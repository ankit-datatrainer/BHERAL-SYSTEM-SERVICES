/**
 * Customer request endpoints: orders, sell requests, repair bookings,
 * valuation, contact messages, tracking, and pincode serviceability.
 *
 * Two rules apply throughout:
 *   1. Money is never trusted from the client. Order totals are recomputed
 *      from the catalogue price of each product id.
 *   2. Valuations are never trusted from the client either — the estimate is
 *      recalculated server-side before it is stored.
 */
import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../supabase.js';
import { asyncRoute, HttpError } from '../middleware/errors.js';
import { makeReferenceId } from '../lib/ids.js';
import { calculateValuation } from '../lib/valuation.js';
import { checkPincode } from '../lib/serviceability.js';
import { TIMELINES, statusLabel } from '../lib/timelines.js';
import type { RequestType, ValuationConfig } from '../types.js';

export const requestsRouter = Router();

const phone = z.string().trim().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number');
const pincode = z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode');
const optionalPhone = z
  .string()
  .trim()
  .regex(/^\d{10}$/, 'Enter a valid 10-digit number')
  .optional()
  .or(z.literal(''));

/** Reads the valuation multipliers out of the database. */
async function loadValuationConfig(): Promise<ValuationConfig> {
  const { data, error } = await supabase
    .from('bss_valuation_config')
    .select('key, value')
    .eq('key', 'default')
    .maybeSingle();

  if (error) throw new HttpError(502, `Failed to load valuation config: ${error.message}`);
  if (!data) throw new HttpError(503, 'Valuation config missing. Run `npm run seed` in backend/.');

  return data.value as ValuationConfig;
}

/**
 * Inserts a row, retrying on a primary-key collision so a duplicate random
 * reference id never surfaces as an error to the customer.
 */
async function insertWithReferenceId<T extends Record<string, unknown>>(
  table: string,
  prefix: Parameters<typeof makeReferenceId>[0],
  build: (id: string) => T,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = makeReferenceId(prefix);
    const { error } = await supabase.from(table).insert(build(id));

    if (!error) return id;
    // 23505 = unique_violation; anything else is a real failure.
    if (error.code !== '23505') {
      throw new HttpError(502, `Failed to save request: ${error.message}`);
    }
  }
  throw new HttpError(503, 'Could not allocate a unique reference id. Please retry.');
}

// ---------------------------------------------------------------------------
// Valuation
// ---------------------------------------------------------------------------

const valuationSchema = z.object({
  category: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  processor: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  storageType: z.string().optional(),
  year: z.string().optional(),
  cosmeticCondition: z.string().optional(),
  accessories: z.array(z.string()).optional(),
  functionalQuestions: z.record(z.boolean()).optional(),
  capacity: z.string().optional(),
  interfaceType: z.string().optional(),
  health: z.string().optional(),
  badSectors: z.string().optional(),
  generation: z.string().optional(),
  vram: z.string().optional(),
});

/** GET /api/valuation/config — multipliers, for rendering the wizard's options. */
requestsRouter.get(
  '/valuation/config',
  asyncRoute(async (_req, res) => {
    res.json(await loadValuationConfig());
  }),
);

/** POST /api/valuation/estimate — live estimate as the customer fills the wizard. */
requestsRouter.post(
  '/valuation/estimate',
  asyncRoute(async (req, res) => {
    const input = valuationSchema.parse(req.body);
    const cfg = await loadValuationConfig();
    res.json(calculateValuation(input, cfg));
  }),
);

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

const orderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, 'Enter your full name'),
    phone,
    email: z.string().trim().email('Enter a valid email address'),
    street: z.string().trim().min(3, 'Enter your street address'),
    area: z.string().trim().min(2, 'Enter your area or locality'),
    city: z.string().trim().min(2, 'Enter your city'),
    state: z.string().trim().min(2, 'Enter your state'),
    pincode,
    deliveryMethod: z.string().default('Free Doorstep Delivery'),
    paymentPreference: z.string().default('Cash on Delivery'),
  }),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        qty: z.number().int().min(1).max(10),
      }),
    )
    .min(1, 'Your cart is empty'),
});

