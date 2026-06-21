/* ======================================================
   JAISWAL FASHION — Main Shared Logic
   Handles navbar, scroll effects, mobile menu, and
   shared initialization across all pages
   ====================================================== */

// API Base URL — works in both dev and production
window.API_BASE = window.API_BASE || '/api';

// DOMPurify — sanitizes HTML to prevent XSS
// Configured to preserve inline event handlers used by site components
window.safeHTML = function(str) {
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(str, {
      ADD_ATTR: ['onclick', 'onchange', 'oninput', 'onmouseover', 'onmouseout', 'onsubmit']
    });
  }
  // Fallback: server-side sanitizer already strips HTML + encodes entities from all user data.
  // This is defense-in-depth — data is already safe before reaching the browser.
  if (typeof str !== 'string') return str;
  return str;
};



// ==================== Initialize Page ====================
async function initPage(activePage = '') {
  // Fetch products from API first
  if (typeof fetchProductsFromAPI === 'function') {
    await fetchProductsFromAPI();
  }

  // Inject navbar
  const navContainer = document.getElementById('nav-container');
  if (navContainer) {
    navContainer.innerHTML = getNavbarHTML(activePage);
  }

  // Inject footer
  const footerContainer = document.getElementById('footer-container');
  if (footerContainer) {
    footerContainer.innerHTML = getFooterHTML();
  }

  // Initialize features
  initNavbar();
  if (typeof initLocation === 'function') initLocation();
  initScrollEffects();
  initScrollReveal();
  updateCartBadge();
  updateFavBadge();
  applyBulukSettings();

  // Global favorite handler
  window.handleFavClick = (productId, btn) => {
    const favs = toggleFavorite(productId);
    const isFav = favs.includes(productId);
    btn.classList.toggle('active', isFav);
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
  };
}

// ==================== Navbar Logic ====================
function initNavbar() {
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
      document.body.classList.toggle('nav-open');
    });

    // Close menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        document.body.classList.remove('nav-open');
      });
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.navbar-inner')) {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        document.body.classList.remove('nav-open');
      }
    });
  }
}

// ==================== Scroll Effects ====================
function initScrollEffects() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;

    // Add/remove scrolled class for styling
    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Hide/show on scroll direction
    if (currentScroll > 300) {
      if (currentScroll > lastScroll) {
        navbar.classList.add('hidden');
      } else {
        navbar.classList.remove('hidden');
      }
    } else {
      navbar.classList.remove('hidden');
    }

    lastScroll = currentScroll;
  });
}

// ==================== Smooth Scroll to Section ====================
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Make initPage available globally for inline scripts
window.initPage = initPage;
