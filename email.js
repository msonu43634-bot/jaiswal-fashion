const nodemailer = require('nodemailer');
const { ImapFlow } = require('imapflow');
const { getDb } = require('../db');
const { ADMIN_NAME } = require('../config');
const { decrypt } = require('../crypto-utils');

function getEmailConfig() {
  let cfg = {};
  try {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('email_config');
    if (row) {
      try { cfg = JSON.parse(row.value); } catch (e) {}
    }
  } catch (e) {}
  return {
    alertEmail: cfg.alertEmail || process.env.ALERT_EMAIL || '',
    alertPass: cfg.alertPass ? decrypt(cfg.alertPass) : (process.env.ALERT_EMAIL_PASS || ''),
    otpEmail: cfg.otpEmail || process.env.OTP_EMAIL || process.env.ALERT_EMAIL || '',
    otpPass: cfg.otpPass ? decrypt(cfg.otpPass) : (process.env.OTP_EMAIL_PASS || process.env.ALERT_EMAIL_PASS || ''),
    admin2faEmail: cfg.admin2faEmail || process.env.ADMIN_2FA_EMAIL || process.env.ALERT_EMAIL || '',
  };
}

function createTransporter(email, pass) {
  if (!email || !pass) return null;
  try {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: email, pass }
    });
  } catch (err) {
    console.log('⚠️  Email alerts disabled (check email config)');
    return null;
  }
}

async function sendSecurityAlert(ip, username, attemptCount) {
  const ec = getEmailConfig();
  const transporter = createTransporter(ec.alertEmail, ec.alertPass);
  if (!transporter) {
    console.log(`⚠️  SECURITY ALERT (email not configured): ${attemptCount} failed login attempts from IP ${ip} with username "${username}"`);
    return;
  }
  try {
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    await transporter.sendMail({
      from: `"🔒 ${ADMIN_NAME}" <${ec.alertEmail}>`,
      to: ec.alertEmail,
      subject: `🚨 SECURITY ALERT — ${attemptCount} Failed Login Attempts!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 2px solid #ef4444; border-radius: 12px; background: #1a1a2e; color: #f5f5f5;">
          <h2 style="color: #ef4444; margin-top: 0;">🚨 Security Alert — Jaiswal Fashion</h2>
          <p>Someone tried to login to your Admin Panel with a <strong>wrong password</strong>!</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #333; color: #aaa;">❌ Failed Attempts</td><td style="padding: 8px; border-bottom: 1px solid #333; font-weight: bold; color: #ef4444;">${attemptCount} times</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #333; color: #aaa;">👤 Username Tried</td><td style="padding: 8px; border-bottom: 1px solid #333; font-weight: bold;">${username}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #333; color: #aaa;">🌐 IP Address</td><td style="padding: 8px; border-bottom: 1px solid #333; font-weight: bold;">${ip}</td></tr>
            <tr><td style="padding: 8px; color: #aaa;">🕐 Time (IST)</td><td style="padding: 8px; font-weight: bold;">${now}</td></tr>
          </table>
          <p style="color: #facc15; font-size: 14px;">⚠️ If this was not you, please change your admin password immediately!</p>
          <hr style="border-color: #333;">
          <p style="font-size: 12px; color: #666;">This is an automated security alert from Jaiswal Fashion Admin Panel.</p>
        </div>
      `
    });
    console.log(`📧 Security alert email sent for IP: ${ip}`);
  } catch (err) {
    console.error('❌ Failed to send alert email:', err.message);
  }
}

const otpStorage = new Map();
const emailVerificationStatus = new Map();

async function startBounceCheck(email, timeoutMs = 25000) {
  const ec = getEmailConfig();
  if (!ec.otpEmail || !ec.otpPass) {
    emailVerificationStatus.set(email, { status: 'verified' });
    return;
  }

  emailVerificationStatus.set(email, { status: 'pending' });

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: ec.otpEmail, pass: ec.otpPass },
    logger: false
  });

  try {
    console.log(`📬 Connecting IMAP for bounce check on ${email}...`);
    await client.connect();
    console.log(`📬 IMAP connected, checking for bounce on ${email}...`);

    const since = new Date(Date.now() - 120 * 1000);
    const foldersToCheck = ['INBOX'];

    try {
      const mailboxes = await client.list();
      const allMail = mailboxes.find(m => m.path === '[Gmail]/All Mail' || m.path.toLowerCase().includes('all mail'));
      if (allMail) foldersToCheck.push(allMail.path);
    } catch (_) {}

    for (const folder of foldersToCheck) {
      try {
        await client.getMailbox(folder);
        const existing = await client.search({ from: 'mailer-daemon', since }, { uid: true });
        if (existing.length > 0) {
          console.log(`📬 Found ${existing.length} existing mailer-daemon msgs in ${folder}, marking seen`);
          await client.messageFlagsAdd(existing, ['\\Seen']);
        }
      } catch (_) {}
    }

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      for (const folder of foldersToCheck) {
        try {
          await client.getMailbox(folder);
          const search = await client.search({
            from: 'mailer-daemon',
            seen: false,
            since
          }, { uid: true });

          for (const uid of search) {
            const msg = await client.fetchOne(uid, { source: true });
            if (msg && msg.source) {
              const body = msg.source.toString().toLowerCase();
              console.log(`📬 Checking bounce msg #${uid} in ${folder} for ${email}...`);
              if (body.includes(email.toLowerCase())) {
                console.log(`❌ BOUNCE DETECTED for ${email}!`);
                emailVerificationStatus.set(email, { status: 'bounced', reason: 'Mail server returned: address not found' });
                await client.logout();
                return;
              }
            }
          }
        } catch (_) {}
      }

      await new Promise(r => setTimeout(r, 3000));
    }

    console.log(`✅ No bounce detected for ${email} within timeout`);
    emailVerificationStatus.set(email, { status: 'verified' });
    await client.logout();
  } catch (err) {
    try { await client.logout(); } catch (_) {}
    console.log('⚠️  IMAP bounce check error:', err.message);
    emailVerificationStatus.set(email, { status: 'verified' });
  }
}

module.exports = { getEmailConfig, createTransporter, sendSecurityAlert, startBounceCheck, otpStorage, emailVerificationStatus };
