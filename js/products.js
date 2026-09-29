/* Premium Acrylics 415 — product data + rendering helpers */

const Products = {
  _cache: null,

  async all() {
    if (this._cache) return this._cache;
    const res = await fetch('/data/products.json');
    this._cache = await res.json();
    return this._cache;
  },

  async byId(id) {
    const products = await this.all();
    return products.find(p => p.id === id);
  },

  formatPrice(n) {
    return '$' + Number(n).toFixed(2);
  },

  // Line total honoring optional multi-buy pricing, e.g.
  // "quantityPricing": [{ "qty": 2, "price": 55 }]  =>  every 2 cost $55, leftovers cost the normal price.
  lineTotal(p, qty) {
    let remaining = qty;
    let total = 0;
    const tiers = (p.quantityPricing || []).slice().sort((a, b) => b.qty - a.qty);
    for (const t of tiers) {
      const sets = Math.floor(remaining / t.qty);
      total += sets * t.price;
      remaining -= sets * t.qty;
    }
    return total + remaining * p.price;
  },

  // Short label like "2 for $55.00" (or '' if the product has no multi-buy pricing)
  dealLabel(p) {
    const t = (p.quantityPricing || [])[0];
    return t ? `${t.qty} for ${this.formatPrice(t.price)}` : '';
  },

  categoryLabel(cat) {
    const map = {
      'pokemon': 'Pokémon',
      'one-piece': 'One Piece',
      'custom': 'Custom'
    };
    return map[cat] || cat;
  },

  statusBadge(p) {
    if (p.status === 'preorder') return { label: 'PRE-ORDER', bg: 'var(--accent)', fg: 'var(--accent-text)' };
    if (p.status === 'special-order') return { label: 'SPECIAL ORDER', bg: 'var(--text-faint)', fg: '#fff' };
    return null;
  },

  cardHTML(p) {
    const onSale = p.compareAtPrice && p.compareAtPrice > p.price;
    const status = this.statusBadge(p);
    return `
      <a class="product-card" href="/product.html?id=${encodeURIComponent(p.id)}">
        <div class="product-thumb">
          ${onSale ? '<span class="badge">SALE</span>' : (status ? `<span class="badge" style="background:${status.bg};color:${status.fg};">${status.label}</span>` : '')}
          <img src="${p.image}" alt="${p.name}" loading="lazy">
        </div>
        <div class="product-body">
          <span class="product-cat">${this.categoryLabel(p.category)}</span>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-desc">${p.shortDescription}</p>
          <div class="product-price-row">
            <span class="price">${this.formatPrice(p.price)}</span>
            ${this.dealLabel(p) ? `<span class="price-compare" style="text-decoration:none;color:var(--accent);">${this.dealLabel(p)}</span>` : ''}
            ${onSale ? `<span class="price-compare">${this.formatPrice(p.compareAtPrice)}</span>` : ''}
            ${p.status === 'special-order' ? `<button type="button" class="btn btn-secondary btn-card-contact">Contact to Order</button>` : (p.inStock !== false ? `<button type="button" class="btn btn-primary btn-card-add" data-add-id="${encodeURIComponent(p.id)}">${p.status === 'preorder' ? 'Pre-Order' : 'Add to Cart'}</button>` : '')}
          </div>
        </div>
      </a>
    `;
  },

  async renderGrid(container, products) {
    if (!products.length) {
      container.innerHTML = `<div class="empty-state">No products match your filters. Try clearing search or category.</div>`;
      return;
    }
    container.innerHTML = products.map(p => this.cardHTML(p)).join('');
    container.querySelectorAll('.btn-card-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = decodeURIComponent(btn.dataset.addId);
        Cart.add(id, 1);
        this.byId(id).then(p => {
          if (window.showToast) showToast(`Added ${p ? p.name : 'item'} to cart`);
        });
      });
    });
    container.querySelectorAll('.btn-card-contact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = '/contact.html';
      });
    });
  }
};

window.Products = Products;
