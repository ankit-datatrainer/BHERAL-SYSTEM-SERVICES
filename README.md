# Bheral Systems & Services

Delhi NCR computer re-commerce platform: buy certified refurbished hardware,
sell used devices for a doorstep valuation, book chip-level repairs, and trade
hardware directly with other people through the marketplace.

The application is split into two deployable projects:

| Folder      | Stack                                    | Port | Purpose                                     |
| ----------- | ---------------------------------------- | ---- | ------------------------------------------- |
| `frontend/` | Next.js 16 (App Router), React 19, TypeScript | 3000 | Storefront UI, server-rendered              |
| `backend/`  | Node.js, Express 4, TypeScript            | 4000 | REST API, business rules, Supabase access   |
| Supabase    | Postgres 17                               | —    | Catalogue, customer requests, marketplace   |

The original static site (`index.html`, `css/`, `js/`) is still in the repo as
the design reference. The React app reuses its stylesheets verbatim and ports
`js/award.js` to `frontend/src/lib/motion.ts`.

---

## Quick start

Two terminals.

```bash
cd backend && npm install && npm run dev
```

```bash
cd frontend && npm install && npm run dev
```

Then open <http://localhost:3000>. Check the API alone with
<http://localhost:4000/api/health>.

### Environment

`backend/.env` (copy from `.env.example`):

```
PORT=4000
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=      # preferred — bypasses RLS
SUPABASE_ANON_KEY=              # fallback, limited by RLS policies
CORS_ORIGIN=http://localhost:3000
```

`frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Seeding the catalogue

```bash
cd backend && npm run seed
```

Upserts the 18 products, 24 repair services and the valuation multipliers from
`backend/src/data/catalog.ts`. Idempotent — safe to re-run. Requires a
service-role key, since the catalogue tables are read-only to `anon`.

---

## Architecture

### Why the API owns the rules

Two things moved from the browser to the server during the port, and both
matter:

- **Order totals.** The client sends only `{ id, qty }`. The API looks up the
  current price and stock for each id and recomputes the total. A tampered
  cart cannot change what an order costs.
- **Valuations.** The buy-back multipliers and fault penalties used to ship to
  every visitor in `js/data.js`. They now live in `bss_valuation_config` and
  are applied server-side, so pricing can be tuned without a deploy and is not
  visible to customers.

### Data model

All tables are prefixed `bss_` because the Supabase project also hosts an
unrelated application.

| Table                  | Contents                                            |
| ---------------------- | --------------------------------------------------- |
| `bss_products`         | Catalogue: specs, price, stock, images               |
| `bss_repair_services`  | The 24 bench services                                |
| `bss_valuation_config` | Buy-back multipliers, as a single JSONB row          |
| `bss_orders`           | Placed orders, `status` indexes the order timeline   |
| `bss_sell_requests`    | Buy-back bookings with the stored estimate           |
| `bss_repair_requests`  | Repair bookings                                      |
| `bss_contact_messages` | Contact-form enquiries                               |
| `bss_sellers`          | Marketplace sellers; PIN stored as a bcrypt hash     |
| `bss_listings`         | Items listed by private sellers                      |
| `bss_listing_orders`   | Buyer requests / offers against a listing            |

`status` is an integer index into the milestone arrays in
`backend/src/lib/timelines.ts` — the same convention the static site used.

### Security model

Every table has RLS enabled.

- **Catalogue** (`bss_products`, `bss_repair_services`, `bss_valuation_config`)
  — `SELECT` granted to `anon`. It is public reference data.
- **Customer requests** — `INSERT` only, no `SELECT` policy. Nobody can
  enumerate orders, even with the publishable key.
- **Tracking** goes through `bss_track_request(p_id, p_phone)`, a
  `SECURITY DEFINER` function that requires the phone number registered
  against the reference. The reference id alone is not enough.

**Marketplace.** Seller identity is phone + PIN. The PIN is hashed with
pgcrypto and verified *inside* Postgres by SECURITY DEFINER functions
(`bss_seller_auth`, `bss_listing_create`, `bss_seller_dashboard`,
`bss_listing_set_status`, `bss_listing_order_set_status`), so the API never
handles a password hash and one seller cannot touch another's listings.

Active listings are publicly readable, but `bss_listings.seller_phone` is
excluded from the column-level grant to `anon`. A seller's number reaches the
buyer only after the seller accepts the request — otherwise the marketplace
would be a scrapeable phone directory.

With a service-role key configured the API bypasses RLS entirely, which is the
recommended production setup; the policies above are the safety net for when it
runs on the publishable key.

---

## API

Base URL `http://localhost:4000`.

