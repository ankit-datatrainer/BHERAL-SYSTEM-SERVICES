/**
 * Milestone timelines for each request type. `status` on a row is an index
 * into these arrays — the same convention the original static site used.
 */
import type { RequestType } from '../types.js';

export const TIMELINES: Record<RequestType, string[]> = {
  order: ['Order Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered'],
  sell: [
    'Request Submitted',
    'Pickup Scheduled',
    'Inspection',
    'Final Value Confirmed',
    'Payment Processing',
    'Completed',
  ],
  repair: [
    'Request Submitted',
    'Pickup Scheduled',
    'Device Received',
    'Diagnosis',
    'Quote Shared',
    'Repair Approved',
    'Repair in Progress',
    'Quality Check',
    'Ready for Delivery',
    'Delivered',
  ],
  marketplace: [
    'Request Sent',
    'Seller Notified',
    'Deal Confirmed',
    'Meetup / Handover Scheduled',
    'Completed',
  ],
};

/**
 * Peer-to-peer marketplace deals run on their own timeline: a buyer raises a
 * request, the seller accepts, they meet, and the item changes hands.
 */
export const MARKETPLACE_TIMELINE = TIMELINES.marketplace;

export function marketplaceStatusLabel(status: number): string {
  const i = Math.max(0, Math.min(status, MARKETPLACE_TIMELINE.length - 1));
  return MARKETPLACE_TIMELINE[i];
}

export function statusLabel(type: RequestType, status: number): string {
  const steps = TIMELINES[type];
  return steps[Math.max(0, Math.min(status, steps.length - 1))];
}
