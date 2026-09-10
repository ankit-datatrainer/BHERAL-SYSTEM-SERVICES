/**
 * Shared marketplace helpers: category metadata, the per-category spec fields
 * a seller is asked for, and the stock imagery used when a listing has no
 * photo of its own.
 */
import { STORAGE_KEYS, readJSON, removeKey, writeJSON } from './storage';
import type { AdminCredentials, BuyerCredentials, SellerCredentials } from './types';

export interface CategoryMeta {
  /** Material Symbols glyph. */
  icon: string;
  /** Fallback image when the seller supplied none. */
  image: string;
  /** Spec fields the listing form asks for, in order. */
  fields: Array<{ label: string; placeholder: string; options?: string[] }>;
}

const YES_NO = ['Yes', 'No'];

export const CATEGORY_META: Record<string, CategoryMeta> = {
  Laptop: {
    icon: 'laptop',
    image: '/assets/images/lenovo-t14.jpg',
    fields: [
      { label: 'Processor', placeholder: 'e.g. Intel Core i7-1185G7' },
      { label: 'RAM', placeholder: 'e.g. 16GB', options: ['4GB', '8GB', '16GB', '32GB', '64GB'] },
      { label: 'Storage', placeholder: 'e.g. 512GB NVMe SSD' },
      { label: 'Screen', placeholder: 'e.g. 14-inch FHD IPS' },
      { label: 'Battery Health', placeholder: 'e.g. 85% / around 4 hours' },
      { label: 'Original Charger', placeholder: 'Yes', options: YES_NO },
    ],
  },
  Desktop: {
    icon: 'desktop_windows',
    image: '/assets/images/corporate-laptops.jpg',
    fields: [
      { label: 'Processor', placeholder: 'e.g. Intel Core i5-8500' },
      { label: 'RAM', placeholder: 'e.g. 16GB' },
      { label: 'Storage', placeholder: 'e.g. 512GB SSD + 1TB HDD' },
      { label: 'Graphics', placeholder: 'e.g. NVIDIA GTX 1650 / Integrated' },
      { label: 'Includes Monitor', placeholder: 'No', options: YES_NO },
    ],
  },
  'Monitor / Screen': {
    icon: 'tv',
    image: '/assets/images/corporate-laptops.jpg',
    fields: [
      { label: 'Screen Size', placeholder: 'e.g. 24-inch', options: ['19-inch', '22-inch', '24-inch', '27-inch', '32-inch or larger'] },
      { label: 'Resolution', placeholder: 'Full HD (1080p)', options: ['HD (720p)', 'Full HD (1080p)', '2K QHD', '4K Ultra HD'] },
      { label: 'Panel Type', placeholder: 'IPS', options: ['IPS', 'VA', 'TN', 'OLED'] },
      { label: 'Dead Pixels', placeholder: 'None', options: ['None', 'A few', 'Visible patch'] },
      { label: 'Ports', placeholder: 'e.g. HDMI, DisplayPort, VGA' },
    ],
  },
  'Hard Disk': {
    icon: 'album',
    image: '/assets/images/hero-laptop.jpg',
    fields: [
      { label: 'Capacity', placeholder: 'e.g. 1TB', options: ['500GB', '1TB', '2TB', '4TB or larger'] },
      { label: 'Form Factor', placeholder: '3.5-inch internal', options: ['2.5-inch internal', '3.5-inch internal', 'External / portable'] },
      { label: 'Interface', placeholder: 'SATA', options: ['SATA', 'USB 3.0', 'USB-C'] },
      { label: 'Health', placeholder: 'No bad sectors', options: ['No bad sectors', 'Minor bad sectors', 'Clicking / faulty'] },
      { label: 'Hours Used', placeholder: 'e.g. around 4000 hours' },
    ],
  },
  SSD: {
    icon: 'hard_drive',
    image: '/assets/images/hero-laptop.jpg',
    fields: [
      { label: 'Capacity', placeholder: 'e.g. 512GB', options: ['128GB', '256GB', '512GB', '1TB', '2TB or larger'] },
      { label: 'Interface', placeholder: 'NVMe', options: ['NVMe (M.2)', 'SATA (M.2)', 'SATA (2.5-inch)'] },
      { label: 'SMART Health', placeholder: '90–100%', options: ['90–100%', '70–89%', 'Below 70%'] },
      { label: 'Read Speed', placeholder: 'e.g. 3500 MB/s' },
    ],
  },
  RAM: {
    icon: 'developer_board',
    image: '/assets/images/corporate-laptops.jpg',
    fields: [
      { label: 'Capacity', placeholder: 'e.g. 16GB', options: ['4GB', '8GB', '16GB', '32GB', '64GB'] },
      { label: 'Generation', placeholder: 'DDR4', options: ['DDR3', 'DDR4', 'DDR5'] },
      { label: 'Speed', placeholder: 'e.g. 3200MHz' },
      { label: 'Form Factor', placeholder: 'Laptop SODIMM', options: ['Laptop SODIMM', 'Desktop DIMM'] },
      { label: 'Number of Sticks', placeholder: 'e.g. 2' },
    ],
  },
  'Graphics Card': {
    icon: 'memory',
    image: '/assets/images/asus-rog.jpg',
    fields: [
      { label: 'GPU Model', placeholder: 'e.g. RTX 3060' },
      { label: 'VRAM', placeholder: 'e.g. 12GB', options: ['2GB', '4GB', '6GB', '8GB', '12GB or more'] },
      { label: 'Used for Mining', placeholder: 'No', options: YES_NO },
      { label: 'Power Connector', placeholder: 'e.g. 1x 8-pin' },
    ],
  },
  Processor: {
    icon: 'stream_apps',
    image: '/assets/images/corporate-laptops.jpg',
    fields: [
      { label: 'Model', placeholder: 'e.g. Core i7-10700K' },
      { label: 'Socket', placeholder: 'e.g. LGA 1200' },
      { label: 'Cores / Threads', placeholder: 'e.g. 8 cores / 16 threads' },
      { label: 'Cooler Included', placeholder: 'No', options: YES_NO },
    ],
  },
  Motherboard: {
    icon: 'check_indeterminate_small',
    image: '/assets/images/corporate-laptops.jpg',
    fields: [
      { label: 'Model', placeholder: 'e.g. ASUS B450M-A' },
      { label: 'Socket', placeholder: 'e.g. AM4' },
      { label: 'Form Factor', placeholder: 'mATX', options: ['ITX', 'mATX', 'ATX', 'E-ATX'] },
      { label: 'Accessories', placeholder: 'e.g. I/O shield, SATA cables' },
    ],
  },
  Printer: {
    icon: 'print',
    image: '/assets/images/corporate-laptops.jpg',
    fields: [
      { label: 'Type', placeholder: 'Laser', options: ['Laser', 'Ink Tank', 'Inkjet', 'All-in-One'] },
      { label: 'Colour', placeholder: 'Monochrome', options: ['Monochrome', 'Colour'] },
      { label: 'Connectivity', placeholder: 'e.g. USB, Wi-Fi, Ethernet' },
      { label: 'Cartridge Status', placeholder: 'e.g. Half full' },
    ],
  },
  'Charger / Adapter': {
    icon: 'power',
    image: '/assets/images/hp-elitebook.jpg',
    fields: [
      { label: 'Wattage', placeholder: 'e.g. 65W' },
      { label: 'Connector', placeholder: 'e.g. USB Type-C' },
      { label: 'Compatible With', placeholder: 'e.g. Dell Latitude, XPS' },
      { label: 'Original / Compatible', placeholder: 'Original', options: ['Original OEM', 'Compatible / third-party'] },
    ],
  },
  'Other Accessory': {
    icon: 'extension',
    image: '/assets/images/corporate-laptops.jpg',
    fields: [
      { label: 'Item Type', placeholder: 'e.g. Wireless mouse, docking station' },
      { label: 'Key Details', placeholder: 'Anything a buyer should know' },
    ],
  },
};

