const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const { getDb, initDb } = require('./db');
const SQLiteStore = require('./session-store');
const { backup: runBackup } = require('./backup-db');
const { startAutoShipScheduler } = require('./services/shiprocket');

const { PORT, isProd, ADMIN_PATH, SESSION_SECRET, SESSION_TTL } = require('./config');

const app = express();
app.set('trust proxy', 1);

initDb();

// === Static files (must be before Helmet for images) ===
const siteDir = path.join(__dirname);
app.use((req, res, next) => {
  const blocked = ['.env', 'node_modules', 'admin-backend/.env', 'admin-backend', 'package.json', 'package-lock.json', 'clear-data.js', 'database.js', 'crypto-utils.js', 'shiprocket.js', 'session-store.js', 'backup-db.js'];
  if (blocked.some(p => req.path.startsWith('/' + p) || req.path === '/' + p))
    return res.status(403).send('Forbidden');
  next();
});
app.use(express.static(siteDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
}));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    if (filePath.startsWith(path.join(uploadsDir, 'products')))
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
}));

// === Security Middleware ===
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.razorpay.com"],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: isProd ? { maxAge: 365*24*60*60, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'same-origin' }
}));

if (!isProd) {
  app.use((req, res, next) => { res.setHeader('Strict-Transport-Security', 'max-age=0'); next(); });
}

if (isProd) {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'] || '';
    if (proto === 'http' || (req.headers.host && !proto)) {
      return res.redirect(301, 'https://' + req.headers.host + req.url);
    }
    next();
  });
}

app.use(cors({
  origin: function(origin, callback) {
    if (!isProd) return callback(null, true);
    if (!origin) return callback(null, true);
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('site_url');
    const allowedOrigin = row ? row.value.replace(/\/+$/, '') : (process.env.DOMAIN_URL || '');
    if (!allowedOrigin) {
      console.warn('⚠️  No site_url configured — rejecting cross-origin request from', origin, '. Set site_url in Admin Settings.');
      return callback(null, false);
    }
    if (origin.startsWith(allowedOrigin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ ttl: SESSION_TTL }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: SESSION_TTL * 1000 }
}));

// === General API rate limiter ===
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { error: 'Too many requests. Please try again after 15 minutes.' }
});
app.use('/api', apiLimiter);

// === Admin panel SPA ===
const publicDir = path.join(__dirname, 'public');
app.use('/' + ADMIN_PATH, (req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    const indexPath = path.join(publicDir, 'index.html');
    fs.readFile(indexPath, 'utf-8', (err, html) => {
      if (err) return res.status(500).send('Internal error');
      res.type('html').send(html.replace('<base href="/admin/">', `<base href="/${ADMIN_PATH}/">`));
    });
  } else {
    express.static(publicDir)(req, res, next);
  }
});

// === Mount Routes ===
app.use(require('./routes/auth'));
app.use(require('./routes/products'));
app.use(require('./routes/orders'));
app.use(require('./routes/customers'));
app.use(require('./routes/contacts'));
app.use(require('./routes/settings'));
app.use(require('./routes/webhooks'));

// === DB Backup Scheduler ===
const BACKUP_INTERVAL = parseInt(process.env.BACKUP_INTERVAL || '86400', 10) * 1000;
runBackup();
if (BACKUP_INTERVAL > 0) {
  setInterval(() => {
    console.log('⏰ Running scheduled database backup...');
    runBackup();
  }, BACKUP_INTERVAL);
}

// === Start Auto-Ship Scheduler ===
startAutoShipScheduler();

// === Start Server ====================
const listenPort = parseInt(PORT, 10) || 3000;

app.listen(listenPort, () => {
  console.log('');
  console.log(`🏭 ═══════════════════════════════════════════════`);
  console.log(`   JAISWAL FASHION — Server`);
  console.log('═══════════════════════════════════════════════════');
  console.log(`   🌐 Server running on port ${listenPort}`);
  console.log(`   🔐 Admin path: /${ADMIN_PATH}`);
  console.log(`   📡 API: /api`);
  if (isProd) {
    console.log(`   🚀 Mode:   Production`);
  }
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});

// Last-resort error handler — prevents info leaks
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack || err.message || err);
  res.status(err.status || 500).json({
    error: isProd ? 'An unexpected error occurred. Please try again later.' : err.message
  });
});
