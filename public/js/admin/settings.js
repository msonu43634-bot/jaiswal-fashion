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
                <strong style="display:block; font-size: 16px; margin-bottom: 4px;">Product Order Only</strong>
                <span style="color: var(--text-secondary); font-size: 13px;">Display the Products section on header.</span>
              </div>
              <label class="switch" style="position:relative; display:inline-block; width:50px; height:24px;">
                <input type="checkbox" id="set_productSection" ${settings.show_products == true || settings.show_products === 'true' ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${settings.show_products == true || settings.show_products === 'true' ? 'var(--success)' : '#ccc'}; transition:.4s; border-radius:34px;">
                  <span style="position:absolute; height:18px; width:18px; left: ${settings.show_products == true || settings.show_products === 'true' ? '28px' : '3px'}; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
                </span>
              </label>
            </div>
            <div class="form-group" style="display:flex; align-items:center; justify-content:space-between; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-subtle);">
              <div>
                <strong style="display:block; font-size: 16px; margin-bottom: 4px;">Buluk Order Only</strong>
                <span style="color: var(--text-secondary); font-size: 13px;">Display the Buluk section on header.</span>
              </div>
              <label class="switch" style="position:relative; display:inline-block; width:50px; height:24px;">
                <input type="checkbox" id="set_bulukEnabled" ${settings.buluk_enabled == true || settings.buluk_enabled === 'true' ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${settings.buluk_enabled == true || settings.buluk_enabled === 'true' ? 'var(--success)' : '#ccc'}; transition:.4s; border-radius:34px;">
                  <span style="position:absolute; height:18px; width:18px; left: ${settings.buluk_enabled == true || settings.buluk_enabled === 'true' ? '28px' : '3px'}; bottom:3px; background-color:white; transition:.4s; border-radius:50%;"></span>
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
          <thead><tr><th>Image</th><th>Name</th><th>Role</th><th>Text</th><th>Rating</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            ${list.map(t => `
              <tr>
                <td>${t.image ? `<img src="${t.image}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">` : '<span style="color:var(--text-muted);font-size:11px;">No img</span>'}</td>
                <td><strong>${t.name}</strong></td>
                <td>${t.role || '-'}</td>
                <td style="max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">"${t.text}"</td>
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
  let t = { name: '', role: '', text: '', rating: 5, sort_order: 0, active: 1, image: '' };
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
          <div class="form-group">
            <label class="form-label">Photo</label>
            <div style="display:flex; align-items:center; gap:12px;">
              ${t.image ? `<img src="${t.image}" id="t_imagePreview" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);">` : '<div id="t_imagePreview" style="display:none;"></div>'}
              <input type="file" accept="image/*" id="t_image" onchange="previewTestimonialImage(this)">
            </div>
            ${t.image ? `<span style="font-size:12px;color:var(--text-muted);">Leave empty to keep current photo</span>` : ''}
          </div>
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

function previewTestimonialImage(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('t_imagePreview');
      preview.src = e.target.result;
      preview.style.display = 'block';
      preview.style.width = '60px';
      preview.style.height = '60px';
      preview.style.borderRadius = '50%';
      preview.style.objectFit = 'cover';
      preview.style.border = '2px solid var(--gold)';
    };
    reader.readAsDataURL(input.files[0]);
  }
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
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Failed to save'); btn.textContent = id ? 'Update' : 'Create'; return; }

    // Upload image if selected
    const fileInput = document.getElementById('t_image');
    const testimonialId = id || (await res.json()).id;
    if (fileInput && fileInput.files.length > 0 && testimonialId) {
      const formData = new FormData();
      formData.append('image', fileInput.files[0]);
      const imgRes = await apiFetch(`${API}/admin/testimonials/${testimonialId}/image`, {
        method: 'POST',
        body: formData
      });
      if (!imgRes.ok) alert('Testimonial saved, but image upload failed.');
    }
    loadTestimonials();
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
  
  const showProducts = document.getElementById('set_productSection').checked ? 'true' : 'false';
  const bulukEnabled = document.getElementById('set_bulukEnabled').checked ? 'true' : 'false';

  try {
    const res = await apiFetch(`${API}/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_products: showProducts, buluk_enabled: bulukEnabled, show_bulk_section: 'false' })
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
