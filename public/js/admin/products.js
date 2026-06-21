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
                <td><span style="font-size:13px; color:${p.images && p.images.length ? 'var(--success)' : 'var(--text-muted)'};">${p.images ? p.images.length : 0}/4 📷</span></td>
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
                <td><span style="font-size:13px; color:${p.images && p.images.length ? 'var(--success)' : 'var(--text-muted)'};">${p.images ? p.images.length : 0}/4 📷</span></td>
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
  editColors = [];
  editSizes = ['S', 'M', 'L', 'XL'];
  renderColors();
  renderSizes();
  clearImagePreviews();
  document.getElementById('pf_imageColorSelect').value = '';
  document.getElementById('pf_imageGrid').style.opacity = '0.5';
  document.getElementById('pf_imageGrid').style.pointerEvents = 'none';
  openModal('productModal');
}

function openEditProduct(id) {
  const p = productsData.find(x => x.id === id);
  if (!p) return;

  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('productSaveBtn').textContent = '💾 Update Product';
  document.getElementById('pf_editId').value = p.id;
  document.getElementById('pf_name').value = p.name;
  document.getElementById('pf_category').value = p.category;
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

  // Load images
  window.currentProductData = p; // store for reference when switching colors
  document.getElementById('pf_imageColorSelect').value = '';
  clearImagePreviews();
  document.getElementById('pf_imageGrid').style.opacity = '0.5';
  document.getElementById('pf_imageGrid').style.pointerEvents = 'none';

  openModal('productModal');
}

function loadImagesForSelectedColor() {
  const colorName = document.getElementById('pf_imageColorSelect').value;
  const grid = document.getElementById('pf_imageGrid');

  if (!colorName) {
    grid.style.opacity = '0.5';
    grid.style.pointerEvents = 'none';
    clearImagePreviews();
    return;
  }

  grid.style.opacity = '1';
  grid.style.pointerEvents = 'auto';
  clearImagePreviews();

  const p = window.currentProductData;
  if (p && p.images) {
    p.images.filter(i => i.color_name === colorName || (i.color_name === '' && colorName === 'default')).forEach(img => {
      const box = document.querySelector(`.image-upload-box[data-angle="${img.view_angle}"]`);
      if (box) {
        let preview = box.querySelector('img');
        if (!preview) {
          preview = document.createElement('img');
          box.appendChild(preview);
        }
        preview.src = img.image_path;
        box.classList.add('has-image');
        box.dataset.existingImageId = img.id;
      }
    });
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

      for (const box of boxes) {
        const fileInput = box.querySelector('input[type="file"]');
        if (fileInput && fileInput.files.length > 0) {
          const formData = new FormData();
          formData.append('image', fileInput.files[0]);
          await apiFetch(`${API}/products/${productId}/images/${box.dataset.angle}/${encodeURIComponent(selectedColor)}`, {
            method: 'POST',
            body: formData
          });
        }
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

// ==================== IMAGE UPLOAD ====================
function triggerImageUpload(box) {
  box.querySelector('input[type="file"]').click();
}

function previewImage(input) {
  const box = input.closest('.image-upload-box');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      let img = box.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        box.appendChild(img);
      }
      img.src = e.target.result;
      box.classList.add('has-image');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function removeImage(btn) {
  const box = btn.closest('.image-upload-box');
  const img = box.querySelector('img');
  if (img) img.remove();
  box.classList.remove('has-image');
  box.querySelector('input[type="file"]').value = '';
  delete box.dataset.existingImageId;
}

function clearImagePreviews() {
  document.querySelectorAll('.image-upload-box').forEach(box => {
    const img = box.querySelector('img');
    if (img) img.remove();
    box.classList.remove('has-image');
    box.querySelector('input[type="file"]').value = '';
    delete box.dataset.existingImageId;
  });
}
