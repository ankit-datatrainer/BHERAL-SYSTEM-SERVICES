'use client';

/**
 * Hero with the Buy / Sell / Repair segment switcher. The headline is split
 * into masked lines by the motion engine and re-split whenever a tab swaps
 * the copy out.
 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { imageUrl } from '@/lib/format';
import { splitHeroLines } from '@/lib/motion';

type TabKey = 'buy' | 'sell' | 'repair';

interface TabCopy {
  key: TabKey;
  tabIcon: string;
  tabLabel: string;
  badge?: { text: string; className: string };
  headline: [string, string];
  body: string;
  primary: { href: string; icon: string; label: string };
}

const TABS: TabCopy[] = [
  {
    key: 'buy',
    tabIcon: 'shopping_bag',
    tabLabel: 'Buy Refurbished',
    headline: ['Buy. Sell. Repair.', 'Everything for Your Computer.'],
    body: 'Buy certified refurbished corporate laptops with a comprehensive 6-month warranty, liquidate pre-owned systems for spot cash, or book chip-level precision repairs with free doorstep pickup across Delhi NCR.',
    primary: { href: '/sell', icon: 'currency_rupee', label: 'Sell Your Laptop' },
  },
  {
    key: 'sell',
    tabIcon: 'currency_rupee',
    tabLabel: 'Sell Used Device',
    badge: { text: 'INSTANT CASH', className: 'badge-green' },
    headline: ['Turn Used Hardware', 'Into Instant Spot Cash.'],
    body: 'Enter your laptop configuration, answer simple functional questions, and get a transparent valuation with free doorstep pickup in Delhi NCR.',
    primary: { href: '/sell', icon: 'currency_rupee', label: 'Calculate Instant Value' },
  },
  {
    key: 'repair',
    tabIcon: 'handyman',
    tabLabel: 'Book Computer Repair',
    badge: { text: 'FREE PICKUP', className: 'badge-blue' },
    headline: ['Master Chip-Level', 'Precision Computer Repairs.'],
    body: 'Broken screens, liquid spills, dead motherboards, or noisy fans. Book certified technicians with free doorstep pickup and written warranty.',
    primary: { href: '/repair', icon: 'handyman', label: 'Book a Repair Session' },
  },
];

const TRUST = [
  { icon: 'shield_with_heart', color: 'var(--primary)', title: '6-Month Warranty', sub: 'Hardware replacement guarantee' },
  { icon: 'electric_moped', color: 'var(--emerald-text)', title: 'Free Doorstep Pickup', sub: 'Across eligible Delhi NCR areas' },
  { icon: 'payments', color: 'var(--primary)', title: 'Instant Cash / Transfer', sub: 'Spot verification UPI on delivery' },
  { icon: 'lock_reset', color: 'var(--navy)', title: '100% Data Erasure', sub: 'DoD certified sanitary wiping' },
];

export function HeroSection() {
  const [active, setActive] = useState<TabKey>('buy');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tab = TABS.find((t) => t.key === active)!;

  // Re-split the headline into animated lines every time the copy changes.
  useEffect(() => {
    const h1 = headingRef.current;
    const panel = panelRef.current;
    if (!h1 || !panel) return;

    delete h1.dataset.awSplit;
    splitHeroLines(h1);
    panel.classList.remove('aw-ready');
    const raf = requestAnimationFrame(() => panel.classList.add('aw-ready'));
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-panel" ref={panelRef}>
          <div className="journey-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`journey-tab${t.key === active ? ' active' : ''}`}
                role="tab"
                aria-selected={t.key === active}
                onClick={() => setActive(t.key)}
              >
                <span className="icon" style={{ fontSize: 18 }}>{t.tabIcon}</span> {t.tabLabel}
                {t.badge && (
                  <span className={`badge ${t.badge.className}`} style={{ fontSize: 9, marginLeft: 4 }}>
                    {t.badge.text}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="icon" style={{ fontSize: 16 }}>bolt</span> NCR&apos;s Trusted IT Re-Commerce &amp; Repair Facility
              </span>

              {/* Rebuilt by splitHeroLines(); key forces a fresh node per tab. */}
              <h1 ref={headingRef} key={active}>
                {tab.headline[0]}
                <br />
                <span>{tab.headline[1]}</span>
              </h1>

              <p>{tab.body}</p>

              <div className="hero-actions">
                <Link className="btn btn-primary btn-lg" href={tab.primary.href}>
                  <span className="icon">{tab.primary.icon}</span> {tab.primary.label}{' '}
                  <span className="icon">arrow_forward</span>
                </Link>
                <Link className="btn btn-secondary btn-lg" href="/buy">
                  <span className="icon">storefront</span> Shop Laptops
                </Link>
                <Link className="btn btn-green btn-lg" href="/repair">
                  <span className="icon">handyman</span> Book a Repair
                </Link>
              </div>
            </div>

            <div className="hero-art">
              <div className="offer-bubble">
                <small style={{ fontSize: 10, letterSpacing: 1, display: 'block' }}>UP TO</small>
                45%
                <br />
                <small style={{ fontSize: 10, letterSpacing: 1, display: 'block' }}>OFF MRP</small>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl('assets/images/hero-laptop.jpg')}
                alt="Refurbished Lenovo ThinkPad business laptop on studio slate surface"
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '1.25rem',
                  left: '1.25rem',
                  background: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(8px)',
                  padding: '0.5rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  zIndex: 2,
                }}
              >
                <span className="icon" style={{ color: 'var(--emerald-text)', fontSize: 22 }}>verified_user</span>
                <div>
                  <strong style={{ fontSize: 12, display: 'block', color: 'var(--navy)' }}>
                    Lenovo ThinkPad T14 Gen 2
                  </strong>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--primary)',
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Core i7 • 16GB RAM • 512GB SSD
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-features">
          {TRUST.map((t) => (
            <div className="mini-trust" key={t.title}>
              <span className="icon" style={{ color: t.color }}>{t.icon}</span>
              <span>
                <strong>{t.title}</strong>
                <small>{t.sub}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
