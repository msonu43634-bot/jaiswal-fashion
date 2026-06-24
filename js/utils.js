/* ======================================================
   JAISWAL FASHION — Utility Functions
   Shared helper functions used across all pages
   ====================================================== */

// ==================== Price Formatting ====================
function formatPrice(price) {
  return '₹' + price.toLocaleString('en-IN');
}

function calculateDiscount(originalPrice, price) {
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

// ==================== LocalStorage Helpers ====================
function getFromStorage(key, defaultValue = []) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

// ==================== Login Guard ====================
function requireLogin(returnUrl) {
  if (!isLoggedIn()) {
    const url = returnUrl || window.location.pathname;
    showToast('Please login first! 🔒', 'error');
    setTimeout(() => {
      window.location.href = `login.html?returnUrl=${encodeURIComponent(url)}`;
    }, 800);
    return false;
  }
  return true;
}

// ==================== Cart Functions ====================
function getCart() {
  return getFromStorage('jf_cart', []);
}

function addToCart(productId, color, size, quantity = 1) {
  if (!requireLogin()) return null;

  const cart = getCart();
  const existingIndex = cart.findIndex(
    item => item.productId === productId && item.color === color && item.size === size
  );

  const product = window.products ? window.products.find(p => p.id === productId) : null;
  const isBulk = product && (product.is_bulk === 1 || product.is_bulk === true);

  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
    if (isBulk && cart[existingIndex].quantity < 20) {
      cart[existingIndex].quantity = 20;
    }
  } else {
    let finalQty = quantity;
    if (isBulk && finalQty < 20) {
      finalQty = 20;
      showToast('Bulk products have a minimum order of 20. Quantity adjusted.', 'info');
    }
    cart.push({ productId, color, size, quantity: finalQty });
  }

  saveToStorage('jf_cart', cart);
  updateCartBadge();
  showToast('Added to cart!', 'success');
  return cart;
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveToStorage('jf_cart', cart);
  updateCartBadge();
  return cart;
}

function updateCartQuantity(index, quantity) {
  const cart = getCart();
  const item = cart[index];
  if (!item) return cart;

  const product = window.products ? window.products.find(p => p.id === item.productId) : null;
  const isBulk = product && (product.is_bulk === 1 || product.is_bulk === true);

  if (isBulk && quantity > 0 && quantity < 20) {
    showToast('Minimum order for bulk items is 20', 'error');
    cart[index].quantity = 20;
  } else if (quantity <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].quantity = quantity;
  }
  saveToStorage('jf_cart', cart);
  updateCartBadge();
  return cart;
}

function clearCart() {
  saveToStorage('jf_cart', []);
  updateCartBadge();
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-badge');
  const count = getCartCount();
  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ==================== Favorites Functions ====================
function getFavorites() {
  return getFromStorage('jf_favorites', []);
}

function toggleFavorite(productId) {
  if (!requireLogin()) return;

  const favorites = getFavorites();
  const index = favorites.indexOf(productId);

  if (index > -1) {
    favorites.splice(index, 1);
    showToast('Removed from favorites', 'info');
  } else {
    favorites.push(productId);
    showToast('Added to favorites! ❤️', 'success');
  }

  saveToStorage('jf_favorites', favorites);
  updateFavBadge();

  // Sync to database if logged in
  const token = localStorage.getItem('jf_customer_token');
  if (token) {
    const API_BASE = window.API_BASE || '/api';
    fetch(`${API_BASE}/customer/favorites`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ productId })
    }).catch(e => console.error('Failed to sync favorite', e));
  }

  return favorites;
}

function isFavorite(productId) {
  return getFavorites().includes(productId);
}

function updateFavBadge() {
  const badges = document.querySelectorAll('.fav-badge');
  const count = getFavorites().length;
  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ==================== User Session ====================
function getUser() {
  return getFromStorage('jf_user', null);
}

function setUser(userData) {
  saveToStorage('jf_user', userData);
}

function isLoggedIn() {
  return getUser() !== null;
}

function logout() {
  localStorage.removeItem('jf_user');
  showToast('Logged out successfully', 'info');
  window.location.href = '/login.html';
}

// ==================== Toast Notification ====================
function showToast(message, type = 'info', duration = 3000) {
  // Remove existing toast
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // Auto-remove
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ==================== Scroll Reveal ====================
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  reveals.forEach(el => observer.observe(el));
}

// ==================== Debounce ====================
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ==================== Rating Stars HTML ====================
function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  let html = '';
  for (let i = 0; i < fullStars; i++) html += '<span class="star full">★</span>';
  if (hasHalf) html += '<span class="star half">★</span>';
  for (let i = 0; i < emptyStars; i++) html += '<span class="star empty">☆</span>';

  return html;
}

