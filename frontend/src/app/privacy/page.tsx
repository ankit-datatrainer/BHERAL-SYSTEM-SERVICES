import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { PHONE_DISPLAY } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What data Bheral Systems & Services collects, why, and how device data is erased.',
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        title="Privacy Policy"
        description="What we collect, why we collect it, and how your device data is handled."
        crumbs={[{ label: 'Privacy Policy' }]}
      />
      <section className="section">
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="policy-block form-card" style={{ marginBottom: '1.5rem' }}>
            <h2>Information We Collect</h2>
            <p>To fulfil an order, buy-back or repair we collect your name, mobile number, email address and the service address you provide. Device details you enter into the valuation or booking wizard are stored alongside the request.</p>
          </div>
          <div className="policy-block form-card" style={{ marginBottom: '1.5rem' }}>
            <h2>How We Use It</h2>
            <ul>
              <li>Scheduling pickup, delivery and technician visits.</li>
              <li>Confirming valuations and repair quotes by phone or WhatsApp.</li>
              <li>Issuing invoices and honouring warranty claims.</li>
            </ul>
            <p>We do not sell your personal information, and we do not use it for advertising.</p>
          </div>
          <div className="policy-block form-card" style={{ marginBottom: '1.5rem' }}>
            <h2>Device Data Erasure</h2>
            <p>Every device we purchase is wiped to a DoD 5220.22-M standard before refurbishment or resale. On request we will issue a written data destruction certificate. Please still back up and sign out of your accounts before handover.</p>
          </div>
          <div className="policy-block form-card">
            <h2>Your Choices</h2>
            <p>To access, correct or delete the information held against a request, contact us on {PHONE_DISPLAY} quoting your reference id. Cart and wishlist contents live only in your own browser and are never sent to us until you place an order.</p>
          </div>
        </div>
      </section>
    </>
  );
}
