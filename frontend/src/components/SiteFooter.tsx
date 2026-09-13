'use client';

/** Global footer, floating WhatsApp CTA and the mobile bottom bar. */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PHONE_DISPLAY, whatsappUrl } from '@/lib/format';

/** Route-aware opening line for the WhatsApp deep link. */
const CONTEXT_MESSAGES: Array<[string, string]> = [
  ['/buy', 'Hi Bheral Systems & Services, I am interested in buying a refurbished laptop. Please share current available models.'],
  ['/product', 'Hi Bheral Systems & Services, I am interested in this product from your website. Please share availability.'],
  ['/sell', 'Hi Bheral Systems & Services, I want to sell my used laptop/computer device. Please guide me.'],
  ['/repair', 'Hi Bheral Systems & Services, I need to book computer repair / diagnostics with pickup.'],
  ['/marketplace', 'Hi Bheral Systems & Services, I have a question about a marketplace listing.'],
  ['/parts', 'Hi Bheral Systems & Services, I need assistance with computer parts and upgrades.'],
  ['/contact', 'Hi Bheral Systems & Services, I have an inquiry.'],
];

const DEFAULT_MESSAGE =
  'Hi Bheral Systems & Services, I would like to inquire about your laptops and computer services.';

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: 'Buy',
    links: [
      { href: '/buy?category=Laptop', label: 'Refurbished Laptops' },
      { href: '/buy?category=Desktop', label: 'Custom Desktops' },
      { href: '/parts', label: 'Computer Parts' },
      { href: '/buy?category=Printer', label: 'Laser & Tank Printers' },
      { href: '/buy?category=Monitor', label: 'IPS & 4K Monitors' },
      { href: '/marketplace', label: 'Marketplace (Private Sellers)' },
    ],
  },
  {
    title: 'Sell',
    links: [
      { href: '/sell?category=Laptop', label: 'Sell Laptop' },
      { href: '/sell?category=Desktop', label: 'Sell Desktop' },
      { href: '/sell?category=Printer', label: 'Sell Printer' },
      { href: '/sell?category=HDD', label: 'Sell Hard Disk & SSD' },
      { href: '/sell', label: 'Sell Computer Parts' },
      { href: '/marketplace/sell', label: 'List an Item Yourself' },
    ],
  },
  {
    title: 'Repair',
    links: [
      { href: '/repair?service=Laptop Repair', label: 'Laptop Repair' },
      { href: '/repair?service=Desktop Repair', label: 'Desktop Repair' },
      { href: '/repair?service=Printer Repair', label: 'Printer Service' },
      { href: '/repair?service=Data Recovery', label: 'Data Recovery' },
      { href: '/repair?service=Motherboard Repair', label: 'Motherboard Chip-Level' },
    ],
  },
  {
    title: 'Support & Legal',
    links: [
      { href: '/track', label: 'Track Service Request' },
      { href: '/marketplace/purchases', label: 'My Marketplace Purchases' },
      { href: '/warranty', label: 'Warranty Guidelines' },
      { href: '/warranty#pickup', label: 'Doorstep Pickup Policy' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms & Conditions' },
    ],
  },
];

export function SiteFooter() {
  const pathname = usePathname();
  const match = CONTEXT_MESSAGES.find(([prefix]) => pathname.startsWith(prefix));
  const href = whatsappUrl(match ? match[1] : DEFAULT_MESSAGE);

  const isActive = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p));

  if (pathname === '/login') {
    return null;
  }

  return (
    <>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-brand-title">BHERAL SYSTEM &amp; SERVICES</div>
              <p>
                Delhi NCR&apos;s premier tech re-commerce, certified pre-owned IT infrastructure provider,
                and precision chip-level hardware repair laboratory.
              </p>
              <div className="footer-meta-item">
                <span className="icon">location_on</span>
                <span>1st Floor, D-3/6, Pocket 3, Sector 11, Rohini, New Delhi, Delhi 110085</span>
              </div>
              <div className="footer-meta-item">
                <span className="icon">call</span>
                <a href="tel:+919654779949">{PHONE_DISPLAY}</a>
              </div>
              <div className="footer-meta-item">
                <span className="icon">schedule</span>
                <span>Mon – Sat: 10:00 AM – 8:30 PM (Sunday Closed)</span>
              </div>
            </div>

            {COLUMNS.map((col) => (
              <div className="footer-col" key={col.title}>
                <h4>{col.title}</h4>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link href={l.href}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="footer-bottom">
            <div>
              <span>© 2026 Bheral Systems &amp; Services. All rights reserved.</span>
              <span style={{ margin: '0 0.5rem' }}>•</span>
              <span>Tested &amp; Verified Tech Re-Commerce</span>
            </div>
            <div className="footer-chips-row">
              <span className="footer-chip">UPI / QR Accepted</span>
              <span className="footer-chip">Doorstep Pickup</span>
              <span className="footer-chip">GST Invoicing Available</span>
            </div>
          </div>
        </div>
      </footer>

      <a
        className="whatsapp-float"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp with Bheral Systems"
      >
        <span className="whatsapp-pulse" />
        <span className="icon">chat</span>
        <span>WhatsApp Support</span>
      </a>

      <nav className="mobile-bottom" aria-label="Mobile Bottom Navigation">
        <Link href="/" className={isActive('/') ? 'active' : ''}>
          <span className="icon">home</span>Home
        </Link>
        <Link href="/buy" className={isActive('/buy') ? 'active' : ''}>
          <span className="icon">shopping_bag</span>Buy
        </Link>
        <Link href="/sell" className="sell-center-btn" aria-label="Sell your device">
          <span className="icon">currency_rupee</span>
        </Link>
        <Link href="/repair" className={isActive('/repair') ? 'active' : ''}>
          <span className="icon">handyman</span>Repair
        </Link>
        <Link href="/contact" className={isActive('/contact') ? 'active' : ''}>
          <span className="icon">person</span>Account
        </Link>
      </nav>
    </>
  );
}
