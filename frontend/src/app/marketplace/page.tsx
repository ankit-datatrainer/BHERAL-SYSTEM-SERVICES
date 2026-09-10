import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { MarketplaceBrowser } from '@/components/marketplace/MarketplaceBrowser';

export const metadata: Metadata = {
  title: 'Marketplace — Buy from Private Sellers in Delhi NCR',
  description:
    'Browse laptops, screens, hard disks, RAM and spare parts listed directly by their owners across Delhi NCR.',
};

const HOW_IT_WORKS = [
  {
    icon: 'search',
    title: 'Find it locally',
    body: 'Filter by category, condition, city and budget. Every item is listed by the person who owns it.',
  },
  {
    icon: 'send',
    title: 'Send a request',
    body: 'Buy at the asking price or make an offer. Your details go to the seller, nobody else.',
  },
  {
    icon: 'handshake',
    title: 'Meet and inspect',
    body: 'Once the seller accepts, you get their number. Check the hardware before any money changes hands.',
  },
  {
    icon: 'verified_user',
    title: 'Need a second opinion?',
    body: 'Bring it to our Rohini bench for a free inspection, or book a repair if it needs work.',
  },
];

export default function MarketplacePage() {
  return (
    <>
      <PageHero
        title="Marketplace: Buy Direct from Owners"
        description="Laptops, screens, hard disks, memory and spare parts listed by people across Delhi NCR. Inspect before you pay."
        crumbs={[{ label: 'Marketplace' }]}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
          <Link className="btn btn-primary" href="/marketplace/sell">
            <span className="icon">sell</span> Sell Your Item Here
          </Link>
          <Link className="btn btn-secondary" href="/marketplace/purchases">
            <span className="icon">receipt_long</span> My Purchases
          </Link>
          <Link className="btn btn-secondary" href="/buy">
            <span className="icon">verified</span> Prefer a Warranty? Shop Certified Stock
          </Link>
        </div>
      </PageHero>

      {/* How it works — sets expectations before someone contacts a stranger. */}
      <section className="section-sm">
        <div className="container">
          <div className="journey-grid steps-4">
            {HOW_IT_WORKS.map((step, i) => (
              <article className="journey-card" key={step.title}>
                <span className="icon-box">
                  <span className="icon">{step.icon}</span>
                </span>
                <span className="badge badge-blue" style={{ width: 'fit-content', marginBottom: '0.5rem', fontSize: 10 }}>
                  STEP {i + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Suspense fallback={<div className="aw-skeleton" style={{ minHeight: 400 }} />}>
            <MarketplaceBrowser />
          </Suspense>
        </div>
      </section>
    </>
  );
}