| Method | Path                       | Purpose                                             |
| ------ | -------------------------- | --------------------------------------------------- |
| GET    | `/api/health`              | Liveness + database reachability                    |
| GET    | `/api/products`            | Filter / sort / paginate; also returns sidebar facets |
| GET    | `/api/products/:id`        | Product detail + related items                      |
| GET    | `/api/repair-services`     | Services, optionally `?device=`                     |
| GET    | `/api/search`              | Header autocomplete across products and services    |
| GET    | `/api/valuation/config`    | Buy-back multipliers                                |
| POST   | `/api/valuation/estimate`  | Live estimate for the sell wizard                   |
| POST   | `/api/orders`              | Place an order (totals recomputed server-side)      |
| POST   | `/api/sell-requests`       | Book a doorstep valuation                           |
| POST   | `/api/repair-requests`     | Book a repair                                       |
| POST   | `/api/contact`             | Store an enquiry                                    |
| GET    | `/api/track`               | `?id=&phone=` milestone lookup                      |
| GET    | `/api/serviceability`      | `?pincode=` free-pickup eligibility                 |

### Marketplace

| Method | Path                                     | Purpose                                  |
| ------ | ---------------------------------------- | ---------------------------------------- |
| GET    | `/api/marketplace/meta`                  | Categories, conditions, deal timeline    |
| GET    | `/api/marketplace/listings`              | Browse; filters + facets                 |
| GET    | `/api/marketplace/listings/:id`          | Listing detail + similar items           |
| POST   | `/api/marketplace/seller/auth`           | Register or sign in (phone + PIN)        |
| POST   | `/api/marketplace/seller/dashboard`      | A seller's listings + buyer requests     |
| POST   | `/api/marketplace/listings`              | Publish a listing                        |
| PATCH  | `/api/marketplace/listings/:id/status`   | Mark sold / withdraw / relist            |
| POST   | `/api/marketplace/listings/:id/orders`   | Buy, or make an offer                    |
| PATCH  | `/api/marketplace/orders/:id/status`     | Seller advances the deal                 |

Validation is Zod-based; a 400 carries
`{ error, details: [{ field, message }] }`, which the forms render inline.

---

## Frontend routes

| Route           | Rendering | Notes                                             |
| --------------- | --------- | ------------------------------------------------- |
| `/`             | Server    | Hero, featured stock and services in initial HTML |
| `/buy`          | Client    | Filters live in the URL, so views are shareable   |
| `/parts`        | Client    | Same browser, pinned to component categories      |
| `/product/[id]` | Server    | Per-product metadata for SEO                      |
| `/sell`         | Client    | 6-step (laptop) / 5-step (component) wizard       |
| `/repair`       | Server + client | Service catalogue, pincode check, 8-step booking |
| `/cart`, `/checkout`, `/wishlist` | Client | Cart holds ids only; prices always refetched |
| `/marketplace`  | Client    | Buyer portal — browse listings from private sellers |
| `/marketplace/[id]` | Server + client | Listing detail, buy or make an offer     |
| `/marketplace/sell` | Client | Seller dashboard — overview, listings, requests, new listing |
| `/marketplace/purchases` | Redirect | Kept working; now points at `/account` |
| `/account`      | Client    | Buyer dashboard — deals, store orders, sell & repair jobs |
| `/admin`        | Client    | Super-admin console — listings, deals, orders, people, enquiries |
| `/invoice/[id]` | Server + client | Printable invoice; `?phone=` is the credential |
| `/track`        | Client    | Deep-linkable `?id=&phone=`; handles all four request types |
| `/contact`      | Client    | `?type=` preselects the enquiry type              |
| `/warranty`, `/privacy`, `/terms` | Static | Policy pages                        |

Cart and wishlist persist in `localStorage` (per browser, as before) and hold
only product ids and quantities.

### The three ways to sell

The site deliberately offers two different selling routes, plus the shop's own
stock, and they should not be confused:

