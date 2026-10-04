/* Premium Acrylics 415 - "Pay Now with Square" button on the checkout page.
 * Sends the cart to /api/create-checkout, then redirects to the Square payment page it returns.
 * The cart is cleared on /thank-you.html once the customer has actually paid. */

// Keep false until Square is set up and tested (see SQUARE-SETUP.md), then change to true.
// While false, the "Pay Now with Square" button stays hidden and customers use the order-request form.
const SQUARE_ENABLED = false;

// Private test switch: opening /checkout.html?square=test shows the button to you only,
// so you can try Square (in sandbox, with fake money) before customers can see it.
const SQUARE_TEST_MODE = new URLSearchParams(window.location.search).get('square') === 'test';

(() => {
  const btn = document.getElementById('squarePayBtn');
  const noteEl = document.getElementById('squareNote');
  if (!btn || !(SQUARE_ENABLED || SQUARE_TEST_MODE)) return;

  document.getElementById('squareBlock').hidden = false;
  const submitBtn = document.getElementById('submitOrderBtn');
  submitBtn.classList.remove('btn-primary');
  submitBtn.classList.add('btn-secondary');

  btn.addEventListener('click', async () => {
    const items = Cart.read();
    if (!items.length) return;

    const delivery = document.getElementById('deliveryPickup').checked ? 'pickup'
      : document.getElementById('deliveryLabel').checked ? 'ship-label' : 'ship-invoice';
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Taking you to Square…';

    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, delivery })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'We couldn\'t start the payment. Please try again or text us at 650-248-2473.');
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      noteEl.textContent = err.message;
      noteEl.style.color = 'var(--accent)';
      if (window.showToast) showToast(err.message);
      btn.disabled = false;
      btn.textContent = original;
    }
  });
})();