// ==================== Product Image Placeholder ====================
function getProductImageHTML(product, index = 0) {
  const colorHex = product.colors[index]?.hex || product.colors[0]?.hex || '#333';
  return `
    <div class="product-image-placeholder" style="background: #f1f5f9; display: flex; align-items: center; justify-content: center;">
      <div style="color: ${colorHex}; width: 60%; height: 60%; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));">${getCategorySVG(product.category)}</div>
    </div>
  `;
}

function getCategorySVG(categoryId) {
  const svgs = {
    tshirt: `<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M21.43 6.13L16 3.4A1.94 1.94 0 0 0 15 3a4 4 0 0 1-6 0 1.94 1.94 0 0 0-1-.4L2.57 6.13A1 1 0 0 0 2 7v2.5a1 1 0 0 0 .55.89l2.45 1.23V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8.38l2.45-1.23A1 1 0 0 0 22 9.5V7a1 1 0 0 0-.57-.87z"/></svg>`,
    lower: `<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M5.5 3h13a1 1 0 0 1 1 1v1h-15V4a1 1 0 0 1 1-1zm13.9 3.5l-2.4 14.5a1 1 0 0 1-1 .85h-3a1 1 0 0 1-1-1V12h-2v8.85a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-.85L4.6 6.5h14.8z"/></svg>`,
    halfpant: `<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M5.5 4h13a1.5 1.5 0 0 1 1.5 1.5v1h-16v-1A1.5 1.5 0 0 1 5.5 4zm14.4 3.5l-1.5 10A1.5 1.5 0 0 1 16.9 19H13v-6h-2v6H7.1a1.5 1.5 0 0 1-1.5-1.5l-1.5-10h15.8z"/></svg>`,
    jacket: `<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M16 3H8a2 2 0 0 0-2 2v2H4.5A1.5 1.5 0 0 0 3 8.5v2A1.5 1.5 0 0 0 4.5 12H6v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8h1.5A1.5 1.5 0 0 0 21 10.5v-2A1.5 1.5 0 0 0 19.5 7H18V5a2 2 0 0 0-2-2zM8 5h8v2H8V5zm4 15V8h2v12h-2z"/></svg>`,
    hoodie: `<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M12 2C8.7 2 6 4.7 6 8v1H3.5A1.5 1.5 0 0 0 2 10.5v3A1.5 1.5 0 0 0 3.5 15H5v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6h1.5a1.5 1.5 0 0 0 1.5-1.5v-3A1.5 1.5 0 0 0 19.5 9H18V8c0-3.3-2.7-6-6-6zm0 2c2.2 0 4 1.8 4 4v1H8V8c0-2.2 1.8-4 4-4zm-1 5h2v12h-2z"/></svg>`,
    kurta: `<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M21 7l-5-2.5V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v1.5L3 7a1 1 0 0 0-.5.9V11a1 1 0 0 0 .5.9L5 13v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8l2-1.1a1 1 0 0 0 .5-.9V7.9a1 1 0 0 0-.5-.9zM11 3h2v7h-2V3z"/></svg>`,
    buluk: `<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M21 8.5V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v2.5A3.5 3.5 0 0 0 6.5 12 3.5 3.5 0 0 0 3 15.5V18a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2.5a3.5 3.5 0 0 0-3.5-3.5 3.5 3.5 0 0 0 3.5-3.5zM5 8h14v.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8zm14 8H5v-.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v.5z"/></svg>`,
    sweater: `<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M20.5 5.5L16 3.2A2.5 2.5 0 0 0 14.5 3h-5A2.5 2.5 0 0 0 8 3.2L3.5 5.5A1 1 0 0 0 3 6.3v3.4a1 1 0 0 0 .6.9l2.4 1.2V20a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8.2l2.4-1.2a1 1 0 0 0 .6-.9V6.3a1 1 0 0 0-.5-.8z"/></svg>`
  };
  return svgs[categoryId] || svgs.tshirt;
}

