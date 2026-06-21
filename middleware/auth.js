const crypto = require('crypto');
const { getDb } = require('../db');
const { decrypt } = require('../crypto-utils');

function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized. Please login.' });
}

function requireCustomer(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const sessionToken = token.split(' ')[1];
  const db = getDb();
  const customer = db.prepare('SELECT id, name, phone, email, address, city, pincode FROM customers WHERE session_token = ?').get(sessionToken);

  if (!customer) return res.status(401).json({ error: 'Invalid or expired token' });

  customer.address = decrypt(customer.address);
  customer.city = decrypt(customer.city);
  customer.pincode = decrypt(customer.pincode);

  req.customer = customer;
  next();
}

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // still run a comparison of equal length to keep timing consistent
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireCSRF(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (req.session && req.session.csrfToken && safeCompare(token, req.session.csrfToken)) {
    return next();
  }
  if (req.session && req.session.admin) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    return res.status(403).json({
      error: 'Invalid or missing security token',
      newToken: req.session.csrfToken
    });
  }
  return res.status(403).json({ error: 'Invalid or missing security token. Please refresh the page and try again.' });
}

module.exports = { requireAdmin, requireCustomer, requireCSRF };
