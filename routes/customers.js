const { Router } = require('express');
const router = Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const { getDb } = require('../db');
const { sanitize, deepSanitize } = require('../middleware/sanitize');
const { requireAdmin, requireCustomer, requireCSRF } = require('../middleware/auth');
const { encrypt, decrypt, deterministicHash } = require('../crypto-utils');

const customerLookupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many lookups. Try again later.' }
});

router.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const db = getDb();
  const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const pendingOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get().c;
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != 'cancelled'").get().total;
  const totalContacts = db.prepare("SELECT COUNT(*) as c FROM contacts WHERE status = 'new'").get().c;
  const pendingBulkOrders = db.prepare("SELECT COUNT(*) as c FROM bulk_orders WHERE status = 'pending'").get().c;
  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all();
  const recentContacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 5').all();
  const failedLogins = db.prepare('SELECT * FROM login_attempts WHERE success = 0 ORDER BY created_at DESC LIMIT 10').all();

  res.json({ totalProducts, totalOrders, pendingOrders, totalRevenue, totalContacts, pendingBulkOrders, recentOrders, recentContacts, failedLogins });
});

router.get('/api/admin/customers', requireAdmin, (req, res) => {
  const db = getDb();
  const customers = db.prepare('SELECT id, name, phone, email, address, city, pincode, created_at FROM customers ORDER BY created_at DESC').all();

  for (let customer of customers) {
    customer.address = decrypt(customer.address);
    customer.city = decrypt(customer.city);
    customer.pincode = decrypt(customer.pincode);
    const stat = db.prepare('SELECT COUNT(id) as orderCount, SUM(total_amount) as totalSpent FROM orders WHERE customer_id = ? OR customer_phone = ?').get(customer.id, customer.phone);
    customer.orderCount = stat.orderCount || 0;
    customer.totalSpent = stat.totalSpent || 0;
  }

  res.json(customers);
});

router.get('/api/admin/customers/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const customerId = req.params.id;

  const customer = db.prepare('SELECT id, name, phone, email, address, city, pincode, created_at FROM customers WHERE id = ?').get(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  customer.address = decrypt(customer.address);
  customer.city = decrypt(customer.city);
  customer.pincode = decrypt(customer.pincode);

  const orders = db.prepare('SELECT * FROM orders WHERE customer_id = ? OR customer_phone = ? ORDER BY created_at DESC').all(customerId, customer.phone);
  for (let order of orders) {
    order.customer_address = decrypt(order.customer_address);
    order.customer_email = decrypt(order.customer_email);
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  }

  const favorites = db.prepare(`
    SELECT cf.product_id, p.name as product_name, p.price, p.category 
    FROM customer_favorites cf
    JOIN products p ON cf.product_id = p.id
    WHERE cf.customer_id = ?
  `).all(customerId);

  res.json({ customer, orders, favorites });
});

router.delete('/api/admin/customers/:id', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/api/customer/profile', requireCustomer, (req, res) => {
  const customer = { ...req.customer };
  customer.address = decrypt(customer.address) || '';
  customer.city = decrypt(customer.city) || '';
  customer.pincode = decrypt(customer.pincode) || '';
  if (!customer.address) {
    const db = getDb();
    const lastOrder = db.prepare('SELECT customer_address FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1').get(customer.id);
    if (lastOrder && lastOrder.customer_address) {
      customer.address = decrypt(lastOrder.customer_address) || lastOrder.customer_address;
    }
  }
  res.json(customer);
});

router.put('/api/customer/profile', requireCustomer, (req, res) => {
  const { address, city, pincode, name, email, phone } = req.body;
  const db = getDb();
  const finalEmail = sanitize(email || req.customer.email);
  const finalName = sanitize(name || req.customer.name);
  const finalPhone = sanitize(phone || req.customer.phone);
  db.prepare('UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, city = ?, pincode = ? WHERE id = ?')
    .run(finalName, finalEmail, finalPhone, encrypt(sanitize(address || '')), encrypt(sanitize(city || '')), encrypt(sanitize(pincode || '')), req.customer.id);
  res.json({ success: true });
});

router.get('/api/customer/orders', requireCustomer, (req, res) => {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC').all(req.customer.id);

  for (let order of orders) {
    order.customer_address = decrypt(order.customer_address);
    order.customer_email = decrypt(order.customer_email);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    for (let item of items) {
      let imgRow;
      if (item.color) {
        imgRow = db.prepare('SELECT image_path FROM product_images WHERE product_id = ? AND color_name = ? ORDER BY sort_order ASC LIMIT 1').get(item.product_id, item.color);
      }
      if (!imgRow) {
        imgRow = db.prepare('SELECT image_path FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1').get(item.product_id);
      }
      item.image_url = imgRow ? imgRow.image_path : null;
    }
    order.items = items;
  }

  res.json(orders);
});

router.get('/api/customer/favorites', requireCustomer, (req, res) => {
  const db = getDb();
  const favs = db.prepare('SELECT product_id FROM customer_favorites WHERE customer_id = ?').all(req.customer.id);
  res.json(favs.map(f => f.product_id));
});

router.post('/api/customer/favorites', requireCustomer, (req, res) => {
  const { productId } = req.body;
  const db = getDb();
  const exists = db.prepare('SELECT id FROM customer_favorites WHERE customer_id = ? AND product_id = ?').get(req.customer.id, productId);

  if (exists) {
    db.prepare('DELETE FROM customer_favorites WHERE id = ?').run(exists.id);
    res.json({ status: 'removed' });
  } else {
    db.prepare('INSERT INTO customer_favorites (customer_id, product_id) VALUES (?, ?)').run(req.customer.id, productId);
    res.json({ status: 'added' });
  }
});

router.get('/api/customer/lookup', customerLookupLimiter, (req, res) => {
  const db = getDb();
  const phone = req.query.phone;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  let customerName = null;
  let customerCity = null;
  let customerPincode = null;

  const registered = db.prepare('SELECT name as customer_name, city, pincode FROM customers WHERE phone = ?').get(phone);
  if (registered) {
    customerName = registered.customer_name;
    customerCity = decrypt(registered.city);
    customerPincode = decrypt(registered.pincode);
  }

  if (!customerName) {
    const order = db.prepare(`
      SELECT customer_name, city, pincode
      FROM orders 
      WHERE customer_phone = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(phone);
    if (order) {
      customerName = order.customer_name;
      customerCity = decrypt(order.city);
      customerPincode = decrypt(order.pincode);
    }
  }

  if (customerName) {
    res.json({ customer_name: customerName, city: customerCity || '', pincode: customerPincode || '' });
  } else res.status(404).json({ error: 'Customer not found' });
});

module.exports = router;
