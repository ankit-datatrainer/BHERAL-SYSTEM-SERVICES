/**
 * Home page. Rendered on the server so the hero, featured stock and repair
 * services are all in the initial HTML — good for SEO and first paint.
 */
import Link from 'next/link';
import { api } from '@/lib/api';
import { money, whatsappUrl, PHONE_DISPLAY, imageUrl } from '@/lib/format';
import { ProductCard } from '@/components/ProductCard';
import { HeroSection } from '@/components/home/HeroSection';
import { ShopByCategory } from '@/components/home/ShopByCategory';
import { FaqAccordion } from '@/components/home/FaqAccordion';
import type { Product, RepairService } from '@/lib/types';

export const dynamic = 'force-dynamic';

const JOURNEY_CARDS = [
  { href: '/buy', icon: 'laptop_mac', badge: 'FROM ₹14,999', badgeClass: 'badge-blue', title: 'Buy Refurbished Laptop', body: 'Dell Latitude, ThinkPads & MacBooks tested with 50-point diagnostic checks and Grade A guarantee.', cta: 'Browse 120+ Laptops →' },
  { href: '/sell', icon: 'currency_rupee', badge: 'INSTANT VALUATION', badgeClass: 'badge-green', title: 'Sell Used Laptop', body: 'Liquidate your old or dead notebook for the highest salvage valuation with instant UPI at your doorstep.', cta: 'Calculate Instant Quote →', green: true },
  { href: '/repair', icon: 'handyman', badge: 'SAME-DAY PICKUP', badgeClass: 'badge-blue', title: 'Laptop Repair Lab', body: 'Cracked screens, water damage, motherboard BGA chips, keyboard swaps, and thermal overhauls.', cta: 'Book Repair Session →' },
  { href: '/parts?category=Desktop', icon: 'desktop_windows', badge: 'WORKSTATIONS', badgeClass: 'badge-blue', title: 'Desktop & Gaming PC', body: 'Custom rig tuning, PSU short troubleshooting, GPU thermal repasting, and enterprise server maintenance.', cta: 'Diagnose Desktop →' },
  { href: '/parts', icon: 'memory', badge: 'GENUINE OEM', badgeClass: 'badge-blue', title: 'Computer Parts & SSD', body: 'NVMe SSDs, DDR4/DDR5 RAM sticks, dedicated graphics cards, genuine batteries, and high-wattage chargers.', cta: 'Explore Spares →' },
  { href: '/repair?service=Printer%20Repair', icon: 'print', badge: 'HP • CANON • EPSON', badgeClass: 'badge-blue', title: 'Printer & Scanner Service', body: 'Cartridge head unclogging, paper jam mechanical fixes, logic board repair, and toner refills.', cta: 'Fix My Printer →' },
  { href: '/repair?service=Data%20Recovery', icon: 'cloud_download', badge: 'CLEAN-ROOM LAB', badgeClass: 'badge-blue', title: 'Clean-Room Data Recovery', body: 'Specialist recovery from formatted drives, dropped clicking disks, ransomware encryptions, and dead SSDs.', cta: 'Request Evaluation →' },
  { href: '/contact', icon: 'electric_moped', badge: 'FREE SERVICE', badgeClass: 'badge-green', title: 'Free 2-Hour Pickup', body: 'Quick doorstep pickup for evaluation and repairs in eligible Delhi NCR pincodes with live trackable receipts.', cta: 'Check Availability →', green: true, highlight: true },
];

const BRAND_LOGOS = [
  { name: 'Apple', logo: 'assets/images/brands/apple.svg', href: '/buy?brand=Apple', height: 32 },
  { name: 'Dell', logo: 'assets/images/brands/dell.svg', href: '/buy?brand=Dell', height: 38 },
  { name: 'HP', logo: 'assets/images/brands/hp.svg', href: '/buy?brand=HP', height: 36 },
  { name: 'Lenovo', logo: 'assets/images/brands/lenovo.svg', href: '/buy?brand=Lenovo', height: 26 },
  { name: 'ASUS', logo: 'assets/images/brands/asus.svg', href: '/buy?brand=ASUS', height: 24 },
  { name: 'Acer', logo: 'assets/images/brands/acer.svg', href: '/buy?brand=Acer', height: 26 },
  { name: 'MSI', logo: 'assets/images/brands/msi.svg', href: '/buy?brand=MSI', height: 24 },
  { name: 'Samsung', logo: 'assets/images/brands/samsung.svg', href: '/buy?brand=Samsung', height: 22 },
];

