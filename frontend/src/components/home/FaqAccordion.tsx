'use client';

/** Home page FAQ. One panel open at a time, height-animated by award.css. */
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

const FAQS: Array<{ q: string; a: ReactNode }> = [
  {
    q: 'How does the 6-Month Replacement Warranty work on refurbished laptops?',
    a: (
      <p>
        Every certified refurbished computer sold by Bheral Systems includes a written 6-month hardware
        warranty covering motherboard, processor, RAM, storage, and display malfunctions. In the event of a
        verified hardware defect, our Delhi technician will diagnose and repair or replace the system free of
        charge.
      </p>
    ),
  },
  {
    q: 'How is the selling value of my old laptop calculated?',
    a: (
      <p>
        Our valuation algorithm factors in the processor generation, RAM capacity, storage drive health,
        screen condition, battery cycles, cosmetic wear, and available accessories. The final quote is
        confirmed in person after physical inspection by our visiting technician.
      </p>
    ),
  },
  {
    q: 'Do you buy dead, non-working, or water-damaged laptops?',
    a: (
      <p>
        Yes! We buy non-working and damaged laptops for component salvage and scrap value. Simply select
        &lsquo;Does not power on&rsquo; or &lsquo;Liquid damage&rsquo; during the online selling estimate to
        receive a salvage payout offer.
      </p>
    ),
  },
  {
    q: 'How do I track my repair or selling request?',
    a: (
      <p>
        Navigate to the{' '}
        <Link className="text-link" href="/track">
          Track Request
        </Link>{' '}
        page, enter your Reference ID (e.g. <code>BSS-REP-123456</code> or <code>BSS-SELL-123456</code>) and
        your registered 10-digit mobile number to view the exact milestone timeline in real time.
      </p>
    ),
  },
  {
    q: 'Where is your service center located in Delhi?',
    a: (
      <p>
        Our primary hardware diagnostic and repair laboratory is centrally located in the Nehru Place Tech
        Hub, New Delhi. We also operate scheduled doorstep pickup and delivery across Delhi NCR.
      </p>
    ),
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="section">
      <div className="container faq">
        <div className="section-head">
          <div>
            <span className="eyebrow">Clear Answers</span>
            <h2>Frequently Asked Questions</h2>
            <p>Everything you need to know about buying, selling, and repairing computers with Bheral Systems.</p>
          </div>
        </div>

        {FAQS.map((f, i) => (
          <div className={`accordion${open === i ? ' open' : ''}`} key={f.q}>
            <button aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              <span>{f.q}</span>
              <span className="icon">expand_more</span>
            </button>
            <div className="accordion-panel">{f.a}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
