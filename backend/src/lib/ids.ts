/**
 * Human-readable reference IDs, e.g. BSS-ORD-584920.
 * Customers read these out over the phone, so they stay short and digit-only
 * after the prefix. Collisions are handled by the caller retrying on the
 * primary-key conflict.
 */
import { randomInt } from 'node:crypto';

export type IdPrefix = 'BSS-ORD' | 'BSS-SELL' | 'BSS-REP' | 'BSS-LST' | 'BSS-MKT';

export function makeReferenceId(prefix: IdPrefix): string {
  return `${prefix}-${randomInt(100000, 1000000)}`;
}
