// ==================== PRODUCTS ====================
async function loadProducts() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>Loading products...</p></div>';

  try {
    const res = await fetch(`${API}/products`, { credentials: 'include' });
    productsData = await res.json();

    const catNames = { tshirt: 'T-Shirt', lower: 'Lower', halfpant: 'Half Pant', jacket: 'Jacket', hoodie: 'Hoodie', kurta: 'Kurta', buluk: 'Bulk Order Only', sweater: 'Sweater' };

    content.innerHTML = safeHTML(`
      <div class="data-card animate-in">
        <div class="data-card-header">
          <span class="data-card-title">All Products (${productsData.length})</span>
          <div style="display:flex; gap:12px;">
            <div class="search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search products..." id="productSearch" oninput="filterProducts()">
            </div>
            <button class="btn btn-primary" onclick="openAddProduct()">+ Add Product</button>
          </div>
        </div>
        <div style="overflow-x:auto;">
        <table class="data-table" id="productsTable">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Colors</th>
              <th>Sizes</th>
              <th>Images</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${productsData.map(p => `
              <tr data-id="${p.id}" data-name="${p.name.toLowerCase()}">
                <td>
                  <div class="product-cell">
                    <div class="product-thumb" style="background:${p.gradient || '#333'}">
                      ${getCatEmoji(p.category)}
                    </div>
                    <div>
                      <div class="product-cell-name">${p.name}</div>
                      <div class="product-cell-id">${p.id} ${p.badge ? `· <span style="color:var(--gold)">${p.badge}</span>` : ''}</div>
                    </div>
                  </div>
                </td>
                <td>${catNames[p.category] || p.category}</td>
                <td>
                  <div style="font-weight:700;">₹${p.price}</div>
                  <div style="font-size:12px;color:var(--text-muted);text-decoration:line-through;">₹${p.originalPrice}</div>
                </td>
                <td>
                  <div style="display:flex;gap:4px;">
                    ${(p.colors || []).map(c => `<span class="color-swatch" style="background:${c.hex};width:20px;height:20px;border-radius:4px;display:inline-block;" title="${c.name}"></span>`).join('')}
                  </div>
                </td>
                <td><span style="font-size:13px;">${(p.sizes || []).join(', ')}</span></td>
                <td><span style="font-size:13px; color:${p.images && p.images.length ? 'var(--success)' : 'var(--text-muted)'};">${p.images ? p.images.length : 0} 📷</span></td>
                <td><span class="status-badge ${p.inStock ? 'status-completed' : 'status-cancelled'}">${p.inStock ? 'In Stock' : 'Out'}</span></td>
                <td>
                  <div style="display:flex;gap:6px;">
                    <button class="btn-icon" title="Edit" onclick="openEditProduct('${p.id}')">✏️</button>
                    <button class="btn-icon" title="Delete" onclick="deleteProduct('${p.id}', '${encodeURIComponent(p.name)}')">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>
      </div>
    `);
  } catch (err) {
    content.innerHTML = safeHTML('<div class="empty-state"><div class="empty-state-icon">❌</div><p>Error loading products</p></div>');
  }
}

function getCatEmoji(cat) {
  return { tshirt: '👕', lower: '👖', halfpant: '🩳', jacket: '🧥', hoodie: '🔶', kurta: '👘', buluk: '🧶', sweater: '🧶' }[cat] || '👕';
}

function filterProducts() {
  const q = document.getElementById('productSearch').value.toLowerCase();
  document.querySelectorAll('#productsTable tbody tr').forEach(row => {
    row.style.display = row.dataset.name.includes(q) ? '' : 'none';
  });
}

// ==================== BULUK PRODUCTS ====================
async function loadBulukProducts() {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>Loading bulk products...</p></div>';

  try {
    const res = await fetch(`${API}/products`, { credentials: 'include' });
    const allProducts = await res.json();
    productsData = allProducts.filter(p => p.category === 'buluk');

    const catNames = { tshirt: 'T-Shirt', lower: 'Lower', halfpant: 'Half Pant', jacket: 'Jacket', hoodie: 'Hoodie', kurta: 'Kurta', buluk: 'Bulk Order Only', sweater: 'Sweater' };

    content.innerHTML = safeHTML(`
      <div class="data-card animate-in">
        <div class="data-card-header">
          <span class="data-card-title">Bulk Products (${productsData.length})</span>
          <div style="display:flex; gap:12px;">
            <div class="search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search bulk products..." id="productSearch" oninput="filterProducts()">
            </div>
            <button class="btn btn-primary" onclick="openAddBulukProduct()">+ Add Bulk Product</button>
          </div>
        </div>
        <div style="overflow-x:auto;">
        <table class="data-table" id="productsTable">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Colors</th>
              <th>Sizes</th>
              <th>Images</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${productsData.map(p => `
              <tr data-id="${p.id}" data-name="${p.name.toLowerCase()}">
                <td>
                  <div class="product-cell">
                    <div class="product-thumb" style="background:${p.gradient || '#333'}">
                      ${getCatEmoji(p.category)}
                    </div>
                    <div>
                      <div class="product-cell-name">${p.name}</div>
                      <div class="product-cell-id">${p.id} ${p.badge ? `· <span style="color:var(--gold)">${p.badge}</span>` : ''}</div>
                    </div>
                  </div>
                </td>
                <td>${catNames[p.category] || p.category}</td>
                <td>
                  <div style="font-weight:700;">₹${p.price}</div>
                  <div style="font-size:12px;color:var(--text-muted);text-decoration:line-through;">₹${p.originalPrice}</div>
                </td>
                <td>
                  <div style="display:flex;gap:4px;">
                    ${(p.colors || []).map(c => `<span class="color-swatch" style="background:${c.hex};width:20px;height:20px;border-radius:4px;display:inline-block;" title="${c.name}"></span>`).join('')}
                  </div>
                </td>
                <td><span style="font-size:13px;">${(p.sizes || []).join(', ')}</span></td>
                <td><span style="font-size:13px; color:${p.images && p.images.length ? 'var(--success)' : 'var(--text-muted)'};">${p.images ? p.images.length : 0} 📷</span></td>
                <td><span class="status-badge ${p.inStock ? 'status-completed' : 'status-cancelled'}">${p.inStock ? 'In Stock' : 'Out'}</span></td>
                <td>
                  <div style="display:flex;gap:6px;">
                    <button class="btn-icon" title="Edit" onclick="openEditProduct('${p.id}')">✏️</button>
                    <button class="btn-icon" title="Delete" onclick="deleteProduct('${p.id}', '${encodeURIComponent(p.name)}')">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>
      </div>
    `);
  } catch (err) {
    content.innerHTML = safeHTML('<div class="empty-state"><div class="empty-state-icon">❌</div><p>Error loading bulk products</p></div>');
  }
}

function openAddBulukProduct() {
  openAddProduct();
  document.getElementById('pf_category').value = 'buluk';
}

// ==================== PRODUCT MODAL ====================
function openAddProduct() {
  document.getElementById('productModalTitle').textContent = 'Add New Product';
  document.getElementById('productSaveBtn').textContent = '💾 Save Product';
  document.getElementById('pf_editId').value = '';
  document.getElementById('productForm').reset();
  document.getElementById('pf_isBulk').checked = false;
  
  window.currentProductData = null; // Important for state check
  
  editColors = [];
  editSizes = ['S', 'M', 'L', 'XL'];
  renderColors();
  renderSizes();
  loadCategoryOptions();
  
  document.getElementById('pf_imageColorSelect').value = '';
  loadImagesForSelectedColor(); // This auto-enables for default state
  openModal('productModal');
}

// Enable/disable image grid + add angle button together
function setImageGridEnabled(enabled) {
  const grid = document.getElementById('pf_imageGrid');
  const addBtn = document.getElementById('pf_addAngleBtn');
  grid.style.opacity = enabled ? '1' : '0.5';
  grid.style.pointerEvents = enabled ? 'auto' : 'none';
  if (addBtn) {
    addBtn.disabled = !enabled;
    addBtn.style.opacity = enabled ? '1' : '0.5';
    addBtn.style.pointerEvents = enabled ? 'auto' : 'none';
  }
}

function openEditProduct(id) {
  const p = productsData.find(x => x.id === id);
  if (!p) return;
  
  window.currentProductData = p; // Important to set before renderColors

  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('productSaveBtn').textContent = '💾 Update Product';
  document.getElementById('pf_editId').value = p.id;
  document.getElementById('pf_name').value = p.name;
  document.getElementById('pf_price').value = p.price;
  document.getElementById('pf_originalPrice').value = p.originalPrice;
  document.getElementById('pf_badge').value = p.badge || '';
  document.getElementById('pf_description').value = p.description || '';
  document.getElementById('pf_material').value = p.material || '';
  document.getElementById('pf_fit').value = p.fit || 'Regular Fit';
  document.getElementById('pf_washCare').value = p.washCare || '';
  document.getElementById('pf_inStock').checked = p.inStock || p.in_stock === 1;
  document.getElementById('pf_isBulk').checked = p.isBulk || p.is_bulk === 1;

  editColors = [...(p.colors || [])];
  editSizes = [...(p.sizes || [])];
  renderColors();
  renderSizes();
  loadCategoryOptions(p.category);

  document.getElementById('pf_imageColorSelect').value = '';
  loadImagesForSelectedColor();

  openModal('productModal');
}

function loadImagesForSelectedColor() {
  let colorName = document.getElementById('pf_imageColorSelect').value;
  const p = window.currentProductData;
  const hasNoColors = editColors.length === 0;

  // If no explicit colors exist, auto-use 'default'
  if (!colorName && hasNoColors) {
    colorName = 'default';
  }

  if (!colorName) {
    setImageGridEnabled(false);
    clearAngleBoxes();
    return;
  }

  setImageGridEnabled(true);
  clearAngleBoxes();

  if (p && p.images) {
    const matched = p.images.filter(i => i.color_name && i.color_name.toLowerCase() === colorName.toLowerCase());
    if (matched.length > 0) {
      matched.forEach(img => {
        addAngleBox(img.view_angle, img.image_path, img.id);
      });
    } else {
      addAngleBox();
    }
  } else {
    addAngleBox();
  }
}

async function saveProduct() {
  const editId = document.getElementById('pf_editId').value;
  const productData = {
    name: document.getElementById('pf_name').value,
    category: document.getElementById('pf_category').value,
    price: Number(document.getElementById('pf_price').value),
    originalPrice: Number(document.getElementById('pf_originalPrice').value),
    badge: document.getElementById('pf_badge').value,
    description: document.getElementById('pf_description').value,
    material: document.getElementById('pf_material').value,
    fit: document.getElementById('pf_fit').value,
    washCare: document.getElementById('pf_washCare').value,
    inStock: document.getElementById('pf_inStock').checked,
    isBulk: document.getElementById('pf_isBulk').checked,
    colors: editColors,
    sizes: editSizes,
    gradient: `linear-gradient(135deg, ${editColors[0]?.hex || '#667eea'} 0%, ${editColors[1]?.hex || '#764ba2'} 100%)`,
    rating: 4.0,
    reviewCount: 0
  };

  if (!productData.name || !productData.price) return alert('Name and price are required');

  try {
    let url, method;
    if (editId) {
      url = `${API}/products/${editId}`;
      method = 'PUT';
    } else {
      url = `${API}/products`;
      method = 'POST';
    }

    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    const result = await res.json();

    if (result.success) {
      const productId = editId || result.id;

      // Upload images for selected color
      const boxes = document.querySelectorAll('.image-upload-box');
      const selectedColor = document.getElementById('pf_imageColorSelect').value || 'default';

      let uploadErrors = [];
      let unnamedAngleCounter = 1;
      for (const box of boxes) {
        const fileInput = box.querySelector('input[type="file"]');
        const angleInput = box.querySelector('.angle-name-input');
        let angle = angleInput ? angleInput.value.trim() : (box.dataset.angle || '');
        
        // If angle name is empty but a file is selected, auto-assign a name
        if (!angle && fileInput && fileInput.files.length > 0) {
          angle = `View-${unnamedAngleCounter++}`;
        }
        
        if (!angle) continue;
        
        // Update input field to show the assigned name
        if (angleInput) angleInput.value = angle;
        box.dataset.angle = angle;
        
        if (fileInput && fileInput.files.length > 0) {
          const formData = new FormData();
          formData.append('image', fileInput.files[0]);
          const resp = await apiFetch(`${API}/products/${productId}/images/${encodeURIComponent(angle)}/${encodeURIComponent(selectedColor)}`, {
            method: 'POST',
            body: formData
          });
          if (!resp.ok) {
            let errMsg = `Angle "${angle}": HTTP ${resp.status}`;
            try { const e = await resp.json(); if (e.error) errMsg += ` - ${e.error}`; } catch(e) {}
            uploadErrors.push(errMsg);
          }
        }
      }

      if (uploadErrors.length > 0) {
        alert('Product saved, but some images failed to upload:\n' + uploadErrors.join('\n'));
      }

      closeModal('productModal');
      loadProducts();
    } else {
      alert('Error: ' + (result.error || 'Save failed'));
    }
  } catch (err) {
    alert('Error saving product: ' + err.message);
  }
}

async function deleteProduct(id, name) {
  name = decodeURIComponent(name);
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await apiFetch(`${API}/products/${id}`, { method: 'DELETE' });
    loadProducts();
  } catch (err) {
    alert('Error deleting product');
  }
}