// ==================== URL Params ====================
function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ==================== Image URL Helper ====================
// Returns full URL for product images (served by Express on port 3000)
function getImageUrl(imagePath) {
  if (!imagePath) return '';
  const cleanPath = imagePath.replace(/^\.\//, '/');
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }
  // Use relative URL so it works on any port (Vite proxy or Express)
  return cleanPath;
}

// ==================== Generate Product Card HTML ====================
function createProductCard(product) {
  const discount = calculateDiscount(product.originalPrice, product.price);
  const favClass = isFavorite(product.id) ? 'active' : '';
  const defaultColorHex = (product.colors && product.colors.length > 0) ? product.colors[0].hex : '#333';
  const firstColorName = (product.colors && product.colors.length > 0) ? product.colors[0].name : null;
  let imageHTML;
  if (product.images && product.images.length > 0) {
    let matchedImg = product.images[0];
    if (firstColorName) {
      const found = product.images.find(img => img.color_name && img.color_name.toLowerCase() === firstColorName.toLowerCase());
      if (found) matchedImg = found;
    }
    const imgUrl = getImageUrl(matchedImg.image_path);
    imageHTML = `<img src="${imgUrl}" alt="${product.name}" style="width:100%; height:100%; object-fit:contain; object-position:center; position:absolute; top:0; left:0; padding:8px; border-radius: var(--radius-lg) var(--radius-lg) 0 0;" id="img-${product.id}">`;
  } else {
    imageHTML = `
    <div class="product-image-bg" style="background: ${product.gradient || '#f1f5f9'}; display: flex; align-items: center; justify-content: center; width:100%; height:100%; position:absolute; top:0; left:0; border-radius: var(--radius-lg) var(--radius-lg) 0 0;">
      <span class="product-emoji" id="icon-${product.id}" style="color: ${defaultColorHex}; width: 50%; height: 50%; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.15)); transition: color 0.3s ease;">
        ${getCategorySVG(product.category)}
      </span>
    </div>`;
  }

  return safeHTML(`
    <div class="product-card reveal" data-product-id="${product.id}" onclick="window.location.href='product-detail.html?id=${product.id}'">
      <div class="product-card-image" style="position:relative; width:100%; padding-top:120%;">
        ${imageHTML}
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        <button class="product-fav-btn ${favClass}" onclick="event.stopPropagation(); window.handleFavClick('${product.id}', this)" aria-label="Add to favorites">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${favClass ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <span class="product-discount-tag">-${discount}%</span>
      </div>
      <div class="product-card-body">
        <p class="product-card-category">${getCategoryName(product.category)}</p>
        <h3 class="product-card-name">${product.name}</h3>
        <div class="product-card-rating">
          ${renderStars(product.rating)}
          <span class="rating-count">(${product.reviewCount})</span>
        </div>
        <div class="product-card-colors">
          ${product.colors.slice(0, 4).map(c => `<span class="color-dot" style="background:${c.hex}" title="${c.name}" onclick="event.stopPropagation(); const icon = document.getElementById('icon-${product.id}'); if(icon) icon.style.color = '${c.hex}';"></span>`).join('')}
        </div>
        <div class="product-card-price">
          <span class="current-price">${formatPrice(product.price)}</span>
          <span class="original-price">${formatPrice(product.originalPrice)}</span>
        </div>
      </div>
    </div>
  `);
}

function getCategoryName(categoryId) {
  const names = {
    tshirt: 'T-Shirt',
    lower: 'Lower',
    halfpant: 'Half Pant',
    jacket: 'Jacket',
    hoodie: 'Hoodie',
    kurta: 'Kurta',
    buluk: 'Bulk Order Only',
    sweater: 'Sweater',
  };
  return names[categoryId] || categoryId;
}

