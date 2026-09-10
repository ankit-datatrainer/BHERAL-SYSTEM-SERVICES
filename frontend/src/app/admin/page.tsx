import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { AdminConsole } from '@/components/admin/AdminConsole';

export const metadata: Metadata = {
  title: 'Super Admin Console',
  description: 'Internal console for Bheral Systems & Services staff.',
  // Staff-only, and everything behind it needs credentials anyway.
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <PageHero
        title="Super Admin Console"
        description="Listings, deals, orders, buy-backs, repairs and enquiries — the whole platform in one place."
        crumbs={[{ label: 'Admin' }]}
      />
      <Suspense
        fallback={
          <div className="container">
            <div className="aw-skeleton" style={{ minHeight: 420, margin: '3rem 0' }} />
          </div>
        }
      >
        <AdminConsole />
      </Suspense>
    </>
  );
}