// ==================== COLORS & SIZES ====================
function addColor() {
  const name = document.getElementById('pf_newColorName').value.trim();
  const hex = document.getElementById('pf_newColorHex').value;
  if (!name) return;
  if (editColors.find(c => c.name === name)) return alert('Color already exists');
  editColors.push({ name, hex });
  renderColors();
  document.getElementById('pf_newColorName').value = '';
}

function removeColor(index) {
  editColors.splice(index, 1);
  renderColors();
}

function renderColors() {
  document.getElementById('pf_colorList').innerHTML = safeHTML(editColors.map((c, i) => `
    <div class="color-item">
      <span class="color-swatch" style="background:${c.hex}"></span>
      <span class="color-name">${c.name}</span>
      <button type="button" class="color-remove" onclick="removeColor(${i})">✕</button>
    </div>
  `).join('') || '<span style="color:var(--text-muted);font-size:13px;">No colors added</span>');

  // Update Color Select Dropdown for Images
  const select = document.getElementById('pf_imageColorSelect');
  const currentValue = select.value;
  select.innerHTML = safeHTML('<option value="">-- Select Color First --</option>' +
    editColors.map(c => `<option value="${c.name}">${c.name}</option>`).join(''));
  if (editColors.find(c => c.name === currentValue)) {
    select.value = currentValue;
  }

  loadImagesForSelectedColor();
}

