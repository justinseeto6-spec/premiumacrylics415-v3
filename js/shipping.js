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
 *   4-6 lb       avg ~$13.50  -> $15.50 (+15%)
 *   6-12 lb      2 UPCs ship mostly by UPS: avg $22.95, high $28.57 -> $28 (raised Oct 2026
 *                so 2-UPC orders do not eat into profit)
 *   12-20 lb     estimated (little data): about $8 more per extra UPC -> $34
 * A heavier band should never cost less than a lighter one. Review the prices every few
 * months against your Pirate Ship costs.
 */

const Shipping = {
  bands: [
    { maxLb: 4, price: 9.75 },    // 1 ETB, 1 booster bundle, 1 tin
    { maxLb: 6, price: 15.5 },   // 1 UPC, 2 ETBs
    { maxLb: 12, price: 28 },     // 2 UPCs, 3 ETBs
    { maxLb: 20, price: 34 }       // 5 ETBs, 3-4 UPCs
  ],

  // Ships to US addresses only.
  contactPhone: '650-248-2473',

  // Human label for a band, e.g. "6.1 to 12 lb" (used by the table on the Shipping page).
  bandLabel(i) {
    const lo = i === 0 ? null : this.bands[i - 1].maxLb;
    const hi = this.bands[i].maxLb;
    return lo === null ? `Up to ${hi} lb` : `${lo + 0.1} to ${hi} lb`;
  },

  // lines: [{ product, qty }] (from Products.cartTotals). Returns
  //   { ok: true, fee, weightOz, bandIndex }          - priced
  //   { ok: false, reason: 'heavy' | 'noweight', ... } - can't be priced online
  quote(lines) {
    let weightOz = 0;
    for (const l of lines) {
      if (typeof l.product.weightOz !== 'number') return { ok: false, reason: 'noweight' };
      weightOz += l.product.weightOz * l.qty;
    }
    const lb = weightOz / 16;
    const bandIndex = this.bands.findIndex(b => lb <= b.maxLb + 1e-9);
    if (bandIndex === -1) return { ok: false, reason: 'heavy', weightOz };
    return { ok: true, fee: this.bands[bandIndex].price, weightOz, bandIndex };
  }
};

// Browser: global. Node (api/create-checkout.js): require()'d.
if (typeof window !== 'undefined') window.Shipping = Shipping;
if (typeof module !== 'undefined' && module.exports) module.exports = Shipping;
