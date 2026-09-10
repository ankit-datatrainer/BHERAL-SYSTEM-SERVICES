import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { BuyerPurchases } from '@/components/marketplace/BuyerPurchases';

export const metadata: Metadata = {
  title: 'My Marketplace Purchases',
  description: 'Track every item you have requested from a private seller on the Bheral marketplace.',
};

export default function PurchasesPage() {
  return (
    <>
      <PageHero
        title="My Purchases"
        description="Every item you have requested from a private seller, with live status and seller contact once the deal is accepted."
        crumbs={[{ label: 'Marketplace', href: '/marketplace' }, { label: 'My Purchases' }]}
      />
      <Suspense fallback={<div className="container"><div className="aw-skeleton" style={{ minHeight: 420, margin: '3rem 0' }} /></div>}>
        <BuyerPurchases />
      </Suspense>
    </>
  );
}
