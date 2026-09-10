/**
 * Peer-to-peer marketplace: sellers list their own hardware, buyers browse
 * and buy it.
 *
 * Seller identity is phone + PIN. Every seller-scoped operation goes through
 * a SECURITY DEFINER function that verifies the PIN with pgcrypto inside
 * Postgres, so this process never handles a password hash and the anon key
 * cannot reach another seller's private data.
 */
import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../supabase.js';
import { asyncRoute, HttpError } from '../middleware/errors.js';
import { makeReferenceId } from '../lib/ids.js';
import { MARKETPLACE_TIMELINE, marketplaceStatusLabel } from '../lib/timelines.js';

export const marketplaceRouter = Router();

const phone = z.string().trim().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number');
const pin = z.string().trim().min(4, 'PIN must be at least 4 digits').max(12, 'PIN is too long');

/** Categories a private seller can list. */
export const LISTING_CATEGORIES = [
  'Laptop',
  'Desktop',
  'Monitor / Screen',
  'Hard Disk',
  'SSD',
  'RAM',
  'Graphics Card',
  'Processor',
  'Motherboard',
  'Printer',
  'Charger / Adapter',
  'Other Accessory',
] as const;

const CONDITIONS = ['Like New', 'Excellent', 'Good', 'Fair', 'For Parts / Not Working'] as const;

/** Maps a Postgres exception from our functions onto an HTTP response. */
function translateDbError(message: string): HttpError {
  if (message.includes('BAD_CREDENTIALS')) {
    return new HttpError(401, 'That phone number and PIN do not match.');
  }
  if (message.includes('NAME_REQUIRED')) {
    return new HttpError(400, 'Enter your name to open a seller account.');
  }
  if (message.includes('INVALID_PHONE')) {
    return new HttpError(400, 'Enter a valid 10-digit mobile number.');
  }
  if (message.includes('INVALID_PIN')) {
    return new HttpError(400, 'Choose a PIN of at least 4 digits.');
  }
  if (message.includes('NOT_OWNER')) {
    return new HttpError(403, 'That listing belongs to a different seller.');
  }
  if (message.includes('NOT_FOUND')) {
    return new HttpError(404, 'That listing no longer exists.');
  }
  return new HttpError(502, `Marketplace request failed: ${message}`);
}

/**
 * Columns the public marketplace may read.
 *
 * `seller_phone` is deliberately absent: the anon role has had SELECT on that
 * column revoked, so `select('*')` would fail, and the number must not reach a
 * buyer before the seller accepts their request.
 */
const PUBLIC_LISTING_COLUMNS =
  'id, title, category, brand, model, description, condition, price, negotiable, ' +
  'specs, images, city, pincode, status, views, created_at';

/** snake_case listing row -> camelCase API shape. */
function toListing(row: Record<string, any>, includeSeller = false) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    brand: row.brand ?? '',
    model: row.model ?? '',
    description: row.description ?? '',
    condition: row.condition,
    price: row.price,
    negotiable: row.negotiable ?? true,
    specs: (row.specs ?? {}) as Record<string, string>,
    images: (row.images ?? []) as string[],
    city: row.city ?? '',
    pincode: row.pincode ?? '',
    status: row.status,
    views: row.views ?? 0,
    createdAt: row.created_at,
    ...(includeSeller ? { sellerPhone: row.seller_phone } : {}),
  };
}

// ---------------------------------------------------------------------------
// Reference data — lets the UI build its forms without hard-coding options
// ---------------------------------------------------------------------------

marketplaceRouter.get('/marketplace/meta', (_req, res) => {
  res.json({
    categories: LISTING_CATEGORIES,
    conditions: CONDITIONS,
    timeline: MARKETPLACE_TIMELINE,
  });
});

// ---------------------------------------------------------------------------
// Public browse
// ---------------------------------------------------------------------------

const browseSchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  condition: z.string().trim().optional(),
  city: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sort: z.enum(['newest', 'low', 'high']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

/** GET /api/marketplace/listings — the buyer-facing marketplace. */
marketplaceRouter.get(
  '/marketplace/listings',
  asyncRoute(async (req, res) => {
    const params = browseSchema.parse(req.query);

    // RLS already restricts this to active/reserved listings.
    const { data, error } = await supabase.from('bss_listings').select(PUBLIC_LISTING_COLUMNS);
    if (error) throw new HttpError(502, `Failed to load listings: ${error.message}`);

    let items = (data ?? []).map((row) => toListing(row));

    // Facets come from the unfiltered set so options never vanish mid-search.
    const facets = {
      categories: [...new Set(items.map((i) => i.category))].sort(),
      conditions: [...new Set(items.map((i) => i.condition))].sort(),
      cities: [...new Set(items.map((i) => i.city).filter(Boolean))].sort(),
      priceRange: {
        min: items.length ? Math.min(...items.map((i) => i.price)) : 0,
        max: items.length ? Math.max(...items.map((i) => i.price)) : 0,
      },
      total: items.length,
    };

    if (params.q) {
      const q = params.q.toLowerCase();
      items = items.filter((i) =>
        `${i.title} ${i.brand} ${i.model} ${i.category} ${i.description}`.toLowerCase().includes(q),
      );
    }
    if (params.category) items = items.filter((i) => i.category === params.category);
    if (params.condition) items = items.filter((i) => i.condition === params.condition);
    if (params.city) items = items.filter((i) => i.city === params.city);
    if (params.minPrice !== undefined) items = items.filter((i) => i.price >= params.minPrice!);
    if (params.maxPrice !== undefined) items = items.filter((i) => i.price <= params.maxPrice!);

    items.sort((a, b) => {
      if (params.sort === 'low') return a.price - b.price;
      if (params.sort === 'high') return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = items.length;
    const start = (params.page - 1) * params.pageSize;

    res.json({
      items: items.slice(start, start + params.pageSize),
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
      facets,
    });
  }),
);

/** GET /api/marketplace/listings/:id — public detail view. */
marketplaceRouter.get(
  '/marketplace/listings/:id',
  asyncRoute(async (req, res) => {
    const { data, error } = await supabase
      .from('bss_listings')
      .select(PUBLIC_LISTING_COLUMNS)
      .eq('id', req.params.id.toUpperCase())
      .maybeSingle();

    if (error) throw new HttpError(502, `Failed to load listing: ${error.message}`);
    if (!data) throw new HttpError(404, 'That listing is no longer available.');

    const listing = toListing(data);

    // Fire-and-forget, but it still has to be *sent*: Supabase query builders
    // are lazy thenables, so `void supabase.rpc(...)` builds a request that
    // never executes. Calling .then() dispatches it without blocking the
    // response, and a failed view count must not break the page.
    supabase
      .rpc('bss_listing_view', { p_id: listing.id })
      .then(({ error: viewError }) => {
        if (viewError) console.warn('[api] view counter failed:', viewError.message);
      });

    const { data: similar } = await supabase
      .from('bss_listings')
      .select(PUBLIC_LISTING_COLUMNS)
      .eq('category', listing.category)
      .neq('id', listing.id)
      .limit(4);

    res.json({ listing, similar: (similar ?? []).map((row) => toListing(row)) });
  }),
);

// ---------------------------------------------------------------------------
// Seller account
// ---------------------------------------------------------------------------

const authSchema = z.object({
  phone,
  pin,
  name: z.string().trim().min(2, 'Enter your name').optional(),
  email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  city: z.string().trim().optional(),
});

/**
 * POST /api/marketplace/seller/auth
 * Registers a new seller or signs an existing one in — the function decides
 * based on whether the phone number is already known.
 */
marketplaceRouter.post(
  '/marketplace/seller/auth',
  asyncRoute(async (req, res) => {
    const body = authSchema.parse(req.body);

    const { data, error } = await supabase.rpc('bss_seller_auth', {
      p_phone: body.phone,
      p_pin: body.pin,
      p_name: body.name ?? null,
      p_email: body.email || null,
      p_city: body.city ?? null,
    });

    if (error) throw translateDbError(error.message);

    const seller = Array.isArray(data) ? data[0] : data;
    if (!seller) throw new HttpError(401, 'That phone number and PIN do not match.');

    res.json({ seller });
  }),
);

/** POST /api/marketplace/seller/dashboard — listings + buyer requests. */
marketplaceRouter.post(
  '/marketplace/seller/dashboard',
  asyncRoute(async (req, res) => {
    const { phone: sellerPhone, pin: sellerPin } = z.object({ phone, pin }).parse(req.body);

    const { data, error } = await supabase.rpc('bss_seller_dashboard', {
      p_phone: sellerPhone,
      p_pin: sellerPin,
    });

    if (error) throw translateDbError(error.message);

    const payload = (data ?? { listings: [], orders: [] }) as {
      listings: Array<Record<string, any>>;
      orders: Array<Record<string, any>>;
    };

    res.json({
      listings: payload.listings.map((row) => toListing(row, true)),
      orders: payload.orders.map((row) => ({
        id: row.id,
        listingId: row.listing_id,
        listingTitle: row.listingTitle,
        listingPrice: row.listingPrice,
        listingStatus: row.listingStatus,
        buyerName: row.buyer_name,
        buyerPhone: row.buyer_phone,
        buyerEmail: row.buyer_email ?? '',
        buyerCity: row.buyer_city ?? '',
        message: row.message ?? '',
        offerPrice: row.offer_price,
        status: row.status,
        statusLabel: marketplaceStatusLabel(row.status),
        createdAt: row.created_at,
      })),
      timeline: MARKETPLACE_TIMELINE,
    });
  }),
);

// ---------------------------------------------------------------------------
// Listing management
// ---------------------------------------------------------------------------

const listingSchema = z.object({
  phone,
  pin,
  title: z.string().trim().min(6, 'Give your listing a descriptive title'),
  category: z.enum(LISTING_CATEGORIES),
  brand: z.string().trim().min(1, 'Enter the brand'),
  model: z.string().trim().optional().default(''),
  description: z.string().trim().min(20, 'Describe the item in at least 20 characters'),
  condition: z.enum(CONDITIONS),
  price: z.coerce.number().int().min(100, 'Enter a price of at least ₹100').max(1000000),
  negotiable: z.boolean().default(true),
  specs: z.record(z.string()).default({}),
  images: z.array(z.string()).max(6).default([]),
  city: z.string().trim().min(2, 'Enter your city'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
});

/** POST /api/marketplace/listings — publish a listing. */
marketplaceRouter.post(
  '/marketplace/listings',
  asyncRoute(async (req, res) => {
    const body = listingSchema.parse(req.body);

    // Retry on the (unlikely) reference-id collision.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const id = makeReferenceId('BSS-LST');
      const { error } = await supabase.rpc('bss_listing_create', {
        p_phone: body.phone,
        p_pin: body.pin,
        p_id: id,
        p_payload: {
          title: body.title,
          category: body.category,
          brand: body.brand,
          model: body.model,
          description: body.description,
          condition: body.condition,
          price: body.price,
          negotiable: body.negotiable,
          specs: body.specs,
          images: body.images,
          city: body.city,
          pincode: body.pincode,
        },
      });

      if (!error) {
        res.status(201).json({ id, status: 'active', title: body.title, price: body.price });
        return;
      }
      if (!error.message.includes('duplicate key')) throw translateDbError(error.message);
    }

    throw new HttpError(503, 'Could not allocate a listing reference. Please retry.');
  }),
);

const statusSchema = z.object({
  phone,
  pin,
  status: z.enum(['active', 'reserved', 'sold', 'withdrawn']),
});

/** PATCH /api/marketplace/listings/:id/status */
marketplaceRouter.patch(
  '/marketplace/listings/:id/status',
  asyncRoute(async (req, res) => {
    const body = statusSchema.parse(req.body);

    const { error } = await supabase.rpc('bss_listing_set_status', {
      p_phone: body.phone,
      p_pin: body.pin,
      p_id: req.params.id.toUpperCase(),
      p_status: body.status,
    });

    if (error) throw translateDbError(error.message);
    res.json({ id: req.params.id.toUpperCase(), status: body.status });
  }),
);

// ---------------------------------------------------------------------------
// Buyer requests
// ---------------------------------------------------------------------------

const buyerSchema = z.object({
  buyerName: z.string().trim().min(2, 'Enter your name'),
  buyerPhone: phone,
  buyerEmail: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  buyerCity: z.string().trim().optional().default(''),
  message: z.string().trim().max(600).optional().default(''),
  offerPrice: z.coerce.number().int().min(1).optional(),
});

/** POST /api/marketplace/listings/:id/orders — buy, or make an offer. */
marketplaceRouter.post(
  '/marketplace/listings/:id/orders',
  asyncRoute(async (req, res) => {
    const body = buyerSchema.parse(req.body);
    const listingId = req.params.id.toUpperCase();

    const { data: listing, error: listingError } = await supabase
      .from('bss_listings')
      .select('id, title, price, status, negotiable')
      .eq('id', listingId)
      .maybeSingle();

    if (listingError) throw new HttpError(502, `Failed to load listing: ${listingError.message}`);
    if (!listing) throw new HttpError(404, 'That listing is no longer available.');
    if (listing.status !== 'active') {
      throw new HttpError(409, 'This item is no longer available — it has been reserved or sold.');
    }
    if (body.offerPrice && !listing.negotiable) {
      throw new HttpError(400, 'The seller has listed this at a fixed price.');
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const id = makeReferenceId('BSS-MKT');
      const { error } = await supabase.from('bss_listing_orders').insert({
        id,
        listing_id: listingId,
        buyer_name: body.buyerName,
        buyer_phone: body.buyerPhone,
        buyer_email: body.buyerEmail || null,
        buyer_city: body.buyerCity || null,
        message: body.message || null,
        offer_price: body.offerPrice ?? null,
        status: 0,
      });

      if (!error) {
        res.status(201).json({
          id,
          listingId,
          listingTitle: listing.title,
          listingPrice: listing.price,
          offerPrice: body.offerPrice ?? null,
          status: 0,
          statusLabel: marketplaceStatusLabel(0),
          timeline: MARKETPLACE_TIMELINE,
          buyerPhone: body.buyerPhone,
        });
        return;
      }
      if (error.code !== '23505') {
        throw new HttpError(502, `Failed to save your request: ${error.message}`);
      }
    }

    throw new HttpError(503, 'Could not allocate a request reference. Please retry.');
  }),
);

const orderStatusSchema = z.object({
  phone,
  pin,
  status: z.coerce.number().int().min(0).max(MARKETPLACE_TIMELINE.length - 1),
});

/** PATCH /api/marketplace/orders/:id/status — seller accepts/advances a deal. */
marketplaceRouter.patch(
  '/marketplace/orders/:id/status',
  asyncRoute(async (req, res) => {
    const body = orderStatusSchema.parse(req.body);

    const { error } = await supabase.rpc('bss_listing_order_set_status', {
      p_phone: body.phone,
      p_pin: body.pin,
      p_id: req.params.id.toUpperCase(),
      p_status: body.status,
    });

    if (error) throw translateDbError(error.message);

    res.json({
      id: req.params.id.toUpperCase(),
      status: body.status,
      statusLabel: marketplaceStatusLabel(body.status),
    });
  }),
);
