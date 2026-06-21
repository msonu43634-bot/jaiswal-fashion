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
