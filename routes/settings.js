const { Router } = require('express');
const router = Router();
const rateLimit = require('express-rate-limit');

const { getDb } = require('../db');
const { sanitize, deepSanitize } = require('../middleware/sanitize');
const { requireAdmin, requireCustomer, requireCSRF } = require('../middleware/auth');
const { encrypt, decrypt, deterministicHash } = require('../crypto-utils');
const { ALLOWED_SETTINGS_KEYS } = require('../config');

const SR = require('../shiprocket');

const settingsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many setting changes. Slow down.' }
});

router.get('/api/settings', (req, res) => {
  const db = getDb();
  const getVal = (key, def) => { const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key); return r ? r.value : def; };
  res.json({
    payment_methods: (() => { const r = db.prepare('SELECT value FROM settings WHERE key = ?').get('payment_methods'); return r ? JSON.parse(r.value) : { cod: true, online: false }; })(),
    show_bulk_section: getVal('show_bulk_section', 'false'),
    buluk_enabled: getVal('buluk_enabled', 'false'),
    show_stats: getVal('show_stats', 'true'),
    show_categories: getVal('show_categories', 'true'),
    show_features: getVal('show_features', 'true'),
    show_products: getVal('show_products', 'true'),
    show_bestsellers: getVal('show_bestsellers', 'true'),
    show_testimonials: getVal('show_testimonials', 'true'),
    show_bulk_pricing: getVal('show_bulk_pricing', 'true')
  });
});

router.get('/api/admin/settings', requireAdmin, (req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj = {};
  settings.forEach(s => {
    try {
      settingsObj[s.key] = JSON.parse(s.value);
    } catch (e) {
      settingsObj[s.key] = s.value;
    }
  });
  if (settingsObj.shiprocket_config && settingsObj.shiprocket_config.password) {
    settingsObj.shiprocket_config.password = '__CONFIGURED__';
  }
  if (settingsObj.email_config) {
    if (settingsObj.email_config.alertPass) settingsObj.email_config.alertPass = '__CONFIGURED__';
    if (settingsObj.email_config.otpPass) settingsObj.email_config.otpPass = '__CONFIGURED__';
  }
  res.json(settingsObj);
});

router.post('/api/admin/settings', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  const updates = req.body;
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP');

  const processSetting = db.transaction((updates) => {
    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED_SETTINGS_KEYS.includes(key)) continue;
      let cleanValue = deepSanitize(value);
      if (key === 'shiprocket_config' && typeof cleanValue === 'object' && cleanValue.password === '__CONFIGURED__') {
        const old = db.prepare('SELECT value FROM settings WHERE key = ?').get('shiprocket_config');
        if (old) { const oc = JSON.parse(old.value); cleanValue.password = oc.password; }
      }
      if (key === 'email_config' && typeof cleanValue === 'object') {
        if (cleanValue.alertPass === '__CONFIGURED__') {
          const old = db.prepare('SELECT value FROM settings WHERE key = ?').get('email_config');
          if (old) { const oc = JSON.parse(old.value); cleanValue.alertPass = oc.alertPass; }
        } else if (cleanValue.alertPass) {
          cleanValue.alertPass = encrypt(cleanValue.alertPass);
        }
        if (cleanValue.otpPass === '__CONFIGURED__') {
          const old = db.prepare('SELECT value FROM settings WHERE key = ?').get('email_config');
          if (old) { const oc = JSON.parse(old.value); cleanValue.otpPass = oc.otpPass; }
        } else if (cleanValue.otpPass) {
          cleanValue.otpPass = encrypt(cleanValue.otpPass);
        }
      }
      stmt.run(sanitize(key), typeof cleanValue === 'object' ? JSON.stringify(cleanValue) : cleanValue);
    }
  });

  processSetting(updates);
  res.json({ success: true });
});

router.get('/api/testimonials', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM testimonials WHERE active = 1 ORDER BY sort_order ASC, created_at DESC').all();
  res.json(list);
});

router.get('/api/admin/testimonials', requireAdmin, (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM testimonials ORDER BY sort_order ASC, created_at DESC').all();
  res.json(list);
});

router.post('/api/admin/testimonials', requireAdmin, requireCSRF, (req, res) => {
  const { name, role, text, rating, sort_order, active } = req.body;
  if (!name || !text) return res.status(400).json({ error: 'Name and text are required' });
  const db = getDb();
  db.prepare('INSERT INTO testimonials (name, role, text, rating, sort_order, active) VALUES (?, ?, ?, ?, ?, ?)').run(
    sanitize(name), sanitize(role || ''), sanitize(text), parseInt(rating) || 5, parseInt(sort_order) || 0, active !== undefined ? (active ? 1 : 0) : 1
  );
  res.json({ success: true });
});

router.put('/api/admin/testimonials/:id', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  const { name, role, text, rating, sort_order, active } = req.body;
  db.prepare('UPDATE testimonials SET name=?, role=?, text=?, rating=?, sort_order=?, active=? WHERE id=?').run(
    sanitize(name), sanitize(role || ''), sanitize(text), parseInt(rating) || 5, parseInt(sort_order) || 0, active !== undefined ? (active ? 1 : 0) : 1, req.params.id
  );
  res.json({ success: true });
});

router.delete('/api/admin/testimonials/:id', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM testimonials WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/api/admin/shiprocket/config', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  const config = req.body;
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP').run(
    'shiprocket_config', JSON.stringify(config)
  );
  SR.clearTokenCache();
  res.json({ success: true });
});

module.exports = router;
