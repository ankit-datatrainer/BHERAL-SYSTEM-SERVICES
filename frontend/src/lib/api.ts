/**
 * Typed client for the Express API.
 *
 * Server components call the API directly over its absolute URL; client
 * components go through the same helper, which resolves to a relative /api
 * path in the browser so the Next dev rewrite handles it and no CORS
 * preflight is needed.
 */
import type {
  ApiErrorBody,
  Listing,
  ListingListResponse,
  ListingOrder,
  MarketplaceMeta,
  Seller,
  SellerCredentials,
  SellerDashboard,
  ProductListResponse,
  Product,
  RepairService,
  SearchHit,
  Serviceability,
  TrackedRequest,
  ValuationConfig,
  ValuationResult,
} from './types';

const SERVER_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** In the browser we want same-origin; on the server we need the absolute URL. */
function resolve(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return typeof window === 'undefined' ? `${SERVER_BASE}${suffix}` : suffix;
}

/** Error carrying the API's structured validation details. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Flattens Zod-style field errors into `{ field: message }`. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    const out: Record<string, string> = {};
    for (const item of this.details as Array<{ field?: string; message?: string }>) {
      if (item?.field && item?.message) out[item.field] = item.message;
    }
    return out;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolve(path), {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    // The catalogue is small and changes rarely; requests are always fresh so
    // stock and pricing are never stale.
    cache: 'no-store',
  });

  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const err = (body ?? {}) as ApiErrorBody;
    throw new ApiError(res.status, err.error ?? `Request failed (${res.status})`, err.details);
  }

  return body as T;
}

/** Serialises a filter object into a query string, dropping empty values. */
export function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
    } else if (typeof value === 'boolean') {
      if (value) search.set(key, 'true');
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  health: () => request<{ status: string; database: string }>('/api/health'),

  products: (params: Record<string, unknown> = {}) =>
    request<ProductListResponse>(`/api/products${toQuery(params)}`),

  product: (id: string) =>
    request<{ product: Product; related: Product[] }>(`/api/products/${encodeURIComponent(id)}`),

  repairServices: (device?: string) =>
    request<{ items: RepairService[]; total: number; devices: string[] }>(
      `/api/repair-services${toQuery({ device })}`,
    ),

  search: (q: string, scope = 'all') =>
    request<{ results: SearchHit[] }>(`/api/search${toQuery({ q, scope })}`),

  valuationConfig: () => request<ValuationConfig>('/api/valuation/config'),

  estimate: (device: Record<string, unknown>) =>
    request<ValuationResult>('/api/valuation/estimate', {
      method: 'POST',
      body: JSON.stringify(device),
    }),

  createOrder: (payload: unknown) =>
    request<{ id: string; total: number; items: Array<{ name: string; qty: number; price: number }> }>(
      '/api/orders',
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  createSellRequest: (payload: unknown) =>
    request<{ id: string; valuation: ValuationResult; device: Record<string, unknown>; customer: Record<string, string> }>(
      '/api/sell-requests',
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  createRepairRequest: (payload: unknown) =>
    request<{ id: string; details: Record<string, unknown>; customer: Record<string, string> }>(
      '/api/repair-requests',
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  contact: (payload: unknown) =>
    request<{ ok: boolean; message: string }>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  track: (id: string, phone: string) =>
    request<TrackedRequest>(`/api/track${toQuery({ id, phone })}`),

  serviceability: (pincode: string) =>
    request<Serviceability>(`/api/serviceability${toQuery({ pincode })}`),

  // ---- Marketplace ----

  marketplaceMeta: () => request<MarketplaceMeta>('/api/marketplace/meta'),

  listings: (params: Record<string, unknown> = {}) =>
    request<ListingListResponse>(`/api/marketplace/listings${toQuery(params)}`),

  listing: (id: string) =>
    request<{ listing: Listing; similar: Listing[] }>(
      `/api/marketplace/listings/${encodeURIComponent(id)}`,
    ),

  /** Registers a new seller or signs an existing one in. */
  sellerAuth: (payload: SellerCredentials & { name?: string; email?: string; city?: string }) =>
    request<{ seller: Seller }>('/api/marketplace/seller/auth', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sellerDashboard: (creds: SellerCredentials) =>
    request<SellerDashboard>('/api/marketplace/seller/dashboard', {
      method: 'POST',
      body: JSON.stringify(creds),
    }),

  createListing: (payload: unknown) =>
    request<{ id: string; status: string; title: string; price: number }>(
      '/api/marketplace/listings',
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  setListingStatus: (id: string, payload: SellerCredentials & { status: string }) =>
    request<{ id: string; status: string }>(
      `/api/marketplace/listings/${encodeURIComponent(id)}/status`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    ),

  buyListing: (id: string, payload: unknown) =>
    request<{
      id: string;
      listingId: string;
      listingTitle: string;
      listingPrice: number;
      offerPrice: number | null;
      statusLabel: string;
      timeline: string[];
      buyerPhone: string;
    }>(`/api/marketplace/listings/${encodeURIComponent(id)}/orders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  setListingOrderStatus: (id: string, payload: SellerCredentials & { status: number }) =>
    request<Pick<ListingOrder, 'id' | 'status' | 'statusLabel'>>(
      `/api/marketplace/orders/${encodeURIComponent(id)}/status`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    ),
};
