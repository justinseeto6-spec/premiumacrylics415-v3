/* Premium Acrylics 415 - grand-opening promo counter.
 *
 * Asks Square how many PAID orders already carry the promo tag (metadata.promo). A payment
 * link's order stays a DRAFT until it is paid, then becomes OPEN (and later COMPLETED), so
 * counting OPEN + COMPLETED orders counts real, paid promo orders only. Settings (limit,
 * tag, start date) live in Products.promo in js/products.js.
 *
 * It can overshoot slightly if several people check out at the very same moment, because an
 * order is only counted once it is paid. If Square can't be reached, the gift is NOT given
 * (the promo fails closed rather than giving away unlimited gifts).
 */

const Products = require('../js/products.js');

const SQUARE_VERSION = '2025-01-23';
const GIFT_LINE_PREFIX = 'FREE GIFT:';   // must match the name api/create-checkout.js gives the gift line

function squareHost() {
  return process.env.SQUARE_ENVIRONMENT === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
}

async function countPromoOrders() {
  const promo = Products.promo;
  let count = 0;
  let cursor;
  do {
    const body = {
      location_ids: [process.env.SQUARE_LOCATION_ID],
      limit: 500,
      query: {
        filter: {
          state_filter: { states: ['OPEN', 'COMPLETED'] },
          date_time_filter: { created_at: { start_at: promo.startsAt } }
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
    // An order counts if it carries the promo tag OR contains the free-gift line itself - the line
    // can never be lost, so the count stays right even if Square drops the tag.
    for (const o of data.orders || []) {
      const tagged = o.metadata && o.metadata.promo === promo.tag;
      const hasGiftLine = (o.line_items || []).some(li => String(li.name || '').startsWith(GIFT_LINE_PREFIX));
      if (tagged || hasGiftLine) count++;
    }
    cursor = data.cursor;
  } while (cursor);
  return count;
}

// -> { available: boolean, reason: 'ok' | 'limit' | 'off' | 'error' }
async function status() {
  const promo = Products.promo;
  if (!promo || !promo.active) return { available: false, reason: 'off' };
  if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) return { available: false, reason: 'error' };
  try {
    const used = await countPromoOrders();
    return used < promo.limit ? { available: true, reason: 'ok' } : { available: false, reason: 'limit' };
  } catch (err) {
    console.error('Promo count failed:', err.message);
    return { available: false, reason: 'error' };
  }
}

module.exports = { status, countPromoOrders };