// ==================== Navbar HTML ====================
function getNavbarHTML(activePage = '') {
  const user = getUser();
  const cartCount = getCartCount();
  const favCount = getFavorites().length;

  return `
    <nav class="navbar" id="navbar">
      <div class="container navbar-inner">
        <a href="index.html" class="navbar-brand">
          <div class="brand-logo-container">
            <img src="./image/logo.jpeg" alt="Jaiswal Fashion Logo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: contain; background: #000;">
          </div>
          <div class="brand-text">
            <span class="brand-name">JAISWAL <span class="text-gold">FASHION</span></span>
            <span class="brand-location">Madhubani, Bihar</span>
          </div>
        </a>

        <!-- Location Widget -->
        <div class="nav-location desktop-only" style="display: flex; align-items: center; gap: 8px; color: var(--text-secondary); cursor: pointer; transition: all 0.3s; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid transparent;" onclick="detectUserLocation()" onmouseover="this.style.background='var(--bg-glass)'; this.style.borderColor='var(--border)';" onmouseout="this.style.background='transparent'; this.style.borderColor='transparent';">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.5px;">Delivering to</span>
            <span id="locationText" style="font-weight: 600; color: var(--text-white); font-size: 13px;">Select Location</span>
          </div>
        </div>

        <ul class="navbar-links" id="navLinks">
          <li><a href="index.html" class="${activePage === 'home' ? 'active' : ''}">Home</a></li>
          <li><a href="about.html" class="${activePage === 'about' ? 'active' : ''}">About Us</a></li>
          <li id="navProductsLink"><a href="products.html" class="${activePage === 'products' ? 'active' : ''}">Products</a></li>
          <li id="navBulukLink"><a href="bulk-product.html" class="${activePage === 'buluk' ? 'active' : ''}">Bulk Order Only</a></li>
          <li><a href="bulk-orders.html" class="${activePage === 'bulk' ? 'active' : ''}">Bulk Enquiries</a></li>
          <li><a href="contact.html" class="${activePage === 'contact' ? 'active' : ''}">Contact</a></li>
        </ul>

        <div class="navbar-actions">
          <a href="#" class="nav-icon-btn" title="Favorites" onclick="event.preventDefault(); if(!isLoggedIn()){requireLogin('favorites.html');return;} window.location.href='favorites.html';">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span class="fav-badge icon-badge" style="display:${favCount > 0 ? 'flex' : 'none'}">${favCount}</span>
          </a>
          <a href="#" class="nav-icon-btn" title="Cart" onclick="event.preventDefault(); if(!isLoggedIn()){requireLogin('cart.html');return;} window.location.href='cart.html';">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span class="cart-badge icon-badge" style="display:${cartCount > 0 ? 'flex' : 'none'}">${cartCount}</span>
          </a>
          ${user ? `
          <div class="user-dropdown-container">
            <button class="nav-icon-btn" title="${user.name}" style="border:none; background:transparent; cursor:pointer;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
            <div class="user-dropdown-menu">
              <div class="user-dropdown-header">
                <div class="user-name">${user.name}</div>
                <div class="user-email">${user.email || user.phone || ''}</div>
              </div>
              <a href="profile.html" class="user-dropdown-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                My Profile
              </a>
              <a href="profile.html?tab=orders" class="user-dropdown-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                Orders
              </a>
              <a href="favorites.html" class="user-dropdown-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                Wishlist
              </a>
              <a href="#" class="user-dropdown-item" onclick="event.preventDefault(); if(confirm('Logout?')) { localStorage.removeItem('jf_user'); localStorage.removeItem('jf_customer_token'); location.reload(); }">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Logout
              </a>
            </div>
          </div>
          ` : `
          <a href="login.html" class="nav-icon-btn" title="Login">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </a>
          `}
          <button class="navbar-hamburger" id="navHamburger" aria-label="Toggle menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </nav>
  `;
}

