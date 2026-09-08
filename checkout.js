/* Premium Acrylics 415 — cart drawer "Checkout" button just goes to the order-request page */

function goToCheckout() {
  if (!Cart.count()) return;
  window.location.href = '/checkout.html';
}

window.goToCheckout = goToCheckout;
