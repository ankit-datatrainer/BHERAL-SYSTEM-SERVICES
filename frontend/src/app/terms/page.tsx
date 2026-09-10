import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The terms that apply to purchases, buy-backs and repairs with Bheral Systems & Services.',
};

export default function TermsPage() {
  return (
    <>
      <PageHero
        title="Terms & Conditions"
        description="The terms that apply when you buy from, sell to, or book a repair with us."
        crumbs={[{ label: 'Terms & Conditions' }]}
      />
      <section className="section">
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="policy-block form-card" style={{ marginBottom: '1.5rem' }}>
            <h2>Purchases</h2>
            <p>All refurbished stock is sold as tested and graded at the time of listing. Photographs are representative; minor cosmetic variation is normal on pre-owned hardware. Stock and pricing are confirmed when the order is placed, not when an item is added to the cart.</p>
          </div>
          <div className="policy-block form-card" style={{ marginBottom: '1.5rem' }}>
            <h2>Valuations &amp; Buy-Back</h2>
            <p>Online valuations are provisional and calculated from the specifications you declare. The final offer is confirmed by our technician after physical inspection. You are free to decline the final offer at no cost.</p>
            <p>You confirm you are the lawful owner of any device you offer for sale, and valid photo ID is required at handover.</p>
          </div>
          <div className="policy-block form-card" style={{ marginBottom: '1.5rem' }}>
            <h2>Repairs</h2>
            <p>Repair work begins only after you approve the written quote. Diagnosis may reveal additional faults; these are quoted separately before any further work. We are not liable for data loss — please back up before handover.</p>
          </div>
          <div className="policy-block form-card">
            <h2>Warranty &amp; Liability</h2>
            <p>Warranty coverage is set out on the <Link className="text-link" href="/warranty">Warranty page</Link>. Our liability for any claim is limited to the amount paid for the specific product or service.</p>
          </div>
        </div>
      </section>
    </>
  );
}
