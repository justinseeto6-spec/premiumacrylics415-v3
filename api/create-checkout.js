/* Premium Acrylics 415 - creates a Square payment page for the customer's whole cart.
 *
 * POST /api/create-checkout   { items: [{ id, qty }], delivery: "pickup" | "ship-label" | "ship" }
 *   -> { url }  the Square-hosted checkout page to send the customer to.
 *
 * Prices are always recalculated here from data/products.json - nothing the browser
 * sends (prices, totals) is trusted, only product ids and quantities.
 *
 * Needs these environment variables (set in Vercel > Project > Settings > Environment Variables):
 *   SQUARE_ACCESS_TOKEN   from your Square developer application
 *   SQUARE_LOCATION_ID    your Square location
 *   SQUARE_ENVIRONMENT    "sandbox" (test, no real money - the default) or "production" (real payments)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Products = require('../js/products.js');
const Shipping = require('../js/shipping.js');
const config = require('./_config.js');

const SQUARE_VERSION = '2025-01-23';
// How each delivery choice is handled. The note is saved on the Square payment so you can
// see which one the customer picked.
//   pickup      - customer collects in person (no shipping)
//   ship-label  - customer buys their own label (e.g. Pirate Ship) and sends it to us (no shipping charge)
//   ship        - we ship it; flat-rate shipping is charged in this same payment (prices in js/shipping.js)
const DELIVERY_NOTES = {
  'pickup': 'Local pick-up - 1158 Mission Rd, South San Francisco, CA 94080',
  'ship-label': 'SHIP - customer will send their own shipping label (Pirate Ship)',
  'ship': 'SHIP - we ship it, shipping charged in this payment'
};

const toCents = dollars => Math.round(dollars * 100);

function fail(res, status, message) {
  return res.status(status).json({ error: message });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'Use POST.');

  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!token || !locationId) {
    console.error('Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID');
    return fail(res, 500, 'Online payment isn\'t set up yet. Please text us at 650-248-2473.');
  }
  const squareHost = process.env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

  // ---- validate the request ----
  const body = req.body || {};
  const delivery = body.delivery;
  if (!Object.prototype.hasOwnProperty.call(DELIVERY_NOTES, delivery)) {
    return fail(res, 400, 'Please refresh the page and choose how you\'d like to receive your order.');
  }
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (!rawItems.length || rawItems.length > 50) return fail(res, 400, 'Your cart is empty.');

  const items = [];
  for (const it of rawItems) {
    const qty = Number(it && it.qty);
    if (!it || typeof it.id !== 'string' || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      return fail(res, 400, 'Something is wrong with your cart. Please refresh and try again.');
    }
    const existing = items.find(i => i.id === it.id);
    if (existing) existing.qty += qty; else items.push({ id: it.id, qty });
  }

  // ---- price the cart from our own catalog ----
  const catalog = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'products.json'), 'utf8'));
  for (const it of items) {
    const p = catalog.find(pp => pp.id === it.id);
    if (!p) return fail(res, 400, 'One of the items in your cart is no longer available.');
    if (p.status === 'special-order' || Products.isSoldOut(p)) {
      return fail(res, 400, `${p.name} isn't available to buy online right now. Text us at 650-248-2473.`);
    }
    if (p.pickupOnly && delivery !== 'pickup') {
      return fail(res, 400, `${p.name} can't be shipped - it's local pick-up only. Please choose pick-up.`);
    }
    if (typeof p.stock === 'number' && it.qty > p.stock) {
      return fail(res, 400, `Only ${p.stock} of ${p.name} available.`);
    }
  }
  const { lines } = Products.cartTotals(catalog, items);

  // Shipping is priced here from the cart weight (never from anything the browser sends).
  let shipQuote = null;
  if (delivery === 'ship') {
    shipQuote = Shipping.quote(lines);
    if (!shipQuote.ok) {
      return fail(res, 400, 'We can\'t price shipping for this order online. Please text us at 650-248-2473 for a shipping quote, or choose pick-up.');
    }
  }

  // Square line items need a whole-cent price per unit, but bulk deals (e.g. 2 for $55)
  // don't always divide evenly - so each cart line is one Square line at its full total.
  const lineItems = lines.map(l => ({
    name: l.qty > 1 ? `${l.product.name} × ${l.qty}` : l.product.name,
    quantity: '1',
    base_price_money: { amount: toCents(l.lineTotal), currency: 'USD' }
  }));

  const order = { location_id: locationId, line_items: lineItems };
  if (config.taxPercent != null) {
    order.taxes = [{ uid: 'sales-tax', name: 'Sales tax', percentage: String(config.taxPercent), scope: 'ORDER' }];
  }

  const checkoutOptions = {
    redirect_url: `${config.siteUrl}/thank-you.html`,
    // We only need an address when we're the ones shipping.
    ask_for_shipping_address: delivery === 'ship',
    allow_tipping: false
  };
  if (shipQuote) {
    checkoutOptions.shipping_fee = { name: 'Shipping', charge: { amount: toCents(shipQuote.fee), currency: 'USD' } };
  }

  const payload = {
    idempotency_key: crypto.randomUUID(),
    order,
    checkout_options: checkoutOptions,
    payment_note: shipQuote
      ? `${DELIVERY_NOTES[delivery]} - $${shipQuote.fee.toFixed(2)} for about ${(shipQuote.weightOz / 16).toFixed(1)} lb`
      : DELIVERY_NOTES[delivery]
  };

  // ---- ask Square for the payment page ----
  try {
    const squareRes = await fetch(`${squareHost}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Square-Version': SQUARE_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await squareRes.json().catch(() => ({}));
    const url = data.payment_link && data.payment_link.url;
    if (!squareRes.ok || !url) {
      console.error('Square error', squareRes.status, JSON.stringify(data.errors || data));
      return fail(res, 502, 'We couldn\'t start the payment. Please try again or text us at 650-248-2473.');
    }
    return res.status(200).json({ url });
  } catch (err) {
    console.error('Square request failed', err);
    return fail(res, 502, 'We couldn\'t reach the payment service. Please try again or text us at 650-248-2473.');
  }
};
