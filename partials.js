/* Premium Acrylics 415 — loads shared header/footer, wires cart drawer + nav */

async function loadPartials() {
  const headerEl = document.getElementById('site-header');
  const footerEl = document.getElementById('site-footer');

  const [headerHTML, footerHTML] = await Promise.all([
    fetch('/partials/header.html').then(r => r.text()),
    fetch('/partials/footer.html').then(r => r.text())
  ]);

  if (headerEl) headerEl.innerHTML = headerHTML;
  if (footerEl) footerEl.innerHTML = footerHTML;

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  highlightActiveNav();
  wireMobileNav();
  wireCartDrawer();
  renderCartDrawer(Cart.read());
  updateCartBadge();

  Cart.onChange(items => {
    renderCartDrawer(items);
    updateCartBadge();
  });
}

function highlightActiveNav() {
  const page = document.body.dataset.page;
  if (!page) return;
  document.querySelectorAll('.main-nav a').forEach(a => {
    if (a.dataset.nav === page) a.classList.add('active');
  });
}

function wireMobileNav() {
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => nav.classList.toggle('mobile-open'));
}

function wireCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  const openBtn = document.getElementById('cartToggle');
  const closeBtn = document.getElementById('cartClose');
  const checkoutBtn = document.getElementById('checkoutBtn');

  const open = () => { drawer.classList.add('open'); overlay.classList.add('open'); };
  const close = () => { drawer.classList.remove('open'); overlay.classList.remove('open'); };

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);

  checkoutBtn?.addEventListener('click', () => {
    if (typeof goToCheckout === 'function') goToCheckout();
  });

  window.openCart = open;
  window.closeCart = close;
}

function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  if (!badge) return;
  const count = Cart.count();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

async function renderCartDrawer(items) {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const subtotalEl = document.getElementById('cartSubtotal');
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<div class="cart-empty">Your cart is empty.<br><a href="/shop.html" style="color:var(--accent);">Browse display cases →</a></div>`;
    if (footer) footer.style.display = 'none';
    return;
  }
  if (footer) footer.style.display = 'block';

  const products = await Products.all();
  let subtotal = 0;

  const rows = items.map(item => {
    const p = products.find(pp => pp.id === item.id);
    if (!p) return '';
    const lineTotal = p.price * item.qty;
    subtotal += lineTotal;
    return `
      <div class="cart-item" data-id="${p.id}">
        <img src="${p.image}" alt="${p.name}">
        <div>
          <p class="cart-item-name">${p.name}</p>
          <span class="cart-item-price">${Products.formatPrice(p.price)} each</span>
          <div class="cart-item-qty">
            <button class="qty-dec" aria-label="Decrease quantity">&minus;</button>
            <span>${item.qty}</span>
            <button class="qty-inc" aria-label="Increase quantity">+</button>
          </div>
          <button class="cart-item-remove">Remove</button>
        </div>
        <div class="cart-item-total">${Products.formatPrice(lineTotal)}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = rows;
  if (subtotalEl) subtotalEl.textContent = Products.formatPrice(subtotal);

  container.querySelectorAll('.cart-item').forEach(row => {
    const id = row.dataset.id;
    const item = items.find(i => i.id === id);
    row.querySelector('.qty-inc')?.addEventListener('click', () => Cart.setQty(id, item.qty + 1));
    row.querySelector('.qty-dec')?.addEventListener('click', () => Cart.setQty(id, item.qty - 1));
    row.querySelector('.cart-item-remove')?.addEventListener('click', () => Cart.remove(id));
  });
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toastMsg');
  if (!toast) return;
  if (msgEl) msgEl.textContent = msg;
  toast.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

window.showToast = showToast;
document.addEventListener('DOMContentLoaded', loadPartials);
