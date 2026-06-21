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
