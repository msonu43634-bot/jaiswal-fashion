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
