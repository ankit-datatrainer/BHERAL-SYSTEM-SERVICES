import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { PHONE_DISPLAY } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Warranty & Doorstep Pickup Policy',
  description: 'How the 6-month replacement warranty, repair warranty and free Delhi NCR doorstep pickup work.',
};

export default function WarrantyPage() {
  return (
    <>
      <PageHero
        title="Warranty & Service Guidelines"
        description="Exactly what is covered, for how long, and how to make a claim."
        crumbs={[{ label: 'Warranty' }]}
      />
      <section className="section">
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="policy-block form-card" style={{ marginBottom: '1.5rem' }}>
            <h2>6-Month Hardware Replacement Warranty</h2>
            <p>
              Every certified refurbished computer includes a written 6-month warranty covering the
              motherboard, processor, RAM, storage drive and display panel. If a covered component fails,
              we repair or replace it at no cost.
            </p>
            <ul>
              <li>Covers manufacturing and component failure under normal use.</li>
              <li>Free doorstep collection and return within eligible Delhi NCR pincodes.</li>
              <li>Claim by quoting your order reference on the <Link className="text-link" href="/track">Track Request</Link> page.</li>
            </ul>
          </div>

          <div className="policy-block form-card" style={{ marginBottom: '1.5rem' }}>
            <h2>What is Not Covered</h2>
            <ul>
              <li>Physical damage, cracked screens, and liquid ingress after handover.</li>
              <li>Consumables: battery wear beyond the stated health, toner and cartridges.</li>
              <li>Software, licence and data loss. Please keep your own backups.</li>
              <li>Units opened or serviced by a third party during the warranty period.</li>
            </ul>
          </div>

          <div className="policy-block form-card" style={{ marginBottom: '1.5rem' }}>
            <h2>Repair Service Warranty</h2>
            <p>
              Bench repairs carry a 90-day warranty on the specific fault repaired and on any OEM part we
              fitted. Chip-level motherboard work carries a 30-day functional warranty.
            </p>
          </div>

          <div className="policy-block form-card" id="pickup">
            <h2>Doorstep Pickup Policy</h2>
            <p>
              Free two-hour pickup runs across Delhi (110xxx), Noida and Ghaziabad (201xxx) and Gurugram
              (122xxx), subject to technician availability. Other pincodes are served by insured courier
              or a walk-in at our Nehru Place bench.
            </p>
            <p>
              To confirm a slot, check your pincode on the <Link className="text-link" href="/repair">repair page</Link>{' '}
              or call {PHONE_DISPLAY}.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
