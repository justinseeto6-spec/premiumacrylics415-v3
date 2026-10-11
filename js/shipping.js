/* Premium Acrylics 415 - flat-rate shipping prices by total cart weight.
 *
 * THIS IS THE ONLY PLACE SHIPPING PRICES LIVE. The checkout page shows them and the
 * payment function (api/create-checkout.js) charges them, both from this same file.
 * To change a price, edit `price` below (dollars), then commit + push.
 *
 * Each band covers carts up to `maxLb` pounds (using each product's packed `weightOz`
 * in data/products.json). A cart heavier than the last band can't be priced online -
 * the customer is told to text for a quote.
 *
 * Prices = the average real label cost for each kind of order (Pirate Ship shipments,
 * Jul-Oct 2026) plus a cushion for carrier adjustments and far-away orders:
 *   up to 4 lb   avg ~$8.50   -> $9.75  (+15%)
 *   4-6 lb       avg ~$13.50  -> $13.50 (no cushion; was $15.50 until 2026-10-11, lowered so a single UPC
 *                ships for less than the same case on eBay)
 *   6-12 lb      2 UPCs ship mostly by UPS: avg $22.95, high $28.57 -> $28 (raised Oct 2026
 *                so 2-UPC orders do not eat into profit)
 *   12-20 lb     estimated (little data): about $8 more per extra UPC -> $34
 *   20-25 lb     ESTIMATE $42, 25-30 lb ESTIMATE $48 (about $1 more per extra lb; added Oct 2026,
 *                no real labels this heavy yet - compare against Pirate Ship and adjust)
 *   30-40 lb     $65, from a real label: 8 UPCs (~40 lb) CA -> Massachusetts, UPS Ground, $63.35.
 *                Far zones cost this much; near zones cost less, so nearby buyers pay a bit extra.
 * A heavier band should never cost less than a lighter one. Review the prices every few
 * months against your Pirate Ship costs.
 */

const Shipping = {
  bands: [
    { maxLb: 4, price: 9.75 },    // 1 ETB, 1 booster bundle, 1 tin
    { maxLb: 6, price: 13.5 },   // 1 UPC (lowered from $15.50 on 2026-10-11 to beat eBay)
    { maxLb: 12, price: 28 },     // 2 UPCs, 3 ETBs
    { maxLb: 20, price: 34 },      // 5 ETBs, 3-4 UPCs
    { maxLb: 25, price: 42 },      // 4-5 UPCs  (estimate - no real labels this heavy yet)
    { maxLb: 30, price: 48 },      // 5-6 UPCs  (estimate - no real labels this heavy yet)
    { maxLb: 40, price: 65 }       // 7-8 UPCs  (real: 8 UPCs to MA by UPS Ground cost $63.35)
  ],

  // Ships to US addresses only.
  contactPhone: '650-248-2473',

  // Human label for a band, e.g. "6.1 to 12 lb" (used by the table on the Shipping page).
  bandLabel(i) {
    const lo = i === 0 ? null : this.bands[i - 1].maxLb;
    const hi = this.bands[i].maxLb;
    return lo === null ? `Up to ${hi} lb` : `${lo + 0.1} to ${hi} lb`;
  },

  // Price for a total weight in ounces, or null if it is heavier than the last band.
  feeForOz(oz) {
    if (oz <= 0) return { fee: 0, bandIndex: -1 };
    const bandIndex = this.bands.findIndex(b => oz / 16 <= b.maxLb + 1e-9);
    return bandIndex === -1 ? null : { fee: this.bands[bandIndex].price, bandIndex };
  },

  // lines: [{ product, qty }] (from Products.cartTotals). Returns
  //   { ok: true, fee, weightOz, bandIndex }          - priced
  //   { ok: false, reason: 'heavy' | 'noweight', ... } - can't be priced online
  // Products flagged "shippingIncluded" already have shipping built into their price, so the
  // customer only pays the EXTRA shipping their other items add (total weight price minus the
  // price of the shipping-included weight). A cart of only shipping-included items ships free.
  quote(lines) {
    let weightOz = 0, includedOz = 0;
    for (const l of lines) {
      if (typeof l.product.weightOz !== 'number') return { ok: false, reason: 'noweight' };
      weightOz += l.product.weightOz * l.qty;
      if (l.product.shippingIncluded) includedOz += l.product.weightOz * l.qty;
    }
    const total = this.feeForOz(weightOz);
    if (!total) return { ok: false, reason: 'heavy', weightOz };
    const included = this.feeForOz(includedOz);
    const fee = Math.max(0, Math.round((total.fee - (included ? included.fee : 0)) * 100) / 100);
    return { ok: true, fee, weightOz, bandIndex: total.bandIndex, includedOz };
  }
};

// Browser: global. Node (api/create-checkout.js): require()'d.
if (typeof window !== 'undefined') window.Shipping = Shipping;
if (typeof module !== 'undefined' && module.exports) module.exports = Shipping;
