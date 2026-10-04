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

  // Max units per product id, filled in by Products.all() from each product's
  // optional "stock" number in data/products.json. No entry = no limit.
  limits: {},

  qtyOf(productId) {
    const existing = this.read().find(i => i.id === productId);
    return existing ? existing.qty : 0;
  },

  // Units of this product that can still be added (Infinity if it has no stock limit).
  remaining(productId) {
    const limit = this.limits[productId];
    if (limit == null) return Infinity;
    return Math.max(0, limit - this.qtyOf(productId));
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
    const limit = this.limits[productId];
    if (limit != null) qty = Math.min(qty, limit);
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
    let changed = false;
    const kept = items.filter(i => {
      const limit = this.limits[i.id];
      if (limit == null || i.qty <= limit) return true;
      i.qty = limit;
      changed = true;
      return limit > 0;
    });
    if (changed || kept.length !== items.length) this.write(kept);
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
