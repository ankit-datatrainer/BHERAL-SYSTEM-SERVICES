'use client';

/**
 * Printable invoice.
 *
 * The reference plus the phone number is the credential — the same rule the
 * tracking page uses. If the URL has no phone number we ask for it rather
 * than showing anything.
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { formatDate, money } from '@/lib/format';
import type { Invoice } from '@/lib/types';

export function InvoiceView({ id }: { id: string }) {
  const params = useSearchParams();
  const [phone, setPhone] = useState('');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchInvoice = useCallback(async (number: string) => {
    setLoading(true);
    setError('');
    try {
      const { invoice: found } = await api.invoice(id, number);
      setInvoice(found);
    } catch (err) {
      setInvoice(null);
      setError(err instanceof ApiError ? err.message : 'Could not load that invoice.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // A link from a dashboard already carries the number.
  useEffect(() => {
    const fromUrl = (params.get('phone') ?? '').replace(/\D/g, '').slice(0, 10);
    if (fromUrl.length === 10) {
      setPhone(fromUrl);
      void fetchInvoice(fromUrl);
    }
  }, [params, fetchInvoice]);

  if (loading && !invoice) {
    return (
      <section className="section">
        <div className="container">
          <div className="aw-skeleton" style={{ minHeight: 420 }} />
        </div>
      </section>
    );
  }

  if (!invoice) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 520 }}>
          <form
            className="dash-panel"
            onSubmit={(e) => {
              e.preventDefault();
              if (phone.length === 10) void fetchInvoice(phone);
            }}
            noValidate
          >
            <div className="dash-panel__head">
              <div>
                <h2 className="dash-panel__title">
                  <span className="icon">description</span> View your invoice
                </h2>
                <p className="dash-panel__sub">
                  Reference <strong>{id}</strong> — confirm the mobile number used on the order.
                </p>
              </div>
            </div>
            <div className="dash-panel__body">
              <label className="field">
                <span>Mobile Number (10 digits)</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  inputMode="numeric"
                  placeholder="9876543210"
                  autoComplete="tel-national"
                />
              </label>
              {error && (
                <p style={{ color: 'var(--red)', fontWeight: 600, fontSize: 13, marginTop: '0.75rem' }}>{error}</p>
              )}
              <button
                className="btn btn-primary btn-block"
                type="submit"
                disabled={phone.length !== 10 || loading}
                style={{ marginTop: '1.25rem' }}
              >
                <span className="icon">visibility</span> {loading ? 'Looking up…' : 'Open Invoice'}
              </button>
              <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 13 }}>
                <Link className="text-link" href="/account">Sign in to your account</Link> to see every invoice at once.
              </p>
            </div>
          </form>
        </div>
      </section>
    );
  }

  const marketplace = invoice.kind === 'marketplace';

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 880 }}>
        <div className="invoice-actions no-print">
          <Link className="btn btn-secondary btn-small" href="/account">
            <span className="icon" style={{ fontSize: 16 }}>arrow_back</span> My Account
          </Link>
          <button className="btn btn-primary btn-small" onClick={() => window.print()}>
            <span className="icon" style={{ fontSize: 16 }}>print</span> Print / Save as PDF
          </button>
        </div>

        <article className="invoice">
          <header className="invoice__head">
            <div>
              <span className="invoice__badge">
                {marketplace ? 'Deal Confirmation' : 'Tax Invoice'}
              </span>
              <h1 className="invoice__no">{invoice.invoiceNo}</h1>
              <p className="invoice__meta">
                Reference {invoice.orderId} · Issued {formatDate(invoice.issuedAt)}
              </p>
            </div>
            <div className="invoice__brand">
              <strong>Bheral Systems &amp; Services</strong>
              <span>Nehru Place, New Delhi</span>
              <span>+91 9891993143</span>
            </div>
          </header>

          <div className="invoice__parties">
            <div>
              <h2>Billed to</h2>
              <strong>{invoice.billedTo.name ?? '—'}</strong>
              {invoice.billedTo.phone && <span>+91 {invoice.billedTo.phone}</span>}
              {invoice.billedTo.email && <span>{invoice.billedTo.email}</span>}
              {invoice.billedTo.address && <span>{invoice.billedTo.address}</span>}
              {invoice.billedTo.city && (
                <span>
                  {invoice.billedTo.city}
                  {invoice.billedTo.pincode ? ` — ${invoice.billedTo.pincode}` : ''}
                </span>
              )}
            </div>
            <div>
              <h2>{marketplace ? 'Sold by (private seller)' : 'Sold by'}</h2>
              <strong>{invoice.seller.name}</strong>
              <span>+91 {invoice.seller.phone}</span>
              {invoice.seller.city && <span>{invoice.seller.city}</span>}
            </div>
          </div>

          <div className="dash-table-wrap">
            <table className="dash-table invoice__table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Rate</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={`${item.name}-${i}`}>
                    <td>
                      <span className="dash-table__title" style={{ maxWidth: 360 }}>{item.name}</span>
                      {(item.condition || item.category) && (
                        <span className="dash-table__sub">
                          {[item.category, item.condition].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }} className="mono">{item.qty}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{money(item.price)}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{money(item.price * item.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="invoice__totals">
            <div>
              <span>Subtotal</span>
              <span className="mono">{money(invoice.subtotal)}</span>
            </div>
            <div>
              <span>Delivery</span>
              <span className="mono">{invoice.deliveryFee ? money(invoice.deliveryFee) : 'Free'}</span>
            </div>
            <div className="invoice__grand">
              <span>Total</span>
              <span className="mono">{money(invoice.total)}</span>
            </div>
          </div>

          <footer className="invoice__foot">
            {marketplace ? (
              <p>
                This is a record of a peer-to-peer deal arranged through the Bheral marketplace. Payment
                is settled directly between buyer and seller at handover; Bheral is not a party to the
                sale and does not collect the amount shown.
              </p>
            ) : (
              <p>
                Amounts are inclusive of applicable GST. Refurbished units carry a 6-month limited
                hardware warranty from the invoice date. Retain this invoice for any warranty claim.
              </p>
            )}
            <p className="invoice__thanks">Thank you for choosing Bheral Systems &amp; Services.</p>
          </footer>
        </article>
      </div>
    </section>
  );
}
