/** Wire types shared with the Express API (backend/src/types.ts). */

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  images: string[];
  price: number;
  originalPrice?: number;
  discount?: number;
  processor: string;
  ram: number;
  storage: number;
  storageType: string;
  gpu: string;
  screenSize: number;
  operatingSystem: string;
  condition: string;
  rating: number;
  reviewCount: number;
  stock: number;
  warranty: string;
  isNew: boolean;
  featured: boolean;
  description: string;
  specifications: Record<string, string>;
}

export interface RepairService {
  id: string;
  name: string;
  device: string;
  icon: string;
  description: string;
  time: string;
  popular: boolean;
}

export interface ProductFacets {
  categories: string[];
  brands: string[];
  storageTypes: string[];
  operatingSystems: string[];
  conditions: string[];
  ram: number[];
  storage: number[];
  screenSizes: number[];
  priceRange: { min: number; max: number };
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: ProductFacets;
}

export interface SearchHit {
  id: string;
  name: string;
  category: string;
  description: string;
  image?: string;
  icon?: string;
  price?: number;
  href: string;
  isService: boolean;
}

export interface ValuationResult {
  estimate: number;
  minRange: number;
  maxRange: number;
  currency: 'INR';
}

export interface ValuationConfig {
  basePrices: Record<string, number>;
  brandMultipliers: Record<string, number>;
  processorMultipliers: Record<string, number>;
  ramMultipliers: Record<string, number>;
  storageMultipliers: Record<string, number>;
  storageTypeMultipliers: Record<string, number>;
  yearMultipliers: Record<string, number>;
  conditionMultipliers: Record<string, number>;
  componentRules: Record<string, Record<string, Record<string, number>>>;
}

export type RequestType = 'order' | 'sell' | 'repair' | 'marketplace';

export interface TrackedRequest {
  id: string;
  type: RequestType;
  status: number;
  statusLabel: string;
  timeline: string[];
  phone: string;
  createdAt: string;
  customer?: Record<string, string>;
  items?: Array<{ id: string; name: string; price: number; qty: number }>;
  device?: Record<string, unknown>;
  details?: Record<string, unknown>;
  total?: number;
  subtotal?: number;
  deliveryFee?: number;
  estimate?: number;
  /** Marketplace deals only. `seller` is null until the seller accepts. */
  listing?: {
    id: string;
    title: string;
    category: string;
    brand: string | null;
    model: string | null;
    price: number;
    condition: string;
    images: string[];
    city: string | null;
    status: string;
  };
  buyer?: { name: string; phone: string; email: string | null; city: string | null };
  seller?: { name: string; phone: string; city: string | null } | null;
  offerPrice?: number | null;
  message?: string | null;
}

export interface Serviceability {
  valid: boolean;
  freePickup?: boolean;
  message: string;
}

/** Shape of a 4xx body from the API. */
export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Marketplace — sellers list their own hardware, buyers browse and buy it
// ---------------------------------------------------------------------------

export type ListingStatus = 'active' | 'reserved' | 'sold' | 'withdrawn';

export interface Listing {
  id: string;
  title: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  condition: string;
  price: number;
  negotiable: boolean;
  specs: Record<string, string>;
  images: string[];
  city: string;
  pincode: string;
  status: ListingStatus;
  views: number;
  createdAt: string;
  sellerPhone?: string;
}

export interface ListingFacets {
  categories: string[];
  conditions: string[];
  cities: string[];
  priceRange: { min: number; max: number };
  total: number;
}

export interface ListingListResponse {
  items: Listing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: ListingFacets;
}

export interface Seller {
  phone: string;
  name: string;
  email: string | null;
  city: string | null;
  created_at: string;
}

export interface SellerCredentials {
  phone: string;
  pin: string;
}

export interface ListingOrder {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  listingStatus: ListingStatus;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerCity: string;
  message: string;
  offerPrice: number | null;
  status: number;
  statusLabel: string;
  createdAt: string;
}

export interface SellerDashboard {
  listings: Listing[];
  orders: ListingOrder[];
  timeline: string[];
}

export interface MarketplaceMeta {
  categories: string[];
  conditions: string[];
  timeline: string[];
}