const SELL_CATEGORIES = [
  { cat: 'Laptop', icon: 'laptop', label: 'Laptop' },
  { cat: 'Desktop', icon: 'desktop_windows', label: 'Desktop' },
  { cat: 'Monitor', icon: 'tv', label: 'Monitor' },
  { cat: 'Printer', icon: 'print', label: 'Printer' },
  { cat: 'GPU', icon: 'memory', label: 'Graphics Card' },
  { cat: 'SSD', icon: 'hard_drive', label: 'SSD / HDD' },
  { cat: 'RAM', icon: 'developer_board', label: 'RAM' },
  { cat: 'Processor', icon: 'stream_apps', label: 'Processor' },
  { cat: 'Motherboard', icon: 'check_indeterminate_small', label: 'Motherboard' },
  { cat: '', icon: 'inventory_2', label: 'Other Parts' },
];

const WHY_US = [
  { icon: 'fact_check', title: '50-Point Device Audit', body: 'Display uniformity, battery health, stress thermals, ports, Wi-Fi stability, and keyboard are tested before dispatch.' },
  { icon: 'verified_user', title: '6-Month Written Warranty', body: 'Eligible refurbished laptops include a clear, documented hardware warranty with free doorstep replacement if faults occur.', green: true },
  { icon: 'receipt_long', title: 'Transparent Quotes', body: 'No unexpected hidden bench charges. Repair costs and final selling values require your explicit approval before execution.' },
  { icon: 'support_agent', title: 'Delhi Support Team', body: `Talk directly with experienced hardware engineers via phone (${PHONE_DISPLAY}) or WhatsApp for fast answers.`, navy: true },
];

const SELL_STEPS = [
  { title: 'Select Device & Model', body: 'Choose your exact brand, configuration, and storage specifications.' },
  { title: 'Share Current Condition', body: 'Answer clear functional questions on screen, battery, and physical wear.' },
  { title: 'Instant Provisional Estimate', body: 'See an algorithmic valuation range before scheduling free inspection.' },
  { title: 'Doorstep Verification & Payment', body: 'Technician verifies hardware and transfers instant cash/UPI on the spot.' },
];

const REPAIR_STEPS = [
  { title: 'Book Pickup or Center Visit', body: 'Choose free doorstep pickup in Delhi NCR or drop by our Nehru Place hub.' },
  { title: 'Engineer Bench Diagnosis', body: 'Master chip technician inspects the board and tests failure points.' },
  { title: 'Transparent Quote & Approval', body: 'Written quote shared on WhatsApp. Repair proceeds only after your go-ahead.' },
  { title: 'Repair, QC Audit & Return', body: 'Device passes burn-in tests and is delivered back with a warranty card.' },
];

const COMPONENTS = [
  { cat: 'RAM', icon: 'developer_board', title: 'Laptop & PC RAM', sub: 'DDR4 & DDR5 Stock →' },
  { cat: 'SSD', icon: 'hard_drive', title: 'High-Speed SSDs', sub: 'NVMe & SATA Drives →' },
  { cat: 'Battery', icon: 'battery_full', title: 'OEM Batteries', sub: 'Dell, Lenovo, HP Packs →' },
  { cat: 'Charger', icon: 'power', title: 'Genuine Chargers', sub: '65W Type-C & Barrels →' },
  { cat: 'Graphics Card', icon: 'memory', title: 'Graphics Cards', sub: 'NVIDIA & AMD GPUs →' },
  { cat: 'Accessories', icon: 'router', title: 'Network & Cables', sub: 'Wi-Fi 6 & Adapters →' },
];

const TESTIMONIALS = [
  { quote: 'Bought 3 refurbished ThinkPad T14s for our digital agency. Pristine Grade-A condition, battery life was well over 5 hours, and GST invoicing was smooth.', name: 'Sameer Malhotra, Connaught Place', role: 'Verified Laptop Buyer' },
  { quote: 'Sold my old HP Pavilion laptop from home in Mayur Vihar. The technician arrived on time, conducted a quick 10-minute check, and paid via UPI on the spot.', name: 'Neha Sharma, Mayur Vihar', role: 'Device Seller' },
  { quote: 'My Dell XPS suffered a motherboard short and Nehru Place vendors had quoted exorbitant prices. Bheral fixed it at component level within 24 hours. Saved my machine!', name: 'Amit Srivastava, Saket', role: 'Motherboard Repair Client' },
];

