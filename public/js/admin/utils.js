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
  return str;
};

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