/** POST /api/orders — place an order. Totals are recomputed server-side. */
requestsRouter.post(
  '/orders',
  asyncRoute(async (req, res) => {
    const body = orderSchema.parse(req.body);

    const ids = body.items.map((i) => i.id);
    const { data: rows, error } = await supabase
      .from('bss_products')
      .select('id, name, price, stock')
      .in('id', ids);

    if (error) throw new HttpError(502, `Failed to price the order: ${error.message}`);

    const catalogue = new Map((rows ?? []).map((r: any) => [r.id, r]));
    const missing = ids.filter((id) => !catalogue.has(id));
    if (missing.length) {
      throw new HttpError(400, 'Some items are no longer available', { unavailable: missing });
    }

    const outOfStock = body.items.filter((i) => (catalogue.get(i.id)?.stock ?? 0) < i.qty);
    if (outOfStock.length) {
      throw new HttpError(409, 'Not enough stock for some items', {
        items: outOfStock.map((i) => ({ id: i.id, requested: i.qty, available: catalogue.get(i.id)?.stock ?? 0 })),
      });
    }

    const items = body.items.map((i) => {
      const row = catalogue.get(i.id)!;
      return { id: row.id, name: row.name, price: row.price, qty: i.qty };
    });

    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const deliveryFee = 0; // Free doorstep delivery promotion.
    const total = subtotal + deliveryFee;

    const { customer } = body;
    const id = await insertWithReferenceId('bss_orders', 'BSS-ORD', (orderId) => ({
      id: orderId,
      phone: customer.phone,
      status: 0,
      customer: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: `${customer.street}, ${customer.area}`,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
        deliveryMethod: customer.deliveryMethod,
        paymentPreference: customer.paymentPreference,
      },
      items,
      subtotal,
      delivery_fee: deliveryFee,
      total,
    }));

    res.status(201).json({
      id,
      type: 'order' as RequestType,
      status: 0,
      statusLabel: statusLabel('order', 0),
      items,
      subtotal,
      deliveryFee,
      total,
      customer: body.customer,
    });
  }),
);

// ---------------------------------------------------------------------------
// Sell requests
// ---------------------------------------------------------------------------

const sellSchema = z.object({
  device: valuationSchema,
  customer: z.object({
    name: z.string().trim().min(2, 'Enter your full name'),
    phone,
    whatsapp: optionalPhone,
    email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
    address: z.string().trim().min(3, 'Enter your pickup address'),
    area: z.string().trim().min(2, 'Enter your area or locality'),
    city: z.string().trim().default('Delhi'),
    pincode,
    preferredDate: z.string().trim().min(1, 'Choose a preferred date'),
    preferredTime: z.string().trim().min(1, 'Choose a preferred time slot'),
    instructions: z.string().trim().optional().default(''),
  }),
});

/** POST /api/sell-requests — book a doorstep valuation and pickup. */
requestsRouter.post(
  '/sell-requests',
  asyncRoute(async (req, res) => {
    const body = sellSchema.parse(req.body);

    // Recalculated, never taken from the client.
    const cfg = await loadValuationConfig();
    const valuation = calculateValuation(body.device, cfg);

    const { customer, device } = body;
    const id = await insertWithReferenceId('bss_sell_requests', 'BSS-SELL', (sellId) => ({
      id: sellId,
      phone: customer.phone,
      status: 0,
      estimate: valuation.estimate,
      device: {
        category: device.category,
        brand: device.brand ?? '',
        model: device.model || device.category,
        processor: device.processor ?? '',
        ram: device.ram ?? '',
        storage: device.storage ?? device.capacity ?? '',
        condition: device.cosmeticCondition ?? '',
        accessories: device.accessories ?? [],
        functionalQuestions: device.functionalQuestions ?? {},
        estimate: valuation.estimate,
      },
      customer: {
        ...customer,
        whatsapp: customer.whatsapp || customer.phone,
        address: `${customer.address}, ${customer.area}`,
      },
    }));

    res.status(201).json({
      id,
      type: 'sell' as RequestType,
      status: 0,
      statusLabel: statusLabel('sell', 0),
      valuation,
      device: body.device,
      customer: body.customer,
    });
  }),
);

