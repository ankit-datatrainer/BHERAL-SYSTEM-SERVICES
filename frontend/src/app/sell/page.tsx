import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { SellWizard } from '@/components/SellWizard';

export const metadata: Metadata = {
  title: 'Sell Used Laptop & Computer Parts Online in Delhi',
  description:
    'Tell us about your used laptop, desktop or components and we send a firm price on WhatsApp within 1-2 working days, with free doorstep pickup and instant UPI across Delhi NCR.',
};

export default function SellPage() {
  return (
    <>
      <PageHero
        title="Sell Your Used Computer for Best Spot Cash"
        description="Share your device details and we send a firm price on WhatsApp within 1&ndash;2 working days. Free doorstep evaluation across Delhi NCR."
        crumbs={[{ label: 'Sell Device' }]}
      />
      <Suspense fallback={<div className="container"><div className="aw-skeleton" style={{ minHeight: 480, margin: '3rem 0' }} /></div>}>
        <SellWizard />
      </Suspense>
    </>
  );
}
