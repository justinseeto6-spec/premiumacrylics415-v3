/* Premium Acrylics 415 - limited-time launch deal counter (see Products.flash in js/products.js).
 *
 * The deal is open only from `startsAt` until `limit` PAID orders have used it. Square keeps the
 * count: api/create-checkout.js tags every order that got the deal (metadata.flash), and this file
 * counts the OPEN + COMPLETED orders carrying that tag (a payment link's order stays a DRAFT until
 * it is paid, so only real, paid orders count).
 *
 * It can overshoot by an order or two if several people pay at the very same moment, because an
 * order is only counted once it is paid. If Square can't be reached the deal is NOT offered
 * (it fails closed). Before `startsAt` no call to Square is made at all.
 */

const Products = require('../js/products.js');

const SQUARE_VERSION = '2025-01-23';

function squareHost() {
  return process.env.SQUARE_ENVIRONMENT === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
}

async function countFlashOrders() {
  const flash = Products.flash;
  let count = 0;
  let cursor;
  do {
    const body = {
      location_ids: [process.env.SQUARE_LOCATION_ID],
      limit: 500,
      query: {
        filter: {
          state_filter: { states: ['OPEN', 'COMPLETED'] },
          date_time_filter: { created_at: { start_at: flash.startsAt } }
        },
        sort: { sort_field: 'CREATED_AT', sort_order: 'ASC' }
      }
    };
    if (cursor) body.cursor = cursor;
    const res = await fetch(`${squareHost()}/v2/orders/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Square-Version': SQUARE_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Square order search failed (${res.status}): ${JSON.stringify(data.errors || data).slice(0, 300)}`);
    for (const o of data.orders || []) {
      if (o.metadata && o.metadata.flash === flash.tag) count++;
    }
    cursor = data.cursor;
  } while (cursor);
  return count;
}

// -> { available: boolean, reason: 'ok' | 'off' | 'notyet' | 'limit' | 'error' }
async function status() {
  const flash = Products.flash;
  if (!flash || !flash.active) return { available: false, reason: 'off' };
  if (Date.now() < Date.parse(flash.startsAt)) return { available: false, reason: 'notyet' };
  if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) return { available: false, reason: 'error' };
  try {
    const used = await countFlashOrders();
    return used < flash.limit ? { available: true, reason: 'ok' } : { available: false, reason: 'limit' };
  } catch (err) {
    console.error('Flash deal count failed:', err.message);
    return { available: false, reason: 'error' };
  }
}

module.exports = { status, countFlashOrders };
