# Premium Acrylics 415 — Ecommerce Site

A custom ecommerce site for Premium Acrylics 415: browse products, add to cart, and submit
an order request — built with plain HTML/CSS/JavaScript, with **no backend and zero npm
dependencies at all**. Customers don't pay on the site directly; instead, submitting an
order emails you their info and an itemized order, and you follow up to confirm the total
and collect payment however you normally do.

## What's included

- Home, Shop (with category filters + search), Product detail, About, FAQ, Shipping &
  Returns, and Contact pages
- A working cart (add/remove/update quantity), persisted in the browser
- An order-request checkout page: customer enters name, email, phone, and optional address/
  notes, reviews their cart, and submits — you get an email with everything
- Mobile-responsive, dark "acrylic" themed design
- 21 products with real photos where you provided them (see "Product photos" below for the
  handful still using a placeholder graphic)

## Project structure

Every file here is a plain static file — there's no build step and nothing to `npm install`.

```
index.html, shop.html, product.html, checkout.html, about.html, faq.html,
shipping-returns.html, contact.html, checkout-success.html, 404.html

data/products.json    → single source of truth for your catalog
css/styles.css
js/                    → cart, product rendering, order form, page scripts
images/                → product photos (falls back to placeholder.svg where none exist yet)
partials/              → shared header/cart-drawer + footer, loaded into every page
favicon.svg

server.js              → optional local preview server (see "Running it locally")
package.json
```

## Setting up your order form (do this before going live)

The order form on `checkout.html` needs somewhere to actually send the email — that's
[Formspree](https://formspree.io), a free service that turns a form submission into an email,
with no backend code required.

1. Go to [formspree.io](https://formspree.io) and create a free account.
2. Create a new form. Set the email it should send to (your real inbox — this can be
   different from the placeholder `support@premiumacrylics415.com` used on the Contact page;
   update that too if you'd like them to match).
3. Formspree will give you an endpoint URL that looks like
   `https://formspree.io/f/abcd1234`.
4. Open `js/order.js` in this project and find this line near the top:
   ```js
   const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID';
   ```
   Replace `YOUR_FORM_ID` (or the whole URL) with your real endpoint from step 3.
5. That's it — no environment variables, no server, no redeploying anything beyond this one
   file change. The free Formspree plan includes 50 submissions/month, which is worth
   checking against your expected order volume; paid plans raise that limit if needed.

Until you do this, the Submit button will show a message telling you the form isn't
connected yet instead of silently failing.

### What you'll receive

Each submission emails you the customer's name, email, phone, optional shipping address and
notes, plus an itemized order (product, quantity, price, line total) and an estimated total.
Shipping isn't included in that estimate — the site tells the customer you'll confirm the
final total (including shipping) directly with them, which is also your chance to gather
payment (however you currently collect it — Venmo, Zelle, in person, etc.).

## Running it locally

You need Node.js 18+ to use the optional local preview server (nothing else is required —
no `npm install`).

```bash
node server.js
```

Visit `http://localhost:3000`. Add something to your cart, go through checkout, and submit —
once you've set your real Formspree endpoint (see above), you'll get an actual test email.

> Important: open the site via `http://localhost:3000`, not by double-clicking `index.html`.
> The pages load shared header/footer content and product data with `fetch()`, which
> requires a real HTTP server (which `server.js` provides). Any other local static server
> works too (e.g. `npx serve`), if you'd rather not use `server.js`.

## Deploying

Because there's no backend anymore, this deploys as a **plain static site** — the simplest
possible kind of deployment, with no environment variables or serverless functions involved.

### Option A — Vercel (recommended)

1. Push this project to a GitHub repo, keeping the folder structure exactly as-is (files at
   the repo root, not nested inside another folder).
2. Import that repo in Vercel and deploy — no configuration needed, since there's no `api/`
   folder anymore and no environment variables to set.
3. In Project Settings → Domains, add `premiumacrylics415.com` and follow Vercel's DNS
   instructions.

### Option B — Any static host (Netlify, GitHub Pages, Cloudflare Pages, etc.)

Since this is just static files, any of these work equally well — upload the project (again,
keeping files at the root) and point your domain at it per that host's instructions.

### Option C — Render, Railway, Fly.io, or any Node host

If you'd rather run `server.js` directly instead of using a static host:
1. Push this project to a GitHub repo.
2. Create a new "Web Service" pointed at that repo.
3. Start command: `node server.js`.
4. Point your domain's DNS at the host once it's live.

## Product photos

Most products now use your real photos. A handful of listings — mainly the ones I didn't
have a matching photo for — still use the placeholder graphic
(`images/placeholder.svg`). To swap one in:

1. Add the image file to `images/` (e.g. `images/25th-anniversary-upc.jpg`).
2. Open `data/products.json` and update that product's `"image"` field, e.g.
   `"image": "/images/25th-anniversary-upc.jpg"`.

One judgment call worth double-checking: the photo you sent named
`Sams_Club_4_pack_tin_marketing.jpg` was used for the **"Mini Tin Display Case — Ascended
Heroes"** listing, since it was the closest existing match (a 4-tin case). If that's actually
a different product (a Sam's Club–exclusive listing you want as its own product), let me know
and I'll add it separately rather than reusing that slot.

## Editing your catalog

`data/products.json` is the single source of truth for every product — name, price,
category, description, specs, stock status, and image. To add, remove, or edit a product,
edit this file directly (it's plain JSON, no code changes needed elsewhere). Fields:

| Field | Notes |
|---|---|
| `id` | Unique, URL-safe (used in `/product.html?id=...`) |
| `category` | `pokemon`, `one-piece`, or `bundles` — used by the Shop page filters |
| `price` / `compareAtPrice` | Set `compareAtPrice` to show a "was $X" sale badge |
| `inStock` | `false` hides the Add to Cart / Order Now buttons |
| `featured` | `true` shows it in the homepage's Featured section |

Since there's no payment processing on the site anymore, prices here are just what's shown
to customers and included in the order-request email — you still have the final say on the
actual total when you follow up.

## Content that still needs your input

- **Return window** — I used 14 days as a placeholder in the Shipping & Returns and FAQ
  pages; update if yours differs
- **Support email** (`support@premiumacrylics415.com`) — swap for your real inbox, and make
  sure it matches whatever email you set up in Formspree
- **Social links** in the footer currently point nowhere — add your real Instagram/Facebook/
  etc. URLs
- **A few product photos** — see "Product photos" above

## Why no backend at all?

The original version of this site used Stripe for real-time payment, which needed a small
server-side function. Since you'd rather review and confirm orders manually before charging
anyone, that backend became unnecessary — Formspree handles "turn a form submission into an
email" entirely from the browser. That also means no more environment variables, no
serverless functions to misconfigure, and deployment is as simple as uploading static files
anywhere.
