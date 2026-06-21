const { Router } = require('express');
const router = Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const { getDb } = require('../db');
const { sanitize, deepSanitize } = require('../middleware/sanitize');
const { requireAdmin, requireCustomer, requireCSRF } = require('../middleware/auth');
const { encrypt, decrypt, deterministicHash } = require('../crypto-utils');

const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many reviews submitted. Please try again after 1 hour.' }
});

const uploadsDir = path.join(__dirname, '..', 'uploads');

function safeJsonParse(str, fallback) {
  if (!str || typeof str !== 'string') return fallback;
  try { return JSON.parse(str); } catch (e) { return fallback; }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadsDir, 'products');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    // Only allow known-safe extensions; strip anything else (blocks path traversal / double extensions)
    if (!/^\.(jpe?g|png|gif|webp)$/.test(ext)) ext = '.jpg';
    const safeColor = req.params.colorName ? req.params.colorName.replace(/[^a-zA-Z0-9]/g, '') : 'default';
    const safeProductId = String(req.params.productId || 'product').replace(/[^a-zA-Z0-9]/g, '');
    const safeAngle = String(req.params.angle || 'front').replace(/[^a-zA-Z0-9]/g, '');
    const name = `${safeProductId}_${safeAngle}_${safeColor}_${Date.now()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    cb(null, ok);
  }
});

router.get('/api/products', (req, res) => {
  const db = getDb();
  let products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  products = products.map(p => ({
    ...p,
    colors: safeJsonParse(p.colors, []),
    sizes: safeJsonParse(p.sizes, []),
    inStock: p.in_stock === 1,
    originalPrice: p.original_price,
    reviewCount: p.review_count,
    washCare: p.wash_care,
    images: db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order').all(p.id)
  }));
  res.json(products);
});

router.get('/api/products/:id', (req, res) => {
  const db = getDb();
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  p.colors = safeJsonParse(p.colors, []);
  p.sizes = safeJsonParse(p.sizes, []);
  p.inStock = p.in_stock === 1;
  p.originalPrice = p.original_price;
  p.reviewCount = p.review_count;
  p.washCare = p.wash_care;
  p.images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order').all(p.id);
  res.json(p);
});

router.get('/api/categories', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

router.post('/api/products', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  const { id, name, category, price, originalPrice, colors, sizes, description, material, fit, washCare, badge, gradient, inStock, isBulk } = req.body;

  const productId = id || `${sanitize(category).substring(0, 2)}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;

  db.prepare(`
    INSERT INTO products (id, name, category, price, original_price, colors, sizes, description, material, fit, wash_care, badge, gradient, in_stock, is_bulk)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(productId, sanitize(name), sanitize(category), price, originalPrice, JSON.stringify((colors || []).map(sanitize)), JSON.stringify((sizes || []).map(sanitize)), sanitize(description || ''), sanitize(material || ''), sanitize(fit || 'Regular Fit'), sanitize(washCare || ''), sanitize(badge || ''), sanitize(gradient || ''), inStock ? 1 : 0, isBulk ? 1 : 0);

  res.json({ success: true, id: productId });
});

router.put('/api/products/:id', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  const { name, category, price, originalPrice, colors, sizes, description, material, fit, washCare, badge, gradient, inStock, rating, reviewCount, isBulk } = req.body;

  db.prepare(`
    UPDATE products SET name=?, category=?, price=?, original_price=?, colors=?, sizes=?,
    description=?, material=?, fit=?, wash_care=?, badge=?, gradient=?, in_stock=?,
    rating=?, review_count=?, is_bulk=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(sanitize(name), sanitize(category), price, originalPrice, JSON.stringify((colors || []).map(sanitize)), JSON.stringify((sizes || []).map(sanitize)), sanitize(description || ''), sanitize(material || ''), sanitize(fit || ''), sanitize(washCare || ''), sanitize(badge || ''), sanitize(gradient || ''), inStock ? 1 : 0, rating || 4.0, reviewCount || 0, isBulk ? 1 : 0, req.params.id);

  res.json({ success: true });
});

router.delete('/api/products/:id', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ?').all(req.params.id);
  images.forEach(img => {
    const imgPath = path.resolve(__dirname, '..', img.image_path || '');
    if (imgPath.startsWith(path.resolve(uploadsDir)) && fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  });
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(req.params.id);
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

function isValidImage(filePath) {
  try {
    const buf = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61) return true;
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
    return false;
  } catch { return false; }
}

router.post('/api/products/:productId/images/:angle/:colorName', requireAdmin, requireCSRF, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file' });

  if (!isValidImage(req.file.path)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid image file. Only JPEG, PNG, GIF, and WebP are allowed.' });
  }

  const db = getDb();
  const imagePath = `/uploads/products/${req.file.filename}`;
  const colorName = decodeURIComponent(req.params.colorName);

  const existing = db.prepare('SELECT * FROM product_images WHERE product_id = ? AND view_angle = ? AND color_name = ?').get(req.params.productId, req.params.angle, colorName);
  if (existing) {
    const oldPath = path.resolve(__dirname, '..', existing.image_path || '');
    if (oldPath.startsWith(path.resolve(uploadsDir)) && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    db.prepare('DELETE FROM product_images WHERE id = ?').run(existing.id);
  }

  const sortOrders = { front: 0, back: 1, left: 2, right: 3, detail: 4 };
  db.prepare('INSERT INTO product_images (product_id, view_angle, image_path, sort_order, color_name) VALUES (?, ?, ?, ?, ?)').run(
    req.params.productId, req.params.angle, imagePath, sortOrders[req.params.angle] || 0, colorName
  );

  res.json({ success: true, path: imagePath });
});

router.delete('/api/products/:productId/images/:imageId', requireAdmin, requireCSRF, (req, res) => {
  const db = getDb();
  const img = db.prepare('SELECT * FROM product_images WHERE id = ? AND product_id = ?').get(req.params.imageId, req.params.productId);
  if (img) {
    const imgPath = path.resolve(__dirname, '..', img.image_path || '');
    if (imgPath.startsWith(path.resolve(uploadsDir)) && fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    db.prepare('DELETE FROM product_images WHERE id = ?').run(img.id);
  }
  res.json({ success: true });
});

router.get('/api/products/:productId/images', (req, res) => {
  const db = getDb();
  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order').all(req.params.productId);
  res.json(images);
});

router.post('/api/products/:productId/reviews', reviewLimiter, (req, res) => {
  const db = getDb();
  const { customer_name, rating, comment } = req.body;
  if (!customer_name || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Name and valid rating (1-5) are required' });
  }
  db.prepare('INSERT INTO product_reviews (product_id, customer_name, rating, comment) VALUES (?, ?, ?, ?)').run(
    req.params.productId, sanitize(customer_name), parseInt(rating), sanitize(comment || '')
  );
  const stats = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM product_reviews WHERE product_id = ?').get(req.params.productId);
  db.prepare('UPDATE products SET rating = ?, review_count = ? WHERE id = ?').run(Math.round(stats.avg_rating * 10) / 10, stats.cnt, req.params.productId);
  res.json({ success: true });
});

router.get('/api/products/:productId/reviews', (req, res) => {
  const db = getDb();
  const reviews = db.prepare('SELECT * FROM product_reviews WHERE product_id = ? ORDER BY created_at DESC').all(req.params.productId);
  res.json(reviews);
});

module.exports = router;
