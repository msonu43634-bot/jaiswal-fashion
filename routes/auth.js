const { Router } = require('express');
const router = Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const { getDb } = require('../db');
const { sanitize, deepSanitize } = require('../middleware/sanitize');
const { requireAdmin, requireCustomer, requireCSRF } = require('../middleware/auth');
const { getEmailConfig, createTransporter, sendSecurityAlert, startBounceCheck, otpStorage, emailVerificationStatus } = require('../services/email');
const { OTP_FROM_NAME, OTP_FROM_EMAIL } = require('../config');

function safeOtpCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: '🔒 Too many login attempts. Your IP is blocked for 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const accountLockouts = new Map();

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Too many OTP requests. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const emailStatusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many email status checks. Slow down.' }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many incorrect OTP attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const adminOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many OTP verification attempts. Please try again after 15 minutes.' }
});

router.post('/api/auth/send-otp', otpSendLimiter, async (req, res) => {
  let { email, phone, name, type } = req.body;

  if (!email || !type) return res.status(400).json({ error: 'Email and type are required' });
  email = email.toLowerCase().trim();

  const emailRegex = /^[^\s@]+@gmail\.com$/i;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address. Please check and try again.' });
  }

  const db = getDb();

  if (type === 'login') {
    const customer = db.prepare('SELECT id FROM customers WHERE email = ?').get(email);
    if (!customer) {
      return res.status(400).json({ error: 'Account not found. Please register first.' });
    }
  } else if (type === 'register') {
    if (!phone || !name) return res.status(400).json({ error: 'Name and Phone are required for registration' });
    const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Your account is already available with this email. Please login.' });
    }
    const existingPhone = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
    if (existingPhone) {
      return res.status(400).json({ error: 'This phone number is already registered. Please login.' });
    }
  } else {
    return res.status(400).json({ error: 'Invalid request type' });
  }

  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  otpStorage.set(email, {
    otp,
    phone,
    name,
    type,
    expires: Date.now() + 5 * 60 * 1000
  });

  let emailSent = false;
  const ec = getEmailConfig();
  const otpTransporter = createTransporter(ec.otpEmail, ec.otpPass);
  if (otpTransporter) {
    try {
      await otpTransporter.sendMail({
        from: `"${OTP_FROM_NAME}" <${OTP_FROM_EMAIL}>`,
        to: email,
        subject: type === 'login' ? 'Your Login OTP' : 'Your Registration OTP',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; background-color: #f9f9f9; border-radius: 10px;">
            <h2 style="color: #ff4500;">Jaiswal Fashion</h2>
            <p>Hello ${sanitize(name || 'Customer')},</p>
            <p>Your One-Time Password (OTP) for ${sanitize(type)} is:</p>
            <h1 style="font-size: 40px; color: #333; letter-spacing: 5px; background: #fff; display: inline-block; padding: 10px 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">${otp}</h1>
            <p>This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
          </div>
        `
      });
      console.log(`✅ OTP Email sent successfully to ${email}`);
      emailSent = true;
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
    }
  }

  if (!emailSent && otpTransporter) {
    return res.status(400).json({ error: 'Email could not be delivered. Please check your email address and try again.' });
  }

  if (type === 'login') {
    res.json({ success: true, status: 'verified', message: 'OTP sent successfully' });
  } else {
    startBounceCheck(email);
    res.json({ success: true, status: 'pending', message: 'Checking email delivery...' });
  }
});

router.get('/api/auth/email-status', emailStatusLimiter, (req, res) => {
  const email = req.query.email?.toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email required' });

  const status = emailVerificationStatus.get(email) || { status: 'pending' };
  
  if (status.status === 'bounced') {
    emailVerificationStatus.delete(email);
    return res.json({ status: 'bounced', error: 'The email address you entered is invalid. Please check your email address and try again.' });
  }
  
  if (status.status === 'verified') {
    emailVerificationStatus.delete(email);
    return res.json({ status: 'verified' });
  }
  
  res.json({ status: 'pending' });
});

router.post('/api/auth/verify-otp', otpLimiter, (req, res) => {
  let { email, otp } = req.body;

  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
  email = email.toLowerCase().trim();

  const storedData = otpStorage.get(email);
  if (!storedData) return res.status(400).json({ error: 'OTP expired or invalid' });
  if (!safeOtpCompare(storedData.otp, otp)) return res.status(400).json({ error: 'Incorrect OTP' });
  if (Date.now() > storedData.expires) {
    otpStorage.delete(email);
    return res.status(400).json({ error: 'OTP has expired' });
  }

  otpStorage.delete(email);

  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  let customer;

  if (storedData.type === 'register') {
    const existingPhone = db.prepare('SELECT id FROM customers WHERE phone = ?').get(storedData.phone);
    if (existingPhone) {
      return res.status(400).json({ error: 'This phone number is already registered. Please login.' });
    }
    const info = db.prepare('INSERT INTO customers (name, phone, email, password, session_token) VALUES (?, ?, ?, ?, ?)')
      .run(storedData.name, storedData.phone, email, 'otp-auth-no-password', token);
    customer = { id: info.lastInsertRowid, name: storedData.name, phone: storedData.phone, email };
  } else {
    customer = db.prepare('SELECT id, name, phone, email, address, city, pincode FROM customers WHERE email = ?').get(email);
    if (!customer) return res.status(404).json({ error: 'Account not found' });

    db.prepare('UPDATE customers SET session_token = ? WHERE id = ?').run(token, customer.id);
  }

  res.json({ token, customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email } });
});

router.post('/api/admin/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const db = getDb();
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    const now = Date.now();
    const lockKey = 'admin_' + (username || '');
    const lockEntry = accountLockouts.get(lockKey);
    if (lockEntry && lockEntry.count >= 10 && now - lockEntry.start < 15 * 60 * 1000) {
      return res.status(429).json({ error: '🔒 This account is temporarily locked due to too many failed attempts. Try again later.' });
    }

    db.prepare('INSERT INTO login_attempts (ip_address, username, success) VALUES (?, ?, 0)').run(ip, username || '');

    if (!lockEntry || now - lockEntry.start >= 15 * 60 * 1000) {
      accountLockouts.set(lockKey, { count: 1, start: now });
    } else {
      lockEntry.count++;
    }

    const recentFails = db.prepare(
      "SELECT COUNT(*) as c FROM login_attempts WHERE ip_address = ? AND success = 0 AND created_at > datetime('now', '-15 minutes')"
    ).get(ip).c;

    if (recentFails >= 3 && recentFails % 3 === 0) {
      await sendSecurityAlert(ip, username || '(empty)', recentFails);
    }

    console.log(`🔴 Failed login attempt #${recentFails} from IP: ${ip}, username: "${username}"`);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStorage.set('admin_login_' + username, {
    otp,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
    expires: Date.now() + 5 * 60 * 1000
  });

  console.log(`🔐 Admin OTP sent to email for ${username}`);
  const ec = getEmailConfig();
  const twoFaTransporter = createTransporter(ec.admin2faEmail, ec.alertPass);
  if (twoFaTransporter) {
    try {
      await twoFaTransporter.sendMail({
        from: `"Jaiswal Fashion Security" <${ec.admin2faEmail}>`,
        to: ec.admin2faEmail,
        subject: 'Admin Login 2FA OTP',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; background-color: #f9f9f9; border-radius: 10px;">
            <h2 style="color: #ff4500;">Admin Security Alert</h2>
            <p>Someone is trying to login to the admin panel with username <strong>${sanitize(username)}</strong>.</p>
            <p>Your One-Time Password (OTP) is:</p>
            <h1 style="font-size: 40px; color: #333; letter-spacing: 5px; background: #fff; display: inline-block; padding: 10px 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">${otp}</h1>
            <p>This OTP is valid for <strong>5 minutes</strong>. If this wasn't you, ignore this email.</p>
          </div>
        `
      });
      console.log(`✅ Admin 2FA OTP Email sent successfully to ${ec.admin2faEmail}`);

      return res.json({ success: true, otpRequired: true, emailSent: true, message: 'OTP sent to admin email.' });
    } catch (error) {
      console.error('❌ Failed to send Admin 2FA Email:', error.message);
      otpStorage.delete('admin_login_' + username);
      return res.status(500).json({ success: false, emailFailed: true, error: 'The email address configured is invalid or email delivery failed. Please check your email settings and try again.' });
    }
  } else {
    console.error('❌ No email transporter configured for 2FA.');
    otpStorage.delete('admin_login_' + username);
    return res.status(500).json({ success: false, emailFailed: true, error: 'Email service is not configured. Please configure SMTP settings.' });
  }
});

router.post('/api/admin/verify-login', adminOtpLimiter, (req, res) => {
  const { username, otp } = req.body;
  const db = getDb();
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

  const stored = otpStorage.get('admin_login_' + username);

  if (!stored) {
    return res.status(400).json({ error: 'OTP expired or not requested' });
  }

  if (Date.now() > stored.expires) {
    otpStorage.delete('admin_login_' + username);
    return res.status(400).json({ error: 'OTP expired' });
  }

  if (!safeOtpCompare(stored.otp, otp)) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  db.prepare('INSERT INTO login_attempts (ip_address, username, success) VALUES (?, ?, 1)').run(ip, username);
  req.session.admin = stored.user;
  req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  otpStorage.delete('admin_login_' + username);

  console.log(`🟢 Successful login from IP: ${ip}, username: "${username}" (2FA verified)`);
  res.json({ success: true, admin: req.session.admin });
});

router.get('/api/admin/csrf-token', (req, res) => {
  if (req.session && req.session.csrfToken) {
    res.json({ token: req.session.csrfToken });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

router.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ admin: req.session.admin });
});

module.exports = router;
