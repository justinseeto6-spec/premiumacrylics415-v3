/* Premium Acrylics 415 — product detail page */

(async () => {
  // Canonical product pages live at /products/<id>/ (see
  // scripts/generate-product-pages.js), each pre-built with its own title/
  // meta/canonical/OG tags. The old /product.html?id=... path still works
  // for any bookmarked or previously-shared links.
  const params = new URLSearchParams(window.location.search);
  let id = params.get('id');
  if (!id) {
    const pathMatch = window.location.pathname.match(/\/products\/([^/]+)\/?$/);
    if (pathMatch) id = decodeURIComponent(pathMatch[1]);
  }
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

  // Point crawlers at the canonical clean URL no matter which path loaded
  // this page — the generated /products/<id>/ pages already carry this tag
  // server-side, so this mainly covers the legacy ?id= path.
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.rel = 'canonical';
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.href = new URL(Products.url(product), window.location.origin).href;

  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const images = (product.images && product.images.length) ? product.images : [product.image];
  const isSpecialOrder = product.status === 'special-order';
  // Optional "stock" in data/products.json = units available. The cart can't hold more than that.
  const stock = Products.stockOf(product);
  const soldOut = Products.isSoldOut(product);
  // A sold-out product can carry an optional "restock" note, e.g. "mid to late October".
  const soldOutLabel = product.restock ? (/^tbd$/i.test(product.restock) ? 'Sold out &mdash; restock date to be announced' : `Sold out &mdash; restock estimated ${product.restock}`) : 'Sold out';
  const stockLabel = isSpecialOrder
    ? 'Special Order Only &mdash; contact us to order'
    : (soldOut ? soldOutLabel : (Products.isLowStock(product) ? 'Low stock' : 'In stock, ready to ship'));

  root.innerHTML = `
    <div class="pdp">
      <div class="pdp-gallery">
        <div class="pdp-gallery-main">
          <img id="pdpMainImage" src="${images[0]}" alt="${product.name}" width="800" height="800">
        </div>
        ${images.length > 1 ? `
          <div class="pdp-thumbs" id="pdpThumbs">
            ${images.map((img, i) => `
              <button class="pdp-thumb${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="View photo ${i + 1}">
                <img src="${img}" alt="${product.name} photo ${i + 1}" width="72" height="72">
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
        <div class="stock-pill"><span class="dot"></span> <span id="stockText">${stockLabel}</span></div>
        <div class="pdp-price-row">
          <span class="pdp-price">${Products.formatPrice(product.price)}</span>
          ${onSale ? `<span class="price-compare">${Products.formatPrice(product.compareAtPrice)}</span>` : ''}
        </div>
        ${Products.dealLabels(product).length ? `
          <div class="pdp-deal" style="margin:6px 0 0;">
            ${Products.dealLabels(product).map(l => `<p style="margin:2px 0;color:var(--accent);font-weight:600;">Bulk pricing: ${l}</p>`).join('')}
          </div>
        ` : ''}
        ${product.mixMatch ? (() => {
          const siblings = products.filter(o => o.id !== product.id && o.mixMatch && o.mixMatch.group === product.mixMatch.group);
          if (!siblings.length) return '';
          const save = (product.price - product.mixMatch.price) * product.mixMatch.minQty;
          const links = siblings.map(s => `<a href="${Products.url(s)}" style="color:var(--accent);">${s.name}</a>`).join(', ');
          return `
            <div class="pdp-deal" style="margin:6px 0 0;">
              <p style="margin:2px 0;color:var(--accent);font-weight:600;">Mix &amp; match: buy ${product.mixMatch.minQty}+ combined with ${links} for ${Products.formatPrice(product.mixMatch.price)} each (save ${Products.formatPrice(save)} at ${product.mixMatch.minQty})</p>
            </div>
          `;
        })() : ''}
        <p class="pdp-desc">${product.description}</p>
        <ul class="spec-list">
          ${(product.specs || []).concat(typeof product.weightOz === 'number' && !product.pickupOnly ? [`Est. shipping weight: ${Products.formatWeight(product.weightOz)}`] : []).concat(product.pickupOnly ? ['Local pick-up only &mdash; this item can\'t be shipped'] : []).concat(product.noDiscount ? ['Product excluded from order discounts'] : []).map(s => `<li>${s}</li>`).join('')}
        </ul>
        ${isSpecialOrder ? '' : `
        <div class="qty-row">
          <span>Quantity</span>
          <div class="qty-control">
            <button id="qtyDec">&minus;</button>
            <input id="qtyInput" type="text" value="1" inputmode="numeric">
            <button id="qtyInc">+</button>
          </div>
        </div>
        `}
        <div class="pdp-actions">
          ${isSpecialOrder ? `
            <a class="btn btn-primary" href="/contact.html" style="text-decoration:none;">Contact Us to Order</a>
            <a class="btn btn-secondary" href="sms:6502482473" style="text-decoration:none;">Text 650-248-2473</a>
          ` : `
            <button class="btn btn-primary" id="addToCartBtn" ${soldOut ? 'disabled' : ''}>
              ${soldOut ? 'Sold Out' : 'Add to Cart'}
            </button>
            <button class="btn btn-secondary" id="pdpCheckoutBtn" ${soldOut ? 'disabled' : ''}>Order Now</button>
          `}
        </div>
        ${soldOut && !isSpecialOrder ? `
          <form id="notifyForm" class="notify-form" style="margin-top:16px;padding:14px;border:1px solid var(--border);border-radius:12px;">
            <p style="margin:0 0 4px;font-weight:600;">Get notified when it's back</p>
            <p class="cart-note" style="text-align:left;margin:0 0 10px;">Leave your email and we'll send you one message when this is back in stock. No spam.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <input type="email" id="notifyEmail" name="email" required placeholder="you@example.com" autocomplete="email" aria-label="Your email" style="flex:1;min-width:180px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:transparent;color:inherit;">
              <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" style="display:none;">
              <button type="submit" class="btn btn-primary" id="notifyBtn">Notify Me</button>
            </div>
            <p class="cart-note" id="notifyMsg" style="text-align:left;margin:8px 0 0;"></p>
          </form>
        ` : ''}
        ${product.paymentLink && !soldOut ? `
          <div class="pdp-actions" style="margin-top:10px;">
            <a class="btn btn-primary" href="${product.paymentLink}" target="_blank" rel="noopener" style="text-decoration:none;">Pay Now with Square</a>
          </div>
        ` : ''}
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
  const addBtn = document.getElementById('addToCartBtn');
  const checkoutBtn = document.getElementById('pdpCheckoutBtn');
  const stockText = document.getElementById('stockText');

  // Quantity picked on the page, never more than what's still available.
  const wantedQty = () => Math.min(Math.max(1, parseInt(qtyInput.value || '1', 10) || 1), Math.max(1, Cart.remaining(product.id)));

  // Re-syncs the stock label, buttons and quantity box with what's already in the cart.
  // Once every available unit is in the cart, this visitor sees the item as sold out.
  function refreshStock() {
    if (isSpecialOrder || !addBtn) return;
    const left = Cart.remaining(product.id);
    const out = soldOut || left <= 0;
    addBtn.disabled = out;
    checkoutBtn.disabled = out;
    addBtn.textContent = out ? 'Sold Out' : 'Add to Cart';
    // Customers never see exact stock numbers: "Low stock" under 10, otherwise "In stock".
    stockText.innerHTML = soldOut ? soldOutLabel
      : out ? 'Sold out &mdash; every available unit is in your cart'
      : stockLabel;
    qtyInput.value = out ? 1 : wantedQty();
  }

  document.getElementById('qtyInc')?.addEventListener('click', () => {
    qtyInput.value = Math.min(Math.max(1, parseInt(qtyInput.value || '1', 10) + 1), Math.max(1, Cart.remaining(product.id)));
  });
  document.getElementById('qtyDec')?.addEventListener('click', () => {
    qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1', 10) - 1);
  });
  qtyInput?.addEventListener('change', () => { qtyInput.value = wantedQty(); });

  addBtn?.addEventListener('click', () => {
    const added = Cart.add(product.id, wantedQty());
    if (added) showToast(`Added ${added} × ${product.name} to cart`);
    refreshStock();
  });

  checkoutBtn?.addEventListener('click', () => {
    Cart.add(product.id, wantedQty());
    goToCheckout();
  });

  Cart.onChange(refreshStock);
  refreshStock();

  // "Notify me when it's back": emails you (through the same Formspree form as the order requests)
  // the customer's email and the product, so you can message them when it's restocked.
  const notifyForm = document.getElementById('notifyForm');
  notifyForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('notifyBtn');
    const msg = document.getElementById('notifyMsg');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const res = await fetch('https://formspree.io/f/moeqplrl', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _subject: `Notify me: ${product.name}`,
          'Request type': 'Back-in-stock notification',
          Product: product.name,
          'Product page': location.href,
          email: document.getElementById('notifyEmail').value,
          _gotcha: notifyForm.elements._gotcha.value
        })
      });
      if (!res.ok) throw new Error('failed');
      notifyForm.innerHTML = `<p style="margin:0;font-weight:600;">You're on the list.</p><p class="cart-note" style="text-align:left;margin:4px 0 0;">We'll email you when ${product.name} is back in stock.</p>`;
    } catch (err) {
      msg.textContent = 'Something went wrong. Please try again or text us at 650-248-2473.';
      msg.style.color = 'var(--accent)';
      btn.disabled = false;
      btn.textContent = 'Notify Me';
    }
  });

  // Related products
  const related = products.filter(p => !p.hidden && p.category === product.category && p.id !== product.id).slice(0, 4);
  if (related.length) {
    document.getElementById('relatedSection').style.display = 'block';
    Products.renderGrid(document.getElementById('relatedGrid'), related);
  }
})();
