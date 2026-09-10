'use client';

/**
 * Reference-ID + phone lookup with a milestone timeline.
 *
 * The phone number is the credential: the API's lookup function requires it
 * to match the record, so a reference id alone reveals nothing.
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatDate, money } from '@/lib/format';
import type { TrackedRequest } from '@/lib/types';
import { Reveal } from './Reveal';

const TYPE_LABEL: Record<string, string> = {
  order: 'Hardware Order',
  sell: 'Device Buy-Back',
  repair: 'Repair Booking',
  marketplace: 'Marketplace Purchase',
};

export function TrackRequest() {
  const searchParams = useSearchParams();
  const [id, setId] = useState(searchParams.get('id') ?? '');
  const [phone, setPhone] = useState(searchParams.get('phone') ?? '');
  const [result, setResult] = useState<TrackedRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async (refId: string, refPhone: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.track(refId.trim(), refPhone.trim()));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the tracking service. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Deep links from a confirmation screen look themselves up immediately.
  useEffect(() => {
    const linkId = searchParams.get('id');
    const linkPhone = searchParams.get('phone');
    if (linkId && linkPhone) void lookup(linkId, linkPhone);
  }, [searchParams, lookup]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !/^\d{10}$/.test(phone.trim())) {
      setError('Enter the reference id and the registered 10-digit mobile number.');
      return;
    }
    void lookup(id, phone);
  };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 860 }}>
        <div className="form-card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Enter Your Tracking Details</h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, marginBottom: '1.5rem' }}>
            Use the reference from your confirmation (e.g. <code>BSS-ORD-…</code>, <code>BSS-SELL-…</code>,{' '}
            <code>BSS-REP-…</code>) together with the registered mobile number.
          </p>

          <form onSubmit={onSubmit} noValidate>
            <div className="form-grid">
              <label className="field">
                <span>Reference / Request ID *</span>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value.toUpperCase())}
                  placeholder="e.g. BSS-ORD-584920"
                  style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                />
              </label>
              <label className="field">
                <span>Registered Phone Number *</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                />
              </label>
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ marginTop: '1.25rem' }}>
              <span className="icon">search</span> {loading ? 'Searching…' : 'Track My Request'}
            </button>
          </form>

          {error && (
            <div
              style={{
                marginTop: '1.25rem', padding: '0.875rem 1rem', borderRadius: 'var(--radius-DEFAULT)',
                background: 'var(--red-soft)', color: 'var(--red-dark)', fontSize: 14, fontWeight: 600,
              }}
              role="alert"
            >
              {error}
            </div>
          )}
        </div>

        {result && (
          <>
            <div className="form-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <div>
                  <span className="eyebrow">{TYPE_LABEL[result.type] ?? 'Request'}</span>
                  <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', letterSpacing: 1, margin: '0.25rem 0' }}>
                    {result.id}
                  </h2>
                  <small style={{ color: 'var(--on-surface-variant)' }}>Raised on {formatDate(result.createdAt)}</small>
                </div>
                <span className="badge badge-green" style={{ fontSize: 12, padding: '0.4rem 0.8rem' }}>
                  {result.statusLabel}
                </span>
              </div>

              <ol className="process-list">
                {result.timeline.map((label, i) => {
                  const done = i < result.status;
                  const current = i === result.status;
                  return (
                    <li key={label}>
                      <span
                        className="step-num"
                        style={{
                          background: done ? 'var(--emerald)' : current ? 'var(--primary)' : 'var(--surface-container)',
                          color: done || current ? '#fff' : 'var(--on-surface-variant)',
                        }}
                      >
                        {done ? '✓' : i + 1}
                      </span>
                      <span>
                        <strong style={{ color: current ? 'var(--primary)' : undefined }}>{label}</strong>
                        <small>
                          {done ? 'Completed' : current ? 'In progress right now' : 'Pending'}
                        </small>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="form-card" style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Request Details</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {result.items?.map((item) => (
                    <tr key={item.id}>
                      <td style={cellKey}>{item.qty}× {item.name}</td>
                      <td style={cellValue}>{money(item.price * item.qty)}</td>
                    </tr>
                  ))}
                  {result.total !== undefined && (
                    <tr>
                      <td style={cellKey}>Order Total</td>
                      <td style={{ ...cellValue, color: 'var(--primary)', fontWeight: 700 }}>{money(result.total)}</td>
                    </tr>
                  )}
                  {result.device && (
                    <>
                      <tr>
                        <td style={cellKey}>Device</td>
                        <td style={cellValue}>
                          {String(result.device.brand ?? '')} {String(result.device.model ?? '')} ({String(result.device.category ?? '')})
                        </td>
                      </tr>
                      <tr>
                        <td style={cellKey}>Provisional Estimate</td>
                        <td style={{ ...cellValue, color: 'var(--primary)', fontWeight: 700 }}>
                          {money(Number(result.device.estimate ?? 0))}
                        </td>
                      </tr>
                    </>
                  )}
                  {result.details && (
                    <>
                      <tr>
                        <td style={cellKey}>Device</td>
                        <td style={cellValue}>
                          {String(result.details.brand ?? '')} {String(result.details.model ?? '')} ({String(result.details.device ?? '')})
                        </td>
                      </tr>
                      <tr>
                        <td style={cellKey}>Reported Problem</td>
                        <td style={cellValue}>{String(result.details.problem ?? '')}</td>
                      </tr>
                      <tr>
                        <td style={cellKey}>Service Method</td>
                        <td style={cellValue}>{String(result.details.serviceMethod ?? '')}</td>
                      </tr>
                    </>
                  )}
                  {result.listing && (
                    <>
                      <tr>
                        <td style={cellKey}>Item</td>
                        <td style={cellValue}>
                          <Link className="text-link" href={`/marketplace/${result.listing.id}`}>
                            {result.listing.title}
                          </Link>
                          <br />
                          {result.listing.condition} · {result.listing.category}
                          {result.listing.city ? ` · ${result.listing.city}` : ''}
                        </td>
                      </tr>
                      <tr>
                        <td style={cellKey}>Asking / Your Offer</td>
                        <td style={cellValue}>
                          {money(result.listing.price)}
                          {result.offerPrice ? ` → ${money(result.offerPrice)} offered` : ' (asking price accepted)'}
                        </td>
                      </tr>
                      <tr>
                        <td style={cellKey}>Seller Contact</td>
                        <td style={cellValue}>
                          {result.seller ? (
                            <>
                              {result.seller.name} ·{' '}
                              <a className="text-link" href={`tel:+91${result.seller.phone}`}>
                                +91 {result.seller.phone}
                              </a>
                              {result.seller.city ? ` · ${result.seller.city}` : ''}
                            </>
                          ) : (
                            <em>Shared once the seller accepts your request.</em>
                          )}
                        </td>
                      </tr>
                    </>
                  )}
                  {result.customer && (
                    <tr>
                      <td style={cellKey}>Contact &amp; Address</td>
                      <td style={cellValue}>
                        {result.customer.name} · +91 {result.customer.phone}
                        <br />
                        {result.customer.address}, {result.customer.city} - {result.customer.pincode}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                <a className="btn btn-secondary" href="tel:+919654779949">
                  <span className="icon">call</span> Call the Desk
                </a>
                <Link className="btn btn-primary" href="/contact">
                  <span className="icon">support_agent</span> Contact Support
                </Link>
              </div>
            </div>
            <Reveal deps={[result.id]} />
          </>
        )}
      </div>
    </section>
  );
}

const cellKey: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid var(--border)',
  fontWeight: 700,
  color: 'var(--navy)',
  width: '38%',
  verticalAlign: 'top',
};

const cellValue: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid var(--border)',
  color: 'var(--on-surface-variant)',
};
