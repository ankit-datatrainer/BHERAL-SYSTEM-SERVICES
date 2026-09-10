'use client';

/**
 * Listing detail + purchase flow.
 *
 * The seller's phone number is deliberately not shown here. It is released to
 * the buyer only once the seller accepts the request, which the buyer sees on
 * the tracking page — that is what keeps listings from becoming a scraped
 * phone directory.
 */
import Link from 'next/link';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatDate, money, whatsappUrl } from '@/lib/format';
import { categoryMeta, listingImage, LISTING_STATUS_BADGE, rememberBuyerReference } from '@/lib/marketplace';
import type { Listing } from '@/lib/types';
import { useStore } from '../StoreProvider';
import { ListingCard } from './ListingCard';

interface Confirmation {
  id: string;
  statusLabel: string;
  timeline: string[];
  buyerPhone: string;
  offerPrice: number | null;
}

const EMPTY_BUYER = {
  buyerName: '',
  buyerPhone: '',
  buyerEmail: '',
  buyerCity: '',
  message: '',
  offerPrice: '',
};

export function ListingDetail({ listing, similar }: { listing: Listing; similar: Listing[] }) {
  const { toast } = useStore();
  const [activeImage, setActiveImage] = useState(0);
  const [form, setForm] = useState(EMPTY_BUYER);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [showForm, setShowForm] = useState(false);

  const meta = categoryMeta(listing.category);
  const badge = LISTING_STATUS_BADGE[listing.status] ?? LISTING_STATUS_BADGE.active;
  const gallery = listing.images.length ? listing.images : [meta.image];
  const available = listing.status === 'active';
  const specEntries = Object.entries(listing.specs).filter(([, v]) => v);

  const update = (field: keyof typeof EMPTY_BUYER, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      const result = await api.buyListing(listing.id, {
        buyerName: form.buyerName,
        buyerPhone: form.buyerPhone,
        buyerEmail: form.buyerEmail || undefined,
        buyerCity: form.buyerCity,
        message: form.message,
        offerPrice: form.offerPrice ? Number(form.offerPrice) : undefined,
      });

      rememberBuyerReference(result.id, form.buyerPhone);
      setConfirmation({
        id: result.id,
        statusLabel: result.statusLabel,
        timeline: result.timeline,
        buyerPhone: result.buyerPhone,
        offerPrice: result.offerPrice,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        toast(Object.keys(err.fieldErrors).length ? 'Please correct the highlighted fields' : err.message, 'error');
      } else {
        toast('Could not send your request. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="cart-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--emerald-soft)', color: 'var(--emerald)', display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem' }}>
              <span className="icon" style={{ fontSize: 48 }}>check_circle</span>
            </div>
            <span className="badge badge-green" style={{ fontSize: 12, padding: '0.35rem 0.75rem', marginBottom: '0.75rem' }}>
              Request Sent
            </span>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Your request is with the seller</h1>
            <p style={{ color: 'var(--on-surface-variant)', maxWidth: 540, margin: '0 auto 1.5rem' }}>
              We have notified the seller of <strong>{listing.title}</strong>. Once they accept, their
              contact details appear on your tracking page and you can arrange the handover.
            </p>

            <div style={{ background: 'var(--surface-container-low)', border: '1.5px dashed var(--tertiary)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 480, margin: '0 auto 2rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 700 }}>
                  Request Reference
                </span>
                <span className="badge badge-green">Save this ID</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--tertiary)', letterSpacing: 1, marginBottom: '0.75rem' }}>
                {confirmation.id}
              </div>
              <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div><strong>Item:</strong> {listing.title}</div>
                <div><strong>Asking price:</strong> {money(listing.price)}</div>
                {confirmation.offerPrice && (
                  <div><strong>Your offer:</strong> {money(confirmation.offerPrice)}</div>
                )}
                <div><strong>Status:</strong> {confirmation.statusLabel}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn btn-primary btn-lg" href={`/track?id=${confirmation.id}&phone=${confirmation.buyerPhone}`}>
                <span className="icon">local_shipping</span> Track This Request
              </Link>
              <Link className="btn btn-secondary btn-lg" href="/marketplace">
                <span className="icon">storefront</span> Keep Browsing
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="section">
        <div className="container">
          <div className="detail-grid">
            <div className="detail-gallery">
              <div className="gallery-stage">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={listingImage({ images: [gallery[activeImage]], category: listing.category })} alt={listing.title} />
              </div>
              {gallery.length > 1 && (
                <div className="gallery-thumbs">
                  {gallery.map((src, i) => (
                    <button
                      key={src + i}
                      className={`gallery-thumb${i === activeImage ? ' active' : ''}`}
                      onClick={() => setActiveImage(i)}
                      aria-label={`View image ${i + 1}`}
                      aria-pressed={i === activeImage}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={listingImage({ images: [src], category: listing.category })} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="detail-summary">
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <span className={`badge ${badge.className}`}>{badge.label}</span>
                <span className="badge badge-blue">
                  <span className="icon" style={{ fontSize: 14 }}>{meta.icon}</span> {listing.category}
                </span>
                <span className="badge badge-amber">{listing.condition}</span>
              </div>

              <h2 style={{ fontSize: '1.8rem', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
                {listing.title}
              </h2>

              <div className="rating-row" style={{ marginBottom: '1rem' }}>
                <span className="icon" style={{ fontSize: 18, color: 'var(--primary)' }}>person</span>
                <span className="muted">Listed by a private seller</span>
                {listing.city && (
                  <>
                    <span style={{ color: 'var(--outline-variant)' }}>·</span>
                    <span className="muted">{listing.city}</span>
                  </>
                )}
                <span style={{ color: 'var(--outline-variant)' }}>·</span>
                <span className="muted">{listing.views} view{listing.views === 1 ? '' : 's'}</span>
              </div>

              <div className="price-box" style={{ marginBottom: '1.25rem' }}>
                <span className="price" style={{ fontSize: '2rem' }}>{money(listing.price)}</span>
                {listing.negotiable ? (
                  <span className="badge badge-green">Negotiable</span>
                ) : (
                  <span className="badge badge-blue">Fixed price</span>
                )}
              </div>

              {specEntries.length > 0 && (
                <div className="highlight-specs" style={{ marginBottom: '1.5rem' }}>
                  {specEntries.map(([key, value]) => (
                    <div className="highlight-spec" key={key}>
                      <small>{key}</small>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>
                  Seller&apos;s description
                </h3>
                <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {listing.description}
                </p>
                <small style={{ color: 'var(--outline)' }}>
                  Listed {formatDate(listing.createdAt)}
                  {listing.brand ? ` · ${listing.brand}` : ''}
                  {listing.model ? ` ${listing.model}` : ''}
                </small>
              </div>

              {available ? (
                <>
                  {!showForm && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                      <button className="btn btn-primary btn-lg" onClick={() => setShowForm(true)}>
                        <span className="icon">shopping_bag</span> Buy This Item
                      </button>
                      {listing.negotiable && (
                        <button
                          className="btn btn-secondary btn-lg"
                          onClick={() => {
                            setShowForm(true);
                            update('offerPrice', String(Math.round(listing.price * 0.9)));
                          }}
                        >
                          <span className="icon">sell</span> Make an Offer
                        </button>
                      )}
                    </div>
                  )}

                  {showForm && (
                    <form className="form-card" onSubmit={submit} noValidate style={{ marginBottom: '1.25rem' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Contact the seller</h3>
                      <p style={{ color: 'var(--on-surface-variant)', fontSize: 13, marginBottom: '1.25rem' }}>
                        We pass your details to the seller. Their contact number is shared with you as
                        soon as they accept.
                      </p>

                      <div className="form-grid">
                        <BuyerField label="Your Name *" error={errors.buyerName}>
                          <input type="text" value={form.buyerName} onChange={(e) => update('buyerName', e.target.value)} autoComplete="name" />
                        </BuyerField>
                        <BuyerField label="Mobile Phone * (10 digits)" error={errors.buyerPhone}>
                          <input
                            type="tel"
                            value={form.buyerPhone}
                            onChange={(e) => update('buyerPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            inputMode="numeric"
                            autoComplete="tel-national"
                          />
                        </BuyerField>
                        <BuyerField label="Email (optional)" error={errors.buyerEmail}>
                          <input type="email" value={form.buyerEmail} onChange={(e) => update('buyerEmail', e.target.value)} autoComplete="email" />
                        </BuyerField>
                        <BuyerField label="Your City (optional)" error={errors.buyerCity}>
                          <input type="text" value={form.buyerCity} onChange={(e) => update('buyerCity', e.target.value)} placeholder="e.g. Delhi" />
                        </BuyerField>

                        {listing.negotiable && (
                          <BuyerField label={`Your Offer (asking ${money(listing.price)})`} error={errors.offerPrice}>
                            <input
                              type="number"
                              value={form.offerPrice}
                              onChange={(e) => update('offerPrice', e.target.value)}
                              placeholder={String(listing.price)}
                              min={1}
                            />
                          </BuyerField>
                        )}

                        <BuyerField label="Message to the seller" error={errors.message} full>
                          <textarea
                            rows={4}
                            value={form.message}
                            onChange={(e) => update('message', e.target.value)}
                            placeholder="e.g. Interested — can we meet at Nehru Place this weekend?"
                          />
                        </BuyerField>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
                          <span className="icon">send</span> {submitting ? 'Sending…' : 'Send Request'}
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--amber-soft)',
                    border: '1px solid var(--amber-border)',
                    marginBottom: '1.25rem',
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                    This item is {badge.label.toLowerCase()}
                  </strong>
                  <span style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>
                    It is no longer accepting new requests.{' '}
                    <Link className="text-link" href="/marketplace">Browse other listings →</Link>
                  </span>
                </div>
              )}

              <div className="hero-features" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 0 }}>
                <div className="mini-trust">
                  <span className="icon" style={{ color: 'var(--primary)' }}>verified_user</span>
                  <span><strong>Meet safely</strong><small>Inspect before you pay</small></span>
                </div>
                <div className="mini-trust">
                  <span className="icon" style={{ color: 'var(--emerald-text)' }}>storefront</span>
                  <span><strong>Free inspection</strong><small>Bring it to our Rohini bench</small></span>
                </div>
                <div className="mini-trust">
                  <span className="icon" style={{ color: 'var(--navy)' }}>handyman</span>
                  <span>
                    <strong>Need it serviced?</strong>
                    <small><Link className="text-link" href="/repair">Book a repair</Link></small>
                  </span>
                </div>
                <div className="mini-trust">
                  <span className="icon" style={{ color: 'var(--primary)' }}>support_agent</span>
                  <span>
                    <strong>Questions?</strong>
                    <small>
                      <a
                        className="text-link"
                        href={whatsappUrl(`Hi Bheral Systems, I have a question about marketplace listing ${listing.id} (${listing.title}).`)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        WhatsApp us
                      </a>
                    </small>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '2rem',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--border)',
              fontSize: 13,
              color: 'var(--on-surface-variant)',
            }}
          >
            <strong style={{ color: 'var(--navy)' }}>A note on private listings.</strong> This item is
            sold directly by its owner, not by Bheral Systems, so our 6-month warranty and 50-point audit
            do not apply. Always inspect the hardware before paying. For a warranty-backed machine, see
            our <Link className="text-link" href="/buy">certified refurbished stock</Link>.
          </div>
        </div>
      </section>

      {similar.length > 0 && (
        <section className="section-sm">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow green">More from the marketplace</span>
                <h2>Similar {listing.category} Listings</h2>
                <p>Other private sellers offering comparable hardware.</p>
              </div>
              <Link className="text-link" href={`/marketplace?category=${encodeURIComponent(listing.category)}`}>
                View all →
              </Link>
            </div>
            <div className="product-grid">
              {similar.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function BuyerField({
  label,
  error,
  full,
  children,
}: {
  label: string;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`field${full ? ' full' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</small>}
    </label>
  );
}
