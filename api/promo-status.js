/* Premium Acrylics 415 - GET /api/promo-status -> { available: true | false }
 * Lets the checkout page and cart show the grand-opening gift only while it is still available.
 * Deliberately never reveals how many are left. See api/_promo.js. */

const { status } = require('./_promo.js');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET.' });
  const s = await status();
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=20');
  return res.status(200).json({ available: s.available });
};
