/**
 * Buyer accounts, invoices, and the super-admin console.
 *
 * Same model as the seller portal: every credential check happens inside a
 * SECURITY DEFINER function with pgcrypto, so this process never sees a
 * password hash and never decides for itself whether a caller is allowed in.
 */
import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../supabase.js';
import { asyncRoute, HttpError } from '../middleware/errors.js';
import { MARKETPLACE_TIMELINE, TIMELINES, marketplaceStatusLabel } from '../lib/timelines.js';

export const portalsRouter = Router();

const phone = z.string().trim().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number');
const pin = z.string().trim().min(4, 'PIN must be at least 4 digits').max(12, 'PIN is too long');

/** Maps a Postgres exception from our functions onto an HTTP response. */
function translate(message: string): HttpError {
  if (message.includes('BAD_CREDENTIALS')) {
    return new HttpError(401, 'Those credentials do not match an account.');
  }
  if (message.includes('NAME_REQUIRED')) {
    return new HttpError(400, 'Enter your name to create an account.');
  }
  if (message.includes('INVALID_PHONE')) {
    return new HttpError(400, 'Enter a valid 10-digit mobile number.');
  }
  if (message.includes('INVALID_PIN')) {
    return new HttpError(400, 'Choose a PIN of at least 4 digits.');
  }
  if (message.includes('NOT_CONFIRMED')) {
    return new HttpError(409, 'The invoice is available once the seller confirms the deal.');
  }
  if (message.includes('INVALID_STATUS') || message.includes('INVALID_KIND')) {
    return new HttpError(400, 'That is not a status this record can take.');
  }
  if (message.includes('NOT_FOUND')) {
    return new HttpError(404, 'That record no longer exists.');
  }
  return new HttpError(502, `Request failed: ${message}`);
}

/** Unwraps a single-row RPC result. */
function single<T>(data: unknown): T | null {
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as T | null;
}

// ---------------------------------------------------------------------------
// Buyer accounts
// ---------------------------------------------------------------------------

const buyerAuthSchema = z.object({
  phone,
  pin,
  name: z.string().trim().min(2, 'Enter your name').optional(),
  email: z.string().trim().email('Enter a valid email').or(z.literal('')).optional(),
  city: z.string().trim().optional(),
});

/**
 * POST /api/buyer/auth
 * Creates the account on first use, signs in afterwards — the function
 * decides based on whether the number is already known.
 */
portalsRouter.post(
  '/buyer/auth',
  asyncRoute(async (req, res) => {
    const body = buyerAuthSchema.parse(req.body);

    const { data, error } = await supabase.rpc('bss_buyer_auth', {
      p_phone: body.phone,
      p_pin: body.pin,
      p_name: body.name ?? null,
      p_email: body.email || null,
      p_city: body.city ?? null,
    });

    if (error) throw translate(error.message);

    const buyer = single<Record<string, unknown>>(data);
    if (!buyer) throw new HttpError(401, 'Those credentials do not match an account.');

    res.json({ buyer });
  }),
);

/** POST /api/buyer/dashboard — marketplace deals, shop orders, sell & repair jobs. */
portalsRouter.post(
  '/buyer/dashboard',
  asyncRoute(async (req, res) => {
    const creds = z.object({ phone, pin }).parse(req.body);

    const { data, error } = await supabase.rpc('bss_buyer_dashboard', {
      p_phone: creds.phone,
      p_pin: creds.pin,
    });

    if (error) throw translate(error.message);

    const payload = (data ?? {}) as {
      buyer: Record<string, unknown>;
      deals: Array<Record<string, any>>;
      orders: Array<Record<string, any>>;
      sellRequests: Array<Record<string, any>>;
      repairRequests: Array<Record<string, any>>;
    };

    res.json({
      buyer: payload.buyer,
      deals: (payload.deals ?? []).map((d) => ({
        ...d,
        statusLabel: marketplaceStatusLabel(d.status),
        timeline: MARKETPLACE_TIMELINE,
      })),
      orders: (payload.orders ?? []).map((o) => ({
        id: o.id,
        status: o.status,
        statusLabel: TIMELINES.order[Math.min(o.status, TIMELINES.order.length - 1)],
        timeline: TIMELINES.order,
        items: o.items,
        subtotal: Number(o.subtotal),
        deliveryFee: Number(o.delivery_fee),
        total: Number(o.total),
        customer: o.customer,
        createdAt: o.created_at,
      })),
      sellRequests: (payload.sellRequests ?? []).map((r) => ({
        id: r.id,
        status: r.status,
        statusLabel: TIMELINES.sell[Math.min(r.status, TIMELINES.sell.length - 1)],
        timeline: TIMELINES.sell,
        estimate: Number(r.estimate),
        device: r.device,
        createdAt: r.created_at,
      })),
      repairRequests: (payload.repairRequests ?? []).map((r) => ({
        id: r.id,
        status: r.status,
        statusLabel: TIMELINES.repair[Math.min(r.status, TIMELINES.repair.length - 1)],
        timeline: TIMELINES.repair,
        details: r.details,
        createdAt: r.created_at,
      })),
    });
  }),
);

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

