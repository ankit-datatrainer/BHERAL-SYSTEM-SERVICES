import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { BuyerPortal } from '@/components/marketplace/BuyerPortal';

export const metadata: Metadata = {
  title: 'My Account',
  description:
    'Sign in with your mobile number to track every order, marketplace deal, buy-back and repair booking in one place.',
};

export default function AccountPage() {
  return (
    <>
      <PageHero
        title="My Account"
        description="Every order, marketplace deal, buy-back and repair booking made with your mobile number — with invoices attached."
        crumbs={[{ label: 'My Account' }]}
      />
      <Suspense
        fallback={
          <div className="container">
            <div className="aw-skeleton" style={{ minHeight: 420, margin: '3rem 0' }} />
          </div>
        }
      >
        <BuyerPortal />
      </Suspense>
    </>
  );
}
