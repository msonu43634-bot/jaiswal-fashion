/* ======================================================
   JAISWAL FASHION — Admin Panel JavaScript
   Dashboard, CRUD, Image Upload, Modals
   ====================================================== */

// Use relative API path (works in both dev and production)
const API = '/api';
let currentPage = 'dashboard';
let productsData = [];
let ordersData = [];
let contactsData = [];
let paymentsData = [];
let bulkOrdersData = [];
let editColors = [];
let editSizes = [];

// CSRF token loaded after login
window.csrfToken = '';
async function loadCsrfToken() {
  try {
    const res = await fetch(`${API}/admin/csrf-token`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      window.csrfToken = data.token;
    }
  } catch {}
}

// Helper to include CSRF header in state-changing requests
function csrfHeaders(extra = {}) {
  return window.csrfToken ? { ...extra, 'X-Admin-Token': window.csrfToken } : extra;
}

// Wrapper fetch that auto-retries on CSRF token expiry
async function apiFetch(url, options = {}) {
  const opts = { credentials: 'include', ...options };
  opts.headers = { ...csrfHeaders(), ...opts.headers };
  const res = await fetch(url, opts);
  if (res.status === 403) {
    try {
      const data = await res.clone().json();
      if (data.newToken) {
        window.csrfToken = data.newToken;
        opts.headers = { ...opts.headers, 'X-Admin-Token': data.newToken };
        return fetch(url, opts);
      }
    } catch (e) {}
  }
  return res;
}

// DOMPurify loaded — sanitizes HTML to prevent XSS
// Keeps inline event handlers needed by admin panel (onclick, onchange, etc.)
// while stripping malicious content from user-supplied data
window.safeHTML = function(str) {
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(str, {
      ADD_ATTR: ['onclick', 'onchange', 'oninput', 'onmouseover', 'onmouseout', 'onsubmit']
    });
  }
  // Fallback: basic entity encoding to prevent XSS when CDN is unavailable
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
};

// ==================== AUTH ====================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const loginBtn = document.getElementById('loginBtn');
  
  const originalText = loginBtn.innerHTML;
  loginBtn.innerHTML = '⏳ Sending OTP...';
  loginBtn.disabled = true;

  try {
    const res = await fetch(`${API}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    
    loginBtn.innerHTML = originalText;
    loginBtn.disabled = false;

    if (res.ok && data.success && data.otpRequired) {
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('otpForm').style.display = 'block';
      document.getElementById('loginError').style.display = 'none';
    } else if (res.ok && data.success) {
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('adminLayout').style.display = 'flex';
      document.getElementById('adminName').textContent = data.admin.name;
      loadPage('dashboard');
    } else {
      document.getElementById('loginError').style.display = 'block';
      document.getElementById('loginError').textContent = data.error || 'Login failed';
      if (data.emailFailed) {
        alert(data.error || 'The email address you entered is invalid. Please check your email address and try again.');
      }
    }
  } catch (err) {
    loginBtn.innerHTML = originalText;
    loginBtn.disabled = false;
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('loginError').textContent = 'Server not reachable';
  }
});

document.getElementById('otpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const otp = document.getElementById('loginOtp').value;

  try {
    const res = await fetch(`${API}/admin/verify-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, otp })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('adminLayout').style.display = 'flex';
      document.getElementById('adminName').textContent = data.admin.name;
      loadCsrfToken(); // Load CSRF token for state-changing requests
      loadPage('dashboard');
      
      // Reset form
      document.getElementById('loginForm').reset();
      document.getElementById('otpForm').reset();
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('otpForm').style.display = 'none';
    } else {
      document.getElementById('loginError').style.display = 'block';
      document.getElementById('loginError').textContent = data.error || 'Invalid OTP';
    }
  } catch (err) {
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('loginError').textContent = 'Server not reachable';
  }
});

// Check session
async function checkSession() {
  try {
    const res = await fetch(`${API}/admin/me`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('adminLayout').style.display = 'flex';
      document.getElementById('adminName').textContent = data.admin.name;
      await loadCsrfToken();
      loadPage('dashboard');
    }
  } catch {}
}
checkSession();

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch(`${API}/admin/logout`, { method: 'POST', credentials: 'include' });
  location.reload();
});

// ==================== NAVIGATION ====================
document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    loadPage(link.dataset.page);
    closeSidebar();
  });
});

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
}

