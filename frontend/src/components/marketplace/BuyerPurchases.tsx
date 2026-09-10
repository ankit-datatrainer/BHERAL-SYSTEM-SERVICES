'use client';

/**
 * Buyer dashboard — every marketplace request made from this browser, with
 * live status pulled from the API.
 *
 * References are remembered in localStorage at purchase time. Each one is
 * still re-verified against the API with its phone number, so this view can
 * never show a deal the visitor is not party to; the stored list is only a
 * convenience so buyers do not have to type a reference in by hand.
 */
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatDate, money } from '@/lib/format';
import { clearBuyerReferences, listingImage, readBuyerReferences, rememberBuyerReference } from '@/lib/marketplace';
import type { TrackedRequest } from '@/lib/types';
import { useStore } from '../StoreProvider';
import { Reveal } from '../Reveal';
import { DashEmpty, DashPanel, DashStat, DealSteps, initials } from './DashboardUI';

export function BuyerPurchases() {
  const { toast } = useStore();
  const [deals, setDeals] = useState<TrackedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookup, setLookup] = useState({ id: '', phone: '' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const refs = readBuyerReferences();
    if (!refs.length) {
      setDeals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const results = await Promise.all(
      refs.map((r) => api.track(r.id, r.phone).catch(() => null)),
    );
    setDeals(results.filter((d): d is TrackedRequest => Boolean(d)));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Lets a buyer pull in a purchase made on another device. */
  const addByReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookup.id.trim() || !/^\d{10}$/.test(lookup.phone)) {
      toast('Enter the reference and the 10-digit number you used.', 'error');
      return;
    }

    setAdding(true);
    try {
      const found = await api.track(lookup.id.trim(), lookup.phone);
      rememberBuyerReference(found.id, lookup.phone);
      setLookup({ id: '', phone: '' });
      toast('Added to your purchases.', 'success');
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not find that request.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const marketplaceDeals = useMemo(() => deals.filter((d) => d.type === 'marketplace'), [deals]);

  const stats = useMemo(() => {
    const completed = marketplaceDeals.filter((d) => d.status >= d.timeline.length - 1);
    const awaiting = marketplaceDeals.filter((d) => d.status < 2);
    return {
      total: marketplaceDeals.length,
      awaiting: awaiting.length,
      confirmed: marketplaceDeals.filter((d) => d.status >= 2 && d.status < d.timeline.length - 1).length,
      spend: marketplaceDeals.reduce((n, d) => n + (d.offerPrice ?? d.listing?.price ?? 0), 0),
      completed: completed.length,
    };
  }, [marketplaceDeals]);

  const forget = () => {
    clearBuyerReferences();
    setDeals([]);
    toast('Cleared the purchases saved on this browser.', 'info');
  };

  return (
    <section className="section">
      <div className="container">
        <div className="dash">
          <aside className="dash__side">
            <div className="dash-id">
              <div className="dash-id__avatar">
                <span className="icon" style={{ fontSize: 24 }}>shopping_bag</span>
              </div>
              <div className="dash-id__name">My Purchases</div>
              <span className="dash-id__meta">Saved on this browser</span>
              <span className="dash-id__meta">{stats.total} marketplace deal{stats.total === 1 ? '' : 's'}</span>
              <div className="dash-id__actions">
                <Link className="btn btn-secondary btn-small" href="/marketplace">
                  <span className="icon" style={{ fontSize: 16 }}>storefront</span> Browse
                </Link>
                {deals.length > 0 && (
                  <button className="btn btn-secondary btn-small" onClick={forget}>
                    <span className="icon" style={{ fontSize: 16 }}>delete_sweep</span> Clear
                  </button>
                )}
              </div>
            </div>

            <nav className="dash-nav" aria-label="Buyer sections">
              <Link className="dash-nav__item is-active" href="/marketplace/purchases">
                <span className="icon">receipt_long</span> My Purchases
                {stats.total > 0 && <span className="dash-nav__badge">{stats.total}</span>}
              </Link>
              <Link className="dash-nav__item" href="/marketplace">
                <span className="icon">storefront</span> Marketplace
              </Link>
              <Link className="dash-nav__item" href="/marketplace/sell">
                <span className="icon">sell</span> Sell an Item
              </Link>
              <Link className="dash-nav__item" href="/track">
                <span className="icon">local_shipping</span> Track Any Request
              </Link>
            </nav>
          </aside>

          <div className="dash__main">
            <div className="dash-stats">
              <DashStat icon="receipt_long" value={String(stats.total)} label="Total requests" />
              <DashStat icon="hourglass_top" tone="amber" value={String(stats.awaiting)} label="Awaiting seller" />
              <DashStat icon="handshake" tone="green" value={String(stats.confirmed)} label="Deals confirmed" />
              <DashStat icon="payments" tone="navy" value={money(stats.spend)} label="Committed value" />
            </div>

            {loading ? (
              <div className="aw-skeleton" style={{ minHeight: 300 }} />
            ) : marketplaceDeals.length ? (
              <DashPanel title="Your marketplace requests" icon="receipt_long" sub={`${marketplaceDeals.length} total`} flush>
                {marketplaceDeals.map((deal) => (
                  <PurchaseRow key={deal.id} deal={deal} />
                ))}
              </DashPanel>
            ) : (
              <DashPanel title="Your marketplace requests" icon="receipt_long">
                <DashEmpty
                  icon="shopping_bag"
                  title="No purchases yet"
                  body="Anything you request from a private seller shows up here, with live status and the seller's contact once they accept."
                  action={
                    <Link className="btn btn-primary" href="/marketplace">
                      <span className="icon">storefront</span> Browse the Marketplace
                    </Link>
                  }
                />
              </DashPanel>
            )}

            <DashPanel
              title="Bought on another device?"
              icon="add_link"
              sub="Add it here with your reference and the number you used."
            >
              <form onSubmit={addByReference} noValidate>
                <div className="form-grid">
                  <label className="field">
                    <span>Reference ID</span>
                    <input
                      type="text"
                      value={lookup.id}
                      onChange={(e) => setLookup((l) => ({ ...l, id: e.target.value.toUpperCase() }))}
                      placeholder="BSS-MKT-123456"
                      style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                    />
                  </label>
                  <label className="field">
                    <span>Your Phone Number</span>
                    <input
                      type="tel"
                      value={lookup.phone}
                      onChange={(e) => setLookup((l) => ({ ...l, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      inputMode="numeric"
                      placeholder="9876543210"
                    />
                  </label>
                </div>
                <button className="btn btn-secondary" type="submit" disabled={adding} style={{ marginTop: '1rem' }}>
                  <span className="icon">add</span> {adding ? 'Looking up…' : 'Add to My Purchases'}
                </button>
              </form>
            </DashPanel>
          </div>
        </div>

        <Reveal deps={[marketplaceDeals.length, loading]} />
      </div>
    </section>
  );
}

function PurchaseRow({ deal }: { deal: TrackedRequest }) {
  const listing = deal.listing;
  const accepted = deal.status >= 2;

  return (
    <div className="dash-request">
      <div className="dash-request__top">
        <div className="dash-request__buyer">
          {listing ? (
            <Link className="dash-row__thumb" href={`/marketplace/${listing.id}`} style={{ width: 64, height: 54 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={listingImage({ images: listing.images, category: listing.category })} alt={listing.title} loading="lazy" />
            </Link>
          ) : (
            <div className="dash-request__avatar">{initials(deal.id)}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <div className="dash-request__name">
              {listing ? <Link href={`/marketplace/${listing.id}`}>{listing.title}</Link> : deal.id}
            </div>
            <div className="dash-request__contact">
              <span>{deal.id}</span>
              <span>{formatDate(deal.createdAt)}</span>
              {listing?.city && <span>{listing.city}</span>}
            </div>
          </div>
        </div>
        <span className={`dash-pill ${accepted ? 'dash-pill--active' : 'dash-pill--reserved'}`}>{deal.statusLabel}</span>
      </div>

      <DealSteps timeline={deal.timeline} status={deal.status} />

      <div className="dash-request__item">
        <span className="dash-request__item-name">
          {listing && (
            <>
              <span className="icon" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4, color: 'var(--primary)' }}>
                sell
              </span>
              {listing.condition} · {listing.category}
            </>
          )}
        </span>
        <span className="dash-offer">
          {deal.offerPrice ? (
            <>
              <span className="dash-offer__ask">{money(listing?.price ?? 0)}</span>
              <span className="dash-offer__value dash-offer__value--under">{money(deal.offerPrice)}</span>
            </>
          ) : (
            <span className="dash-offer__value dash-offer__value--full">{money(listing?.price ?? 0)}</span>
          )}
        </span>
      </div>

      {/* Seller contact is released by the API only after acceptance. */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: accepted ? 'var(--emerald-soft)' : 'var(--surface-container-low)',
          border: `1px solid ${accepted ? 'var(--emerald-border)' : 'var(--border)'}`,
          fontSize: 13,
          marginBottom: '1rem',
        }}
      >
        {accepted && deal.seller ? (
          <>
            <strong style={{ color: 'var(--emerald-text)', display: 'block', marginBottom: '0.25rem' }}>
              <span className="icon" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>handshake</span>
              Seller accepted — arrange the handover
            </strong>
            <span style={{ color: 'var(--on-surface)' }}>
              {deal.seller.name} ·{' '}
              <a className="text-link" href={`tel:+91${deal.seller.phone}`}>+91 {deal.seller.phone}</a>
              {deal.seller.city ? ` · ${deal.seller.city}` : ''}
            </span>
          </>
        ) : (
          <span style={{ color: 'var(--on-surface-variant)' }}>
            <span className="icon" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>lock_clock</span>
            Waiting on the seller. Their contact details appear here as soon as they accept.
          </span>
        )}
      </div>

      <div className="dash-request__actions">
        <Link className="btn btn-secondary btn-small" href={`/track?id=${deal.id}&phone=${deal.phone}`}>
          <span className="icon" style={{ fontSize: 16 }}>local_shipping</span> Full Timeline
        </Link>
        {listing && (
          <Link className="btn btn-secondary btn-small" href={`/marketplace/${listing.id}`}>
            <span className="icon" style={{ fontSize: 16 }}>visibility</span> View Listing
          </Link>
        )}
      </div>
    </div>
  );
}
