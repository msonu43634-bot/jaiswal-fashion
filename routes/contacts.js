const { Router } = require('express');
const router = Router();
const rateLimit = require('express-rate-limit');

const { getDb } = require('../db');
const { sanitize, deepSanitize } = require('../middleware/sanitize');
const { requireAdmin, requireCustomer, requireCSRF } = require('../middleware/auth');
const { encrypt, decrypt, deterministicHash } = require('../crypto-utils');

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many messages. Please try again after 1 hour.' }
});

const bulkOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200,
  message: { error: 'Too many bulk order requests. Please try again after 1 hour.' }
});

router.get('/api/contacts', requireAdmin, (req, res) => {
  const db = getDb();
  const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  contacts.forEach(c => { c.message = decrypt(c.message); });
  res.json(contacts);
});

router.post('/api/contacts', contactLimiter, (req, res) => {
  const db = getDb();
  const { name, phone, email, subject, message } = req.body;
  db.prepare('INSERT INTO contacts (name, phone, email, subject, message) VALUES (?, ?, ?, ?, ?)').run(
    sanitize(name), sanitize(phone || ''), sanitize(email || ''), sanitize(subject || 'general'), encrypt(sanitize(message))
  );
  res.json({ success: true });
});

router.put('/api/contacts/:id/status', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE contacts SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.json({ success: true });
});

router.delete('/api/contacts/:id', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/api/bulk-orders', requireAdmin, (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM bulk_orders ORDER BY created_at DESC').all());
});

router.post('/api/bulk-orders', bulkOrderLimiter, (req, res) => {
  const db = getDb();
  const { shopName, contactPerson, phone, city, categories, volume } = req.body;
  db.prepare('INSERT INTO bulk_orders (shop_name, contact_person, phone, city, categories, volume) VALUES (?, ?, ?, ?, ?, ?)').run(
    sanitize(shopName), sanitize(contactPerson), sanitize(phone), sanitize(city), JSON.stringify((categories || []).map(sanitize)), sanitize(volume)
  );
  res.json({ success: true });
});

router.put('/api/bulk-orders/:id/status', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE bulk_orders SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.json({ success: true });
});

router.delete('/api/bulk-orders/:id', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM bulk_orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/api/buluk-orders', (req, res) => {
  const db = getDb();
  const { shopName, contactPerson, phone, address, city, notes, items } = req.body;
  if (!shopName || !contactPerson || !phone || !items || !items.length) {
    return res.status(400).json({ error: 'Shop name, contact person, phone, and items are required' });
  }

  let totalPieces = 0;
  for (const item of items) {
    totalPieces += (item.quantity || 0);
  }

  const orderResult = db.prepare(`
    INSERT INTO buluk_orders (shop_name, contact_person, phone, address, city, total_pieces, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    sanitize(shopName), sanitize(contactPerson), sanitize(phone),
    sanitize(address || ''), sanitize(city || ''), totalPieces, sanitize(notes || '')
  );

  const orderId = orderResult.lastInsertRowid;
  const itemStmt = db.prepare(`
    INSERT INTO buluk_order_items (order_id, product_id, product_name, color, size, quantity, price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    const product = db.prepare('SELECT price FROM products WHERE id = ?').get(item.productId);
    const serverPrice = product ? product.price : 0;
    itemStmt.run(orderId, item.productId, sanitize(item.productName),
      sanitize(item.color || ''), sanitize(item.size || ''),
      item.quantity || 0, serverPrice);
  }

  res.json({ success: true, orderId });
});

router.get('/api/buluk-orders', requireAdmin, (req, res) => {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM buluk_orders ORDER BY created_at DESC').all();
  for (const order of orders) {
    order.items = db.prepare('SELECT * FROM buluk_order_items WHERE order_id = ?').all(order.id);
  }
  res.json(orders);
});

router.put('/api/buluk-orders/:id/status', requireAdmin, requireCSRF, (req, res) => {
  res.json({ success: true });
});

router.delete('/api/buluk-orders/:id', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM buluk_orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
