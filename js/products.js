/* Premium Acrylics 415 — product data + rendering helpers */

const Products = {
  _cache: null,
  _groups: {},   // shared stock pools: group id -> units (data/stock-groups.json)

  async all() {
    if (this._cache) return this._cache;
    const res = await fetch('/data/products.json');
    this._cache = await res.json();
    try {
      const gr = await fetch('/data/stock-groups.json');
      if (gr.ok) this._groups = await gr.json();
    } catch (e) { /* no shared pools: every product uses its own stock */ }
    // "stock" caps how many a customer can add to the cart. A product with a "stockGroup"
    // shares one pool with every other product in that group instead of having its own.
    this._cache.forEach(p => {
      if (typeof p.stock === 'number') Cart.limits[p.id] = p.stock;
      // "maxPerOrder" caps one product per order (the checkout add-on offer: up to 3).
      if (typeof p.maxPerOrder === 'number') Cart.limits[p.id] = Math.min(p.maxPerOrder, Cart.limits[p.id] != null ? Cart.limits[p.id] : Infinity);
      if (p.stockGroup) {
        Cart.groupOf[p.id] = p.stockGroup;
        if (p.groupUnits) Cart.groupUnits[p.id] = p.groupUnits;
        if (typeof this._groups[p.stockGroup] === 'number') Cart.groupLimits[p.stockGroup] = this._groups[p.stockGroup];
      }
    });
    Cart.enforceLimits();
    // Is the launch deal open? Known before anything is priced, so every total on the page agrees.
    if (this.flash && this.flash.active) this._flashOn = !!(await this.flashStatus()).available;
    return this._cache;
  },

  // Units in stock for a product: its shared pool if it has a "stockGroup", else its own
  // "stock", else null (unlimited).
  stockOf(p) {
    if (p.stockGroup && typeof this._groups[p.stockGroup] === 'number') return Math.floor(this._groups[p.stockGroup] / (p.groupUnits || 1));
    return typeof p.stock === 'number' ? p.stock : null;
  },

  // Stock below this many units shows "Low stock" to customers. Exact numbers are never shown.
  LOW_STOCK_UNDER: 10,

  isLowStock(p) {
    const s = this.stockOf(p);
    return p.inStock !== false && s !== null && s > 0 && s < this.LOW_STOCK_UNDER;
  },

  // Sold out = marked inStock:false, or a stock count (own or shared) of 0.
  isSoldOut(p) {
    const s = this.stockOf(p);
    return p.inStock === false || (s !== null && s <= 0);
  },

  async byId(id) {
    const products = await this.all();
    return products.find(p => p.id === id);
  },

  // ---- Spend more, save more (automatic order discount) ----
  // EDIT THE TIERS HERE: the highest tier whose minSpend is reached applies. The discount
  // comes off the ITEMS subtotal, after bulk / mix-and-match prices (so it stacks with
  // them). Shipping is never discounted, and sales tax is charged on the discounted amount.
  // Master switch. false = no spend-more-save-more discount anywhere (checkout, cart, Square, FAQ).
  // Paused 2026-10-11 while prices are set to beat eBay. Set to true to turn the tiers back on.
  discountsActive: false,
  discountTiers: [
    { minSpend: 100, percent: 10 },
    { minSpend: 150, percent: 15 }
  ],

  // itemsDollars = cart items subtotal. Returns the discount that applies and, if there is a
  // higher tier, how much more the customer must spend to reach it.
  discountFor(itemsDollars) {
    const tiers = this.discountsActive ? this.discountTiers.slice().sort((a, b) => a.minSpend - b.minSpend) : [];
    let tier = null;
    for (const t of tiers) if (itemsDollars >= t.minSpend - 1e-9) tier = t;
    const next = tiers.find(t => itemsDollars < t.minSpend - 1e-9) || null;
    const cents = tier ? this.percentOfCents(Math.round(itemsDollars * 100), tier.percent) : 0;
    return {
      percent: tier ? tier.percent : 0,
      cents,
      amount: cents / 100,
      next: next ? { minSpend: next.minSpend, percent: next.percent, toGo: Math.round((next.minSpend - itemsDollars) * 100) / 100 } : null
    };
  },

  // ---- Grand-opening promo: "first 5 orders over $75 get a free ETB case" ----
  // EDIT HERE. The gift is added automatically to a qualifying order only while fewer than
  // `limit` promo orders have been PAID. Square keeps the count (api/_promo.js asks Square),
  // so there is nothing to update by hand. To end the promo early, set active to false.
  //   minSpend       counted on discount-eligible items, BEFORE the 10%/15% discount
  //   giftProductId  the free item (its weight is not added to shipping - you absorb it)
  //   startsAt       Square orders created before this are not searched
  promo: {
    active: false,   // paused 2026-10-21: no ETBs on hand. Set to true to turn the free-gift promo back on.
    tag: 'grand-opening',
    title: 'Grand opening',
    minSpend: 75,
    giftProductId: 'elite-trainer-box-standard',
    limit: 5,
    startsAt: '2026-10-10T00:00:00-07:00'
  },

  // ---- Launch deal: "first 15 orders get 2 of a case for a special price" ----
  // EDIT HERE. From `startsAt` until `limit` PAID orders have used it, the first `qty` of the case
  // in each order cost `price` in total (any more of that case cost the normal price/tiers).
  // Square keeps the count (api/_flash.js), so nothing to update by hand. active:false ends it early.
  // `startsAt` must carry the Pacific UTC offset: -08:00 in winter (PST), -07:00 in summer (PDT).
  flash: {
    active: true,
    tag: 'flash-30th-upc',
    title: 'Launch deal',
    productId: '30th-anniversary-upc',
    qty: 2,
    price: 50,
    shipping: 18,   // flat shipping on a deal order whose shipping lands in the same weight band as the deal pair
    limit: 5,
    startsAt: '2026-11-02T10:00:00-08:00'
  },
  _flashOn: false,   // set by flashStatus() in the browser, and by api/create-checkout.js on the server

  // Is the launch deal open right now? (asks /api/flash-status once per page)
  flashStatus() {
    if (!this._flash) {
      this._flash = fetch('/api/flash-status').then(r => (r.ok ? r.json() : { available: false })).catch(() => ({ available: false }));
    }
    return this._flash;
  },
  _flash: null,

  // Does the launch deal apply to `qty` of product `p` right now?
  flashApplies(p, qty) {
    const f = this.flash;
    return !!(f && f.active && this._flashOn && p && p.id === f.productId && qty >= f.qty);
  },

  _promo: null,
  // Is the promo still available? (asks /api/promo-status once per page; never shows a count)
  promoStatus() {
    if (!this._promo) {
      this._promo = fetch('/api/promo-status').then(r => (r.ok ? r.json() : { available: false })).catch(() => ({ available: false }));
    }
    return this._promo;
  },

  // percent of an amount in cents, rounded to a whole cent the way Square does it:
  // an exact half-cent goes to the EVEN cent (so 37.525 -> 37.52 and 24.375 -> 24.38).
  percentOfCents(cents, percent) {
    const num = cents * Math.round(percent * 1000);          // percent in thousandths
    const q = Math.floor(num / 100000);
    const twiceRemainder = (num - q * 100000) * 2;
    if (twiceRemainder > 100000) return q + 1;
    if (twiceRemainder < 100000) return q;
    return q % 2 === 0 ? q : q + 1;
  },

  // Order discount for a cart (lines from cartTotals). Square rounds the discount on each
  // eligible line separately, so we do the same to match it to the cent.
  discountForLines(lines) {
    const d = this.discountFor(this.eligibleSubtotal(lines));
    if (d.percent > 0) {
      d.cents = lines.filter(l => !l.product.noDiscount).reduce((s, l) => s + this.percentOfCents(Math.round(l.lineTotal * 100), d.percent), 0);
      d.amount = d.cents / 100;
    }
    return d;
  },

  // Items subtotal that is ELIGIBLE for the order discount: every cart line except products
  // flagged "noDiscount": true in products.json (e.g. the Eevee gift box). Only eligible
  // items count toward the tiers and only they are discounted.
  eligibleSubtotal(lines) {
    const cents = lines.reduce((s, l) => s + (l.product.noDiscount ? 0 : Math.round(l.lineTotal * 100)), 0);
    return cents / 100;
  },

  // Ounces -> "1 lb 4 oz" (used for the optional "weightOz" on each product).
  formatWeight(oz) {
    const total = Math.round(oz * 10) / 10;
    const lb = Math.floor(total / 16);
    const rest = Math.round((total - lb * 16) * 10) / 10;
    if (!lb) return `${rest} oz`;
    return rest ? `${lb} lb ${rest} oz` : `${lb} lb`;
  },

  formatPrice(n) {
    return '$' + Number(n).toFixed(2);
  },

  // Line total honoring optional multi-buy pricing, e.g.
  // "quantityPricing": [{ "qty": 2, "price": 55 }]  =>  every 2 cost $55, leftovers cost the normal price.
  lineTotal(p, qty) {
    let remaining = qty;
    let total = 0;
    // Launch deal: the first `qty` of this case cost the deal price, the rest follow the normal pricing.
    if (this.flashApplies(p, qty)) {
      total = this.flash.price;
      remaining = qty - this.flash.qty;
    }
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
    const f = this.flash;
    if (typeof qty === 'number') {
      if (this.flashApplies(p, qty)) return `${f.title}: ${f.qty} for ${this.formatPrice(f.price)}`;
      const applied = tiers.find(t => qty >= t.qty);
      if (applied) return `${applied.qty} for ${this.formatPrice(applied.price)}`;
      return '';
    }
    if (this.flash && this.flash.active && this._flashOn && p.id === this.flash.productId) return `${f.title}: ${f.qty} for ${this.formatPrice(f.price)}`;
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
    const labels = tiers.map(t => {
      const each = t.price / t.qty;
      const save = p.price * t.qty - t.price;
      return `${t.qty}+ for ${this.formatPrice(t.price)} (${this.formatPrice(each)} each — save ${this.formatPrice(save)})`;
    });
    return labels;
  },

  // Shipping override for js/shipping.js quote(): { productId, qty, fee } while the deal is open and
  // one of these lines gets it, else undefined (normal weight-band shipping).
  flashShipOpts(lines) {
    const f = this.flash;
    if (!f || typeof f.shipping !== 'number' || !lines.some(l => this.flashApplies(l.product, l.qty))) return undefined;
    return { productId: f.productId, qty: f.qty, fee: f.shipping };
  },

  // The launch deal line for a product's page, or '' when the deal doesn't apply to it / is over.
  // Before its start time it announces when it begins; while it is open it says "first N orders".
  flashLabel(p) {
    const f = this.flash;
    if (!f || !f.active || !p || p.id !== f.productId) return '';
    const allIn = typeof f.shipping === 'number' ? ` + $${f.shipping} flat shipping = $${f.price + f.shipping} delivered` : '';
    if (this._flashOn) return `${f.title}: ${f.qty} for ${this.formatPrice(f.price)}${allIn} &mdash; first ${f.limit} orders only (one deal per order)`;
    if (Date.now() < Date.parse(f.startsAt)) {
      const when = new Date(f.startsAt).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles', timeZoneName: 'short' });
      return `${f.title}: ${f.qty} for ${this.formatPrice(f.price)}${allIn} starting ${when} &mdash; first ${f.limit} orders only`;
    }
    return '';
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
      'pokemon-tcg': 'Pokémon TCG',
      'custom': 'Custom'
    };
    return map[cat] || cat;
  },

  statusBadge(p) {
    if (p.status === 'special-order') return { label: 'SPECIAL ORDER', bg: 'var(--text-faint)', fg: '#fff' };
    if (this.isSoldOut(p)) return { label: 'SOLD OUT', bg: 'var(--text-faint)', fg: '#fff' };
    if (this.isLowStock(p)) return { label: 'LOW STOCK', bg: '#f5a524', fg: '#201400' };
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
            ${p.status === 'special-order' ? `<button type="button" class="btn btn-secondary btn-card-contact">Contact to Order</button>` : (!this.isSoldOut(p) ? `<button type="button" class="btn btn-primary btn-card-add" data-add-id="${encodeURIComponent(p.id)}">Add to Cart</button>` : '')}
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
        const added = Cart.add(id, 1);
        this.byId(id).then(p => {
          if (!window.showToast) return;
          const name = p ? p.name : 'item';
          showToast(added ? `Added ${name} to cart` : `All available ${name} are already in your cart`);
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

// Browser: global. Node (api/create-checkout.js): require()'d so the server prices
// carts with exactly the same logic the site shows (bulk tiers, mix & match).
if (typeof window !== 'undefined') window.Products = Products;
if (typeof module !== 'undefined' && module.exports) module.exports = Products;