const FALLBACK: CategoryMeta = CATEGORY_META['Other Accessory'];

export const categoryMeta = (category: string): CategoryMeta => CATEGORY_META[category] ?? FALLBACK;

/** First supplied photo, else a category-appropriate stock image. */
export function listingImage(listing: { images?: string[]; category: string }): string {
  const first = listing.images?.[0];
  if (!first) return categoryMeta(listing.category).image;
  if (first.startsWith('http') || first.startsWith('/')) return first;
  return `/${first}`;
}

export const LISTING_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: 'Available', className: 'badge-green' },
  reserved: { label: 'Reserved', className: 'badge-amber' },
  sold: { label: 'Sold', className: 'badge-blue' },
  withdrawn: { label: 'Withdrawn', className: 'badge-blue' },
};

/**
 * Seller credentials for the current browser.
 *
 * The PIN is held in sessionStorage, not localStorage, so it does not outlive
 * the browser session. It is only ever sent to our own API over the same
 * origin.
 */
const SELLER_KEY = 'bss_seller_session';

export function readSellerSession(): SellerCredentials | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SELLER_KEY);
    return raw ? (JSON.parse(raw) as SellerCredentials) : null;
  } catch {
    return null;
  }
}

export function writeSellerSession(creds: SellerCredentials): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SELLER_KEY, JSON.stringify(creds));
  } catch {
    /* storage blocked — the seller just signs in again on reload */
  }
}

export function clearSellerSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SELLER_KEY);
  } catch {
    /* ignore */
  }
}

/** Reference ids of marketplace purchases made from this browser. */
export function rememberBuyerReference(id: string, phone: string): void {
  const list = readJSON<Array<{ id: string; phone: string }>>(STORAGE_KEYS.recentRequests, []);
  if (list.some((r) => r.id === id)) return;
  writeJSON(STORAGE_KEYS.recentRequests, [{ id, phone }, ...list].slice(0, 10));
}

export function readBuyerReferences(): Array<{ id: string; phone: string }> {
  return readJSON<Array<{ id: string; phone: string }>>(STORAGE_KEYS.recentRequests, []);
}

export function clearBuyerReferences(): void {
  removeKey(STORAGE_KEYS.recentRequests);
}

/**
 * Buyer and admin sessions.
 *
 * Held in sessionStorage for the same reason the seller's PIN is: a password
 * should not outlive the browser session, and it is only ever sent to our own
 * API over the same origin.
 */
const BUYER_KEY = 'bss_buyer_session';
const ADMIN_KEY = 'bss_admin_session';

function readSession<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked - they sign in again on reload */
  }
}

function clearSession(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const readBuyerSession = () => readSession<BuyerCredentials>(BUYER_KEY);
export const writeBuyerSession = (creds: BuyerCredentials) => writeSession(BUYER_KEY, creds);
export const clearBuyerSession = () => clearSession(BUYER_KEY);

export const readAdminSession = () => readSession<AdminCredentials>(ADMIN_KEY);
export const writeAdminSession = (creds: AdminCredentials) => writeSession(ADMIN_KEY, creds);
export const clearAdminSession = () => clearSession(ADMIN_KEY);
