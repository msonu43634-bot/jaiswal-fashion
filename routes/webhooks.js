const { Router } = require('express');
const router = Router();
const crypto = require('crypto');

const { getDb } = require('../db');

router.post('/api/webhooks/shiprocket', (req, res) => {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers['x-shiprocket-signature'] || req.headers['x-webhook-signature'] || '';
    const rawBody = JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const provided = signature.toLowerCase().replace(/^sha256=/i, '');
    if (!provided || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
      console.warn('[Webhook/Shiprocket] Invalid signature, rejecting');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  }

  res.status(200).json({ received: true });

  try {
    const db = getDb();
    const payload = req.body;
    console.log('[Webhook/Shiprocket] Received:', JSON.stringify(payload).substring(0, 200));

    const awb = payload.awb || payload.awb_code;
    const status = payload.current_status || payload.status || '';
    const location = payload.current_location || payload.location || '';
    const description = payload.current_status_label || payload.activity || status;
    const eventTime = payload.updated_at || new Date().toISOString();

    if (!awb) return;

    const order = db.prepare('SELECT * FROM orders WHERE awb_code = ?').get(awb);
    if (!order) {
      console.warn('[Webhook/Shiprocket] No order found for AWB:', awb);
      return;
    }

    db.prepare('INSERT INTO shipment_tracking (order_id, awb_code, status, location, description, event_time) VALUES (?, ?, ?, ?, ?, ?)').run(
      order.id, awb, status, location, description, eventTime
    );

    const statusMap = {
      'Delivered': 'delivered',
      'RTO Delivered': 'cancelled',
      'Cancelled': 'cancelled',
      'Shipment Returned': 'cancelled',
      'Out for Delivery': 'shipped',
      'In Transit': 'shipped'
    };

    const newStatus = statusMap[status];
    if (newStatus) {
      const updateData = { status: newStatus };
      if (newStatus === 'delivered') updateData.delivered_at = new Date().toISOString();
      db.prepare('UPDATE orders SET status = ?, delivered_at = COALESCE(?, delivered_at), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        newStatus, updateData.delivered_at || null, order.id
      );
      if (newStatus === 'delivered') {
        db.prepare("UPDATE payments SET status = 'completed' WHERE order_id = ?").run(order.id);
      }
    }

    console.log(`[Webhook/Shiprocket] ✅ Order #${order.id} updated: ${status} @ ${location}`);
  } catch (e) {
    console.error('[Webhook/Shiprocket] Error:', e.message);
  }
});

module.exports = router;
