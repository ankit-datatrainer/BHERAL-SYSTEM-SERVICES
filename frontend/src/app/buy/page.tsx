import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { CatalogBrowser } from '@/components/CatalogBrowser';

export const metadata: Metadata = {
  title: 'Buy Refurbished Laptops in Delhi NCR',
  description:
    '50-point hardware inspected corporate machines with guaranteed battery health, genuine OS, and 6-month warranty.',
};

export default function BuyPage() {
  return (
    <>
      <PageHero
        title="Certified Refurbished Business Laptops"
        description="50-point hardware inspected corporate machines with guaranteed battery health, genuine OS, and 6-month warranty."
        crumbs={[{ label: 'Buy Refurbished Laptops' }]}
      />
      <section className="section">
        <div className="container">
          <Suspense fallback={<div className="aw-skeleton" style={{ minHeight: 400 }} />}>
            <CatalogBrowser />
          </Suspense>
        </div>
      </section>
    </>
  );
}