| Route              | What it is                                                       |
| ------------------ | ---------------------------------------------------------------- |
| `/buy`             | Bheral's own certified stock — 6-month warranty, 50-point audit   |
| `/sell`            | Sell **to** Bheral — instant valuation, doorstep pickup, spot UPI |
| `/marketplace`     | Sell **through** Bheral — list it yourself, buyer pays you direct |

Marketplace items carry no Bheral warranty, and the listing page says so.

### Dashboards

All three dashboards share one design system in
`frontend/src/styles/dashboard.css` and the primitives in
`components/marketplace/DashboardUI.tsx` (stat cards, panels, status pills,
deal stepper, empty states, tables), so the buyer, seller and admin views read
as one product rather than bolted-on admin screens.

The shell is a sticky sidebar plus content on laptops, and collapses to a
horizontal segmented nav with 2-up stat cards on tablets and phones.

### Responsive breakpoints

| Width        | Layout                                                     |
| ------------ | ---------------------------------------------------------- |
| ≥ 1200px     | Full desktop: sidebars, 4-up grids, 4-up stats             |
| 992–1199px   | Laptop: 3-up product grids, 2-up stats, icon-only header   |
| 768–991px    | Tablet: single-column pages, segmented dashboard nav        |
| < 768px      | Phone: search on its own header row, 2-up cards, stacked   |

Every page is verified free of horizontal overflow at 390px, 768–820px and
1440px.

### Motion

`frontend/src/lib/motion.ts` is the TypeScript port of `js/award.js`:
preloader, scroll-reveal via `IntersectionObserver`, staggered grids, kinetic
headline, marquee, magnetic buttons, custom cursor, grain and scroll progress.
`bootMotion()` runs once; `refreshMotion()` re-tags the DOM after each route
change and after client-rendered lists settle. Everything is disabled under
`prefers-reduced-motion`.

---

## Portals & accounts

Three signed-in surfaces, all sharing one dashboard design system
(`frontend/src/styles/dashboard.css`).

| Portal | Route | Credential |
| --- | --- | --- |
| Buyer | `/account` | mobile number + PIN |
| Seller | `/marketplace/sell` | mobile number + PIN |
| Super admin | `/admin` | username + password |

Every credential is verified inside Postgres by a `SECURITY DEFINER` function
using pgcrypto, so the API process never handles a password hash and the anon
key cannot reach another account's data. There is no client-side "am I an
admin?" check to bypass — each request re-authenticates.

### Applying the schema

`backend/schema.sql` is the base schema; `backend/sql/portals.sql` adds buyer
accounts, admin accounts and invoices. Run each in the Supabase SQL editor
(Dashboard → SQL Editor → New query → paste → Run). `portals.sql` finishes with
`NOTIFY pgrst, 'reload schema'` so PostgREST picks up the new functions
immediately — without it the API answers *"Could not find the function … in the
schema cache"*.

`portals.sql` also seeds the demo accounts below. **Change these before this
goes anywhere near production.**

| Role | ID | Password |
| --- | --- | --- |
| Super admin | `superadmin` | `Bheral@2026` |
| Buyer | `9000000002` | `2468` |
| Seller | `9000000001` | `1234` |

### Invoices

`/invoice/<reference>?phone=<10 digits>` renders a printable invoice for a shop
order, or for a marketplace deal once the seller has confirmed it (before that
the function raises `NOT_CONFIRMED` — there is no sale yet). The reference plus
the phone number is the credential, the same rule the tracking page uses.
Invoices are linked from the checkout confirmation, both dashboards and the
admin console. Print styles hide the site chrome, so "Print" gives a clean PDF.

### Seller listings on the main site

`SellerListingsStrip` reads the same public `active` listings the marketplace
does and renders them on the home page and `/buy`. A seller publishing an item
is all it takes for it to appear — no approval step, no copy step.

## Scripts

```bash
# backend
npm run dev        # tsx watch
npm run build      # tsc -> dist/
npm start          # node dist/index.js
npm run seed       # upsert catalogue into Supabase
npm run typecheck

# frontend
npm run dev
npm run build
npm start
npm run typecheck
```

---

## Deploying

1. Set `SUPABASE_SERVICE_ROLE_KEY` on the API host and never expose it to the
   browser.
2. Point `CORS_ORIGIN` at the deployed frontend origin.
3. Set `NEXT_PUBLIC_API_URL` to the deployed API URL. The `/api/*` rewrite in
   `next.config.ts` follows it, so the browser stays same-origin.
4. Run `npm run seed` once against the production project.
