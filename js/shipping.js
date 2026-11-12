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
 *   4-6 lb       avg ~$13.50  -> $10 (was $15.50 until 2026-10-11, then $13.50 until 2026-10-31; now
 *                BELOW the average label cost on purpose (real label 2026-11-07: 1 UPC case CA -> Tennessee,
 *                UPS Ground Saver via Pirate Ship $14.80, USPS $14.93 - $4.80 over the $10 charged), so a single UPC case totals about what the
 *                same case costs on eBay. Raise it if labels keep coming in high.
 *                Another real label, 2026-11-07: 2 UPC cases CA -> San Dimas CA (Southern California, nearest
 *                zone), UPS Ground via Square Shipping, $12.91 - $7.09 under the $20 charged. With the OH $23.90
 *                and WA $17.51 labels, the three real labels average about $18.11, so $20 is slightly above
 *                the average of real labels; far zones (NY quote $29.57+) still lose money.)
 *   6-12 lb      2 UPCs ship mostly by UPS: avg $22.95, high $28.57 -> $20 (was $28 until 2026-10-31;
 *                lowered to stay competitive, on purpose BELOW the average label cost. Real label:
 *                2 UPC cases CA -> Ohio, UPS, $23.90 (2026-10-31) and CA -> Washington, UPS Ground
 *                Saver via Square Shipping, $17.51 (2026-11-01): they average about $20.70, so $20
 *                breaks even, near states earn a little and far states lose about $4. Pirate Ship QUOTE
 *                (not bought) for 2 UPC cases (10 lb) CA -> New York, 2026-11-04: UPS Ground Saver $29.57,
 *                USPS Ground Advantage $31.34, UPS Ground $34.07 - so the farthest zone loses about $9.50
 *                at $20, and the three labels average about $23.65. The $28.57
 *                high loses about $8. Raise it if labels keep coming in high.)
 *   12-20 lb     estimated (little data): about $8 more per extra UPC -> $30 (was $34 until 2026-11-01;
 *                lowered after the real labels below. No far-state label for this weight yet, so
 *                watch the first Ohio/New York order and raise it if it costs more). A 16 lb order
 *                (2 UPC + 3 booster-bundle add-on cases, CA -> Washington, 2026-11-01) shipped in TWO
 *                boxes for $25.15 total: 2 UPC $17.51 (UPS Ground Saver via Square Shipping) + 3 bundle
 *                cases $7.64 (UPS Ground Saver via Pirate Ship). The buyer paid $34. Near zone only.
 *                Also 3 ETB + 1 UPC cases (about 15.5 lb, one box) CA -> Texas, UPS Ground Saver via
 *                Pirate Ship, $21.69 (retail $62.73), 2026-11-01 - a mid-distance zone.
 *                Far zone: 4 UPC cases (20 lb, 2 x the eBay 2-pack), CA -> New York, FedEx via the eBay
 *                label, $32.98 (2026-11-04). The same box quoted in Pirate Ship that day: UPS Ground $47.95
 *                (Pirate Ship has no FedEx). So $30 is only fine if a FedEx / cheap USPS label can be bought
 *                for site orders; at UPS Ground it is about $18 under. Check Pirate Ship USPS rates.
 *   20-25 lb     ESTIMATE $42, 25-30 lb ESTIMATE $48 (about $1 more per extra lb; added Oct 2026,
 *                no real labels this heavy yet - compare against Pirate Ship and adjust)
 *   30-40 lb     $65, from a real label: 8 UPCs (~40 lb) CA -> Massachusetts, UPS Ground, $63.35.
 *                Far zones cost this much; near zones cost less, so nearby buyers pay a bit extra.
 *                Another real label, 2026-11-11: a mixed website order of 8 cases (about 33.5 lb: 25th ETB,
 *                2 Prismatic Figure Collection, Mega Charizard UPC, Sword & Shield UPC, Prismatic Super Premium,
 *                2 Crown Zenith ETB Plus) CA -> Florida, UPS Ground via Pirate Ship, $51.27 (retail $111.90).
 *                The buyer paid $55.25 shipping (the $65 band minus the $9.75 the shipping-included 25th ETB
 *                already covers), so this far-zone order made about $3.98 on shipping. The $65 band holds.
 * A heavier band should never cost less than a lighter one. Review the prices every few
 * months against your Pirate Ship costs.
 */

const Shipping = {
  bands: [
    { maxLb: 4, price: 9.75 },    // 1 ETB, 1 booster bundle, 1 tin
    { maxLb: 6, price: 10 },     // 1 UPC (lowered from $15.50 to $13.50 on 2026-10-11, then to $10 on 2026-10-31 to match eBay's ~$6.50-7 local rate)
    { maxLb: 12, price: 20 },     // 2 UPCs, 3 ETBs (lowered from $28 to $25, then to $20, on 2026-10-31)
    { maxLb: 20, price: 30 },      // 5 ETBs, 3-4 UPCs (lowered from $34 on 2026-11-01)
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
  // flashShip (optional, from Products.flashShipOpts or api/create-checkout.js while the launch deal
  // is open): { productId, qty, fee } - the order pays `fee` flat if its weight band is the same band
  // the deal's pair of cases falls in (so 2 UPC cases pay $18 instead of $20; an order that grows
  // into a heavier band pays that band's normal price).
  quote(lines, flashShip) {
    let weightOz = 0, includedOz = 0;
    for (const l of lines) {
      if (typeof l.product.weightOz !== 'number') return { ok: false, reason: 'noweight' };
      weightOz += l.product.weightOz * l.qty;
      if (l.product.shippingIncluded) includedOz += l.product.weightOz * l.qty;
    }
    const total = this.feeForOz(weightOz);
    if (!total) return { ok: false, reason: 'heavy', weightOz };
    const included = this.feeForOz(includedOz);
    let fee = Math.max(0, Math.round((total.fee - (included ? included.fee : 0)) * 100) / 100);
    if (flashShip && fee > flashShip.fee) {
      const dealLine = lines.find(l => l.product.id === flashShip.productId && l.qty >= flashShip.qty);
      const pair = dealLine && this.feeForOz(dealLine.product.weightOz * flashShip.qty);
      if (pair && pair.bandIndex === total.bandIndex) fee = flashShip.fee;
    }
    return { ok: true, fee, weightOz, bandIndex: total.bandIndex, includedOz };
  }
};

// Browser: global. Node (api/create-checkout.js): require()'d.
if (typeof window !== 'undefined') window.Shipping = Shipping;
if (typeof module !== 'undefined' && module.exports) module.exports = Shipping;
