/* Premium Acrylics 415 - sales tax settings and rules.
 *
 * THIS IS THE ONLY PLACE THE TAX RATE LIVES. The checkout page shows the tax and the
 * payment function (api/create-checkout.js) charges it, both from this same file.
 *
 * `percent` is the California sales tax rate for your pick-up address (1158 Mission Rd,
 * South San Francisco). Get the official number from the CDTFA "find a sales tax rate"
 * lookup (cdtfa.ca.gov) and enter it as a plain number, e.g. 9.875 for 9.875%.
 * While it is `null`, NO sales tax is charged.
 *
 * Who is taxed (California's general rule - confirm with your accountant):
 *   - Local pick-up orders                         -> taxed
 *   - Orders shipped to a California address       -> taxed
 *   - Orders shipped to any other state            -> not taxed
 * Tax is charged on the items only. Shipping is not taxed here (see js/shipping.js) -
 * ask your accountant whether any part of the shipping fee should be.
 *
 * Note: California district taxes depend on the customer's address, so one rate is an
 * approximation for California-bound shipments. Your accountant can tell you if you
 * need the exact destination rate.
 */

const Tax = {
  percent: null,
  homeState: 'CA',

  // US states (+ DC) for the "ship-to state" choice at checkout.
  states: {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
    CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
    KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
    MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
    NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
    NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
    OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
    TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
    WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
  },

  // Percent charged for this delivery choice ("pickup" | "ship" | "ship-label") and ship-to
  // state (2-letter code). 0 means no tax.
  rate(delivery, state) {
    if (this.percent == null) return 0;
    if (delivery === 'pickup') return this.percent;
    return state === this.homeState ? this.percent : 0;
  },

  // Tax in whole cents on an items subtotal given in dollars.
  cents(itemsDollars, delivery, state) {
    return Math.round(itemsDollars * this.rate(delivery, state));  // dollars * percent = cents
  }
};

// Browser: global. Node (api/create-checkout.js): require()'d.
if (typeof window !== 'undefined') window.Tax = Tax;
if (typeof module !== 'undefined' && module.exports) module.exports = Tax;
