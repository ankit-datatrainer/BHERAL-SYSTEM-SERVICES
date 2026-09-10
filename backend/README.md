# Backend — Express + TypeScript API

REST API for the Bheral Systems storefront. Talks to Supabase (Postgres) and
owns every business rule that must not be trusted to the browser.

See the [root README](../README.md) for the full architecture and API table.

## Run

```bash
npm install
cp .env.example .env   # fill in SUPABASE_URL and a key
npm run dev            # http://localhost:4000
```

`GET /api/health` reports database reachability and which credential is in use.

## Layout

```
src/
  index.ts          Express bootstrap, middleware, graceful shutdown
  env.ts            Zod-validated environment; fails fast at boot
  supabase.ts       Shared client + connectivity probe
  types.ts          Domain types, mirrored in frontend/src/lib/types.ts
  data/catalog.ts   Seed data extracted from the original js/data.js
  lib/
    valuation.ts    Buy-back engine (port of js/sell.js calculateEstimate)
    timelines.ts    Milestone arrays; `status` is an index into these
    serviceability.ts  Pincode -> free-pickup eligibility
    ids.ts          BSS-ORD / BSS-SELL / BSS-REP reference ids
  middleware/errors.ts  HttpError, asyncRoute, 404 + error handlers
  routes/
    catalog.ts      products, product detail, repair services, search
    requests.ts     valuation, orders, sell, repair, contact, track, pincode
    marketplace.ts  seller accounts, listings, buyer requests
scripts/seed.ts     Idempotent catalogue upsert (needs a service-role key)
```

## Notes

- **Order totals are never taken from the client.** `POST /api/orders` accepts
  only `{ id, qty }` per line, then looks up the live price and stock.
- **Reference ids** are random 6-digit suffixes; inserts retry on a primary-key
  collision rather than surfacing an error.
- **Tracking** calls the `bss_track_request` SQL function, which requires the
  phone number registered against the reference. It resolves all four request
  types, including marketplace deals.
- **Marketplace auth** never touches a password hash in Node. Seller PINs are
  verified by pgcrypto inside SECURITY DEFINER functions, and public listing
  queries select an explicit column list because `seller_phone` is not granted
  to the anon role.
