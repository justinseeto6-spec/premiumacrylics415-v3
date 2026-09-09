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

  categoryLabel(cat) {
    const map = {
      'pokemon': 'Pokémon',
      'one-piece': 'One Piece',
      'custom': 'Custom'
    };
    return map[cat] || cat;
  },

  cardHTML(p) {
    const onSale = p.compareAtPrice && p.compareAtPrice > p.price;
    return `
      <a class="product-card" href="/product.html?id=${encodeURIComponent(p.id)}">
        <div class="product-thumb">
          ${onSale ? '<span class="badge">SALE</span>' : ''}
          <img src="${p.image}" alt="${p.name}" loading="lazy">
        </div>
        <div class="product-body">
          <span class="product-cat">${this.categoryLabel(p.category)}</span>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-desc">${p.shortDescription}</p>
          <div class="product-price-row">
            <span class="price">${this.formatPrice(p.price)}</span>
            ${onSale ? `<span class="price-compare">${this.formatPrice(p.compareAtPrice)}</span>` : ''}
            ${p.inStock !== false ? `<button type="button" class="btn btn-primary btn-card-add" data-add-id="${encodeURIComponent(p.id)}">Add to Cart</button>` : ''}
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
  }
};

window.Products = Products;
