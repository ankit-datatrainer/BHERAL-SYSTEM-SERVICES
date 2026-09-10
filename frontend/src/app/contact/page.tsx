import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { ContactForm } from '@/components/ContactForm';
import { PHONE_DISPLAY, whatsappUrl } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Contact Bheral Systems & Services',
  description:
    'Talk to our Delhi team about a refurbished computer purchase, device liquidation, or hardware repair.',
};

const DETAILS = [
  {
    icon: 'location_on',
    title: 'Nehru Place Hub, New Delhi, India',
    body: 'Primary hardware testing lab and corporate dispatch hub. Doorstep pickup operates across all eligible Delhi NCR zones.',
  },
  {
    icon: 'call',
    title: PHONE_DISPLAY,
    body: 'Direct telephone helpline for inventory queries, technician dispatch, and order support.',
  },
  {
    icon: 'chat',
    title: 'WhatsApp Business Support',
    body: `${PHONE_DISPLAY} — instant replies for photos, quotes, and tracking updates.`,
  },
  {
    icon: 'schedule',
    title: 'Operating Hours',
    body: 'Monday to Saturday: 10:00 AM – 08:30 PM (Sunday closed for bench maintenance).',
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Contact Bheral Systems & Services"
        description="Talk directly with our Delhi team about a refurbished computer purchase, device liquidation, or hardware repair."
        crumbs={[{ label: 'Contact Us' }]}
      />

      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '2rem', alignItems: 'start' }} className="contact-layout">
            <div className="contact-card form-card">
              <span className="eyebrow">Direct Support &amp; Laboratory</span>
              <h2 style={{ fontSize: '1.3rem', margin: '0.25rem 0 0.5rem' }}>Bheral Systems &amp; Services</h2>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, marginBottom: '1.5rem' }}>
                Also commercially known as <strong>Bheral Infotech Systems</strong>. Registered enterprise IT
                re-commerce and precision electronics engineering facility.
              </p>

              {DETAILS.map((d) => (
                <div key={d.title} style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="icon" style={{ color: 'var(--primary)' }}>{d.icon}</span>
                    <strong style={{ fontSize: 14 }}>{d.title}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--on-surface-variant)', paddingLeft: '1.75rem' }}>
                    {d.body}
                  </p>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                <a className="btn btn-primary" href="tel:+919654779949">
                  <span className="icon">call</span> Call Now
                </a>
                <a
                  className="btn btn-green"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={whatsappUrl('Hi Bheral Systems & Services, I have an inquiry.')}
                >
                  <span className="icon">chat</span> WhatsApp Us
                </a>
              </div>
            </div>

            <Suspense fallback={<div className="aw-skeleton" style={{ minHeight: 420 }} />}>
              <ContactForm />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}
