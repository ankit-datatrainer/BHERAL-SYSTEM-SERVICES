import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { TrackRequest } from '@/components/TrackRequest';

export const metadata: Metadata = {
  title: 'Track Order, Sell or Repair Request',
  description: 'Real-time milestone transparency for every hardware order, buyback valuation and bench repair.',
};

export default function TrackPage() {
  return (
    <>
      <PageHero
        title="Track Order, Selling, or Repair Request"
        description="Real-time milestone transparency for every hardware order, buyback valuation, and bench repair."
        crumbs={[{ label: 'Track Request' }]}
      />
      <Suspense fallback={<div className="container"><div className="aw-skeleton" style={{ minHeight: 320, margin: '3rem 0' }} /></div>}>
        <TrackRequest />
      </Suspense>
    </>
  );
}
