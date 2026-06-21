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