function addSize() {
  const size = document.getElementById('pf_newSize').value;
  if (editSizes.includes(size)) return alert('Size already added');
  editSizes.push(size);
  renderSizes();
}

function removeSize(index) {
  editSizes.splice(index, 1);
  renderSizes();
}

function renderSizes() {
  document.getElementById('pf_sizeList').innerHTML = safeHTML(editSizes.map((s, i) => `
    <div class="size-item">
      ${s}
      <button type="button" class="size-remove" onclick="removeSize(${i})">✕</button>
    </div>
  `).join('') || '<span style="color:var(--text-muted);font-size:13px;">No sizes added</span>');
}

// ==================== IMAGE UPLOAD (Dynamic Angles) ====================
function addAngleBox(angleName, existingImagePath, existingImageId) {
  // Check if color is selected before allowing add
  const colorSelect = document.getElementById('pf_imageColorSelect');
  const hasNoColors = editColors.length === 0;
  if (!hasNoColors && (!colorSelect || !colorSelect.value)) {
    alert('⚠️ Pehle ek Color select karo, phir image angle add hoga.');
    return;
  }

  const grid = document.getElementById('pf_imageGrid');
  const box = document.createElement('div');
  box.className = 'image-upload-box' + (existingImagePath ? ' has-image' : '');
  if (angleName) box.dataset.angle = angleName;
  if (existingImageId) box.dataset.existingImageId = existingImageId;

  box.innerHTML = `
    <input type="text" class="angle-name-input" value="${angleName || ''}" placeholder="Angle name (e.g. Front)" onclick="event.stopPropagation()">
    <input type="file" accept="image/*" onchange="previewImage(this)">
    ${existingImagePath ? `<img src="${existingImagePath}">` : '<span class="upload-icon">📷<br><span style="font-size:10px;">Click to upload</span></span>'}
    <button type="button" class="remove-img always-visible" onclick="event.stopPropagation(); removeAngleBox(this)" title="Remove this angle">✕</button>
  `;

  box.addEventListener('click', (e) => {
    // Don't trigger file upload if clicking on the text input or remove button
    if (e.target.classList.contains('angle-name-input') || e.target.classList.contains('remove-img')) return;
    triggerImageUpload(box);
  });
  grid.appendChild(box);
}

