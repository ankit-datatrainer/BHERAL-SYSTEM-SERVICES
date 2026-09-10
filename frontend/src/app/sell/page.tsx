import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { SellWizard } from '@/components/SellWizard';

export const metadata: Metadata = {
  title: 'Sell Used Laptop & Computer Parts Online in Delhi',
  description:
    'Get a transparent algorithmic valuation for your used laptop, desktop or components, with free doorstep pickup and instant UPI across Delhi NCR.',
};

export default function SellPage() {
  return (
    <>
      <PageHero
        title="Sell Your Used Computer for Best Spot Cash"
        description="Get a transparent, algorithmic valuation in minutes. Free doorstep evaluation across Delhi NCR."
        crumbs={[{ label: 'Sell Device' }]}
      />
      <Suspense fallback={<div className="container"><div className="aw-skeleton" style={{ minHeight: 480, margin: '3rem 0' }} /></div>}>
        <SellWizard />
      </Suspense>
    </>
  );
}
