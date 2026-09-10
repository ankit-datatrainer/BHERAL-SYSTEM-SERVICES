/**
 * localStorage helpers that never throw.
 *
 * Private-mode browsers and blocked site data make these calls fail, and a
 * crashed cart provider would take the whole page with it.
 */
export const STORAGE_KEYS = {
  cart: 'bss_cart',
  wishlist: 'bss_wishlist',
  sellProgress: 'bss_sell_progress',
  recentRequests: 'bss_recent_requests',
} as const;

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded or storage blocked — the UI still works in-memory */
  }
}

export function removeKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
