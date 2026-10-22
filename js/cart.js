/* Premium Acrylics 415 — cart data model (localStorage-backed) */

const CART_KEY = 'pa415_cart';

const Cart = {
  _listeners: [],

  read() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Cart read failed', e);
      return [];
    }
  },

  write(items) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Cart write failed', e);
    }
    this._emit();
  },

  // Stock limits, filled in by Products.all() from data/products.json and data/stock-groups.json.
  //   limits      product id -> max units (the product's own "stock")
  //   groupOf     product id -> shared stock group id (its "stockGroup")
  //   groupLimits group id   -> max units shared by EVERY product in that group
  // No entry = no limit.
  limits: {},
  groupOf: {},
  groupLimits: {},
  groupUnits: {},   // product id -> units it uses from its pool per item (default 1; a 2-pack uses 2)
  unitsOf(productId) { return this.groupUnits[productId] || 1; },

  qtyOf(productId) {
    const existing = this.read().find(i => i.id === productId);
    return existing ? existing.qty : 0;
  },

  // Units already in the cart from one shared stock group.
  groupQty(groupId) {
    return this.read().filter(i => this.groupOf[i.id] === groupId).reduce((s, i) => s + i.qty * this.unitsOf(i.id), 0);
  },

  // Units of this product that can still be added (Infinity if it has no stock limit).
  remaining(productId) {
    let left = Infinity;
    if (this.limits[productId] != null) left = Math.min(left, this.limits[productId] - this.qtyOf(productId));
    const g = this.groupOf[productId];
    if (g && this.groupLimits[g] != null) left = Math.min(left, Math.floor((this.groupLimits[g] - this.groupQty(g)) / this.unitsOf(productId)));
    return Math.max(0, left);
  },

  // Returns how many units were actually added (0 if the stock limit is already reached).
  add(productId, qty = 1) {
    const allowed = Math.min(qty, this.remaining(productId));
    if (allowed <= 0) return 0;
    const items = this.read();
    const existing = items.find(i => i.id === productId);
    if (existing) {
      existing.qty += allowed;
    } else {
      items.push({ id: productId, qty: allowed });
    }
    this.write(items);
    return allowed;
  },

  setQty(productId, qty) {
    let items = this.read();
    // The most this line can hold = what it has now + whatever stock is still free.
    qty = Math.min(qty, this.qtyOf(productId) + this.remaining(productId));
    if (qty <= 0) {
      items = items.filter(i => i.id !== productId);
    } else {
      const existing = items.find(i => i.id === productId);
      if (existing) existing.qty = qty;
    }
    this.write(items);
  },

  // Trims any cart line that exceeds its stock (e.g. stock was lowered after it was added).
  enforceLimits() {
    const items = this.read();
    const usedByGroup = {};
    let changed = false;
    const kept = [];
    for (const i of items) {
      let cap = this.limits[i.id] != null ? this.limits[i.id] : Infinity;
      const g = this.groupOf[i.id];
      if (g && this.groupLimits[g] != null) cap = Math.min(cap, Math.floor((this.groupLimits[g] - (usedByGroup[g] || 0)) / this.unitsOf(i.id)));
      if (i.qty > cap) { i.qty = Math.max(0, cap); changed = true; }
      if (i.qty > 0) {
        kept.push(i);
        if (g) usedByGroup[g] = (usedByGroup[g] || 0) + i.qty * this.unitsOf(i.id);
      } else {
        changed = true;
      }
    }
    if (changed) this.write(kept);
  },
  remove(productId) {
    const items = this.read().filter(i => i.id !== productId);
    this.write(items);
  },

  clear() {
    this.write([]);
  },

  count() {
    return this.read().reduce((sum, i) => sum + i.qty, 0);
  },

  onChange(fn) {
    this._listeners.push(fn);
  },

  _emit() {
    this._listeners.forEach(fn => {
      try { fn(this.read()); } catch (e) { console.error(e); }
    });
  }
};

window.Cart = Cart;
