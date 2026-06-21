const { Router } = require('express');
const router = Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const { getDb } = require('../db');
const { sanitize, deepSanitize } = require('../middleware/sanitize');
const { requireAdmin, requireCustomer, requireCSRF } = require('../middleware/auth');
const { encrypt, decrypt, deterministicHash } = require('../crypto-utils');
const { getSRConfig, getSRToken } = require('../services/shiprocket');
const { isProd } = require('../config');

const uploadsDir = path.join(__dirname, '..', 'uploads');

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many order operations. Slow down.' }
});

const invoiceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadsDir, 'invoices');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const name = `invoice_order${req.params.id}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, name);
  }
});
const uploadInvoice = multer({
  storage: invoiceStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /pdf/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()) && file.mimetype === 'application/pdf');
  }
});

const SR = require('../shiprocket');

router.get('/api/orders', requireAdmin, (req, res) => {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  orders.forEach(o => {
    o.customer_address = decrypt(o.customer_address);
    o.customer_email = decrypt(o.customer_email);
    o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
  });
  res.json(orders);
});

router.delete('/api/orders/:id', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/api/orders', orderLimiter, [
  body('customerName').trim().notEmpty().withMessage('Customer name is required'),
  body('customerPhone').trim().matches(/^\d{10}$/).withMessage('Valid 10-digit phone required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array().map(e => e.msg).join('. ') });
  }
  const db = getDb();
  const { customerId, customerName, customerPhone, customerEmail, customerAddress, items, gst, deliveryCharge, paymentMethod, coupon, discount } = req.body;

  let calculatedTotalAmount = 0;
  const verifiedItems = [];

  if (items && items.length) {
    items.forEach(item => {
      const product = db.prepare('SELECT price FROM products WHERE id = ?').get(item.productId);
      if (product) {
        const itemTotal = product.price * (item.quantity || 1);
        calculatedTotalAmount += itemTotal;
        verifiedItems.push({
          productId: item.productId,
          productName: sanitize(item.productName),
          color: sanitize(item.color || ''),
          size: sanitize(item.size || ''),
          quantity: item.quantity || 1,
          price: product.price
        });
      }
    });
  }

  const safeGst = Math.round(calculatedTotalAmount * 0.05 * 100) / 100;
  const safeDeliveryCharge = 0;
  const safeDiscount = 0;

  const result = db.prepare(`
    INSERT INTO orders (customer_id, customer_name, customer_phone, customer_email, customer_address, total_amount, gst, delivery_charge, discount, coupon_code, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(customerId || null, sanitize(customerName || ''), sanitize(customerPhone || ''), sanitize(customerEmail || ''), encrypt(sanitize(customerAddress || '')), calculatedTotalAmount, safeGst, safeDeliveryCharge, safeDiscount, sanitize(coupon || ''), sanitize(paymentMethod || 'cod'));

  const orderId = result.lastInsertRowid;

  if (verifiedItems.length > 0) {
    const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, color, size, quantity, price) VALUES (?, ?, ?, ?, ?, ?, ?)');
    verifiedItems.forEach(item => {
      stmt.run(orderId, sanitize(item.productId), item.productName, item.color, item.size, item.quantity, item.price);
    });
  }

  db.prepare('INSERT INTO payments (order_id, amount, method) VALUES (?, ?, ?)').run(orderId, calculatedTotalAmount, sanitize(paymentMethod || 'cod'));

  res.json({ success: true, orderId });
});

router.put('/api/orders/:id/status', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

  if (status === 'delivered') {
    db.prepare("UPDATE payments SET status = 'completed' WHERE order_id = ?").run(req.params.id);
  }
  if (status === 'cancelled') {
    db.prepare("UPDATE payments SET status = 'refunded' WHERE order_id = ?").run(req.params.id);
  }

  res.json({ success: true });
});

router.get('/api/payments', requireAdmin, (req, res) => {
  const db = getDb();
  const payments = db.prepare(`
    SELECT p.*, o.customer_name, o.customer_phone, o.status as order_status
    FROM payments p LEFT JOIN orders o ON p.order_id = o.id
    ORDER BY p.created_at DESC
  `).all();
  res.json(payments);
});

router.put('/api/payments/:id/status', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE payments SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.json({ success: true });
});

router.delete('/api/payments/:id', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/api/admin/shiprocket/status', requireAdmin, async (req, res) => {
  try {
    const token = await getSRToken();
    const locations = await SR.getPickupLocations(token);
    const locs = Array.isArray(locations?.data) ? locations.data : [];
    res.json({ connected: true, message: 'Shiprocket connected successfully!', pickup_locations: locs });
  } catch (e) {
    res.json({ connected: false, message: e.message });
  }
});