document.getElementById('menuBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
document.getElementById('sidebarCloseBtn').addEventListener('click', closeSidebar);

function loadPage(page) {
  currentPage = page;
  const titles = { dashboard: 'Dashboard', products: 'Products', 'buluk-products': 'Bulk Products only product control section', orders: 'Orders', payments: 'Payments', contacts: 'Contacts', 'bulk-orders': 'Bulk Enquiry', 'buluk-orders': 'Bulk Orders', customers: 'Customers', testimonials: 'Testimonials' };
  document.getElementById('pageTitle').innerHTML = titles[page] || page;

  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'products': loadProducts(); break;
    case 'buluk-products': loadBulukProducts(); break;
    case 'orders': loadOrders(); break;
    case 'payments': loadPayments(); break;
    case 'contacts': loadContacts(); break;
    case 'bulk-orders': loadBulkOrders(); break;
    case 'buluk-orders': loadBulukOrders(); break;
    case 'customers': loadCustomers(); break;
    case 'testimonials': loadTestimonials(); break;
    case 'settings': loadSettings(); break;
  }
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>Loading...</p></div>';

  try {
    const res = await fetch(`${API}/admin/dashboard`, { credentials: 'include' });
    const data = await res.json();

    // Update badges
    if (data.pendingOrders > 0) {
      document.getElementById('ordersBadge').style.display = 'inline';
      document.getElementById('ordersBadge').textContent = data.pendingOrders;
    }
    if (data.totalContacts > 0) {
      document.getElementById('contactsBadge').style.display = 'inline';
      document.getElementById('contactsBadge').textContent = data.totalContacts;
    }
    if (data.pendingBulkOrders > 0) {
      document.getElementById('bulkOrdersBadge').style.display = 'inline';
      document.getElementById('bulkOrdersBadge').textContent = data.pendingBulkOrders;
    }

    content.innerHTML = safeHTML(`
      <div class="stats-grid animate-in">
        <div class="stat-card gold">
          <div class="stat-icon">💰</div>
          <div class="stat-value">₹${Number(data.totalRevenue).toLocaleString('en-IN')}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
        <div class="stat-card info">
          <div class="stat-icon">📦</div>
          <div class="stat-value">${data.totalOrders}</div>
          <div class="stat-label">Total Orders</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon">⏳</div>
          <div class="stat-value">${data.pendingOrders}</div>
          <div class="stat-label">Pending Orders</div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon">👕</div>
          <div class="stat-value">${data.totalProducts}</div>
          <div class="stat-label">Total Products</div>
        </div>
        <div class="stat-card danger">
          <div class="stat-icon">📩</div>
          <div class="stat-value">${data.totalContacts}</div>
          <div class="stat-label">New Messages</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="data-card animate-in">
          <div class="data-card-header">
            <span class="data-card-title">📦 Recent Orders</span>
          </div>
          ${data.recentOrders.length ? `
          <table class="data-table">
            <thead><tr><th>ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              ${data.recentOrders.map(o => `
                <tr>
                  <td>#${o.id}</td>
                  <td>${o.customer_name}</td>
                  <td>₹${Number(o.total_amount).toLocaleString('en-IN')}</td>
                  <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>` : '<div class="empty-state"><p>No orders yet</p></div>'}
        </div>

        <div class="data-card animate-in">
          <div class="data-card-header">
            <span class="data-card-title">📩 Recent Messages</span>
          </div>
          ${data.recentContacts.length ? `
          <table class="data-table">
            <thead><tr><th>Name</th><th>Subject</th><th>Status</th></tr></thead>
            <tbody>
              ${data.recentContacts.map(c => `
                <tr>
                  <td>${c.name}</td>
                  <td>${c.subject}</td>
                  <td><span class="status-badge status-${c.status}">${c.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>` : '<div class="empty-state"><p>No messages yet</p></div>'}
        </div>
      </div>
    `);
  } catch (err) {
    content.innerHTML = safeHTML('<div class="empty-state"><div class="empty-state-icon">❌</div><p>Error loading dashboard</p></div>');
  }
}

// ==================== CUSTOMERS ====================
async function loadCustomers() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state">Loading customers...</div>';

  try {
    const res = await fetch(`${API}/admin/customers`, { credentials: 'include' });
    const customers = await res.json();

    content.innerHTML = safeHTML(`
      <div class="card">
        <h2 style="margin-bottom: var(--sp-4);">Registered Customers</h2>
        <div style="overflow-x: auto;">
          <table class="table" style="min-width: 800px;">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Phone / Email</th>
                <th>City / Pincode</th>
                <th>Total Orders</th>
                <th>Total Spent</th>
                <th>Joined On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${customers.length === 0 ? '<tr><td colspan="7" style="text-align:center;">No customers found</td></tr>' : ''}
              ${customers.map(c => `
                <tr style="cursor:pointer;" onclick="viewCustomer(${c.id})">
                  <td>#${c.id}</td>
                  <td style="font-weight: 500;">${c.name}</td>
                  <td>${c.phone}<br><span style="color:var(--text-muted); font-size:12px;">${c.email || 'No email'}</span></td>
                  <td>${c.city || '-'} / ${c.pincode || '-'}</td>
                  <td><span class="badge" style="background:#dbeafe; color:#2563eb;">${c.orderCount}</span></td>
                  <td style="color: var(--gold-dark); font-weight:600;">₹${c.totalSpent.toLocaleString()}</td>
                  <td>${new Date(c.created_at).toLocaleDateString()}</td>
                  <td onclick="event.stopPropagation()">
                    <button class="btn-icon" style="color: #ef4444; padding:4px;" onclick="deleteCustomer(${c.id})" title="Delete Customer">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `);
  } catch (err) {
    content.innerHTML = safeHTML('<div class="empty-state" style="color:red;">Failed to load customers</div>');
  }
}

async function deleteCustomer(id) {
  if (!confirm('Are you sure you want to delete this customer account? This cannot be undone.')) return;
  try {
    const res = await apiFetch(`${API}/admin/customers/${id}`, { method: 'DELETE' });
    if (res.ok) loadCustomers();
    else alert('Failed to delete customer');
  } catch (err) { alert('Error deleting customer'); }
}

async function viewCustomer(id) {
  try {
    const res = await fetch(`${API}/admin/customers/${id}`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) return alert('Failed to load customer');
    
    const { customer, orders, favorites } = data;
    
    let html = `
      <div style="display:flex; gap:20px; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:15px;">
        <div style="width:60px; height:60px; border-radius:50%; background:var(--gold); color:#0a0a0f; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:bold;">
          ${customer.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style="margin:0;">${customer.name}</h2>
          <div style="color:var(--text-muted); font-size:14px;">${customer.phone} • ${customer.email || 'No email'}</div>
          <div style="color:var(--text-muted); font-size:14px; margin-top:4px;">📍 ${customer.address || '-'}, ${customer.city || ''} - ${customer.pincode || ''}</div>
        </div>
      </div>
      
      <div class="grid-2" style="gap:20px;">
        <!-- Orders -->
        <div class="card" style="box-shadow:none; border:1px solid var(--border); background:var(--bg-card); margin:0; padding:16px; border-radius:var(--radius-lg);">
          <h3 style="margin-bottom:12px; font-size:16px;">Orders History (${orders.length})</h3>
          <div style="max-height:300px; overflow-y:auto; padding-right:10px;">
            ${orders.length === 0 ? '<p style="color:var(--text-muted); font-size:13px;">No orders yet.</p>' : orders.map(o => `
              <div style="border:1px solid var(--border); background:var(--bg-input); border-radius:8px; padding:10px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                  <span style="font-weight:600; font-size:14px; color:var(--text-primary);">Order #${o.id}</span>
                  <span style="font-size:12px; color:var(--text-muted);">${new Date(o.created_at).toLocaleDateString()}</span>
                </div>
                <div style="font-size:13px; margin-bottom:8px;">Amount: <span style="font-weight:600; color:var(--gold);">₹${o.total_amount}</span> <span style="padding:2px 8px; border-radius:10px; background:var(--bg-glass); color:var(--text-secondary); font-size:11px;">${o.status}</span></div>
                <div style="font-size:12px; color:var(--text-muted);">
                  ${o.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Favorites -->
        <div class="card" style="box-shadow:none; border:1px solid var(--border); background:var(--bg-card); margin:0; padding:16px; border-radius:var(--radius-lg);">
          <h3 style="margin-bottom:12px; font-size:16px;">Favorites / Wishlist ❤️ (${favorites.length})</h3>
          <div style="max-height:300px; overflow-y:auto; padding-right:10px;">
            ${favorites.length === 0 ? '<p style="color:var(--text-muted); font-size:13px;">No favorites saved.</p>' : favorites.map(f => `
              <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border); background:var(--bg-input); border-radius:8px; padding:10px; margin-bottom:10px;">
                <div>
                  <div style="font-weight:500; font-size:14px; color:var(--text-primary);">${f.product_name}</div>
                  <div style="font-size:12px; color:var(--text-muted);">${f.category}</div>
                </div>
                <div style="font-weight:600; color:var(--gold);">₹${f.price}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('customerDetailContent').innerHTML = safeHTML(html);
    document.getElementById('customerModal').classList.add('active');
  } catch (err) {
    alert('Error loading customer details');
  }
}

// ==================== PRODUCTS ====================
async function loadProducts() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>Loading products...</p></div>';

  try {
    const res = await fetch(`${API}/products`, { credentials: 'include' });
    productsData = await res.json();

    const catNames = { tshirt: 'T-Shirt', lower: 'Lower', halfpant: 'Half Pant', jacket: 'Jacket', hoodie: 'Hoodie', kurta: 'Kurta', buluk: 'Bulk Order Only', sweater: 'Sweater' };

    content.innerHTML = safeHTML(`
      <div class="data-card animate-in">
        <div class="data-card-header">
          <span class="data-card-title">All Products (${productsData.length})</span>
          <div style="display:flex; gap:12px;">
            <div class="search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search products..." id="productSearch" oninput="filterProducts()">
            </div>
            <button class="btn btn-primary" onclick="openAddProduct()">+ Add Product</button>
          </div>
        </div>
        <div style="overflow-x:auto;">
        <table class="data-table" id="productsTable">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Colors</th>
              <th>Sizes</th>
              <th>Images</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${productsData.map(p => `
              <tr data-id="${p.id}" data-name="${p.name.toLowerCase()}">
                <td>
                  <div class="product-cell">
                    <div class="product-thumb" style="background:${p.gradient || '#333'}">
                      ${getCatEmoji(p.category)}
                    </div>
                    <div>
                      <div class="product-cell-name">${p.name}</div>
                      <div class="product-cell-id">${p.id} ${p.badge ? `· <span style="color:var(--gold)">${p.badge}</span>` : ''}</div>
                    </div>
                  </div>
                </td>
                <td>${catNames[p.category] || p.category}</td>
                <td>
                  <div style="font-weight:700;">₹${p.price}</div>
                  <div style="font-size:12px;color:var(--text-muted);text-decoration:line-through;">₹${p.originalPrice}</div>
                </td>
                <td>
                  <div style="display:flex;gap:4px;">
                    ${(p.colors || []).map(c => `<span class="color-swatch" style="background:${c.hex};width:20px;height:20px;border-radius:4px;display:inline-block;" title="${c.name}"></span>`).join('')}
                  </div>
                </td>
                <td><span style="font-size:13px;">${(p.sizes || []).join(', ')}</span></td>
                <td><span style="font-size:13px; color:${p.images && p.images.length ? 'var(--success)' : 'var(--text-muted)'};">${p.images ? p.images.length : 0}/4 📷</span></td>
                <td><span class="status-badge ${p.inStock ? 'status-completed' : 'status-cancelled'}">${p.inStock ? 'In Stock' : 'Out'}</span></td>
                <td>
                  <div style="display:flex;gap:6px;">
                    <button class="btn-icon" title="Edit" onclick="openEditProduct('${p.id}')">✏️</button>
                    <button class="btn-icon" title="Delete" onclick="deleteProduct('${p.id}', '${encodeURIComponent(p.name)}')">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>
      </div>
    `);
  } catch (err) {
    content.innerHTML = safeHTML('<div class="empty-state"><div class="empty-state-icon">❌</div><p>Error loading products</p></div>');
  }
}

function getCatEmoji(cat) {
  return { tshirt: '👕', lower: '👖', halfpant: '🩳', jacket: '🧥', hoodie: '🔶', kurta: '👘', buluk: '🧶', sweater: '🧶' }[cat] || '👕';
}

function filterProducts() {
  const q = document.getElementById('productSearch').value.toLowerCase();
  document.querySelectorAll('#productsTable tbody tr').forEach(row => {
    row.style.display = row.dataset.name.includes(q) ? '' : 'none';
  });
}

// ==================== BULUK PRODUCTS ====================
async function loadBulukProducts() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>Loading bulk products...</p></div>';

  try {
    const res = await fetch(`${API}/products`, { credentials: 'include' });
    const allProducts = await res.json();
    productsData = allProducts.filter(p => p.category === 'buluk');

    const catNames = { tshirt: 'T-Shirt', lower: 'Lower', halfpant: 'Half Pant', jacket: 'Jacket', hoodie: 'Hoodie', kurta: 'Kurta', buluk: 'Bulk Order Only', sweater: 'Sweater' };

    content.innerHTML = safeHTML(`
      <div class="data-card animate-in">
        <div class="data-card-header">
          <span class="data-card-title">Bulk Products (${productsData.length})</span>
          <div style="display:flex; gap:12px;">
            <div class="search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search bulk products..." id="productSearch" oninput="filterProducts()">
            </div>
            <button class="btn btn-primary" onclick="openAddBulukProduct()">+ Add Bulk Product</button>
          </div>
        </div>
        <div style="overflow-x:auto;">
        <table class="data-table" id="productsTable">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Colors</th>
              <th>Sizes</th>
              <th>Images</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${productsData.map(p => `
              <tr data-id="${p.id}" data-name="${p.name.toLowerCase()}">
                <td>
                  <div class="product-cell">
                    <div class="product-thumb" style="background:${p.gradient || '#333'}">
                      ${getCatEmoji(p.category)}
                    </div>
                    <div>
                      <div class="product-cell-name">${p.name}</div>
                      <div class="product-cell-id">${p.id} ${p.badge ? `· <span style="color:var(--gold)">${p.badge}</span>` : ''}</div>
                    </div>
                  </div>
                </td>
                <td>${catNames[p.category] || p.category}</td>
                <td>
                  <div style="font-weight:700;">₹${p.price}</div>
                  <div style="font-size:12px;color:var(--text-muted);text-decoration:line-through;">₹${p.originalPrice}</div>
                </td>
                <td>
                  <div style="display:flex;gap:4px;">
                    ${(p.colors || []).map(c => `<span class="color-swatch" style="background:${c.hex};width:20px;height:20px;border-radius:4px;display:inline-block;" title="${c.name}"></span>`).join('')}
                  </div>
                </td>
                <td><span style="font-size:13px;">${(p.sizes || []).join(', ')}</span></td>
                <td><span style="font-size:13px; color:${p.images && p.images.length ? 'var(--success)' : 'var(--text-muted)'};">${p.images ? p.images.length : 0}/4 📷</span></td>
                <td><span class="status-badge ${p.inStock ? 'status-completed' : 'status-cancelled'}">${p.inStock ? 'In Stock' : 'Out'}</span></td>
                <td>
                  <div style="display:flex;gap:6px;">
                    <button class="btn-icon" title="Edit" onclick="openEditProduct('${p.id}')">✏️</button>
                    <button class="btn-icon" title="Delete" onclick="deleteProduct('${p.id}', '${encodeURIComponent(p.name)}')">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>
      </div>
    `);
  } catch (err) {
    content.innerHTML = safeHTML('<div class="empty-state"><div class="empty-state-icon">❌</div><p>Error loading bulk products</p></div>');
  }
}

function openAddBulukProduct() {
  openAddProduct();
  document.getElementById('pf_category').value = 'buluk';
}

// ==================== PRODUCT MODAL ====================
function openAddProduct() {
  document.getElementById('productModalTitle').textContent = 'Add New Product';
  document.getElementById('productSaveBtn').textContent = '💾 Save Product';
  document.getElementById('pf_editId').value = '';
  document.getElementById('productForm').reset();
  document.getElementById('pf_isBulk').checked = false;
  editColors = [];
  editSizes = ['S', 'M', 'L', 'XL'];
  renderColors();
  renderSizes();
  clearImagePreviews();
  document.getElementById('pf_imageColorSelect').value = '';
  document.getElementById('pf_imageGrid').style.opacity = '0.5';
  document.getElementById('pf_imageGrid').style.pointerEvents = 'none';
  openModal('productModal');
}

function openEditProduct(id) {
  const p = productsData.find(x => x.id === id);
  if (!p) return;

  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('productSaveBtn').textContent = '💾 Update Product';
  document.getElementById('pf_editId').value = p.id;
  document.getElementById('pf_name').value = p.name;
  document.getElementById('pf_category').value = p.category;
  document.getElementById('pf_price').value = p.price;
  document.getElementById('pf_originalPrice').value = p.originalPrice;
  document.getElementById('pf_badge').value = p.badge || '';
  document.getElementById('pf_description').value = p.description || '';
  document.getElementById('pf_material').value = p.material || '';
  document.getElementById('pf_fit').value = p.fit || 'Regular Fit';
  document.getElementById('pf_washCare').value = p.washCare || '';
  document.getElementById('pf_inStock').checked = p.inStock || p.in_stock === 1;
  document.getElementById('pf_isBulk').checked = p.isBulk || p.is_bulk === 1;

  editColors = [...(p.colors || [])];
  editSizes = [...(p.sizes || [])];
  renderColors();
  renderSizes();

  // Load images
  window.currentProductData = p; // store for reference when switching colors
  document.getElementById('pf_imageColorSelect').value = '';
  clearImagePreviews();
  document.getElementById('pf_imageGrid').style.opacity = '0.5';
  document.getElementById('pf_imageGrid').style.pointerEvents = 'none';

  openModal('productModal');
}

function loadImagesForSelectedColor() {
  const colorName = document.getElementById('pf_imageColorSelect').value;
  const grid = document.getElementById('pf_imageGrid');

  if (!colorName) {
    grid.style.opacity = '0.5';
    grid.style.pointerEvents = 'none';
    clearImagePreviews();
    return;
  }

  grid.style.opacity = '1';
  grid.style.pointerEvents = 'auto';
  clearImagePreviews();

  const p = window.currentProductData;
  if (p && p.images) {
    p.images.filter(i => i.color_name === colorName || (i.color_name === '' && colorName === 'default')).forEach(img => {
      const box = document.querySelector(`.image-upload-box[data-angle="${img.view_angle}"]`);
      if (box) {
        let preview = box.querySelector('img');
        if (!preview) {
          preview = document.createElement('img');
          box.appendChild(preview);
        }
        preview.src = img.image_path;
        box.classList.add('has-image');
        box.dataset.existingImageId = img.id;
      }
    });
  }
}

async function saveProduct() {
  const editId = document.getElementById('pf_editId').value;
  const productData = {
    name: document.getElementById('pf_name').value,
    category: document.getElementById('pf_category').value,
    price: Number(document.getElementById('pf_price').value),
    originalPrice: Number(document.getElementById('pf_originalPrice').value),
    badge: document.getElementById('pf_badge').value,
    description: document.getElementById('pf_description').value,
    material: document.getElementById('pf_material').value,
    fit: document.getElementById('pf_fit').value,
    washCare: document.getElementById('pf_washCare').value,
    inStock: document.getElementById('pf_inStock').checked,
    isBulk: document.getElementById('pf_isBulk').checked,
    colors: editColors,
    sizes: editSizes,
    gradient: `linear-gradient(135deg, ${editColors[0]?.hex || '#667eea'} 0%, ${editColors[1]?.hex || '#764ba2'} 100%)`,
    rating: 4.0,
    reviewCount: 0
  };

  if (!productData.name || !productData.price) return alert('Name and price are required');

  try {
    let url, method;
    if (editId) {
      url = `${API}/products/${editId}`;
      method = 'PUT';
    } else {
      url = `${API}/products`;
      method = 'POST';
    }

    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    const result = await res.json();

    if (result.success) {
      const productId = editId || result.id;

      // Upload images for selected color
      const boxes = document.querySelectorAll('.image-upload-box');
      const selectedColor = document.getElementById('pf_imageColorSelect').value || 'default';

      for (const box of boxes) {
        const fileInput = box.querySelector('input[type="file"]');
        if (fileInput && fileInput.files.length > 0) {
          const formData = new FormData();
          formData.append('image', fileInput.files[0]);
          await apiFetch(`${API}/products/${productId}/images/${box.dataset.angle}/${encodeURIComponent(selectedColor)}`, {
            method: 'POST',
            body: formData
          });
        }
      }

      closeModal('productModal');
      loadProducts();
    } else {
      alert('Error: ' + (result.error || 'Save failed'));
    }
  } catch (err) {
    alert('Error saving product: ' + err.message);
  }
}

async function deleteProduct(id, name) {
  name = decodeURIComponent(name);
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await apiFetch(`${API}/products/${id}`, { method: 'DELETE' });
    loadProducts();
  } catch (err) {
    alert('Error deleting product');
  }
}

// ==================== COLORS & SIZES ====================
function addColor() {
  const name = document.getElementById('pf_newColorName').value.trim();
  const hex = document.getElementById('pf_newColorHex').value;
  if (!name) return;
  if (editColors.find(c => c.name === name)) return alert('Color already exists');
  editColors.push({ name, hex });
  renderColors();
  document.getElementById('pf_newColorName').value = '';
}

function removeColor(index) {
  editColors.splice(index, 1);
  renderColors();
}

function renderColors() {
  document.getElementById('pf_colorList').innerHTML = safeHTML(editColors.map((c, i) => `
    <div class="color-item">
      <span class="color-swatch" style="background:${c.hex}"></span>
      <span class="color-name">${c.name}</span>
      <button type="button" class="color-remove" onclick="removeColor(${i})">✕</button>
    </div>
  `).join('') || '<span style="color:var(--text-muted);font-size:13px;">No colors added</span>');

  // Update Color Select Dropdown for Images
  const select = document.getElementById('pf_imageColorSelect');
  const currentValue = select.value;
  select.innerHTML = safeHTML('<option value="">-- Select Color First --</option>' +
    editColors.map(c => `<option value="${c.name}">${c.name}</option>`).join(''));
  if (editColors.find(c => c.name === currentValue)) {
    select.value = currentValue;
  }
}

function addSize() {
  const size = document.getElementById('pf_newSize').value;
  if (editSizes.includes(size)) return alert('Size already added');
  editSizes.push(size);
  renderSizes();
}

function removeSize(index) {
  editSizes.splice(index, 1);
  renderSizes();
}

function renderSizes() {
  document.getElementById('pf_sizeList').innerHTML = safeHTML(editSizes.map((s, i) => `
    <div class="size-item">
      ${s}
      <button type="button" class="size-remove" onclick="removeSize(${i})">✕</button>
    </div>
  `).join('') || '<span style="color:var(--text-muted);font-size:13px;">No sizes added</span>');
}

// ==================== IMAGE UPLOAD ====================
function triggerImageUpload(box) {
  box.querySelector('input[type="file"]').click();
}

function previewImage(input) {
  const box = input.closest('.image-upload-box');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      let img = box.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        box.appendChild(img);
      }
      img.src = e.target.result;
      box.classList.add('has-image');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function removeImage(btn) {
  const box = btn.closest('.image-upload-box');
  const img = box.querySelector('img');
  if (img) img.remove();
  box.classList.remove('has-image');
  box.querySelector('input[type="file"]').value = '';
  delete box.dataset.existingImageId;
}

function clearImagePreviews() {
  document.querySelectorAll('.image-upload-box').forEach(box => {
    const img = box.querySelector('img');
    if (img) img.remove();
    box.classList.remove('has-image');
    box.querySelector('input[type="file"]').value = '';
    delete box.dataset.existingImageId;
  });
}

// ==================== ORDERS ====================
async function loadOrders() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>Loading orders...</p></div>';

  try {
    const res = await fetch(`${API}/orders`, { credentials: 'include' });
    ordersData = await res.json();

    content.innerHTML = safeHTML(`
      <div class="data-card animate-in">
        <div class="data-card-header">
          <span class="data-card-title">All Orders (${ordersData.length})</span>
        </div>
        ${ordersData.length ? `
        <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr><th>Order #</th><th>Customer</th><th>Phone</th><th>Items</th><th>Amount</th><th>Payment</th><th>AWB / Courier</th><th>Invoice</th><th>Status</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${ordersData.map(o => `
              <tr>
                <td><strong>#${o.id}</strong></td>
                <td>${o.customer_name || 'N/A'}</td>
                <td><a href="https://wa.me/${(o.customer_phone || '').replace(/\D/g,'')}" target="_blank" style="color:var(--success);">${o.customer_phone || 'N/A'}</a></td>
                <td>${o.items ? o.items.length : 0} items</td>
                <td><strong>₹${Number(o.total_amount).toLocaleString('en-IN')}</strong></td>
                <td><span class="status-badge" style="background:${o.payment_method==='cod'?'rgba(245,158,11,0.15)':'rgba(34,197,94,0.15)'}; color:${o.payment_method==='cod'?'#f59e0b':'#22c55e'}; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; text-transform:uppercase;">${o.payment_method==='cod'?'COD':'Prepaid'}</span></td>
                <td style="font-size:12px;">
                  ${o.awb_code
                    ? `<div style="font-weight:600; color:var(--gold);">${o.awb_code}</div><div style="color:var(--text-muted);">${o.courier_name||''}</div>`
                    : `<span style="color:var(--text-muted); font-style:italic;">Not shipped</span>`
                  }
                </td>
                <td style="text-align:center;font-size:18px;">
                  ${o.invoice_path
                    ? `<a href="${o.invoice_path}" target="_blank" title="View Invoice" style="text-decoration:none;">📄</a>`
                    : `<span style="color:var(--text-muted);font-size:12px;">—</span>`
                  }
                </td>
                <td>
                  <select class="form-select" style="padding:6px 10px;font-size:12px;width:130px;background:var(--bg-input);border-radius:8px;" onchange="updateOrderStatus(${o.id}, this.value)" value="${o.status}">
                    <option value="pending" ${o.status==='pending'?'selected':''}>⏳ Pending</option>
                    <option value="confirmed" ${o.status==='confirmed'?'selected':''}>✅ Confirmed</option>
                    <option value="shipped" ${o.status==='shipped'?'selected':''}>🚚 Shipped</option>
                    <option value="delivered" ${o.status==='delivered'?'selected':''}>📦 Delivered</option>
                    <option value="cancelled" ${o.status==='cancelled'?'selected':''}>❌ Cancelled</option>
                  </select>
                </td>
                <td style="font-size:12px;color:var(--text-muted);">${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                <td style="white-space:nowrap;">
                  <button class="btn-icon" onclick="viewOrder(${o.id})" title="View Details">👁️</button>
                  ${!o.awb_code && o.status !== 'cancelled' ? `<button class="btn-icon" onclick="shipOrder(${o.id})" title="Ship via Shiprocket" style="color:var(--gold);">🚀</button>` : ''}
                  <button class="btn-icon" style="color: #ef4444;" onclick="deleteOrder(${o.id})" title="Delete Order">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>` : '<div class="empty-state"><div class="empty-state-icon">📦</div><p>No orders yet</p></div>'}
      </div>
    `);
  } catch (err) {
    content.innerHTML = safeHTML('<div class="empty-state"><div class="empty-state-icon">❌</div><p>Error loading orders</p></div>');
  }
}

async function updateOrderStatus(orderId, status) {
  await apiFetch(`${API}/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}

async function shipOrder(orderId) {
  if (!confirm(`Ship Order #${orderId} via Shiprocket now?\n\nThis will create the shipment and assign a courier automatically.`)) return;
  const btn = event.target;
  btn.textContent = '⏳';
  btn.disabled = true;
  try {
    const res = await apiFetch(`${API}/admin/orders/${orderId}/ship`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ Order #${orderId} shipped!\nAWB: ${data.awb_code}\nCourier: ${data.courier_name}`);
      loadOrders();
    } else {
      alert('❌ Error: ' + (data.error || 'Unknown error'));
      btn.textContent = '🚀';
      btn.disabled = false;
    }
  } catch (e) {
    alert('❌ Network error: ' + e.message);
    btn.textContent = '🚀';
    btn.disabled = false;
  }
}

async function deleteOrder(orderId) {
  if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;
  
  try {
    const res = await apiFetch(`${API}/orders/${orderId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      loadOrders(); // Refresh table
    } else {
      alert('Failed to delete order');
    }
  } catch (err) {
    console.error('Error deleting order:', err);
    alert('Error deleting order');
  }
}

function viewOrder(orderId) {
  const o = ordersData.find(x => x.id === orderId);
  if (!o) return;

  document.getElementById('orderDetailContent').innerHTML = safeHTML(`
    <div class="order-detail-grid">
      <div class="order-info-card">
        <div class="order-info-title">Customer Info</div>
        <div class="order-info-row"><span class="label">Name</span><span>${o.customer_name}</span></div>
        <div class="order-info-row"><span class="label">Phone</span><a href="https://wa.me/${o.customer_phone.replace(/\D/g,'')}" target="_blank" style="color:var(--success);">${o.customer_phone}</a></div>
        <div class="order-info-row"><span class="label">Email</span><span>${o.customer_email || 'N/A'}</span></div>
        <div class="order-info-row"><span class="label">Address</span><span>${o.customer_address || 'N/A'}</span></div>
      </div>
      <div class="order-info-card">
        <div class="order-info-title">Order Info</div>
        <div class="order-info-row"><span class="label">Order ID</span><span>#${o.id}</span></div>
        <div class="order-info-row"><span class="label">Status</span><span class="status-badge status-${o.status}">${o.status}</span></div>
        <div class="order-info-row"><span class="label">Payment</span><span>${o.payment_method}</span></div>
        <div class="order-info-row"><span class="label">Date</span><span>${new Date(o.created_at).toLocaleString('en-IN')}</span></div>
      </div>
    </div>

    ${o.awb_code ? `
    <div class="data-card" style="margin:16px 0; background: rgba(232,185,74,0.05); border-color: rgba(232,185,74,0.3);">
      <div class="data-card-header"><span class="data-card-title">🚚 Shiprocket Tracking</span></div>
      <div class="grid-2-sm">
        <div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">AWB Number</div><div style="font-weight:700;color:var(--gold);font-size:16px;">${o.awb_code}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Courier</div><div style="font-weight:600;">${o.courier_name || 'Assigning...'}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Shipped At</div><div>${o.shipped_at ? new Date(o.shipped_at).toLocaleString('en-IN') : 'N/A'}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Est. Delivery</div><div>${o.estimated_delivery || 'Calculating...'}</div></div>
      </div>
    </div>` : ''}

    <div class="data-card" style="margin:0;">
      <div class="data-card-header"><span class="data-card-title">Order Items</span></div>
      <table class="data-table">
        <thead><tr><th>Product</th><th>Color</th><th>Size</th><th>Qty</th><th>Price</th></tr></thead>
        <tbody>
          ${(o.items || []).map(item => `
            <tr>
              <td>${item.product_name}</td>
              <td>${item.color}</td>
              <td>${item.size}</td>
              <td>${item.quantity}</td>
              <td>₹${Number(item.price).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Invoice Section -->
    <div class="data-card" style="margin:16px 0; background:rgba(34,197,94,0.03); border-color:rgba(34,197,94,0.2);">
      <div class="data-card-header">
        <span class="data-card-title">📄 Invoice</span>
        <span style="font-size:12px; color:var(--text-muted);">Upload company invoice PDF for this order</span>
      </div>
      <div style="padding:16px; display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
        ${o.invoice_path ? `
          <a href="${o.invoice_path}" target="_blank" class="btn" style="background:var(--success); color:#fff; padding:8px 16px; border-radius:8px; text-decoration:none; font-size:13px;">📥 Download Current Invoice</a>
          <button class="btn" style="background:rgba(239,68,68,0.15); color:#ef4444; padding:8px 16px; border-radius:8px; font-size:13px;" onclick="deleteInvoice(${o.id})">🗑️ Remove Invoice</button>
        ` : '<span style="color:var(--text-muted); font-size:13px;">No invoice uploaded yet.</span>'}
        <label class="btn" style="background:var(--gold); color:#1a1a1a; padding:8px 16px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
          📤 Upload Invoice PDF
          <input type="file" accept=".pdf,application/pdf" style="display:none;" onchange="uploadInvoice(${o.id}, this)">
        </label>
      </div>
    </div>

    <div style="margin-top:20px; text-align:right;">
      <div style="font-size:14px; color:var(--text-secondary);">Subtotal: ₹${Number(o.total_amount - o.gst - o.delivery_charge).toLocaleString('en-IN')}</div>
      <div style="font-size:14px; color:var(--text-secondary);">GST: ₹${Number(o.gst).toLocaleString('en-IN')}</div>
      <div style="font-size:14px; color:var(--text-secondary);">Delivery: ₹${Number(o.delivery_charge).toLocaleString('en-IN')}</div>
      <div style="font-size:20px; font-weight:800; color:var(--gold); margin-top:8px;">Total: ₹${Number(o.total_amount).toLocaleString('en-IN')}</div>
    </div>
  `);
  openModal('orderModal');
}

// ==================== INVOICES ====================
async function uploadInvoice(orderId, input) {
  if (!input.files || !input.files[0]) return;
  const formData = new FormData();
  formData.append('invoice', input.files[0]);
  try {
    const res = await apiFetch(`${API}/admin/orders/${orderId}/invoice`, {
      method: 'POST', body: formData
    });
    if (res.ok) { viewOrder(orderId); }
    else { const d = await res.json(); alert('Upload failed: ' + (d.error || '')); }
  } catch (err) { alert('Error: ' + err.message); }
  input.value = '';
}

async function deleteInvoice(orderId) {
  if (!confirm('Remove invoice PDF from this order?')) return;
  try {
    const res = await apiFetch(`${API}/admin/orders/${orderId}/invoice`, {
      method: 'DELETE'
    });
    if (res.ok) { viewOrder(orderId); }
    else { const d = await res.json(); alert('Delete failed: ' + (d.error || '')); }
  } catch (err) { alert('Error: ' + err.message); }
}

// ==================== PAYMENTS ====================
async function loadPayments() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>Loading...</p></div>';

  try {
    const res = await fetch(`${API}/payments`, { credentials: 'include' });
    paymentsData = await res.json();

    content.innerHTML = safeHTML(`
      <div class="data-card animate-in">
        <div class="data-card-header">
          <span class="data-card-title">All Payments (${paymentsData.length})</span>
        </div>
        ${paymentsData.length ? `
        <table class="data-table">
          <thead><tr><th>ID</th><th>Order</th><th>Customer</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${paymentsData.map(p => `
              <tr>
                <td>#${p.id}</td>
                <td>#${p.order_id}</td>
                <td>${p.customer_name || 'N/A'}</td>
                <td><strong>₹${Number(p.amount).toLocaleString('en-IN')}</strong></td>
                <td style="text-transform:uppercase;font-size:12px;">${p.method}</td>
                <td><span class="status-badge status-${p.status}">${p.status}</span></td>
                <td style="font-size:12px;color:var(--text-muted);">${new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <div style="display:flex;gap:6px;align-items:center;">
                    <select class="form-select" style="padding:6px 10px;font-size:12px;width:130px;background:var(--bg-input);border-radius:8px;" onchange="updatePaymentStatus(${p.id}, this.value)">
                      <option value="pending" ${p.status==='pending'?'selected':''}>Pending</option>
                      <option value="completed" ${p.status==='completed'?'selected':''}>Completed</option>
                      <option value="failed" ${p.status==='failed'?'selected':''}>Failed</option>
                      <option value="refunded" ${p.status==='refunded'?'selected':''}>Refunded</option>
                    </select>
                    <button class="btn-icon" style="color: #ef4444; padding:4px;" onclick="deletePayment(${p.id})" title="Delete Payment">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>` : '<div class="empty-state"><div class="empty-state-icon">💳</div><p>No payments yet</p></div>'}
      </div>
    `);
  } catch (err) {
    content.innerHTML = safeHTML('<div class="empty-state"><div class="empty-state-icon">❌</div><p>Error loading payments</p></div>');
  }
}

async function updatePaymentStatus(paymentId, status) {
  await apiFetch(`${API}/payments/${paymentId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}

async function deletePayment(paymentId) {
  if (!confirm('Are you sure you want to delete this payment record?')) return;
  try {
    const res = await apiFetch(`${API}/payments/${paymentId}`, { method: 'DELETE' });
    if (res.ok) loadPayments();
    else alert('Failed to delete payment');
  } catch (err) { alert('Error deleting payment'); }
}

// ==================== CONTACTS ====================
async function loadContacts() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>Loading...</p></div>';

  try {
    const res = await fetch(`${API}/contacts`, { credentials: 'include' });
    contactsData = await res.json();

    content.innerHTML = safeHTML(`
      <div class="data-card animate-in">
        <div class="data-card-header">
          <span class="data-card-title">Contact Messages (${contactsData.length})</span>
        </div>
        ${contactsData.length ? `
        <table class="data-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Subject</th><th>Message</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${contactsData.map(c => `
              <tr>
                <td><strong>${c.name}</strong></td>
                <td><a href="https://wa.me/${(c.phone||'').replace(/\D/g,'')}" target="_blank" style="color:var(--success);">${c.phone || 'N/A'}</a></td>
                <td style="font-size:12px;">${c.email || 'N/A'}</td>
                <td>${c.subject}</td>
                <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${c.message.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}">${c.message}</td>
                <td><span class="status-badge status-${c.status}">${c.status}</span></td>
                <td style="font-size:12px;color:var(--text-muted);">${new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <div style="display:flex;gap:6px;align-items:center;">
                    <select class="form-select" style="padding:5px 8px;font-size:11px;width:100px;background:var(--bg-input);border-radius:6px;" onchange="updateContactStatus(${c.id}, this.value)">
                      <option value="new" ${c.status==='new'?'selected':''}>New</option>
                      <option value="read" ${c.status==='read'?'selected':''}>Read</option>
                      <option value="replied" ${c.status==='replied'?'selected':''}>Replied</option>
                    </select>
                    ${c.phone ? `<a href="https://wa.me/${c.phone.replace(/\D/g,'')}?text=Hi ${encodeURIComponent(c.name)}, thank you for contacting Jaiswal Fashion!" target="_blank" class="btn-icon" title="Reply on WhatsApp" style="background:rgba(34,197,94,0.15);color:var(--success);">💬</a>` : ''}
                    <button class="btn-icon" style="color: #ef4444; padding:4px;" onclick="deleteContact(${c.id})" title="Delete Message">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>` : '<div class="empty-state"><div class="empty-state-icon">📩</div><p>No messages yet</p></div>'}
      </div>
    `);
  } catch (err) {
    content.innerHTML = safeHTML('<div class="empty-state"><div class="empty-state-icon">❌</div><p>Error loading contacts</p></div>');
  }
}

async function updateContactStatus(contactId, status) {
  await apiFetch(`${API}/contacts/${contactId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}

async function deleteContact(contactId) {
  if (!confirm('Are you sure you want to delete this message?')) return;
  try {
    const res = await apiFetch(`${API}/contacts/${contactId}`, { method: 'DELETE' });
    if (res.ok) loadContacts();
    else alert('Failed to delete message');
  } catch (err) { alert('Error deleting message'); }
}

// ==================== BULK ORDERS ====================
async function loadBulkOrders() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>Loading...</p></div>';

  try {
    const res = await fetch(`${API}/bulk-orders`, { credentials: 'include' });
    bulkOrdersData = await res.json();

    content.innerHTML = safeHTML(`
      <div class="data-card animate-in">
        <div class="data-card-header">
          <span class="data-card-title">Bulk Enquiries (${bulkOrdersData.length})</span>
        </div>
        ${bulkOrdersData.length ? `
        <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>Shop Name</th><th>Contact Person</th><th>Phone</th><th>City</th><th>Categories</th><th>Volume</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${bulkOrdersData.map(b => `
              <tr>
                <td><strong>${b.shop_name}</strong></td>
                <td>${b.contact_person}</td>
                <td><a href="https://wa.me/${(b.phone||'').replace(/\D/g,'')}" target="_blank" style="color:var(--success);">${b.phone}</a></td>
                <td>${b.city}</td>
                <td style="font-size:12px;">${JSON.parse(b.categories).join(', ')}</td>
                <td>${b.volume}</td>
                <td><span class="status-badge status-${b.status}">${b.status}</span></td>
                <td style="font-size:12px;color:var(--text-muted);">${new Date(b.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <div style="display:flex;gap:6px;">
                    <select class="form-select" style="padding:5px 8px;font-size:11px;width:100px;background:var(--bg-input);border-radius:6px;" onchange="updateBulkOrderStatus(${b.id}, this.value)">
                      <option value="pending" ${b.status==='pending'?'selected':''}>Pending</option>
                      <option value="contacted" ${b.status==='contacted'?'selected':''}>Contacted</option>
                      <option value="approved" ${b.status==='approved'?'selected':''}>Approved</option>
                      <option value="rejected" ${b.status==='rejected'?'selected':''}>Rejected</option>
                    </select>
                    ${b.phone ? `<a href="https://wa.me/${b.phone.replace(/\D/g,'')}?text=Hi ${encodeURIComponent(b.contact_person)}, regarding your bulk order request for ${b.shop_name}..." target="_blank" class="btn-icon" title="Reply on WhatsApp" style="background:rgba(34,197,94,0.15);color:var(--success);">💬</a>` : ''}
                    <button class="btn-icon" style="color: #ef4444; padding:4px;" onclick="deleteBulkOrder(${b.id})" title="Delete Request">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>` : '<div class="empty-state"><div class="empty-state-icon">📦</div><p>No bulk orders yet</p></div>'}
      </div>
    `);
  } catch (err) {
    content.innerHTML = safeHTML('<div class="empty-state"><div class="empty-state-icon">❌</div><p>Error loading bulk orders</p></div>');
  }
}

async function updateBulkOrderStatus(id, status) {
  await apiFetch(`${API}/bulk-orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}

async function deleteBulkOrder(id) {
  if (!confirm('Are you sure you want to delete this bulk order request?')) return;
  try {
    const res = await apiFetch(`${API}/bulk-orders/${id}`, { method: 'DELETE' });
    if (res.ok) loadBulkOrders();
    else alert('Failed to delete bulk order request');
  } catch (err) { alert('Error deleting bulk order request'); }
}

// ==================== BULUK ORDERS ====================
async function loadBulukOrders() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>Loading...</p></div>';

  try {
    const res = await fetch(`${API}/buluk-orders`, { credentials: 'include' });
    const orders = await res.json();

    content.innerHTML = safeHTML(`
      <div class="data-card animate-in">
        <div class="data-card-header">
          <span class="data-card-title">Bulk Orders (${orders.length})</span>
        </div>
        ${orders.length ? `
        <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>#</th><th>Shop</th><th>Contact</th><th>Phone</th><th>City</th><th>Items</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${orders.map((o, idx) => {
              const items = o.items || [];
              const totalPieces = items.reduce((s, i) => s + i.quantity, 0);
              const itemsSummary = items.map(i => `${i.product_name} ${i.color}/${i.size} x${i.quantity}`).join('<br>');
              return `
              <tr>
                <td style="color:var(--text-muted);">${idx+1}</td>
                <td><strong>${o.shop_name}</strong></td>
                <td>${o.contact_person}</td>
                <td><a href="https://wa.me/${(o.phone||'').replace(/\D/g,'')}" target="_blank" style="color:var(--success);">${o.phone}</a></td>
                <td>${o.city}</td>
                <td style="font-size:12px;max-width:200px;">${itemsSummary}<br><strong>Total: ${totalPieces} pcs</strong></td>
                <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                <td style="font-size:12px;color:var(--text-muted);">${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <div style="display:flex;gap:6px;flex-direction:column;">
                    <select class="form-select" style="padding:5px 8px;font-size:11px;background:var(--bg-input);border-radius:6px;" onchange="updateBulukOrderStatus(${o.id}, this.value)">
                      <option value="pending" ${o.status==='pending'?'selected':''}>Pending</option>
                      <option value="confirmed" ${o.status==='confirmed'?'selected':''}>Confirmed</option>
                      <option value="processing" ${o.status==='processing'?'selected':''}>Processing</option>
                      <option value="shipped" ${o.status==='shipped'?'selected':''}>Shipped</option>
                      <option value="completed" ${o.status==='completed'?'selected':''}>Completed</option>
                      <option value="cancelled" ${o.status==='cancelled'?'selected':''}>Cancelled</option>
                    </select>
                    ${o.notes ? `<div style="font-size:11px;color:var(--text-muted);padding:4px;background:var(--bg-input);border-radius:4px;">📝 ${o.notes}</div>` : ''}
                    ${o.address ? `<div style="font-size:11px;color:var(--text-muted);">📍 ${o.address}</div>` : ''}
                    <button class="btn-icon" style="color:#ef4444;padding:4px;align-self:flex-start;" onclick="deleteBulukOrder(${o.id})" title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        </div>` : '<div class="empty-state"><div class="empty-state-icon">📦</div><p>No bulk orders yet</p></div>'}
      </div>
    `);
  } catch (err) {
    content.innerHTML = safeHTML('<div class="empty-state"><div class="empty-state-icon">❌</div><p>Error loading bulk orders</p></div>');
  }
}

async function updateBulukOrderStatus(id, status) {
  await apiFetch(`${API}/buluk-orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}

async function deleteBulukOrder(id) {
  if (!confirm('Are you sure you want to delete this bulk order?')) return;
  try {
    const res = await apiFetch(`${API}/buluk-orders/${id}`, { method: 'DELETE' });
    if (res.ok) loadBulukOrders();
    else alert('Failed to delete bulk order');
  } catch (err) { alert('Error deleting bulk order'); }
}

// ==================== MODAL HELPERS ====================
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

// Responsive menu button
if (window.innerWidth <= 768) {
  document.getElementById('menuBtn').style.display = 'inline-flex';
}
window.addEventListener('resize', () => {
  document.getElementById('menuBtn').style.display = window.innerWidth <= 768 ? 'inline-flex' : 'none';
});

// ==================== SETTINGS ====================
async function loadSettings() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state">Loading settings...</div>';

  try {
    const res = await fetch(`${API}/admin/settings`, { credentials: 'include' });
    const settings = await res.json();
    
    const pm = settings.payment_methods || { cod: true, online: false };
    const sr = settings.shiprocket_config || {};

    content.innerHTML = safeHTML(`
      <!-- Website Settings Card -->
      <div class="data-card animate-in" style="max-width: 640px; margin: 0 auto 24px;">
        <div class="data-card-header">
          <span class="data-card-title">🌐 Website Settings</span>
        </div>
        <div style="padding: 20px;">
          <form id="websiteSettingsForm" onsubmit="saveWebsiteSettings(event)">
            <div class="form-group" style="display:flex; align-items:center; justify-content:space-between; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-subtle);">
              <div>
                <strong style="display:block; font-size: 16px; margin-bottom: 4px;">Show Bulk Products Section</strong>
                <span style="color: var(--text-secondary); font-size: 13px;">Display the Wholesale/Bulk Products section on the homepage.</span>
              </div>
              <label class="switch" style="position:relative; display:inline-block; width:50px; height:24px;">
                <input type="checkbox" id="set_bulkSection" ${settings.show_bulk_section == true || settings.show_bulk_section === 'true' ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${settings.show_bulk_section == true || settings.show_bulk_section === 'true' ? 'var(--success)' : '#ccc'}; transition:.4s; border-radius:34px;">
                  <span style="position:absolute; height:18px; width:18px; left: ${settings.show_bulk_section == true || settings.show_bulk_section === 'true' ? '28px' : '3px'}; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
                </span>
              </label>
            </div>
            <div class="form-group" style="display:flex; align-items:center; justify-content:space-between; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-subtle);">
              <div>
                <strong style="display:block; font-size: 16px; margin-bottom: 4px;">Show Bulk Section</strong>
                <span style="color: var(--text-secondary); font-size: 13px;">Display the Bulk products section on homepage and navbar.</span>
              </div>
              <label class="switch" style="position:relative; display:inline-block; width:50px; height:24px;">
                <input type="checkbox" id="set_bulukEnabled" ${settings.buluk_enabled == true || settings.buluk_enabled === 'true' ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${settings.buluk_enabled == true || settings.buluk_enabled === 'true' ? 'var(--success)' : '#ccc'}; transition:.4s; border-radius:34px;">
                  <span style="position:absolute; height:18px; width:18px; left: ${settings.buluk_enabled == true || settings.buluk_enabled === 'true' ? '28px' : '3px'}; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
                </span>
              </label>
            </div>
            <div class="form-group" style="display:flex; align-items:center; justify-content:space-between; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-subtle);">
              <div>
                <strong style="display:block; font-size: 16px; margin-bottom: 4px;">Show Products Section</strong>
                <span style="color: var(--text-secondary); font-size: 13px;">Display the Products section on the homepage.</span>
              </div>
              <label class="switch" style="position:relative; display:inline-block; width:50px; height:24px;">
                <input type="checkbox" id="set_showProducts" ${settings.show_products == true || settings.show_products === 'true' ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${settings.show_products == true || settings.show_products === 'true' ? 'var(--success)' : '#ccc'}; transition:.4s; border-radius:34px;">
                  <span style="position:absolute; height:18px; width:18px; left: ${settings.show_products == true || settings.show_products === 'true' ? '28px' : '3px'}; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
                </span>
              </label>
            </div>
            <div class="form-group" style="display:flex; align-items:center; justify-content:space-between; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-subtle);">
              <div>
                <strong style="display:block; font-size: 16px; margin-bottom: 4px;">Show Best Selling Products</strong>
                <span style="color: var(--text-secondary); font-size: 13px;">Display the Best Selling Products section on the homepage.</span>
              </div>
              <label class="switch" style="position:relative; display:inline-block; width:50px; height:24px;">
                <input type="checkbox" id="set_showBestsellers" ${settings.show_bestsellers == true || settings.show_bestsellers === 'true' ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${settings.show_bestsellers == true || settings.show_bestsellers === 'true' ? 'var(--success)' : '#ccc'}; transition:.4s; border-radius:34px;">
                  <span style="position:absolute; height:18px; width:18px; left: ${settings.show_bestsellers == true || settings.show_bestsellers === 'true' ? '28px' : '3px'}; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
                </span>
              </label>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;">💾 Save Website Settings</button>
          </form>
        </div>
      </div>

      <!-- Payment Settings Card -->
      <div class="data-card animate-in" style="max-width: 640px; margin: 0 auto 24px;">
        <div class="data-card-header">
          <span class="data-card-title">💳 Payment Settings</span>
        </div>
        <div style="padding: 20px;">
          <form id="settingsForm" onsubmit="saveSettings(event)">
            <div class="form-group" style="display:flex; align-items:center; justify-content:space-between; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-subtle);">
              <div>
                <strong style="display:block; font-size: 16px; margin-bottom: 4px;">Cash on Delivery (COD)</strong>
                <span style="color: var(--text-secondary); font-size: 13px;">Allow customers to pay when order is delivered.</span>
              </div>
              <label class="switch" style="position:relative; display:inline-block; width:50px; height:24px;">
                <input type="checkbox" id="set_cod" ${pm.cod ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${pm.cod ? 'var(--success)' : '#ccc'}; transition:.4s; border-radius:34px;">
                  <span style="position:absolute; height:18px; width:18px; left: ${pm.cod ? '28px' : '3px'}; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
                </span>
              </label>
            </div>

            <div class="form-group" style="display:flex; align-items:center; justify-content:space-between; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 25px; border: 1px solid var(--border-subtle);">
              <div>
                <strong style="display:block; font-size: 16px; margin-bottom: 4px;">Online Payments (UPI/Card)</strong>
                <span style="color: var(--text-secondary); font-size: 13px;">Accept payments online via Razorpay/PhonePe.</span>
              </div>
              <label class="switch" style="position:relative; display:inline-block; width:50px; height:24px;">
                <input type="checkbox" id="set_online" ${pm.online ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${pm.online ? 'var(--success)' : '#ccc'}; transition:.4s; border-radius:34px;">
                  <span style="position:absolute; height:18px; width:18px; left: ${pm.online ? '28px' : '3px'}; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
                </span>
              </label>
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%;">💾 Save Payment Settings</button>
          </form>
        </div>
      </div>

      <!-- Shiprocket Config Card -->
      <div class="data-card animate-in" style="max-width: 640px; margin: 0 auto;">
        <div class="data-card-header" style="display:flex; align-items:center; justify-content:space-between;">
          <span class="data-card-title">🚀 Shiprocket Integration</span>
          <span id="srStatusBadge" style="font-size:12px; padding:4px 10px; border-radius:20px; background:rgba(100,100,100,0.2); color:var(--text-muted);">⬤ Not Tested</span>
        </div>
        <div style="padding: 20px;">
          <form id="srForm" onsubmit="saveShiprocketConfig(event)">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">API Email *</label>
                <input type="email" class="form-input" id="sr_email" value="${sr.email||''}" placeholder="api@yourcompany.com" required>
              </div>
              <div class="form-group">
                <label class="form-label">API Password *</label>
                <input type="password" class="form-input" id="sr_password" value="${sr.password === '__CONFIGURED__' ? '' : sr.password||''}" placeholder="Leave empty to keep current" autocomplete="new-password">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Pickup Location Name</label>
                <input type="text" class="form-input" id="sr_pickup" value="${sr.pickup_location||'Primary'}" placeholder="Primary">
              </div>
              <div class="form-group">
                <label class="form-label">Package Weight (kg)</label>
                <input type="number" class="form-input" id="sr_weight" value="${sr.pkg_weight||0.5}" step="0.1" min="0.1">
              </div>
            </div>
            <div class="form-row-3">
              <div class="form-group">
                <label class="form-label">Length (cm)</label>
                <input type="number" class="form-input" id="sr_length" value="${sr.pkg_length||30}" min="1">
              </div>
              <div class="form-group">
                <label class="form-label">Breadth (cm)</label>
                <input type="number" class="form-input" id="sr_breadth" value="${sr.pkg_breadth||25}" min="1">
              </div>
              <div class="form-group">
                <label class="form-label">Height (cm)</label>
                <input type="number" class="form-input" id="sr_height" value="${sr.pkg_height||5}" min="1">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">⚡ Prepaid Auto-Ship (hours)</label>
                <input type="number" class="form-input" id="sr_prepaid_h" value="${sr.auto_ship_prepaid_hours||24}" min="1" max="72">
                <small style="color:var(--text-muted); font-size:11px;">Prepaid orders auto-ship after these many hours</small>
              </div>
              <div class="form-group">
                <label class="form-label">📦 COD Auto-Ship (hours)</label>
                <input type="number" class="form-input" id="sr_cod_h" value="${sr.auto_ship_cod_hours||36}" min="1" max="96">
                <small style="color:var(--text-muted); font-size:11px;">COD orders auto-ship after these many hours</small>
              </div>
            </div>
            <div style="display:flex; gap:12px; margin-top:8px;">
              <button type="submit" class="btn btn-primary" style="flex:1;">💾 Save Shiprocket Config</button>
              <button type="button" class="btn" style="background:var(--bg-glass); border:1px solid var(--border); flex:1;" onclick="testShiprocket()">🔗 Test Connection</button>
            </div>
          </form>
          <div id="srTestResult" style="margin-top:12px; display:none; padding:12px; border-radius:8px; font-size:13px;"></div>
        </div>
      </div>

      <!-- Security Settings Card -->
      <div class="data-card animate-in" style="max-width: 640px; margin: 0 auto 24px;">
        <div class="data-card-header">
          <span class="data-card-title">🔒 Security Settings</span>
        </div>
        <div style="padding: 20px;">
          <form id="securitySettingsForm" onsubmit="saveSecurityConfig(event)">
            <div class="form-group">
              <label class="form-label">🌐 Website Domain URL</label>
              <input type="url" class="form-input" id="sec_domainUrl" value="${settings.site_url||''}" placeholder="https://yourdomain.com">
              <small style="color:var(--text-muted); font-size:11px;">Is domain ka use CORS aur HTTP→HTTPS redirect ke liye hoga. Production mode me sirf is domain se API access ho payega.</small>
            </div>
            <div style="display:flex; gap:16px; margin:16px 0; padding:12px; background:rgba(255,255,255,0.03); border-radius:8px;">
              <div style="flex:1; text-align:center; padding:8px; border-radius:6px; background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.2);">
                <div style="font-size:24px; margin-bottom:4px;">🔒</div>
                <div style="font-size:12px; color:var(--text-muted);">HTTPS</div>
                <div style="font-size:13px; font-weight:600; color:#22c55e;">Host pe depend</div>
              </div>
              <div style="flex:1; text-align:center; padding:8px; border-radius:6px; background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.2);">
                <div style="font-size:24px; margin-bottom:4px;">🛡️</div>
                <div style="font-size:12px; color:var(--text-muted);">CORS</div>
                <div style="font-size:13px; font-weight:600; color:#22c55e;">${settings.site_url ? 'Restricted' : 'Open (dev)'}</div>
              </div>
              <div style="flex:1; text-align:center; padding:8px; border-radius:6px; background:rgba(255,193,7,0.1); border:1px solid rgba(255,193,7,0.2);">
                <div style="font-size:24px; margin-bottom:4px;">⚡</div>
                <div style="font-size:12px; color:var(--text-muted);">Mode</div>
                <div style="font-size:13px; font-weight:600; color:#f0c040;">Production</div>
              </div>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;">💾 Save Security Settings</button>
          </form>
        </div>
      </div>

      <!-- Email Configuration Card -->
      <div class="data-card animate-in" style="max-width: 640px; margin: 0 auto 24px;">
        <div class="data-card-header">
          <span class="data-card-title">📧 Email Configuration</span>
        </div>
        <div style="padding: 20px;">
          <form id="emailConfigForm" onsubmit="saveEmailConfig(event)">
            <div style="margin-bottom:16px; padding:12px; background:rgba(255,193,7,0.1); border:1px solid rgba(255,193,7,0.3); border-radius:8px; font-size:13px; color:#f0c040;">
              ⚠️ Gmail App Password use karte waqt <strong>spaces hatao</strong>. Password mein koi space nahi hona chahiye.
            </div>
            <div class="form-group">
              <label class="form-label">Alert Email (Security Alerts)</label>
              <input type="email" class="form-input" id="ec_alertEmail" value="${settings.email_config?.alertEmail||''}" placeholder="alert@example.com">
            </div>
            <div class="form-group">
              <label class="form-label">Alert Email Password (Gmail App Password)</label>
              <input type="password" class="form-input" id="ec_alertPass" value="${settings.email_config?.alertPass === '__CONFIGURED__' ? '' : settings.email_config?.alertPass||''}" placeholder="Leave empty to keep current" autocomplete="new-password">
              <small style="color:var(--text-muted); font-size:11px;">Used for failed login attempt alerts</small>
            </div>
            <hr style="border-color:var(--border-subtle); margin:16px 0;">
            <div class="form-group">
              <label class="form-label">OTP Email (Customer OTPs)</label>
              <input type="email" class="form-input" id="ec_otpEmail" value="${settings.email_config?.otpEmail||''}" placeholder="otp@example.com">
            </div>
            <div class="form-group">
              <label class="form-label">OTP Email Password (Gmail App Password)</label>
              <input type="password" class="form-input" id="ec_otpPass" value="${settings.email_config?.otpPass === '__CONFIGURED__' ? '' : settings.email_config?.otpPass||''}" placeholder="Leave empty to keep current" autocomplete="new-password">
              <small style="color:var(--text-muted); font-size:11px;">Used for customer login/registration OTPs. Falls back to Alert Email if empty.</small>
            </div>
            <hr style="border-color:var(--border-subtle); margin:16px 0;">
            <div class="form-group">
              <label class="form-label">Admin 2FA Email (OTP receiver)</label>
              <input type="email" class="form-input" id="ec_2faEmail" value="${settings.email_config?.admin2faEmail||''}" placeholder="admin@example.com">
              <small style="color:var(--text-muted); font-size:11px;">Receives admin login 2FA OTP. Falls back to Alert Email if empty.</small>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%; margin-top:8px;">💾 Save Email Configuration</button>
          </form>
        </div>
      </div>
    `);

    // Add toggle animations
    document.querySelectorAll('#settingsForm input[type="checkbox"], #websiteSettingsForm input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const spanBg = e.target.nextElementSibling;
        const spanCircle = spanBg.firstElementChild;
        if (e.target.checked) {
          spanBg.style.backgroundColor = 'var(--success)';
          spanCircle.style.left = '28px';
        } else {
          spanBg.style.backgroundColor = '#ccc';
          spanCircle.style.left = '3px';
        }
      });
    });

  } catch (err) {
    content.innerHTML = safeHTML('<div class="empty-state">Error loading settings</div>');
  }
}

// ==================== TESTIMONIALS ====================
async function loadTestimonials() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state">Loading testimonials...</div>';
  try {
    const res = await fetch(`${API}/admin/testimonials`, { credentials: 'include' });
    const list = await res.json();
    content.innerHTML = safeHTML(`
      <div style="display:flex; justify-content:flex-end; margin-bottom:16px;">
        <button class="btn btn-primary" onclick="showTestimonialForm()">+ Add Testimonial</button>
      </div>
      <div class="data-table-container">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Role</th><th>Text</th><th>Rating</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            ${list.map(t => `
              <tr>
                <td><strong>${t.name}</strong></td>
                <td>${t.role || '-'}</td>
                <td style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">"${t.text}"</td>
                <td>${'★'.repeat(t.rating)}${'☆'.repeat(5-t.rating)}</td>
                <td>${t.active ? '<span style="color:var(--success)">Yes</span>' : '<span style="color:var(--text-muted)">No</span>'}</td>
                <td>
                  <button class="btn btn-sm" onclick="showTestimonialForm(${t.id})" style="margin-right:4px;">✏️</button>
                  <button class="btn btn-sm" onclick="deleteTestimonial(${t.id})" style="color:var(--danger);">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${!list.length ? '<div class="empty-state" style="margin-top:24px;">No testimonials yet. Click "Add Testimonial" to create one.</div>' : ''}
    `);
  } catch (err) {
    content.innerHTML = safeHTML('<div class="empty-state">Error loading testimonials</div>');
  }
}

async function showTestimonialForm(id) {
  const content = document.getElementById('pageContent');
  let t = { name: '', role: '', text: '', rating: 5, sort_order: 0, active: 1 };
  if (id) {
    const res = await fetch(`${API}/admin/testimonials`, { credentials: 'include' });
    const list = await res.json();
    t = list.find(x => x.id === id) || t;
  }
  content.innerHTML = safeHTML(`
    <div class="data-card" style="max-width:600px; margin:0 auto;">
      <div class="data-card-header">
        <span class="data-card-title">${id ? 'Edit Testimonial' : 'Add Testimonial'}</span>
        <button class="btn btn-sm" onclick="loadTestimonials()">← Back</button>
      </div>
      <div style="padding:20px;">
        <form onsubmit="saveTestimonial(event, ${id||''})">
          <div class="form-group"><label class="form-label">Name *</label><input type="text" class="form-input" id="t_name" value="${t.name}" required></div>
          <div class="form-group"><label class="form-label">Role</label><input type="text" class="form-input" id="t_role" value="${t.role}" placeholder="Shopkeeper, Madhubani"></div>
          <div class="form-group"><label class="form-label">Review *</label><textarea class="form-input" id="t_text" rows="3" required>${t.text}</textarea></div>
          <div class="form-group"><label class="form-label">Rating (1-5)</label><input type="number" class="form-input" id="t_rating" value="${t.rating}" min="1" max="5"></div>
          <div class="form-group"><label class="form-label">Sort Order</label><input type="number" class="form-input" id="t_order" value="${t.sort_order}"></div>
          <div class="form-group" style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="t_active" ${t.active ? 'checked' : ''} style="width:18px;height:18px;">
            <label for="t_active">Active</label>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">${id ? 'Update' : 'Create'} Testimonial</button>
        </form>
      </div>
    </div>
  `);
}

async function saveTestimonial(e, id) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.textContent = 'Saving...';
  const payload = {
    name: document.getElementById('t_name').value.trim(),
    role: document.getElementById('t_role').value.trim(),
    text: document.getElementById('t_text').value.trim(),
    rating: parseInt(document.getElementById('t_rating').value) || 5,
    sort_order: parseInt(document.getElementById('t_order').value) || 0,
    active: document.getElementById('t_active').checked
  };
  try {
    const url = id ? `${API}/admin/testimonials/${id}` : `${API}/admin/testimonials`;
    const method = id ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { loadTestimonials(); }
    else { const d = await res.json(); alert(d.error || 'Failed to save'); }
  } catch (err) { alert('Error: ' + err.message); }
}

async function deleteTestimonial(id) {
  if (!confirm('Delete this testimonial?')) return;
  try {
    await apiFetch(`${API}/admin/testimonials/${id}`, { method: 'DELETE' });
    loadTestimonials();
  } catch (err) { alert('Error: ' + err.message); }
}

async function saveWebsiteSettings(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.textContent = 'Saving...';
  
  const showBulk = document.getElementById('set_bulkSection').checked ? 'true' : 'false';
  const bulukEnabled = document.getElementById('set_bulukEnabled').checked ? 'true' : 'false';
  const showProducts = document.getElementById('set_showProducts').checked ? 'true' : 'false';
  const showBestsellers = document.getElementById('set_showBestsellers').checked ? 'true' : 'false';

  try {
    const res = await apiFetch(`${API}/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_bulk_section: showBulk, buluk_enabled: bulukEnabled, show_products: showProducts, show_bestsellers: showBestsellers })
    });
    
    if (res.ok) {
      loadSettings();
    } else {
      const data = await res.json();
      alert('Failed to save settings: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error saving settings: ' + err.message);
  }
}

async function saveSettings(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  const payment_methods = {
    cod: document.getElementById('set_cod').checked,
    online: document.getElementById('set_online').checked
  };

  try {
    const res = await apiFetch(`${API}/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_methods })
    });
    if (res.ok) {
      alert('✅ Payment settings saved!');
    } else {
      alert('Failed to save settings');
    }
  } catch (err) {
    alert('Error saving settings');
  } finally {
    btn.textContent = '💾 Save Payment Settings';
    btn.disabled = false;
  }
}

async function saveShiprocketConfig(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  const srPass = document.getElementById('sr_password').value;
  const config = {
    email: document.getElementById('sr_email').value.trim(),
    password: srPass || '__CONFIGURED__',
    pickup_location: document.getElementById('sr_pickup').value.trim() || 'Primary',
    pkg_weight: parseFloat(document.getElementById('sr_weight').value) || 0.5,
    pkg_length: parseInt(document.getElementById('sr_length').value) || 30,
    pkg_breadth: parseInt(document.getElementById('sr_breadth').value) || 25,
    pkg_height: parseInt(document.getElementById('sr_height').value) || 5,
    auto_ship_prepaid_hours: parseInt(document.getElementById('sr_prepaid_h').value) || 24,
    auto_ship_cod_hours: parseInt(document.getElementById('sr_cod_h').value) || 36
  };

  try {
    const res = await apiFetch(`${API}/admin/shiprocket/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (res.ok) {
      alert('✅ Shiprocket config saved! Testing connection...');
      testShiprocket();
    } else {
      alert('❌ Failed to save Shiprocket config');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btn.textContent = '💾 Save Shiprocket Config';
    btn.disabled = false;
  }
}

async function testShiprocket() {
  const badge = document.getElementById('srStatusBadge');
  const result = document.getElementById('srTestResult');
  badge.textContent = '⬤ Testing...';
  badge.style.background = 'rgba(100,100,100,0.2)';
  badge.style.color = 'var(--text-muted)';
  result.style.display = 'none';

  try {
    const res = await fetch(`${API}/admin/shiprocket/status`, { credentials: 'include' });
    const data = await res.json();
    if (data.connected) {
      badge.textContent = '⬤ Connected';
      badge.style.background = 'rgba(34,197,94,0.15)';
      badge.style.color = '#22c55e';
      result.style.display = 'block';
      result.style.background = 'rgba(34,197,94,0.1)';
      result.style.border = '1px solid rgba(34,197,94,0.3)';
      result.style.color = '#22c55e';
      const locs = Array.isArray(data.pickup_locations) ? data.pickup_locations : [];
      result.innerHTML = safeHTML(`✅ ${data.message}<br><small style="opacity:0.7;">Pickup locations: ${locs.map(l=>l.pickup_location||l.name||'').filter(Boolean).join(', ')||'N/A'}</small>`);
    } else {
      badge.textContent = '⬤ Failed';
      badge.style.background = 'rgba(239,68,68,0.15)';
      badge.style.color = '#ef4444';
      result.style.display = 'block';
      result.style.background = 'rgba(239,68,68,0.1)';
      result.style.border = '1px solid rgba(239,68,68,0.3)';
      result.style.color = '#ef4444';
      result.textContent = '❌ ' + data.message;
    }
  } catch (e) {
    badge.textContent = '⬤ Error';
    result.style.display = 'block';
    result.textContent = '❌ Network error: ' + e.message;
  }
}

async function saveEmailConfig(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  const alertPassVal = document.getElementById('ec_alertPass').value;
  const otpPassVal = document.getElementById('ec_otpPass').value;
  const config = {
    alertEmail: document.getElementById('ec_alertEmail').value.trim(),
    alertPass: alertPassVal || '__CONFIGURED__',
    otpEmail: document.getElementById('ec_otpEmail').value.trim(),
    otpPass: otpPassVal || '__CONFIGURED__',
    admin2faEmail: document.getElementById('ec_2faEmail').value.trim()
  };

  try {
    const res = await apiFetch(`${API}/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_config: config })
    });
    if (res.ok) {
      alert('✅ Email configuration saved!');
    } else {
      const data = await res.json().catch(() => ({}));
      alert('❌ Failed: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error saving email config: ' + err.message);
  } finally {
    btn.textContent = '💾 Save Email Configuration';
    btn.disabled = false;
  }
}

async function saveSecurityConfig(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    const res = await apiFetch(`${API}/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_url: document.getElementById('sec_domainUrl').value.trim() })
    });
    if (res.ok) {
      alert('✅ Security settings saved!');
    } else {
      const data = await res.json().catch(() => ({}));
      alert('❌ Failed: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error saving security config: ' + err.message);
  } finally {
    btn.textContent = '💾 Save Security Settings';
    btn.disabled = false;
  }
}
