const SR = require('../shiprocket');
const { getDb } = require('../db');
const { getEmailConfig, createTransporter } = require('./email');
const { ADMIN_NAME } = require('../config');

function getSRConfig() {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('shiprocket_config');
  return row ? JSON.parse(row.value) : {};
}

async function getSRToken() {
  const config = getSRConfig();
  if (!config.email || !config.password) {
    throw new Error('Shiprocket credentials not configured. Please set them in Admin Settings → Shiprocket.');
  }
  return await SR.getAuthToken(config.email, config.password);
}

function startAutoShipScheduler() {
  const INTERVAL = 60 * 60 * 1000;

  async function checkAndShip() {
    try {
      const db = getDb();
      const ec = getEmailConfig();
      const transporter = createTransporter(ec.alertEmail, ec.alertPass);
      const config = getSRConfig();
      const prepaidHours = config.auto_ship_prepaid_hours || 24;
      const codHours = config.auto_ship_cod_hours || 36;

      const pendingOrders = db.prepare(`
        SELECT o.*, GROUP_CONCAT(oi.product_id || '|' || oi.product_name || '|' || oi.color || '|' || oi.size || '|' || oi.quantity || '|' || oi.price, ';;') as items_raw
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'pending'
          AND o.awb_code IS NULL
          AND (
            (o.payment_method != 'cod' AND o.created_at <= datetime('now', ?))
            OR
            (o.payment_method = 'cod' AND o.created_at <= datetime('now', ?))
          )
        GROUP BY o.id
      `).all('-' + prepaidHours + ' hours', '-' + codHours + ' hours');

      if (pendingOrders.length === 0) return;

      let token;
      try { token = await getSRToken(); }
      catch (e) {
        const fallback = db.prepare(`
          UPDATE orders SET status = 'shipped', updated_at = CURRENT_TIMESTAMP
          WHERE status = 'pending' AND awb_code IS NULL
            AND (
              (payment_method != 'cod' AND created_at <= datetime('now', ?))
              OR
              (payment_method = 'cod' AND created_at <= datetime('now', ?))
            )
        `).run('-' + prepaidHours + ' hours', '-' + codHours + ' hours');
        if (fallback.changes > 0) {
          console.log(`[Auto-Ship] ⚠️  Shiprocket not configured — marked ${fallback.changes} order(s) as shipped locally.`);
        }
        return;
      }

      for (const order of pendingOrders) {
        try {
          const items = (order.items_raw || '').split(';;').filter(Boolean).map(i => {
            const [product_id, product_name, color, size, quantity, price] = i.split('|');
            return { product_id, product_name, color, size, quantity: parseInt(quantity), price: parseFloat(price) };
          });

          const srOrder = await SR.createOrder(token, {
            orderId: order.id,
            orderDate: order.created_at ? order.created_at.split(' ')[0] : new Date().toISOString().split('T')[0],
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            customerEmail: order.customer_email,
            customerAddress: order.customer_address,
            city: order.city || 'Madhubani',
            state: order.state || 'Bihar',
            pincode: order.pincode || '847211',
            items,
            subTotal: order.total_amount
          }, config);

          const srShipmentId = srOrder.shipment_id;
          const srOrderId = srOrder.order_id;

          let awbCode = null, courierName = null, courierId = null;
          try {
            const awbResp = await SR.assignAWB(token, srShipmentId);
            const awbData = awbResp?.response?.data || awbResp;
            awbCode = awbData.awb_code || awbData.awb;
            courierName = awbData.courier_name;
            courierId = awbData.courier_id;
          } catch (awbErr) {
            console.error(`[Auto-Ship] AWB assign failed for Order #${order.id}:`, awbErr.message);
          }

          db.prepare(`
            UPDATE orders SET
              status = 'shipped',
              shiprocket_order_id = ?,
              shiprocket_shipment_id = ?,
              awb_code = ?,
              courier_name = ?,
              courier_id = ?,
              shipped_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            String(srOrderId), String(srShipmentId),
            awbCode, courierName, courierId, order.id
          );

          if (awbCode) {
            db.prepare('INSERT INTO shipment_tracking (order_id, awb_code, status, description) VALUES (?, ?, ?, ?)').run(
              order.id, awbCode, 'Shipped', `Shipped via ${courierName || 'courier'}. AWB: ${awbCode}`
            );
          }

          const payType = order.payment_method !== 'cod' ? 'Prepaid' : 'COD';
          console.log(`[Auto-Ship] ✅ Order #${order.id} (${payType}) shipped. AWB: ${awbCode || 'pending'}, Courier: ${courierName || 'TBD'}`);
        } catch (orderErr) {
          console.error(`[Auto-Ship] ❌ Failed to ship Order #${order.id}:`, orderErr.message);
        }
      }
    } catch (err) {
      console.error('[AutoShip Error]', err.message);
    }
  }

  setInterval(checkAndShip, INTERVAL);
  setTimeout(checkAndShip, 5000);
}

module.exports = { getSRConfig, getSRToken, startAutoShipScheduler };
