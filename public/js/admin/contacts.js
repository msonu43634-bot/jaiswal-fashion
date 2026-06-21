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