// ==================== Footer HTML ====================
function getFooterHTML() {
  return `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="footer-logo">
              <div class="brand-logo-container">
                <img src="./image/logo.jpeg" alt="Jaiswal Fashion Logo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: contain; background: #000;">
              </div>
              <div>
                <h3>JAISWAL <span class="text-gold">FASHION</span></h3>
                <p>Madhubani, Bihar</p>
              </div>
            </div>
            <p class="footer-desc">Premium quality garments manufactured in Madhubani, Bihar. Serving shopkeepers across 5+ districts with the best wholesale prices since 2019.</p>
            <div class="footer-social">
              <a href="#" class="social-link" aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" class="social-link" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" class="social-link" aria-label="YouTube">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#0a0a0a"/></svg>
              </a>
              <a href="https://wa.me/918084341453" class="social-link" aria-label="WhatsApp">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              </a>
            </div>
          </div>

          <div class="footer-links-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="index.html">Home</a></li>
              <li><a href="about.html">About Us</a></li>
              <li><a href="products.html">Products</a></li>
              <li><a href="bulk-orders.html">Bulk Enquiries</a></li>
              <li><a href="contact.html">Contact</a></li>
            </ul>
          </div>

          <div class="footer-links-col">
            <h4>Categories</h4>
            <ul>
              <li><a href="products.html?category=tshirt">T-Shirts</a></li>
              <li><a href="products.html?category=lower">Lowers</a></li>
              <li><a href="products.html?category=halfpant">Half Pants</a></li>
              <li><a href="products.html?category=jacket">Jackets</a></li>
              <li><a href="products.html?category=hoodie">Hoodies</a></li>
              <li><a href="products.html?category=kurta">Kurtas</a></li>
            </ul>
          </div>

          <div class="footer-links-col">
            <h4>Contact Info</h4>
            <ul class="footer-contact">
              <li>📍 <a href="https://www.google.com/maps/search/?api=1&query=Jaiswal+fashion+manufacturing+garment+mahatha+ladnia+847232" target="_blank" style="color: inherit; text-decoration: none;">Jaiswal fashion manufacturing garment mahatha ladnia 847232</a></li>
              <li>📞 <a href="https://wa.me/918084341453" target="_blank" style="color: inherit; text-decoration: none;">+91 80843 41453</a></li>
              <li>✉️ <a href="mailto:jaiswalfashions@gmail.com" style="color: inherit; text-decoration: none;">jaiswalfashions@gmail.com</a></li>
              <li>🕐 Mon-Sat: 9AM - 7PM</li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <p>&copy; 2025 Jaiswal Fashion. All rights reserved. | Made with ❤️ in Madhubani, Bihar</p>
          <div class="footer-bottom-links">
            <a href="privacy-policy.html">Privacy Policy</a>
            <a href="terms-of-service.html">Terms of Service</a>
            <a href="shopping-policy.html">Shopping Policy</a>
            <a href="replacement-policy.html">Replacement Policy</a>
          </div>
        </div>
      </div>
    </footer>
    <!-- Floating WhatsApp Button -->
    <a href="https://wa.me/918084341453" target="_blank" class="floating-whatsapp" aria-label="Chat on WhatsApp">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
    </a>
    <!-- Scroll to Top Button -->
    <button class="scroll-to-top" id="scrollToTopBtn" aria-label="Scroll to top" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
    </button>
  `;
}

// ==================== Location Logic ====================
async function detectUserLocation() {
  const locText = document.getElementById('locationText');
  
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'error');
    return;
  }

  locText.innerHTML = '<span style="color:var(--gold);">Detecting...</span>';
  
  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
      const data = await res.json();
      
      const city = data.city || data.locality || data.principalSubdivision || 'Unknown Location';
      const state = data.principalSubdivision || '';
      
      const locationString = `${city}${state ? ', ' + state : ''}`;
      locText.textContent = locationString;
      
      localStorage.setItem('jf_user_location', locationString);
      showToast('Location updated', 'success');
      
    } catch (err) {
      locText.textContent = 'Select Location';
      showToast('Failed to fetch location name', 'error');
    }
  }, (error) => {
    locText.textContent = 'Select Location';
    if (error.code === error.PERMISSION_DENIED) {
      showToast('Please allow location access in your browser', 'warning');
    } else {
      showToast('Failed to detect location', 'error');
    }
  });
}

function initLocation() {
  const saved = localStorage.getItem('jf_user_location');
  if (saved) {
    const el = document.getElementById('locationText');
    if (el) el.textContent = saved;
  }
}

// Check if buluk section is enabled, hide if not
function applyBulukSettings() {
  fetch(`/api/settings`)
    .then(r => r.json())
    .then(settings => {
      const enabled = settings.buluk_enabled == true || settings.buluk_enabled === 'true';
      const navLink = document.getElementById('navBulukLink');
      if (navLink) navLink.style.display = enabled ? '' : 'none';
      const bulukSection = document.getElementById('bulukSection');
      if (bulukSection) bulukSection.style.display = enabled ? '' : 'none';
    })
    .catch(() => {});
}
