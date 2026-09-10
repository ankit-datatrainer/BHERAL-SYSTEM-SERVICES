# Frontend — Next.js + React + TypeScript

Storefront for Bheral Systems & Services. App Router, React 19, no CSS
framework — it reuses the original site's stylesheets verbatim.

See the [root README](../README.md) for architecture and the route table.

## Run

```bash
npm install
npm run dev    # http://localhost:3000
```

Needs the API running on port 4000 (`cd ../backend && npm run dev`).

## Layout

```
src/
  app/                 App Router pages (see root README for the route table)
  components/
    StoreProvider.tsx  Cart, wishlist and toasts (localStorage-backed)
    SiteHeader.tsx     Utility bar, search, mega menus, mobile drawer
    SiteFooter.tsx     Footer, WhatsApp CTA, mobile bottom bar
    CatalogBrowser.tsx Filter/sort/paginate; state lives in the URL
    SellWizard.tsx     6-step laptop / 5-step component buy-back flow
    RepairBooking.tsx  Service catalogue + 8-step booking wizard
    CheckoutForm.tsx   Delivery details, server-validated
    TrackRequest.tsx   Reference + phone lookup with milestone timeline
    marketplace/
      MarketplaceBrowser.tsx  Buyer portal — browse private-seller listings
      ListingCard.tsx         Marketplace tile
      ListingDetail.tsx       Listing page + buy / make-an-offer flow
      SellerPortal.tsx        Seller dashboard: overview, listings, requests
      BuyerPurchases.tsx      Buyer dashboard: every request from this browser
      DashboardUI.tsx         Shared stat cards, panels, pills, deal stepper
    MotionLayer.tsx    Boots the motion engine, re-tags on route change
  lib/
    api.ts             Typed API client; ApiError exposes field errors
    motion.ts          TypeScript port of the static site's js/award.js
    types.ts           Wire types, mirrored from backend/src/types.ts
    format.ts          INR formatting, image paths, WhatsApp deep links
    storage.ts         localStorage helpers that never throw
    marketplace.ts     Category metadata, per-category spec fields, seller session
  styles/              style.css, responsive.css, award.css (shared with the
                       static site — edit there and copy, or vice versa)
                       dashboard.css — the marketplace dashboard design system
```

## Notes

- The cart stores **ids and quantities only**. Product details and prices are
  refetched on every render, so a week-old cart cannot show a stale price.
- `next.config.ts` rewrites `/api/*` to `NEXT_PUBLIC_API_URL`, so the browser
  always calls same-origin and no CORS preflight is needed.
- Components that call `useSearchParams()` are wrapped in `<Suspense>`, which
  Next requires for prerendering.
- The seller PIN lives in `sessionStorage`, not `localStorage`, so it does not
  survive closing the browser. It is only ever sent to our own API.
