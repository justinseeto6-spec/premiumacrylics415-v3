/* Premium Acrylics 415 — build step: generates sitemap.xml (and robots.txt,
 * which barely changes but lives here so both stay in one place) from
 * data/products.json plus a fixed list of static pages.
 *
 * Run after any change to data/products.json, or when adding/removing a
 * static page:
 *   node scripts/generate-sitemap.js
 *
 * No dependencies — plain Node (fs/path only).
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://www.premiumacrylics415.com';
const ROOT = path.join(__dirname, '..');
const PRODUCTS_JSON = path.join(ROOT, 'data', 'products.json');

// Static, indexable pages — priority is relative (1.0 = most important).
// Transactional/error pages (checkout, checkout-success, 404) are
// deliberately left out: they carry a noindex meta tag, so a sitemap entry
// for them would just send mixed signals.
const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/shop.html', priority: '0.9', changefreq: 'weekly' },
  { path: '/about.html', priority: '0.5', changefreq: 'monthly' },
  { path: '/faq.html', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact.html', priority: '0.5', changefreq: 'monthly' },
  { path: '/shipping-returns.html', priority: '0.4', changefreq: 'monthly' },
];

function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));

  const urls = [
    ...STATIC_PAGES.map(p => `  <url>\n    <loc>${SITE_URL}${p.path}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`),
    ...products.map(p => `  <url>\n    <loc>${SITE_URL}/products/${p.id}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots, 'utf8');

  console.log(`Generated sitemap.xml (${STATIC_PAGES.length} static + ${products.length} product URLs) and robots.txt`);
}

main();