/**
 * GET /api/invoices/:id?phone=
 * The phone number is the credential — the same rule the tracking page uses.
 */
portalsRouter.get(
  '/invoices/:id',
  asyncRoute(async (req, res) => {
    const { phone: customerPhone } = z.object({ phone }).parse(req.query);

    const { data, error } = await supabase.rpc('bss_invoice', {
      p_id: req.params.id.toUpperCase(),
      p_phone: customerPhone,
      p_admin: false,
    });

    if (error) throw translate(error.message);
    if (!data) throw new HttpError(404, 'No invoice found for that reference and number.');

    res.json({ invoice: data });
  }),
);

// ---------------------------------------------------------------------------
// Super admin
// ---------------------------------------------------------------------------

const adminCreds = z.object({
  username: z.string().trim().min(3, 'Enter your username'),
  password: z.string().min(6, 'Enter your password'),
});

/** POST /api/admin/auth */
portalsRouter.post(
  '/admin/auth',
  asyncRoute(async (req, res) => {
    const body = adminCreds.parse(req.body);

    const { data, error } = await supabase.rpc('bss_admin_auth', {
      p_username: body.username,
      p_password: body.password,
    });

    if (error) throw translate(error.message);

    const admin = single<Record<string, unknown>>(data);
    if (!admin) throw new HttpError(401, 'Those credentials do not match an account.');

    res.json({ admin });
  }),
);

/** POST /api/admin/overview — every table the console renders, in one call. */
portalsRouter.post(
  '/admin/overview',
  asyncRoute(async (req, res) => {
    const body = adminCreds.parse(req.body);

    const { data, error } = await supabase.rpc('bss_admin_overview', {
      p_username: body.username,
      p_password: body.password,
    });

    if (error) throw translate(error.message);

    const payload = (data ?? {}) as Record<string, any>;

    res.json({
      ...payload,
      deals: (payload.deals ?? []).map((d: any) => ({
        ...d,
        statusLabel: marketplaceStatusLabel(d.status),
      })),
      timelines: TIMELINES,
    });
  }),
);

const LISTING_STATUSES = ['active', 'reserved', 'sold', 'removed'] as const;

/** PATCH /api/admin/listings/:id/status */
portalsRouter.patch(
  '/admin/listings/:id/status',
  asyncRoute(async (req, res) => {
    const body = adminCreds.extend({ status: z.enum(LISTING_STATUSES) }).parse(req.body);

    const { data, error } = await supabase.rpc('bss_admin_set_listing_status', {
      p_username: body.username,
      p_password: body.password,
      p_id: req.params.id.toUpperCase(),
      p_status: body.status,
    });

    if (error) throw translate(error.message);
    res.json(data);
  }),
);

/** POST /api/admin/listings/:id/delete — a body-carrying delete, since the credentials travel in it. */
portalsRouter.post(
  '/admin/listings/:id/delete',
  asyncRoute(async (req, res) => {
    const body = adminCreds.parse(req.body);

    const { data, error } = await supabase.rpc('bss_admin_delete_listing', {
      p_username: body.username,
      p_password: body.password,
      p_id: req.params.id.toUpperCase(),
    });

    if (error) throw translate(error.message);
    res.json(data);
  }),
);

const REQUEST_KINDS = ['deal', 'order', 'sell', 'repair'] as const;

/** Maps an admin request kind onto the timeline that bounds its status. */
const KIND_TIMELINE: Record<(typeof REQUEST_KINDS)[number], string[]> = {
  deal: TIMELINES.marketplace,
  order: TIMELINES.order,
  sell: TIMELINES.sell,
  repair: TIMELINES.repair,
};

/** PATCH /api/admin/requests/:kind/:id/status */
portalsRouter.patch(
  '/admin/requests/:kind/:id/status',
  asyncRoute(async (req, res) => {
    const { kind } = z.object({ kind: z.enum(REQUEST_KINDS) }).parse(req.params);
    const body = adminCreds.extend({ status: z.coerce.number().int().min(0) }).parse(req.body);

    const ceiling = KIND_TIMELINE[kind].length - 1;
    if (body.status > ceiling) {
      throw new HttpError(400, `Status must be between 0 and ${ceiling} for this record.`);
    }

    const { data, error } = await supabase.rpc('bss_admin_set_request_status', {
      p_username: body.username,
      p_password: body.password,
      p_kind: kind,
      p_id: req.params.id.toUpperCase(),
      p_status: body.status,
    });

    if (error) throw translate(error.message);

    res.json({ ...(data as object), statusLabel: KIND_TIMELINE[kind][body.status] });
  }),
);

/** POST /api/admin/invoices/:id — any invoice, no phone number needed. */
portalsRouter.post(
  '/admin/invoices/:id',
  asyncRoute(async (req, res) => {
    const body = adminCreds.parse(req.body);

    const { data, error } = await supabase.rpc('bss_admin_invoice', {
      p_username: body.username,
      p_password: body.password,
      p_id: req.params.id.toUpperCase(),
    });

    if (error) throw translate(error.message);
    if (!data) throw new HttpError(404, 'No invoice found for that reference.');

    res.json({ invoice: data });
  }),
);