// ---------------------------------------------------------------------------
// Repair bookings
// ---------------------------------------------------------------------------

const repairSchema = z.object({
  details: z.object({
    device: z.string().trim().min(1, 'Choose a device type'),
    problem: z.string().trim().min(1, 'Choose the problem'),
    brand: z.string().trim().min(1, 'Enter the brand'),
    model: z.string().trim().optional().default(''),
    description: z.string().trim().optional().default(''),
    serviceMethod: z.string().trim().default('Free Doorstep Pickup & Drop'),
    photoNames: z.array(z.string()).optional().default([]),
  }),
  customer: z.object({
    name: z.string().trim().min(2, 'Enter your full name'),
    phone,
    whatsapp: optionalPhone,
    email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
    address: z.string().trim().min(3, 'Enter your address'),
    area: z.string().trim().min(2, 'Enter your area or locality'),
    city: z.string().trim().default('Delhi'),
    pincode,
    preferredDate: z.string().trim().min(1, 'Choose a preferred date'),
    preferredTime: z.string().trim().min(1, 'Choose a preferred time slot'),
  }),
});

/** POST /api/repair-requests — book a bench or doorstep repair. */
requestsRouter.post(
  '/repair-requests',
  asyncRoute(async (req, res) => {
    const body = repairSchema.parse(req.body);
    const { customer } = body;

    const id = await insertWithReferenceId('bss_repair_requests', 'BSS-REP', (repairId) => ({
      id: repairId,
      phone: customer.phone,
      status: 0,
      details: body.details,
      customer: { ...customer, whatsapp: customer.whatsapp || customer.phone },
    }));

    res.status(201).json({
      id,
      type: 'repair' as RequestType,
      status: 0,
      statusLabel: statusLabel('repair', 0),
      details: body.details,
      customer: body.customer,
    });
  }),
);

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  phone: optionalPhone,
  email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  subject: z.string().trim().optional().default(''),
  enquiryType: z.string().trim().optional().default('general'),
  message: z.string().trim().min(5, 'Please write a short message'),
});

/** POST /api/contact — store an enquiry from the contact page. */
requestsRouter.post(
  '/contact',
  asyncRoute(async (req, res) => {
    const body = contactSchema.parse(req.body);

    const { error } = await supabase.from('bss_contact_messages').insert({
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      subject: body.subject || null,
      enquiry_type: body.enquiryType,
      message: body.message,
    });

    if (error) throw new HttpError(502, `Failed to save your message: ${error.message}`);

    res.status(201).json({ ok: true, message: 'Thanks — our Delhi team will be in touch shortly.' });
  }),
);

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

const trackSchema = z.object({
  id: z.string().trim().min(4, 'Enter your reference id'),
  phone,
});

/**
 * GET /api/track?id=&phone=
 * Goes through the bss_track_request SECURITY DEFINER function, which requires
 * the phone number registered against the reference — so a reference id on its
 * own is not enough to read somebody's order.
 */
requestsRouter.get(
  '/track',
  asyncRoute(async (req, res) => {
    const { id, phone: customerPhone } = trackSchema.parse(req.query);

    const { data, error } = await supabase.rpc('bss_track_request', {
      p_id: id.toUpperCase(),
      p_phone: customerPhone,
    });

    if (error) throw new HttpError(502, `Tracking lookup failed: ${error.message}`);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      throw new HttpError(404, 'No request found for that reference id and phone number.');
    }

    const type = row.type as RequestType;
    res.json({
      id: row.id,
      type,
      status: row.status,
      statusLabel: statusLabel(type, row.status),
      timeline: TIMELINES[type],
      phone: row.phone,
      createdAt: row.created_at,
      ...(row.payload as Record<string, unknown>),
    });
  }),
);

/** GET /api/serviceability?pincode= — free-pickup eligibility check. */
requestsRouter.get(
  '/serviceability',
  asyncRoute(async (req, res) => {
    const pin = String(req.query.pincode ?? '');
    res.json(checkPincode(pin));
  }),
);
