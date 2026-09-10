import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { SellerPortal } from '@/components/marketplace/SellerPortal';

export const metadata: Metadata = {
  title: 'Seller Portal — List Your Laptop, Screen or Spare Part',
  description:
    'List your own laptop, monitor, hard disk, RAM or spare part and sell it directly to buyers across Delhi NCR.',
};

export default function SellerPortalPage() {
  return (
    <>
      <PageHero
        title="Seller Portal"
        description="List your laptop, screen, hard disk or any spare part, and manage buyer requests in one place."
        crumbs={[{ label: 'Marketplace', href: '/marketplace' }, { label: 'Sell' }]}
      />
      <Suspense fallback={<div className="container"><div className="aw-skeleton" style={{ minHeight: 420, margin: '3rem 0' }} /></div>}>
        <SellerPortal />
      </Suspense>
    </>
  );
}