router.post('/api/admin/orders/:id/ship', requireAdmin, requireCSRF, async (req, res) => {
  const db = getDb();
  const orderId = req.params.id;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.awb_code) return res.status(400).json({ error: 'Order already shipped. AWB: ' + order.awb_code });

  try {
    const config = getSRConfig();
    const token = await getSRToken();
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

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
    const awbResp = await SR.assignAWB(token, srShipmentId);
    const awbData = awbResp?.response?.data || awbResp;
    awbCode = awbData.awb_code || awbData.awb;
    courierName = awbData.courier_name;
    courierId = awbData.courier_id;

    db.prepare(`
      UPDATE orders SET
        status = 'shipped', shiprocket_order_id = ?, shiprocket_shipment_id = ?,
        awb_code = ?, courier_name = ?, courier_id = ?,
        shipped_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(String(srOrderId), String(srShipmentId), awbCode, courierName, courierId, orderId);

    if (awbCode) {
      db.prepare('INSERT INTO shipment_tracking (order_id, awb_code, status, description) VALUES (?, ?, ?, ?)').run(
        orderId, awbCode, 'Shipped', `Manually shipped via ${courierName || 'courier'}. AWB: ${awbCode}`
      );
    }

    res.json({ success: true, awb_code: awbCode, courier_name: courierName, shiprocket_order_id: srOrderId });
  } catch (e) {
    console.error('[Manual Ship]', e.message);
    res.status(500).json({ error: isProd ? 'An unexpected error occurred.' : e.message });
  }
});

router.post('/api/admin/orders/:id/cancel-shipment', requireAdmin, requireCSRF, async (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!order.shiprocket_order_id) return res.json({ success: true, message: 'No Shiprocket order to cancel.' });

  try {
    const token = await getSRToken();
    await SR.cancelShipment(token, order.shiprocket_order_id);
    db.prepare("UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    db.prepare("UPDATE payments SET status = 'refunded' WHERE order_id = ?").run(req.params.id);
    res.json({ success: true, message: 'Shipment cancelled on Shiprocket.' });
  } catch (e) {
    res.status(500).json({ error: isProd ? 'An unexpected error occurred.' : e.message });
  }
});

router.post('/api/admin/orders/:id/invoice', requireAdmin, requireCSRF, uploadInvoice.single('invoice'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const invoicePath = `/uploads/invoices/${req.file.filename}`;
  if (order.invoice_path) {
    const safePath = order.invoice_path.replace(/\/uploads\//g, '');
    const oldPath = path.resolve(uploadsDir, safePath);
    if (oldPath.startsWith(path.resolve(uploadsDir)) && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  db.prepare("UPDATE orders SET invoice_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(invoicePath, req.params.id);
  res.json({ success: true, invoice_path: invoicePath });
});

router.delete('/api/admin/orders/:id/invoice', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.invoice_path) {
    const safePath = order.invoice_path.replace(/\/uploads\//g, '');
    const filePath = path.resolve(uploadsDir, safePath);
    if (filePath.startsWith(path.resolve(uploadsDir)) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare("UPDATE orders SET invoice_path = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

router.get('/api/customer/orders/:id/tracking', requireCustomer, async (req, res) => {
  const db = getDb();
  const orderId = req.params.id;

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND (customer_id = ? OR customer_phone = ?)').get(
    orderId, req.customer.id, req.customer.phone
  );
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const localEvents = db.prepare('SELECT * FROM shipment_tracking WHERE order_id = ? ORDER BY event_time DESC').all(orderId);

  let liveTracking = null;
  if (order.awb_code) {
    try {
      const token = await getSRToken();
      const trackResp = await SR.trackShipment(token, order.awb_code);
      liveTracking = trackResp?.tracking_data || null;

      if (liveTracking?.shipment_track_activities) {
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO shipment_tracking (order_id, awb_code, status, location, description, event_time)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        liveTracking.shipment_track_activities.forEach(evt => {
          stmt.run(orderId, order.awb_code, evt['sr-status-label'] || evt.status || '',
            evt.location || '', evt.activity || '', evt.date || new Date().toISOString());
        });
        if (liveTracking.current_status === 'Delivered') {
          db.prepare("UPDATE orders SET status = 'delivered', delivered_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
            new Date().toISOString(), orderId
          );
        }
      }
    } catch (e) {
      console.warn('[Tracking] Live fetch failed:', e.message);
    }
  }

  const freshEvents = db.prepare('SELECT * FROM shipment_tracking WHERE order_id = ? ORDER BY event_time DESC').all(orderId);

  res.json({
    order: {
      id: order.id,
      status: order.status,
      awb_code: order.awb_code,
      courier_name: order.courier_name,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
      estimated_delivery: order.estimated_delivery,
      tracking_url: order.tracking_url
    },
    events: freshEvents,
    live: liveTracking ? {
      current_status: liveTracking.current_status,
      current_location: liveTracking.current_location || '',
      delivered_date: liveTracking.delivered_date || ''
    } : null
  });
});

module.exports = router;
