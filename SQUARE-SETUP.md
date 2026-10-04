# Square checkout setup

The checkout page has a "Pay Now with Square" button. It calls `api/create-checkout.js` (a Vercel
function), which prices the cart from `data/products.json` and creates a Square payment page.
After paying, customers land on `/thank-you.html`.

## 1. Create a Square developer application (free, uses your normal Square login)
1. Go to https://developer.squareup.com and sign in with your Square account.
2. Open **Developer Console** > **Applications** > **+** (create) and name it "Premium Acrylics 415 website".
3. Open the app. At the top, switch between **Sandbox** (test, fake money) and **Production** (real money).
4. Under **Credentials**, copy the **Access token** for the mode you're in.
5. Under **Locations**, copy the **Location ID** for that mode.
   Sandbox and Production each have their own token and location ID - don't mix them.

## 2. Give the keys to Vercel (never put them in the website files or send them in chat)
Vercel > your project > **Settings** > **Environment Variables**. Add:
- `SQUARE_ACCESS_TOKEN` = the access token
- `SQUARE_LOCATION_ID`  = the location ID
- `SQUARE_ENVIRONMENT`  = `sandbox` for testing, `production` for real payments

## 3. Deploy the updated site
New/changed files: `api/`, `vercel.json`, `thank-you.html`, `checkout.html`, `js/square-checkout.js`,
`js/products.js`, `js/cart.js`, `js/product-detail.js`, `data/products.json`, `images/`, `products/`, `sitemap.xml`.
After changing environment variables, redeploy so they take effect.

## 4. Test with fake money (SQUARE_ENVIRONMENT = sandbox)
Add an item, choose "Local pick-up", click **Pay Now with Square**, and pay with Square's test card
`4111 1111 1111 1111` (any future expiry, any CVV, any ZIP). You should land on the thank-you page.

## 5. Go live
Replace the three variables with your Production token, Production location ID, and `production`,
then redeploy. Make one real small purchase and refund it from the Square dashboard.

## Settings you may want (api/_config.js)
- `shippingFee`: flat shipping in dollars. While it is `null`, "Ship to me" orders can't pay online and are
  pointed to the order-request form.
- `taxPercent`: sales tax percent, or `null` for none.
