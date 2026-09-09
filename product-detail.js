/* Premium Acrylics 415 — product detail page */

(async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const root = document.getElementById('pdpRoot');

  const products = await Products.all();
  const product = products.find(p => p.id === id);

  if (!product) {
    root.innerHTML = `<div class="empty-state">Product not found. <a href="/shop.html" style="color:var(--accent);">Back to shop</a></div>`;
    return;
  }

  document.title = `${product.name} | Premium Acrylics 415`;
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = document.title;

  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const images = (product.images && product.images.length) ? product.images : [product.image];

  root.innerHTML = `
    <div class="pdp">
      <div class="pdp-gallery">
        <div class="pdp-gallery-main">
          <img id="pdpMainImage" src="${images[0]}" alt="${product.name}">
        </div>
        ${images.length > 1 ? `
          <div class="pdp-thumbs" id="pdpThumbs">
            ${images.map((img, i) => `
              <button class="pdp-thumb${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="View photo ${i + 1}">
                <img src="${img}" alt="${product.name} photo ${i + 1}">
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="pdp-info">
        <div class="breadcrumbs">
          <a href="/shop.html">Shop</a> &rsaquo;
          <a href="/shop.html?category=${product.category}">${Products.categoryLabel(product.category)}</a> &rsaquo;
          ${product.name}
        </div>
        <h1>${product.name}</h1>
        <div class="stock-pill"><span class="dot"></span> ${product.inStock ? 'In stock, ready to ship' : 'Currently out of stock'}</div>
        <div class="pdp-price-row">
          <span class="pdp-price">${Products.formatPrice(product.price)}</span>
          ${onSale ? `<span class="price-compare">${Products.formatPrice(product.compareAtPrice)}</span>` : ''}
        </div>
        <p class="pdp-desc">${product.description}</p>
        <ul class="spec-list">
          ${(product.specs || []).map(s => `<li>${s}</li>`).join('')}
        </ul>
        <div class="qty-row">
          <span>Quantity</span>
          <div class="qty-control">
            <button id="qtyDec">&minus;</button>
            <input id="qtyInput" type="text" value="1" inputmode="numeric">
            <button id="qtyInc">+</button>
          </div>
        </div>
        <div class="pdp-actions">
          <button class="btn btn-primary" id="addToCartBtn" ${product.inStock ? '' : 'disabled'}>
            ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
          <button class="btn btn-secondary" id="pdpCheckoutBtn" ${product.inStock ? '' : 'disabled'}>Order Now</button>
        </div>
      </div>
    </div>
  `;

  const thumbButtons = document.querySelectorAll('.pdp-thumb');
  const mainImage = document.getElementById('pdpMainImage');
  thumbButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.index, 10);
      mainImage.src = images[i];
      thumbButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const qtyInput = document.getElementById('qtyInput');
  document.getElementById('qtyInc').addEventListener('click', () => {
    qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1', 10) + 1);
  });
  document.getElementById('qtyDec').addEventListener('click', () => {
    qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1', 10) - 1);
  });

  document.getElementById('addToCartBtn').addEventListener('click', () => {
    const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
    Cart.add(product.id, qty);
    showToast(`Added ${qty} × ${product.name} to cart`);
  });

  document.getElementById('pdpCheckoutBtn').addEventListener('click', () => {
    const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
    Cart.add(product.id, qty);
    goToCheckout();
  });

  // Related products
  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  if (related.length) {
    document.getElementById('relatedSection').style.display = 'block';
    Products.renderGrid(document.getElementById('relatedGrid'), related);
  }
})();
