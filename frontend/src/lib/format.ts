/** Shared formatting helpers. */

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const money = (amount: number | undefined | null): string => INR.format(amount ?? 0);

/**
 * Catalogue image paths are stored relative ("assets/images/x.jpg") because
 * that is how the original static site referenced them. Next serves /public
 * from the root, so they need a leading slash.
 */
export function imageUrl(path: string | undefined | null): string {
  if (!path) return '/assets/images/hero-laptop.jpg';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  return `/${path}`;
}

export const WHATSAPP_NUMBER = '919654779949';
export const PHONE_DISPLAY = '+91 96547 79949';

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