function removeAngleBox(btn) {
  const box = btn.closest('.image-upload-box');
  const existingId = box.dataset.existingImageId;
  const productId = document.getElementById('pf_editId').value;

  if (existingId && productId) {
    apiFetch(`${API}/products/${productId}/images/${existingId}`, { method: 'DELETE' })
      .catch(() => {});
  }
  box.remove();
}

function clearAngleBoxes() {
  const grid = document.getElementById('pf_imageGrid');
  grid.innerHTML = '';
}

// ==================== CATEGORY MANAGEMENT ====================
async function loadCategoryOptions(selectedValue) {
  try {
    const res = await fetch(`${API}/categories`, { credentials: 'include' });
    const categories = await res.json();
    const select = document.getElementById('pf_category');
    select.innerHTML = categories.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('') + '<option value="__add_new__" style="color: #d4a039; font-weight: bold;">➕ Add New Category...</option>';
    if (selectedValue) {
      select.value = selectedValue;
    }
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

// Listen for category dropdown change to handle "Add New"
document.getElementById('pf_category').addEventListener('change', async function() {
  if (this.value !== '__add_new__') return;

  const catName = prompt('🆕 Naya Category ka naam likho (e.g. Shirts):');
  if (!catName || !catName.trim()) {
    this.value = this.options[0]?.value || '';
    return;
  }

  const catId = catName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (!catId) {
    alert('Invalid category name');
    this.value = this.options[0]?.value || '';
    return;
  }

  try {
    const res = await apiFetch(`${API}/admin/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: catId, name: catName.trim() })
    });
    const data = await res.json();
    if (data.success) {
      await loadCategoryOptions(catId);
    } else {
      alert('Error: ' + (data.error || 'Category add failed'));
      this.value = this.options[0]?.value || '';
    }
  } catch (err) {
    alert('Error adding category: ' + err.message);
    this.value = this.options[0]?.value || '';
  }
});

function triggerImageUpload(box) {
  const fileInput = box.querySelector('input[type="file"]');
  if (fileInput) fileInput.click();
}

function previewImage(input) {
  const box = input.closest('.image-upload-box');
  const existingImg = box.querySelector('img');
  const uploadIcon = box.querySelector('.upload-icon');

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (existingImg) {
        existingImg.src = e.target.result;
      } else {
        if (uploadIcon) uploadIcon.remove();
        const img = document.createElement('img');
        img.src = e.target.result;
        box.appendChild(img);
      }
      box.classList.add('has-image');
    };
    reader.readAsDataURL(input.files[0]);
  }
}
