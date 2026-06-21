const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_ENV = 'ENCRYPTION_KEY';

let encryptionKey = null;

function getKey() {
  if (encryptionKey) return encryptionKey;
  const key = process.env[KEY_ENV];
  if (!key) {
    throw new Error('ENCRYPTION_KEY not set in .env. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  encryptionKey = crypto.createHash('sha256').update(key).digest();
  return encryptionKey;
}

function encrypt(text) {
  if (text === null || text === undefined || text === '') return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  const parts = encryptedText.split(':');
  if (parts.length < 3) return encryptedText;
  try {
    const iv = Buffer.from(parts.shift(), 'hex');
    const authTag = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedText;
  }
}

function deterministicHash(value) {
  if (!value) return value;
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

module.exports = { encrypt, decrypt, deterministicHash };
