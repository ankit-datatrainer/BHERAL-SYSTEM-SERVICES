'use client';

/**
 * Shared dashboard primitives used by the seller portal and the buyer
 * purchases view, so both read as the same product.
 */
import type { ReactNode } from 'react';
import { LISTING_STATUS_BADGE } from '@/lib/marketplace';

/** "Arjun Bhatia" -> "AB". Falls back to a single glyph for one-word names. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function DashStat({
  icon,
  value,
  label,
  tone,
}: {
  icon: string;
  value: string;
  label: string;
  tone?: 'green' | 'amber' | 'navy';
}) {
  return (
    <div className={`dash-stat${tone ? ` dash-stat--${tone}` : ''}`}>
      <div className="dash-stat__icon">
        <span className="icon">{icon}</span>
      </div>
      <div className="dash-stat__value">{value}</div>
      <span className="dash-stat__label">{label}</span>
    </div>
  );
}

export function DashPanel({
  title,
  icon,
  sub,
  action,
  flush,
  children,
}: {
  title: string;
  icon?: string;
  sub?: string;
  action?: ReactNode;
  /** Removes body padding — for full-bleed row lists. */
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="dash-panel">
      <header className="dash-panel__head">
        <div>
          <h2 className="dash-panel__title">
            {icon && <span className="icon" style={{ fontSize: 20, color: 'var(--primary)' }}>{icon}</span>}
            {title}
          </h2>
          {sub && <p className="dash-panel__sub">{sub}</p>}
        </div>
        {action}
      </header>
      <div className={`dash-panel__body${flush ? ' dash-panel__body--flush' : ''}`}>{children}</div>
    </section>
  );
}

export function DashEmpty({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="dash-empty">
      <div className="dash-empty__icon">
        <span className="icon">{icon}</span>
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const badge = LISTING_STATUS_BADGE[status] ?? LISTING_STATUS_BADGE.active;
  return <span className={`dash-pill dash-pill--${status}`}>{badge.label}</span>;
}

/**
 * Compact horizontal deal progress. Scrolls sideways on narrow screens rather
 * than wrapping into an unreadable stack.
 */
export function DealSteps({ timeline, status }: { timeline: string[]; status: number }) {
  if (!timeline.length) return null;

  return (
    <ol className="dash-steps" aria-label={`Progress: ${timeline[Math.min(status, timeline.length - 1)]}`}>
      {timeline.map((label, i) => {
        const state = i < status ? 'is-done' : i === status ? 'is-current' : '';
        return (
          <li className={`dash-step ${state}`} key={label}>
            {i > 0 && <span className="dash-step__bar" aria-hidden="true" />}
            <span className="dash-step__dot">{i < status ? '✓' : i + 1}</span>
            <span className="dash-step__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
