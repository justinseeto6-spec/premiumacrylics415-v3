/* Premium Acrylics 415 - GET /api/flash-status -> { available: true | false }
 * Lets the product page, cart and checkout show the launch deal price only while the deal is open
 * (after its start time and before its order limit is used up). Never reveals how many are left.
 * The payment function (api/create-checkout.js) re-checks this itself, so this is display only.
 * See api/_flash.js. */

const { status } = require('./_flash.js');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET.' });
  const s = await status();
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=15');
  return res.status(200).json({ available: s.available });
};
