/* Premium Acrylics 415 - sales tax settings and rules.
 *
 * THIS IS THE ONLY PLACE TAX RATES LIVE. The checkout page shows the tax and the payment
 * function (api/create-checkout.js) charges it, both from this same file.
 *
 * Tax follows the BUYER'S STATE: list a state and its rate in `rates` below (percent, e.g.
 * 9.875 for 9.875%). A state that is NOT listed is charged no tax. Local pick-up orders
 * use the rate of `homeState` (your South San Francisco pick-up address).
 *
 *   rates: { CA: 9.875, TX: 8.25 }
 *
 * Only list states where you are registered to collect and remit sales tax (ask your
 * accountant). Rates differ inside a state by city/county/district, so a single rate per
 * state is an approximation; California in particular mixes seller-location and
 * destination district rates. Tax is charged on the items only, not on shipping.
 */
const Tax = {
  // State code -> tax percent. Empty until you give me the rates. Example: { CA: 9.875 }
  rates: {},
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

  // True once at least one state has a rate.
  enabled() { return Object.keys(this.rates).length > 0; },

  // Percent charged for this delivery choice ("pickup" | "ship" | "ship-label") and the buyer's
  // 2-letter state. Pick-up uses the home state's rate. 0 means no tax.
  rate(delivery, state) {
    const code = delivery === 'pickup' ? this.homeState : state;
    const r = this.rates[code];
    return typeof r === 'number' && r > 0 ? r : 0;
  },

  // Tax in whole cents on an items subtotal given in dollars.
  cents(itemsDollars, delivery, state) {
    return Math.round(itemsDollars * this.rate(delivery, state));  // dollars * percent = cents
  }
};

// Browser: global. Node (api/create-checkout.js): require()'d.
if (typeof window !== 'undefined') window.Tax = Tax;
if (typeof module !== 'undefined' && module.exports) module.exports = Tax;
