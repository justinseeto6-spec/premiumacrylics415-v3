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

  // Short label for a product's OWN bulk pricing (its "quantityPricing" tiers,
  // bought in isolation) or its mix-and-match group. Pass this cart line's `qty`
  // to get the specific tier that actually applied (used in order/cart line text);
  // omit it to get a general hint for cards/PDPs (used before anything's in the cart).
  dealLabel(p, qty) {
    const tiers = (p.quantityPricing || []).slice().sort((a, b) => b.qty - a.qty);
    if (typeof qty === 'number') {
      const applied = tiers.find(t => qty >= t.qty);
      if (applied) return `${applied.qty} for ${this.formatPrice(applied.price)}`;
      return '';
    }
    if (tiers.length === 1) return `${tiers[0].qty} for ${this.formatPrice(tiers[0].price)}`;
    if (tiers.length > 1) return 'Bulk pricing available';
    if (p.mixMatch) return `Mix & match ${p.mixMatch.minQty}+ for ${this.formatPrice(p.mixMatch.price)} each`;
    return '';
  },

  // Full per-tier breakdown of a product's OWN "quantityPricing" tiers, e.g.
  // ["5+ for $67.00 ($13.40 each — save $5.50)", …], lowest quantity first.
  // (Mix-and-match deals are shown separately — see mixMatchLabel().)
  dealLabels(p) {
    const tiers = (p.quantityPricing || []).slice().sort((a, b) => a.qty - b.qty);
    return tiers.map(t => {
      const each = t.price / t.qty;
      const save = p.price * t.qty - t.price;
      return `${t.qty}+ for ${this.formatPrice(t.price)} (${this.formatPrice(each)} each — save ${this.formatPrice(save)})`;
    });
  },

  // Describes a product's mix-and-match deal against the sibling products that
  // share its group, e.g. "Mix & match with Ascended Heroes Booster Bundle
  // Display — buy 6 or more between them for $9.50 each (save $6.00 at 6)".
  mixMatchLabel(p, allProducts) {
    if (!p.mixMatch) return '';
    const siblings = allProducts.filter(o => o.id !== p.id && o.mixMatch && o.mixMatch.group === p.mixMatch.group);
    if (!siblings.length) return '';
    const names = siblings.map(s => s.name).join(', ');
    const save = (p.price - p.mixMatch.price) * p.mixMatch.minQty;
    return `Mix &amp; match with ${names} — buy ${p.mixMatch.minQty} or more combined for ${this.formatPrice(p.mixMatch.price)} each (save ${this.formatPrice(save)} at ${p.mixMatch.minQty})`;
  },

  // Every cart line's total, honoring each product's own bulk tiers AND pooling
  // quantities across products that share a mix-and-match group — e.g. 4 of one
  // booster-bundle case + 2 of another still clears a "6 combined" mix-and-match
  // deal, even though neither product alone reaches it. Once a group's pooled
  // qty clears its minQty, every unit in that group is billed at its flat price.
  cartTotals(allProducts, items) {
    const lines = items.map(item => {
      const p = allProducts.find(pp => pp.id === item.id);
      if (!p) return null;
      return { id: item.id, product: p, qty: item.qty, lineTotal: this.lineTotal(p, item.qty), mixMatchApplied: false };
    }).filter(Boolean);

    const groups = {};
    lines.forEach(l => {
      const mm = l.product.mixMatch;
      if (!mm) return;
      const g = (groups[mm.group] ||= { minQty: mm.minQty, price: mm.price, lines: [], totalQty: 0 });
      g.lines.push(l);
      g.totalQty += l.qty;
    });
    Object.values(groups).forEach(g => {
      if (g.totalQty >= g.minQty) {
        g.lines.forEach(l => { l.lineTotal = g.price * l.qty; l.mixMatchApplied = true; });
      }
    });

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    return { lines, subtotal };
  },

  // Canonical product URL — the clean, static-generated path (see
  // scripts/generate-product-pages.js). The old /product.html?id=... path
  // still works (product-detail.js falls back to reading it), but nothing
  // should link to it anymore so search engines consolidate on this one.
  url(p) {
    return `/products/${encodeURIComponent(p.id)}/`;
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
      <a class="product-card" href="${this.url(p)}">
        <div class="product-thumb">
          ${onSale ? '<span class="badge">SALE</span>' : (status ? `<span class="badge" style="background:${status.bg};color:${status.fg};">${status.label}</span>` : '')}
          <img src="${p.image}" alt="${p.name}" loading="lazy" width="600" height="600">
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
