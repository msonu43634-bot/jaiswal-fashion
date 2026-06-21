require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex');
const SESSION_TTL = parseInt(process.env.SESSION_TTL || '7200');
const ADMIN_PATH = (process.env.ADMIN_PATH || 'admin').replace(/^\/+|\/+$/g, '');
const ADMIN_NAME = 'Jaiswal Fashion Admin';
const OTP_FROM_NAME = process.env.OTP_FROM_NAME || 'Jaiswal Fashion';
const OTP_FROM_EMAIL = process.env.OTP_FROM_EMAIL || 'msonu43634@gmail.com';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

const ALLOWED_SETTINGS_KEYS = [
  'payment_methods', 'shiprocket_config', 'site_name', 'site_description',
  'show_bulk_section', 'buluk_enabled', 'show_stats', 'show_categories',
  'show_features', 'show_products', 'show_bestsellers', 'show_testimonials', 'show_bulk_pricing',
  'delivery_charge', 'tax_rate', 'free_shipping_threshold', 'email_config', 'site_url'
];

module.exports = { PORT, isProd, ADMIN_PATH, SESSION_SECRET, SESSION_TTL, ENCRYPTION_KEY, ADMIN_NAME, OTP_FROM_NAME, OTP_FROM_EMAIL, ALLOWED_SETTINGS_KEYS };
