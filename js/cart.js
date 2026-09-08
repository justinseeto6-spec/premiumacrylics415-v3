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

  add(productId, qty = 1) {
    const items = this.read();
    const existing = items.find(i => i.id === productId);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({ id: productId, qty });
    }
    this.write(items);
  },

  setQty(productId, qty) {
    let items = this.read();
    if (qty <= 0) {
      items = items.filter(i => i.id !== productId);
    } else {
      const existing = items.find(i => i.id === productId);
      if (existing) existing.qty = qty;
    }
    this.write(items);
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
