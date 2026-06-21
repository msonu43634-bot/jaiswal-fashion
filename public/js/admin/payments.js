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
