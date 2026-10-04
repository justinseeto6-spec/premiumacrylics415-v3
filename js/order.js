/* Premium Acrylics 415 — order request page (no payment processing here).
 *
 * Submits to Formspree, a free form-to-email service — no backend code needed.
 * Setup: create a free form at https://formspree.io, then paste your form's
 * endpoint URL below in place of the placeholder. See README.md for full steps.
 */

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/moeqplrl';

(async () => {
  const summaryEl = document.getElementById('orderSummary');
  const form = document.getElementById('orderForm');
  const submitBtn = document.getElementById('submitOrderBtn');
  const noteEl = document.getElementById('orderFormNote');

  const items = Cart.read();

  if (!items.length) {
    summaryEl.innerHTML = `<div class="empty-state">Your cart is empty. <a href="/shop.html" style="color:var(--accent);">Browse display cases →</a></div>`;
    form.style.display = 'none';
    return;
  }

  const products = await Products.all();
  const { lines: cartLines, subtotal } = Products.cartTotals(products, items);
  const lines = [];

  const rows = cartLines.map(l => {
    const p = l.product;
    const dealApplied = l.mixMatchApplied || l.lineTotal < p.price * l.qty;
    const dealText = l.mixMatchApplied
      ? `Mix &amp; match ${p.mixMatch.minQty}+ for ${Products.formatPrice(p.mixMatch.price)} each`
      : Products.dealLabel(p, l.qty);
    lines.push(`${l.qty} × ${p.name} (${Products.formatPrice(p.price)} each${dealApplied ? `, ${dealText} deal applied` : ''}) = ${Products.formatPrice(l.lineTotal)}`);
    return `
      <div class="cart-item" data-id="${p.id}">
        <img src="${p.image}" alt="${p.name}">
        <div>
          <p class="cart-item-name">${p.name}</p>
          <span class="cart-item-price">Qty ${l.qty} × ${Products.formatPrice(p.price)}${dealApplied ? ` &middot; ${dealText} deal applied` : ''}</span>
        </div>
        <div class="cart-item-total">${Products.formatPrice(l.lineTotal)}</div>
      </div>
    `;
  }).join('');

  summaryEl.innerHTML = `
    <h3 style="margin-top:0;">Your cart</h3>
    ${rows}
    <div class="cart-subtotal-row" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
      <span>Estimated total</span>
      <span>${Products.formatPrice(subtotal)}</span>
    </div>
    <p class="cart-note" style="text-align:left;margin-top:10px;">Shipping isn't included in this total. Pick how you'd like to handle it under Delivery method below.</p>
  `;


  // Box size + estimated weights to use when buying a label (the "send my own label" option).
  const labelDetails = document.getElementById('labelDetails');
  if (labelDetails) {
    const allKnown = cartLines.every(l => typeof l.product.weightOz === 'number');
    const rows = allKnown ? cartLines.map(l => `<li>${l.qty} &times; ${l.product.name} &mdash; about ${Products.formatWeight(l.product.weightOz)} each</li>`).join('') : '';
    const totalOz = allKnown ? cartLines.reduce((s, l) => s + l.product.weightOz * l.qty, 0) : 0;
    labelDetails.innerHTML = `
      <strong>Package size for your label:</strong> 16 &times; 12 &times; 12 in (our medium box &mdash; most orders ship in this).
      ${allKnown ? `
        <br><strong>Estimated weight:</strong> about ${Products.formatWeight(totalOz)} total for your order.
        <ul style="margin:6px 0 0 18px;padding:0;">${rows}</ul>
      ` : `<br><strong>Weight:</strong> text us at 650-248-2473 and we'll tell you what to enter.`}
      <br>Have a large order? Text us first and we'll confirm the box size.
    `;
  }

  // A pick-up-only product (data/products.json: "pickupOnly": true) can't be shipped, so
  // when one is in the cart the shipping options are turned off and pick-up is selected.
  const pickupOnlyNames = cartLines.filter(l => l.product.pickupOnly).map(l => l.product.name);
  if (pickupOnlyNames.length) {
    ['deliveryLabel', 'deliveryInvoice'].forEach(id => {
      const r = document.getElementById(id);
      r.disabled = true;
      r.closest('.delivery-option').style.opacity = '0.45';
    });
    const pickupRadio = document.getElementById('deliveryPickup');
    pickupRadio.checked = true;
    pickupRadio.dispatchEvent(new Event('change'));
    document.querySelector('.delivery-options').insertAdjacentHTML('beforebegin',
      `<p class="cart-note" style="text-align:left;margin-top:8px;color:var(--accent);">Local pick-up only: ${pickupOnlyNames.join(', ')} can't be shipped. Shipping options are off while it's in your cart.</p>`);
  }
  const orderSummaryText = lines.join('\n');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (FORMSPREE_ENDPOINT.includes('YOUR_FORM_ID')) {
      showToast?.('Order form isn\'t connected yet — see README.md to finish setup.');
      return;
    }

    document.getElementById('orderSummaryField').value = orderSummaryText;
    document.getElementById('orderTotalField').value = Products.formatPrice(subtotal);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.errors?.[0]?.message || 'Could not submit your order request.');
      }

      Cart.clear();
      window.location.href = '/checkout-success.html';
    } catch (err) {
      console.error(err);
      showToast?.(err.message || 'Something went wrong — please try again or text us at 650-248-2473.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Order Request';
    }
  });
})();