export default async function HomePage() {
  // One round trip each; both are cheap and run in parallel.
  const [featured, repairs] = await Promise.all([
    api.products({ category: 'Laptop', sort: 'recommended', pageSize: 4 }).catch(() => null),
    api.repairServices().catch(() => null),
  ]);

  const products: Product[] = featured?.items ?? [];
  const services: RepairService[] = (repairs?.items ?? []).slice(0, 8);
  const offline = !featured || !repairs;

  return (
    <>

      {offline && (
        <div className="container" style={{ marginBottom: '1.5rem' }}>
          <div className="badge badge-amber" style={{ padding: '0.75rem 1rem', display: 'block' }}>
            Live catalogue is unavailable right now — start the API with <code>npm run dev</code> in <code>backend/</code>.
          </div>
        </div>
      )}

      <HeroSection />
      <ShopByCategory />

      {/* 2. Bento action categories */}
      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Comprehensive Ecosystem</span>
              <h2>Select What You Need Done</h2>
              <p>Dedicated re-commerce, certified hardware procurement, and chip-level technical laboratory under one single roof in Delhi.</p>
            </div>
            <a className="btn btn-green btn-small" href={whatsappUrl('Hi Bheral Systems, I would like a quick consultation.')} target="_blank" rel="noopener noreferrer">
              <span className="icon">chat</span> Quick WhatsApp Consultation
            </a>
          </div>

          <div className="journey-grid">
            {JOURNEY_CARDS.map((c) => (
              <Link className={`journey-card${c.highlight ? ' highlight' : ''}`} href={c.href} key={c.title}>
                <span className="icon-box" style={c.green ? { color: 'var(--emerald-text)', background: 'var(--emerald-soft)' } : undefined}>
                  <span className="icon">{c.icon}</span>
                </span>
                <span className={`badge ${c.badgeClass}`} style={{ width: 'fit-content', marginBottom: '0.5rem', fontSize: 10 }}>{c.badge}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                <span className="text-link" style={c.green ? { color: 'var(--emerald-text)' } : undefined}>{c.cta}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Sell category tiles */}
      <section className="section" id="sell-section">
        <div className="container sell-categories">
          <div className="section-head">
            <div>
              <span className="eyebrow green">Instant Buyback Calculator</span>
              <h2>Sell Your Used Computer Hardware for Best Value</h2>
              <p>Select a category to begin an instant, transparent valuation with doorstep cash payout.</p>
            </div>
          </div>
          <div className="category-grid">
            {SELL_CATEGORIES.map((c) => (
              <Link className="category-tile" href={c.cat ? `/sell?category=${encodeURIComponent(c.cat)}` : '/sell'} key={c.label}>
                <span className="icon">{c.icon}</span>
                <strong>{c.label}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Brand marquee */}
      <section className="section-sm">
        <div className="container">
          <div className="brand-rail">
            {BRAND_LOGOS.map((b) => (
              <Link key={b.name} href={b.href} className="brand-rail-item" title={b.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(b.logo)}
                  alt={`${b.name} logo`}
                  style={{ height: b.height, width: 'auto', maxHeight: 38, objectFit: 'contain' }}
                  loading="lazy"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Corporate promo */}
      <section className="section-sm">
        <div className="container promo">
          <div>
            <span className="eyebrow">Enterprise IT Liquidation &amp; Procurement</span>
            <h2>Corporate Deals: <span>Up to 45% Off</span> Refurbished ThinkPads &amp; MacBooks</h2>
            <p>Tested corporate fleet devices, commercial GST invoicing, 6-month written replacement warranty, and volume procurement support for Delhi NCR businesses and startups.</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
              <Link className="btn btn-primary" href="/buy">View Available Stock</Link>
              <Link className="btn btn-secondary" href="/contact?type=corporate">Enquire Bulk Order</Link>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl('assets/images/corporate-laptops.jpg')} alt="Row of corporate Dell and Lenovo refurbished laptops" loading="lazy" />
        </div>
      </section>

      {/* 6. Best sellers */}
      <section className="section" id="laptops-grid">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow green">Certified Stock</span>
              <h2>Best-Selling Refurbished Laptops</h2>
              <p>Independently tested, thermal repasted, and backed by a 6-month replacement warranty.</p>
            </div>
            <Link className="text-link" href="/buy">View complete inventory →</Link>
          </div>
          <div className="product-grid">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* 7. Why us */}
      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Why Choose Bheral Systems</span>
              <h2>Clear Checks. Direct Support. Practical Service.</h2>
              <p>Our commitment to transparent, reliable computer hardware since 2018.</p>
            </div>
          </div>
          <div className="journey-grid">
            {WHY_US.map((w) => (
              <article className="journey-card" key={w.title}>
                <span className="icon-box" style={w.green ? { color: 'var(--emerald-text)', background: 'var(--emerald-soft)' } : w.navy ? { color: 'var(--navy)', background: 'var(--secondary-container)' } : undefined}>
                  <span className="icon">{w.icon}</span>
                </span>
                <h3>{w.title}</h3>
                <p>{w.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Repair services */}
      <section className="section-sm" id="repair-section">
        <div className="container repair-well">
          <div className="section-head">
            <div>
              <span className="eyebrow">Nehru Place Bench Diagnostics</span>
              <h2>Computer Problem? We Can Fix It.</h2>
              <p>Fast turnarounds, genuine parts, and chip-level precision for laptops, desktops, and printers.</p>
            </div>
            <Link className="btn btn-secondary btn-small" href="/repair">Browse All 24 Services →</Link>
          </div>
          <div className="service-grid">
            {services.map((s) => (
              <article className="service-card" key={s.id}>
                <span className="service-icon"><span className="icon">{s.icon}</span></span>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.25rem' }}>{s.device}</div>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <footer>
                  <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span className="icon" style={{ fontSize: 14 }}>schedule</span> {s.time}
                  </span>
                  <Link href={`/repair?service=${encodeURIComponent(s.name)}`} style={{ fontWeight: 700 }}>Book now →</Link>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 9. How it works */}
      <section className="section">
        <div className="container steps-pair">
          <div className="steps-card">
            <span className="eyebrow green">Transparent Checkpoints</span>
            <h2>How Selling Works</h2>
            <ol className="process-list">
              {SELL_STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="step-num">{i + 1}</span>
                  <span><strong>{s.title}</strong><small>{s.body}</small></span>
                </li>
              ))}
            </ol>
            <Link className="btn btn-green btn-block" href="/sell">Start Selling Now</Link>
          </div>

          <div className="steps-card">
            <span className="eyebrow">Laboratory Process</span>
            <h2>How Repair Works</h2>
            <ol className="process-list">
              {REPAIR_STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="step-num">{i + 1}</span>
                  <span><strong>{s.title}</strong><small>{s.body}</small></span>
                </li>
              ))}
            </ol>
            <Link className="btn btn-primary btn-block" href="/repair">Book Doorstep Repair</Link>
          </div>
        </div>
      </section>

      {/* 10. Components */}
      <section className="section-sm" id="parts-strip">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Performance Upgrades &amp; Spares</span>
              <h2>Computer Spares &amp; Performance Upgrades</h2>
              <p>Upgrade sluggish corporate notebooks with lightning-fast NVMe storage and dual-channel memory.</p>
            </div>
            <Link className="text-link" href="/parts">Browse all components →</Link>
          </div>
          <div className="component-strip">
            {COMPONENTS.map((c) => (
              <Link className="component-pill" href={`/parts?category=${encodeURIComponent(c.cat)}`} key={c.title}>
                <span className="icon">{c.icon}</span>
                <span><strong>{c.title}</strong><small>{c.sub}</small></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Pickup banner */}
      <section className="section">
        <div className="container pickup-banner">
          <div>
            <span className="eyebrow">Delhi NCR Convenience</span>
            <h2>Free Doorstep Pickup &amp; Return in 2 Hours</h2>
            <p>Available for eligible devices and locations in Delhi NCR. Timing confirmed after postal pincode and technician slot check.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a className="btn btn-secondary" href="tel:+919654779949">
              <span className="icon">call</span> Call {PHONE_DISPLAY}
            </a>
            <a className="btn btn-green" href={whatsappUrl('Hi Bheral Systems, I want to book a doorstep pickup for my laptop.')} target="_blank" rel="noopener noreferrer">
              <span className="icon">chat</span> WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* 12. Testimonials */}
      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow green">Customer Trust</span>
              <h2>What Delhi NCR Customers Say</h2>
              <p>Recent verified feedback from corporate buyers, sellers, and repair clients.</p>
            </div>
          </div>
          <div className="journey-grid">
            {TESTIMONIALS.map((t) => (
              <blockquote className="journey-card" key={t.name}>
                <div style={{ color: 'var(--amber)', fontSize: 16, marginBottom: '0.5rem' }}>★★★★★</div>
                <p>&ldquo;{t.quote}&rdquo;</p>
                <strong style={{ color: 'var(--navy)', fontSize: 13, display: 'block', marginTop: '0.75rem' }}>— {t.name}</strong>
                <small style={{ color: 'var(--on-surface-variant)', fontSize: 11 }}>{t.role}</small>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <FaqAccordion />
    </>
  );
}
