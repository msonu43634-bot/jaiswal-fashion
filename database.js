/* ======================================================
   JAISWAL FASHION — Database Setup (SQLite)
   Schema, migrations, and seed data
   ====================================================== */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'jaiswal_fashion.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

// ==================== Create Tables ====================
function createTables() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '👕',
      gradient TEXT DEFAULT 'linear-gradient(135deg, #667eea, #764ba2)',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL NOT NULL,
      colors TEXT DEFAULT '[]',
      sizes TEXT DEFAULT '[]',
      rating REAL DEFAULT 4.0,
      review_count INTEGER DEFAULT 0,
      description TEXT DEFAULT '',
      material TEXT DEFAULT '',
      fit TEXT DEFAULT 'Regular Fit',
      wash_care TEXT DEFAULT '',
      in_stock INTEGER DEFAULT 1,
      badge TEXT DEFAULT '',
      gradient TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      view_angle TEXT NOT NULL DEFAULT 'front',
      image_path TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      password TEXT NOT NULL,
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      pincode TEXT DEFAULT '',
      session_token TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customer_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      UNIQUE(customer_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER DEFAULT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT DEFAULT '',
      customer_address TEXT DEFAULT '',
      total_amount REAL NOT NULL,
      gst REAL DEFAULT 0,
      delivery_charge REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      payment_method TEXT DEFAULT 'cod',
      payment_status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      color TEXT DEFAULT '',
      size TEXT DEFAULT '',
      quantity INTEGER DEFAULT 1,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      subject TEXT DEFAULT 'general',
      message TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bulk_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_name TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      categories TEXT NOT NULL,
      volume TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'cod',
      status TEXT DEFAULT 'pending',
      transaction_id TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT 'Admin',
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL DEFAULT '',
      username TEXT DEFAULT '',
      success INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shipment_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      awb_code TEXT DEFAULT '',
      status TEXT NOT NULL,
      status_code INTEGER DEFAULT 0,
      location TEXT DEFAULT '',
      description TEXT DEFAULT '',
      event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS buluk_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_name TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      total_pieces INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS buluk_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      color TEXT DEFAULT '',
      size TEXT DEFAULT '',
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES buluk_orders(id) ON DELETE CASCADE
    );
  `);

  // Migration: Add customer_id to orders if it doesn't exist
  try {
    db.prepare('ALTER TABLE orders ADD COLUMN customer_id INTEGER DEFAULT NULL').run();
  } catch (e) {
    // Ignore if column already exists
  }

  // Migration: Testimonials table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT DEFAULT '',
        text TEXT NOT NULL,
        rating INTEGER DEFAULT 5,
        sort_order INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) { /* ignore */ }

  // Migration: Product reviews table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
  } catch (e) { /* ignore */ }

  // Migration: Add color_name to product_images if it doesn't exist
  try {
    db.prepare('ALTER TABLE product_images ADD COLUMN color_name TEXT DEFAULT ""').run();
  } catch (e) { /* already exists */ }

  // Migration: Add discount/coupon to orders
  try { db.prepare("ALTER TABLE orders ADD COLUMN discount REAL DEFAULT 0").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE orders ADD COLUMN coupon_code TEXT DEFAULT ''").run(); } catch(e) {}

  // Migration: Add invoice_path to orders
  try { db.prepare("ALTER TABLE orders ADD COLUMN invoice_path TEXT DEFAULT NULL").run(); } catch(e) {}

  // Migration: Shiprocket fields in orders table
  const srMigrations = [
    "ALTER TABLE orders ADD COLUMN shiprocket_order_id TEXT DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN shiprocket_shipment_id TEXT DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN awb_code TEXT DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN courier_name TEXT DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN courier_id INTEGER DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN shipped_at DATETIME DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN delivered_at DATETIME DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN tracking_url TEXT DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN estimated_delivery TEXT DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN city TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN pincode TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN state TEXT DEFAULT ''"
  ];
  srMigrations.forEach(sql => { try { db.prepare(sql).run(); } catch(e) { /* already exists */ } });

  // Seed default settings if they don't exist
  const existingSetting = db.prepare('SELECT key FROM settings WHERE key = ?').get('payment_methods');
  if (!existingSetting) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('payment_methods', JSON.stringify({ cod: true, online: false }));
  }

  // Seed Shiprocket config defaults
  const srSetting = db.prepare('SELECT key FROM settings WHERE key = ?').get('shiprocket_config');
  if (!srSetting) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('shiprocket_config', JSON.stringify({
      email: '',
      password: '',
      pickup_location: 'Primary',
      auto_ship_prepaid_hours: 24,
      auto_ship_cod_hours: 36,
      pkg_weight: 0.5,
      pkg_length: 30,
      pkg_breadth: 25,
      pkg_height: 5
    }));
  }

  console.log('✅ Database tables created');
}

// ==================== Seed Default Admin ====================
function seedAdmin() {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM admin_users LIMIT 1').get();
  if (!existing) {
    const hash = bcrypt.hashSync('Suresh@80849934#', 10);
    db.prepare('INSERT INTO admin_users (username, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
      'SURESH', hash, 'SURESH', 'admin'
    );
    console.log('✅ Default admin user created (SURESH / Suresh@80849934#)');
  }
}

// ==================== Seed Categories ====================
function seedCategories() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (count === 0) {
    const cats = [
      { id: 'tshirt', name: 'T-Shirts', icon: '👕', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
      { id: 'lower', name: 'Lowers', icon: '👖', gradient: 'linear-gradient(135deg, #11998e, #38ef7d)' },
      { id: 'halfpant', name: 'Half Pants', icon: '🩳', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
      { id: 'jacket', name: 'Jackets', icon: '🧥', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
      { id: 'hoodie', name: 'Hoodies', icon: '🔶', gradient: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' },
      { id: 'kurta', name: 'Kurtas', icon: '👘', gradient: 'linear-gradient(135deg, #c8982e, #f5d799)' },
      { id: 'buluk', name: 'Bulk', icon: '🧶', gradient: 'linear-gradient(135deg, #8b0000, #cd5c5c)' },
      { id: 'sweater', name: 'Sweaters', icon: '🧶', gradient: 'linear-gradient(135deg, #e17055, #d63031)' },
    ];
    const stmt = db.prepare('INSERT INTO categories (id, name, icon, gradient) VALUES (?, ?, ?, ?)');
    cats.forEach(c => stmt.run(c.id, c.name, c.icon, c.gradient));
    console.log('✅ Categories seeded');
  }

  // Migrate: add missing categories (for existing databases)
  const existingIds = db.prepare('SELECT id FROM categories').all().map(r => r.id);
  const allCats = [
    { id: 'tshirt', name: 'T-Shirts', icon: '👕', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
    { id: 'lower', name: 'Lowers', icon: '👖', gradient: 'linear-gradient(135deg, #11998e, #38ef7d)' },
    { id: 'halfpant', name: 'Half Pants', icon: '🩳', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
    { id: 'jacket', name: 'Jackets', icon: '🧥', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
    { id: 'hoodie', name: 'Hoodies', icon: '🔶', gradient: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' },
    { id: 'kurta', name: 'Kurtas', icon: '👘', gradient: 'linear-gradient(135deg, #c8982e, #f5d799)' },
    { id: 'buluk', name: 'Buluk (Velvet)', icon: '🧶', gradient: 'linear-gradient(135deg, #8b0000, #cd5c5c)' },
    { id: 'sweater', name: 'Sweaters', icon: '🧶', gradient: 'linear-gradient(135deg, #e17055, #d63031)' },
  ];
  const migStmt = db.prepare('INSERT OR IGNORE INTO categories (id, name, icon, gradient) VALUES (?, ?, ?, ?)');
  allCats.forEach(c => {
    if (!existingIds.includes(c.id)) {
      migStmt.run(c.id, c.name, c.icon, c.gradient);
      console.log(`➕ Added category: ${c.id}`);
    }
  });
}

// ==================== Seed Products from data.js ====================
function seedProducts() {
  const db = getDb();

  // Initial seed: only if no products exist
  if (db.prepare('SELECT COUNT(*) as c FROM products').get().c === 0) {
    const products = [
    { id: 'ts-001', name: 'Classic Round Neck T-Shirt', category: 'tshirt', price: 349, originalPrice: 599, colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'White', hex: '#f5f5f5' }, { name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Maroon', hex: '#6b1d1d' }], sizes: ['S', 'M', 'L', 'XL'], rating: 4.5, reviewCount: 128, description: 'Premium 100% combed cotton round neck t-shirt with bio-washed fabric for extra softness. Perfect for everyday casual wear.', material: '100% Combed Cotton, 180 GSM, Bio-Washed', fit: 'Regular Fit', washCare: 'Machine wash cold, Do not bleach, Tumble dry low', inStock: true, badge: 'Bestseller', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'ts-002', name: 'Premium Polo T-Shirt', category: 'tshirt', price: 449, originalPrice: 799, colors: [{ name: 'Royal Blue', hex: '#2b4ea0' }, { name: 'Black', hex: '#1a1a1a' }, { name: 'White', hex: '#f5f5f5' }, { name: 'Olive Green', hex: '#4a5d23' }], sizes: ['M', 'L', 'XL', 'XXL'], rating: 4.3, reviewCount: 87, description: 'Stylish collar polo t-shirt with ribbed collar and cuffs. Ideal for semi-formal and casual occasions.', material: 'Cotton Pique, 220 GSM', fit: 'Slim Fit', washCare: 'Machine wash cold, Iron medium heat', inStock: true, badge: 'New', gradient: 'linear-gradient(135deg, #2b4ea0 0%, #667eea 100%)' },
    { id: 'ts-003', name: 'Printed Graphic T-Shirt', category: 'tshirt', price: 399, originalPrice: 699, colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Charcoal', hex: '#36454f' }, { name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'White', hex: '#f5f5f5' }], sizes: ['S', 'M', 'L', 'XL'], rating: 4.7, reviewCount: 203, description: 'Eye-catching graphic print t-shirt with HD quality printing that lasts 100+ washes. Urban street style design.', material: '100% Cotton, 160 GSM, Screen Printed', fit: 'Regular Fit', washCare: 'Turn inside out before washing, Machine wash cold', inStock: true, badge: 'Trending', gradient: 'linear-gradient(135deg, #36454f 0%, #1a1a1a 100%)' },
    { id: 'ts-004', name: 'V-Neck Premium T-Shirt', category: 'tshirt', price: 379, originalPrice: 649, colors: [{ name: 'Burgundy', hex: '#722f37' }, { name: 'Steel Gray', hex: '#71797e' }, { name: 'Black', hex: '#1a1a1a' }, { name: 'Navy Blue', hex: '#1e3a5f' }], sizes: ['S', 'M', 'L', 'XL'], rating: 4.2, reviewCount: 64, description: 'Elegant V-neck t-shirt crafted from premium cotton blend. Comfortable and stylish for any occasion.', material: 'Cotton-Lycra Blend, 190 GSM', fit: 'Slim Fit', washCare: 'Gentle machine wash, Hang dry', inStock: true, badge: '', gradient: 'linear-gradient(135deg, #722f37 0%, #a04050 100%)' },
    { id: 'lw-001', name: 'Classic Track Pants', category: 'lower', price: 449, originalPrice: 799, colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Charcoal', hex: '#36454f' }, { name: 'Olive Green', hex: '#4a5d23' }], sizes: ['M', 'L', 'XL', 'XXL'], rating: 4.4, reviewCount: 156, description: 'Comfortable track pants with elastic waist and side pockets. Perfect for workouts, jogging, and lounging.', material: '100% Polyester, Moisture-Wicking', fit: 'Regular Fit', washCare: 'Machine wash cold, Do not iron on print', inStock: true, badge: 'Bestseller', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    { id: 'lw-002', name: 'Premium Joggers', category: 'lower', price: 549, originalPrice: 999, colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Steel Gray', hex: '#71797e' }, { name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Olive Green', hex: '#4a5d23' }], sizes: ['S', 'M', 'L', 'XL'], rating: 4.6, reviewCount: 198, description: 'Premium jogger pants with ribbed cuffs and drawstring waist. Ultra-soft fleece interior for maximum comfort.', material: 'Cotton-Polyester Blend, French Terry, 300 GSM', fit: 'Slim Fit', washCare: 'Machine wash warm, Tumble dry low', inStock: true, badge: 'Popular', gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)' },
    { id: 'lw-003', name: 'Cotton Pajama Pants', category: 'lower', price: 349, originalPrice: 599, colors: [{ name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Black', hex: '#1a1a1a' }, { name: 'Charcoal', hex: '#36454f' }, { name: 'Maroon', hex: '#6b1d1d' }], sizes: ['M', 'L', 'XL', 'XXL'], rating: 4.1, reviewCount: 92, description: 'Soft cotton pajama pants ideal for daily wear and sleeping. Breathable fabric for all-day comfort.', material: '100% Cotton, Brushed Interior', fit: 'Relaxed Fit', washCare: 'Machine wash cold, Line dry', inStock: true, badge: '', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #3d7cc9 100%)' },
    { id: 'lw-004', name: 'Sporty Dry-Fit Lowers', category: 'lower', price: 499, originalPrice: 899, colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Royal Blue', hex: '#2b4ea0' }, { name: 'Charcoal', hex: '#36454f' }, { name: 'Forest Green', hex: '#228b22' }], sizes: ['S', 'M', 'L', 'XL'], rating: 4.5, reviewCount: 134, description: 'High-performance dry-fit track pants with 4-way stretch. Designed for intense workouts and sports activities.', material: 'Polyester-Spandex, Dry-Fit Technology', fit: 'Athletic Fit', washCare: 'Machine wash cold, Do not use fabric softener', inStock: true, badge: 'New', gradient: 'linear-gradient(135deg, #1a1a1a 0%, #2b4ea0 100%)' },
    { id: 'hp-001', name: 'Casual Cotton Shorts', category: 'halfpant', price: 299, originalPrice: 499, colors: [{ name: 'Olive Green', hex: '#4a5d23' }, { name: 'Black', hex: '#1a1a1a' }, { name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Charcoal', hex: '#36454f' }], sizes: ['M', 'L', 'XL', 'XXL'], rating: 4.3, reviewCount: 76, description: 'Comfortable cotton shorts with elasticated waistband and deep pockets. Great for summer and casual outings.', material: '100% Cotton Twill', fit: 'Regular Fit', washCare: 'Machine wash cold', inStock: true, badge: '', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'hp-002', name: 'Athletic Sports Shorts', category: 'halfpant', price: 349, originalPrice: 599, colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Royal Blue', hex: '#2b4ea0' }, { name: 'Charcoal', hex: '#36454f' }, { name: 'Navy Blue', hex: '#1e3a5f' }], sizes: ['S', 'M', 'L', 'XL'], rating: 4.5, reviewCount: 112, description: 'Lightweight athletic shorts with mesh lining and quick-dry fabric. Perfect for gym, running, and sports.', material: 'Polyester Mesh, Quick-Dry', fit: 'Athletic Fit', washCare: 'Machine wash cold, Hang dry', inStock: true, badge: 'Popular', gradient: 'linear-gradient(135deg, #e91e63 0%, #f06292 100%)' },
    { id: 'hp-003', name: 'Bermuda Cargo Shorts', category: 'halfpant', price: 449, originalPrice: 749, colors: [{ name: 'Olive Green', hex: '#4a5d23' }, { name: 'Charcoal', hex: '#36454f' }, { name: 'Black', hex: '#1a1a1a' }, { name: 'Navy Blue', hex: '#1e3a5f' }], sizes: ['M', 'L', 'XL', 'XXL'], rating: 4.4, reviewCount: 89, description: 'Rugged cargo shorts with multiple pockets and durable stitching. Ideal for outdoor adventures and casual wear.', material: 'Cotton Canvas, Heavy Duty', fit: 'Relaxed Fit', washCare: 'Machine wash warm', inStock: true, badge: '', gradient: 'linear-gradient(135deg, #4a5d23 0%, #7cb342 100%)' },
    { id: 'hp-004', name: 'Denim Look Shorts', category: 'halfpant', price: 399, originalPrice: 699, colors: [{ name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Black', hex: '#1a1a1a' }, { name: 'Steel Gray', hex: '#71797e' }, { name: 'Charcoal', hex: '#36454f' }], sizes: ['S', 'M', 'L', 'XL'], rating: 4.2, reviewCount: 67, description: 'Trendy denim-look shorts with stretch comfort. Classic 5-pocket styling meets modern comfort.', material: 'Cotton-Spandex Denim, Stretch', fit: 'Slim Fit', washCare: 'Machine wash cold, Inside out', inStock: true, badge: 'New', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #5b8cc9 100%)' },
    { id: 'jk-001', name: 'Classic Bomber Jacket', category: 'jacket', price: 999, originalPrice: 1799, colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Olive Green', hex: '#4a5d23' }, { name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Maroon', hex: '#6b1d1d' }], sizes: ['M', 'L', 'XL', 'XXL'], rating: 4.7, reviewCount: 234, description: 'Premium bomber jacket with satin finish exterior and quilted lining. Ribbed collar, cuffs, and hem for a classic look.', material: 'Polyester Satin, Quilted Interior', fit: 'Regular Fit', washCare: 'Dry clean only', inStock: true, badge: 'Bestseller', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: 'jk-002', name: 'Denim Trucker Jacket', category: 'jacket', price: 1199, originalPrice: 1999, colors: [{ name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Black', hex: '#1a1a1a' }, { name: 'Steel Gray', hex: '#71797e' }, { name: 'Charcoal', hex: '#36454f' }], sizes: ['S', 'M', 'L', 'XL'], rating: 4.5, reviewCount: 167, description: 'Classic denim trucker jacket with chest pockets and button closure. Timeless style for all seasons.', material: 'Denim, 12 oz Weight', fit: 'Regular Fit', washCare: 'Machine wash cold, Hang dry', inStock: true, badge: '', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #4facfe 100%)' },
    { id: 'jk-003', name: 'Windbreaker Sport Jacket', category: 'jacket', price: 899, originalPrice: 1499, colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Royal Blue', hex: '#2b4ea0' }, { name: 'Forest Green', hex: '#228b22' }, { name: 'Charcoal', hex: '#36454f' }], sizes: ['M', 'L', 'XL', 'XXL'], rating: 4.4, reviewCount: 143, description: 'Lightweight windbreaker jacket with water-resistant coating. Perfect for running, hiking, and windy conditions.', material: 'Nylon, Water-Resistant Coating', fit: 'Athletic Fit', washCare: 'Machine wash cold, Do not tumble dry', inStock: true, badge: 'New', gradient: 'linear-gradient(135deg, #2b4ea0 0%, #00f2fe 100%)' },
    { id: 'jk-004', name: 'Quilted Winter Jacket', category: 'jacket', price: 1399, originalPrice: 2499, colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Olive Green', hex: '#4a5d23' }, { name: 'Burgundy', hex: '#722f37' }], sizes: ['M', 'L', 'XL', 'XXL'], rating: 4.8, reviewCount: 289, description: 'Heavy-duty quilted winter jacket with synthetic insulation. Keeps you warm in extreme cold with a stylish silhouette.', material: 'Polyester Shell, Synthetic Insulation', fit: 'Regular Fit', washCare: 'Dry clean recommended', inStock: true, badge: 'Premium', gradient: 'linear-gradient(135deg, #1a1a1a 0%, #4a5d23 100%)' },
    { id: 'hd-001', name: 'Classic Pullover Hoodie', category: 'hoodie', price: 699, originalPrice: 1199, colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Charcoal', hex: '#36454f' }, { name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Maroon', hex: '#6b1d1d' }], sizes: ['S', 'M', 'L', 'XL'], rating: 4.6, reviewCount: 312, description: 'Cozy pullover hoodie with kangaroo pocket and drawstring hood. Made from premium French terry for ultimate comfort.', material: 'Cotton-Polyester French Terry, 350 GSM', fit: 'Relaxed Fit', washCare: 'Machine wash cold, Tumble dry low', inStock: true, badge: 'Bestseller', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
    { id: 'hd-002', name: 'Zip-Up Sport Hoodie', category: 'hoodie', price: 799, originalPrice: 1399, colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Steel Gray', hex: '#71797e' }, { name: 'Royal Blue', hex: '#2b4ea0' }, { name: 'Olive Green', hex: '#4a5d23' }], sizes: ['M', 'L', 'XL', 'XXL'], rating: 4.4, reviewCount: 178, description: 'Full zip hoodie with side pockets and ribbed trim. Versatile layering piece for sports and casual wear.', material: 'Polyester-Cotton Blend, Fleece Interior', fit: 'Regular Fit', washCare: 'Machine wash cold', inStock: true, badge: '', gradient: 'linear-gradient(135deg, #71797e 0%, #a18cd1 100%)' },
    { id: 'hd-003', name: 'Oversized Street Hoodie', category: 'hoodie', price: 899, originalPrice: 1499, colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'White', hex: '#f5f5f5' }, { name: 'Charcoal', hex: '#36454f' }, { name: 'Mustard', hex: '#c8982e' }], sizes: ['M', 'L', 'XL', 'XXL'], rating: 4.7, reviewCount: 245, description: 'Trendy oversized hoodie with drop shoulders and urban street style. Heavy-weight fabric for a premium feel.', material: '100% Cotton, 400 GSM, Pre-Shrunk', fit: 'Oversized', washCare: 'Machine wash cold, Hang dry', inStock: true, badge: 'Trending', gradient: 'linear-gradient(135deg, #1a1a1a 0%, #c8982e 100%)' },
    { id: 'hd-004', name: 'Printed Logo Hoodie', category: 'hoodie', price: 749, originalPrice: 1299, colors: [{ name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Black', hex: '#1a1a1a' }, { name: 'Burgundy', hex: '#722f37' }, { name: 'Forest Green', hex: '#228b22' }], sizes: ['S', 'M', 'L', 'XL'], rating: 4.3, reviewCount: 134, description: 'Stylish hoodie with bold chest logo print and premium finish. Perfect for layering in all seasons.', material: 'Cotton-Poly Fleece, 320 GSM', fit: 'Regular Fit', washCare: 'Turn inside out, Machine wash cold', inStock: true, badge: 'New', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #722f37 100%)' },
    { id: 'kt-001', name: 'Classic Cotton Kurta', category: 'kurta', price: 549, originalPrice: 899, colors: [{ name: 'White', hex: '#f5f5f5' }, { name: 'Mustard', hex: '#c8982e' }, { name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Maroon', hex: '#6b1d1d' }], sizes: ['S', 'M', 'L', 'XL'], rating: 4.5, reviewCount: 189, description: 'Traditional cotton kurta with mandarin collar and side slits. Perfect for festivals, pujas, and daily ethnic wear.', material: '100% Cotton, Handloom Finish', fit: 'Regular Fit', washCare: 'Hand wash or gentle machine wash', inStock: true, badge: 'Bestseller', gradient: 'linear-gradient(135deg, #c8982e 0%, #f5d799 100%)' },
    { id: 'kt-002', name: 'Embroidered Festive Kurta', category: 'kurta', price: 799, originalPrice: 1399, colors: [{ name: 'Mustard', hex: '#c8982e' }, { name: 'Maroon', hex: '#6b1d1d' }, { name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Black', hex: '#1a1a1a' }], sizes: ['M', 'L', 'XL', 'XXL'], rating: 4.7, reviewCount: 234, description: 'Exquisite embroidered kurta with intricate threadwork on collar and placket. Elevate your festive look.', material: 'Cotton Silk Blend, Embroidered', fit: 'Regular Fit', washCare: 'Dry clean only', inStock: true, badge: 'Premium', gradient: 'linear-gradient(135deg, #6b1d1d 0%, #c8982e 100%)' },
    { id: 'kt-003', name: 'Linen Casual Kurta', category: 'kurta', price: 649, originalPrice: 1099, colors: [{ name: 'White', hex: '#f5f5f5' }, { name: 'Olive Green', hex: '#4a5d23' }, { name: 'Steel Gray', hex: '#71797e' }, { name: 'Navy Blue', hex: '#1e3a5f' }], sizes: ['S', 'M', 'L', 'XL'], rating: 4.4, reviewCount: 112, description: 'Lightweight linen kurta for summer comfort. Breathable fabric with minimal design for a clean, modern look.', material: 'Pure Linen, Pre-Washed', fit: 'Relaxed Fit', washCare: 'Hand wash, Hang dry, Iron medium', inStock: true, badge: '', gradient: 'linear-gradient(135deg, #4a5d23 0%, #f5d799 100%)' },
    { id: 'kt-004', name: 'Printed Ethnic Kurta', category: 'kurta', price: 599, originalPrice: 999, colors: [{ name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Black', hex: '#1a1a1a' }, { name: 'Maroon', hex: '#6b1d1d' }, { name: 'Mustard', hex: '#c8982e' }], sizes: ['M', 'L', 'XL', 'XXL'], rating: 4.3, reviewCount: 97, description: 'Block-printed ethnic kurta with traditional Madhubani-inspired patterns. Celebrate Indian artistry.', material: '100% Cotton, Block Printed', fit: 'Regular Fit', washCare: 'Hand wash cold, Dry in shade', inStock: true, badge: 'Exclusive', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #c8982e 100%)' },
    { id: 'sw-001', name: 'Classic Wool Sweater', category: 'sweater', price: 599, originalPrice: 999, colors: [{ name: 'Maroon', hex: '#6b1d1d' }, { name: 'Navy Blue', hex: '#1e3a5f' }, { name: 'Charcoal', hex: '#36454f' }, { name: 'Forest Green', hex: '#228b22' }], sizes: ['S', 'M', 'L', 'XL'], rating: 4.5, reviewCount: 96, description: 'Premium wool blend sweater with ribbed cuffs and hem. Keeps you warm and stylish during winter months.', material: 'Wool-Acrylic Blend, 400 GSM', fit: 'Regular Fit', washCare: 'Hand wash cold, Lay flat to dry', inStock: true, badge: 'Bestseller', gradient: 'linear-gradient(135deg, #e17055 0%, #d63031 100%)' },
    { id: 'sw-002', name: 'Cable Knit Pullover', category: 'sweater', price: 749, originalPrice: 1299, colors: [{ name: 'Cream', hex: '#f5e6d3' }, { name: 'Black', hex: '#1a1a1a' }, { name: 'Burgundy', hex: '#722f37' }, { name: 'Olive Green', hex: '#4a5d23' }], sizes: ['M', 'L', 'XL', 'XXL'], rating: 4.3, reviewCount: 67, description: 'Classic cable knit sweater with turtle neck design. Perfect for formal and casual winter wear.', material: 'Cotton-Acrylic Blend, Cable Knit', fit: 'Regular Fit', washCare: 'Machine wash gentle, Do not tumble dry', inStock: true, badge: 'New', gradient: 'linear-gradient(135deg, #f5e6d3 0%, #d4a017 100%)' },
  ];

  const stmt = db.prepare(`
    INSERT INTO products (id, name, category, price, original_price, colors, sizes, rating, review_count, description, material, fit, wash_care, in_stock, badge, gradient)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  products.forEach(p => {
    stmt.run(p.id, p.name, p.category, p.price, p.originalPrice, JSON.stringify(p.colors), JSON.stringify(p.sizes), p.rating, p.reviewCount, p.description, p.material, p.fit, p.washCare, p.inStock ? 1 : 0, p.badge, p.gradient);
  });

  console.log(`✅ ${products.length} products seeded from data.js`);
  }
}

// ==================== Initialize Database ====================
function initDatabase() {
  createTables();
  
  // Migration: Add is_bulk to products if it doesn't exist
  const db = getDb();
  try {
    db.prepare('ALTER TABLE products ADD COLUMN is_bulk INTEGER DEFAULT 0').run();
  } catch (e) { /* already exists */ }
  
  seedAdmin();
  seedCategories();
  seedProducts();
  console.log('✅ Database initialized successfully');
}

module.exports = { getDb, initDatabase };
