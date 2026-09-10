import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { CatalogBrowser } from '@/components/CatalogBrowser';

export const metadata: Metadata = {
  title: 'Computer Parts, SSDs, RAM & Upgrades',
  description:
    'Genuine OEM NVMe SSDs, DDR4/DDR5 memory, graphics cards, batteries and chargers with same-day Delhi NCR fitting.',
};

/** Everything that is not a whole computer. */
const PART_CATEGORIES = ['SSD', 'HDD', 'RAM', 'Graphics Card', 'Monitor', 'Printer', 'Charger'];

export default function PartsPage() {
  return (
    <>
      <PageHero
        title="Computer Spares & Performance Upgrades"
        description="Genuine OEM storage, memory, graphics and power accessories with same-day fitting at our Nehru Place bench."
        crumbs={[{ label: 'Computer Parts' }]}
      />
      <section className="section">
        <div className="container">
          <Suspense fallback={<div className="aw-skeleton" style={{ minHeight: 400 }} />}>
            <CatalogBrowser lockedCategories={PART_CATEGORIES} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
