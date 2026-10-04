/* Premium Acrylics 415 — build step: generates one static HTML file per product
 * at /products/<id>/index.html, each with a unique <title>, meta description,
 * canonical link, and Open Graph / Twitter card tags baked in server-side —
 * so search engines and link-preview scrapers (Discord, iMessage, Pinterest,
 * Facebook) see real per-product metadata without running JavaScript.
 *
 * The generated page's <body> is otherwise identical to product.html: the
 * same #pdpRoot skeleton, hydrated by the same js/product-detail.js. Nothing
 * about how the page WORKS changes, only what's in <head> before JS runs.
 *
 * Run after any change to data/products.json:
 *   node scripts/generate-product-pages.js
 *
 * No dependencies — plain Node (fs/path only).
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://www.premiumacrylics415.com';
const ROOT = path.join(__dirname, '..');
const PRODUCTS_JSON = path.join(ROOT, 'data', 'products.json');
const OUT_DIR = path.join(ROOT, 'products');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Meta descriptions read best around 150-160 characters — trim on a word
// boundary rather than mid-word if a product's shortDescription runs long.
function truncate(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

// schema.org Offer availability for a product's current state.
function availabilityFor(p) {
  if (p.inStock === false || (typeof p.stock === 'number' && p.stock <= 0)) return 'https://schema.org/OutOfStock';
  return 'https://schema.org/InStock';
}

function pageFor(p) {
  const title = `${p.name} | Premium Acrylics 415`;
  const desc = escapeHtml(truncate(p.shortDescription || p.description || '', 155));
  const canonical = `${SITE_URL}/products/${p.id}/`;
  const image = `${SITE_URL}${p.image}`;
  const allImages = (p.images && p.images.length ? p.images : [p.image]).map(i => `${SITE_URL}${i}`);

  // Product structured data — lets Google show price/availability directly
  // in search results instead of just a plain blue link. JSON.stringify
  // handles all the escaping (quotes, unicode) safely on its own.
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.shortDescription || p.description || '',
    sku: p.id,
    image: allImages,
    url: canonical,
    brand: { '@type': 'Brand', name: 'Premium Acrylics 415' },
    offers: {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'USD',
      price: p.price,
      availability: availabilityFor(p),
      itemCondition: 'https://schema.org/NewCondition',
    },
  }, null, 2).replace(/</g, '\\u003c'); // defensive: no literal "</" can ever break out of the <script> block

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Premium Acrylics 415">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${image}">
<link rel="icon" href="/images/favicon.png" type="image/png">
<link rel="stylesheet" href="/css/styles.css">
<script type="application/ld+json">
${jsonLd}
</script>
</head>
<body data-page="shop">

<div id="site-header"></div>

<main class="wrap" id="pdpRoot">
  <div class="empty-state">Loading product…</div>
</main>

<section class="wrap section" id="relatedSection" style="display:none;">
  <div class="section-head">
    <h2>You might also like</h2>
  </div>
  <div class="product-grid" id="relatedGrid"></div>
</section>

<div id="site-footer"></div>

<script src="/js/cart.js"></script>
<script src="/js/products.js"></script>
<script src="/js/checkout.js"></script>
<script src="/js/partials.js"></script>
<script src="/js/product-detail.js"></script>
</body>
</html>
`;
}

function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  for (const p of products) {
    const dir = path.join(OUT_DIR, p.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), pageFor(p), 'utf8');
    written++;
  }

  console.log(`Generated ${written} product pages in /products/<id>/index.html`);
}

main();
