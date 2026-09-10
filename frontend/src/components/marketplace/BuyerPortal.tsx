'use client';

/**
 * Buyer portal — sign in with a phone number and PIN to see every order and
 * marketplace deal placed with that number, with invoices attached.
 *
 * The seller's contact on a marketplace deal is released by the API only once
 * the seller accepts, so this component never has to hide anything itself.
 */
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatDate, money } from '@/lib/format';
import {
  clearBuyerSession,
  listingImage,
  readBuyerSession,
  writeBuyerSession,
} from '@/lib/marketplace';
import type {
  Buyer,
  BuyerCredentials,
  BuyerDashboard,
  BuyerDeal,
  BuyerOrder,
  BuyerServiceRequest,
} from '@/lib/types';
import { useStore } from '../StoreProvider';
import { Reveal } from '../Reveal';
import { DashEmpty, DashPanel, DashStat, DealSteps, initials } from './DashboardUI';

type Tab = 'overview' | 'deals' | 'orders' | 'services';

export function BuyerPortal() {
  const { toast } = useStore();
  const [creds, setCreds] = useState<BuyerCredentials | null>(null);
  const [data, setData] = useState<BuyerDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  // sessionStorage is only readable after mount, so the gate renders once.
  useEffect(() => {
    setCreds(readBuyerSession());
    setReady(true);
  }, []);

  const load = useCallback(
    async (c: BuyerCredentials) => {
      setLoading(true);
      try {
        setData(await api.buyerDashboard(c));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearBuyerSession();
          setCreds(null);
          toast('Your session expired. Please sign in again.', 'error');
        } else {
          toast('Could not load your dashboard. Please try again.', 'error');
        }
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (creds) void load(creds);
  }, [creds, load]);

  const signOut = () => {
    clearBuyerSession();
    setCreds(null);
    setData(null);
    setTab('overview');
    toast('Signed out.', 'info');
  };

  if (!ready) return <div className="aw-skeleton" style={{ minHeight: 420, margin: '3rem auto', maxWidth: 1100 }} />;

  if (!creds) {
    return (
      <BuyerAuth
        onSignedIn={(c, buyer) => {
          writeBuyerSession(c);
          setCreds(c);
          toast(`Welcome, ${buyer.name}`, 'success');
        }}
      />
    );
  }

  return (
    <BuyerDashboardView
      creds={creds}
      data={data}
      loading={loading}
      tab={tab}
      setTab={setTab}
      onRefresh={() => void load(creds)}
      onSignOut={signOut}
    />
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function BuyerDashboardView({
  creds,
  data,
  loading,
  tab,
  setTab,
  onRefresh,
  onSignOut,
}: {
  creds: BuyerCredentials;
  data: BuyerDashboard | null;
  loading: boolean;
  tab: Tab;
  setTab: (t: Tab) => void;
  onRefresh: () => void;
  onSignOut: () => void;
}) {
  const deals = data?.deals ?? [];
  const orders = data?.orders ?? [];
  const sellRequests = data?.sellRequests ?? [];
  const repairRequests = data?.repairRequests ?? [];
  const services = useMemo(
    () => [...sellRequests, ...repairRequests],
    [sellRequests, repairRequests],
  );

  const stats = useMemo(() => {
    const awaiting = deals.filter((d) => d.status < 2).length;
    const confirmed = deals.filter((d) => d.status >= 2).length;
    const spend =
      deals.reduce((n, d) => n + (d.offerPrice ?? d.listing.price), 0) +
      orders.reduce((n, o) => n + o.total, 0);
    return { awaiting, confirmed, spend };
  }, [deals, orders]);

  const buyer = data?.buyer;

  const NAV: Array<{ id: Tab; icon: string; label: string; badge?: number }> = [
    { id: 'overview', icon: 'dashboard', label: 'Overview' },
    { id: 'deals', icon: 'handshake', label: 'Marketplace Deals', badge: deals.length },
    { id: 'orders', icon: 'receipt_long', label: 'Store Orders', badge: orders.length },
    { id: 'services', icon: 'build', label: 'Sell & Repair', badge: services.length },
  ];

  return (
    <section className="section">
      <div className="container">
        <div className="dash">
          <aside className="dash__side">
            <div className="dash-id">
              <div className="dash-id__avatar">{buyer ? initials(buyer.name) : '—'}</div>
              <div className="dash-id__name">{buyer?.name ?? 'My Account'}</div>
              <span className="dash-id__meta">+91 {creds.phone}</span>
              {buyer?.city && <span className="dash-id__meta">{buyer.city}</span>}
              <div className="dash-id__actions">
                <button className="btn btn-secondary btn-small" onClick={onRefresh} disabled={loading}>
                  <span className="icon" style={{ fontSize: 16 }}>refresh</span>
                  {loading ? 'Refreshing…' : 'Refresh'}
                </button>
                <button className="btn btn-secondary btn-small" onClick={onSignOut}>
                  <span className="icon" style={{ fontSize: 16 }}>logout</span> Sign out
                </button>
              </div>
            </div>

            <nav className="dash-nav" aria-label="Buyer sections">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  className={`dash-nav__item${tab === item.id ? ' is-active' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  <span className="icon">{item.icon}</span> {item.label}
                  {!!item.badge && <span className="dash-nav__badge">{item.badge}</span>}
                </button>
              ))}
              <Link className="dash-nav__item" href="/marketplace">
                <span className="icon">storefront</span> Browse Marketplace
              </Link>
              <Link className="dash-nav__item" href="/buy">
                <span className="icon">laptop_mac</span> Shop Refurbished
              </Link>
            </nav>
          </aside>

          <div className="dash__main">
            <div className="dash-stats">
              <DashStat icon="handshake" value={String(deals.length)} label="Marketplace deals" />
              <DashStat icon="hourglass_top" tone="amber" value={String(stats.awaiting)} label="Awaiting seller" />
              <DashStat icon="receipt_long" tone="green" value={String(orders.length)} label="Store orders" />
              <DashStat icon="payments" tone="navy" value={money(stats.spend)} label="Lifetime value" />
            </div>

            {loading && !data ? (
              <div className="aw-skeleton" style={{ minHeight: 320 }} />
            ) : (
              <>
                {tab === 'overview' && (
                  <OverviewTab
                    deals={deals}
                    orders={orders}
                    services={services}
                    confirmed={stats.confirmed}
                    phone={creds.phone}
                    onSeeAll={setTab}
                  />
                )}

                {tab === 'deals' && (
                  <DashPanel
                    title="Marketplace deals"
                    icon="handshake"
                    sub={`${deals.length} request${deals.length === 1 ? '' : 's'} to private sellers`}
                    flush={deals.length > 0}
                  >
                    {deals.length ? (
                      deals.map((deal) => <DealRow key={deal.id} deal={deal} phone={creds.phone} />)
                    ) : (
                      <DashEmpty
                        icon="storefront"
                        title="No marketplace deals yet"
                        body="Anything you request from a private seller shows up here, with live status and their contact once they accept."
                        action={
                          <Link className="btn btn-primary" href="/marketplace">
                            <span className="icon">storefront</span> Browse the Marketplace
                          </Link>
                        }
                      />
                    )}
                  </DashPanel>
                )}

                {tab === 'orders' && (
                  <DashPanel
                    title="Store orders"
                    icon="receipt_long"
                    sub="Certified refurbished stock bought from Bheral"
                    flush={orders.length > 0}
                  >
                    {orders.length ? (
                      orders.map((order) => <OrderRow key={order.id} order={order} phone={creds.phone} />)
                    ) : (
                      <DashEmpty
                        icon="laptop_mac"
                        title="No store orders yet"
                        body="Orders you place from our own catalogue appear here with a downloadable invoice."
                        action={
                          <Link className="btn btn-primary" href="/buy">
                            <span className="icon">laptop_mac</span> Shop Refurbished Laptops
                          </Link>
                        }
                      />
                    )}
                  </DashPanel>
                )}

                {tab === 'services' && (
                  <DashPanel
                    title="Sell & repair requests"
                    icon="build"
                    sub="Buy-back valuations and repair bookings on this number"
                    flush={services.length > 0}
                  >
                    {services.length ? (
                      services.map((r) => <ServiceRow key={r.id} request={r} phone={creds.phone} />)
                    ) : (
                      <DashEmpty
                        icon="build"
                        title="Nothing booked yet"
                        body="Sell us a device or book a repair and you can follow it from here."
                        action={
                          <Link className="btn btn-primary" href="/sell">
                            <span className="icon">sell</span> Sell a Device
                          </Link>
                        }
                      />
                    )}
                  </DashPanel>
                )}
              </>
            )}
          </div>
        </div>

        <Reveal deps={[tab, deals.length, orders.length, loading]} />
      </div>
    </section>
  );
}

function OverviewTab({
  deals,
  orders,
  services,
  confirmed,
  phone,
  onSeeAll,
}: {
  deals: BuyerDeal[];
  orders: BuyerOrder[];
  services: BuyerServiceRequest[];
  confirmed: number;
  phone: string;
  onSeeAll: (t: Tab) => void;
}) {
  const latestDeal = deals[0];
  const latestOrder = orders[0];

  return (
    <>
      <DashPanel
        title="Latest activity"
        icon="bolt"
        sub={
          confirmed
            ? `${confirmed} deal${confirmed === 1 ? '' : 's'} confirmed — contact the seller to arrange handover`
            : 'Your most recent request and order'
        }
        flush
      >
        {latestDeal || latestOrder ? (
          <>
            {latestDeal && <DealRow deal={latestDeal} phone={phone} />}
            {latestOrder && <OrderRow order={latestOrder} phone={phone} />}
          </>
        ) : (
          <DashEmpty
            icon="explore"
            title="Nothing here yet"
            body="Buy from a private seller or from our own certified stock and everything lands in this dashboard."
            action={
              <Link className="btn btn-primary" href="/marketplace">
                <span className="icon">storefront</span> Start Browsing
              </Link>
            }
          />
        )}
      </DashPanel>

      <DashPanel title="Everything on this number" icon="summarize">
        <div className="dash-category-grid">
          <button className="dash-tile" onClick={() => onSeeAll('deals')}>
            <span className="icon">handshake</span>
            <strong>{deals.length}</strong>
            <small>Marketplace deals</small>
          </button>
          <button className="dash-tile" onClick={() => onSeeAll('orders')}>
            <span className="icon">receipt_long</span>
            <strong>{orders.length}</strong>
            <small>Store orders</small>
          </button>
          <button className="dash-tile" onClick={() => onSeeAll('services')}>
            <span className="icon">build</span>
            <strong>{services.length}</strong>
            <small>Sell &amp; repair jobs</small>
          </button>
        </div>
      </DashPanel>
    </>
  );
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

function DealRow({ deal, phone }: { deal: BuyerDeal; phone: string }) {
  const accepted = deal.status >= 2;
  const listing = deal.listing;

  return (
    <div className="dash-request">
      <div className="dash-request__top">
        <div className="dash-request__buyer">
          <Link className="dash-row__thumb" href={`/marketplace/${listing.id}`} style={{ width: 64, height: 54 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={listingImage({ images: listing.images, category: listing.category })} alt={listing.title} loading="lazy" />
          </Link>
          <div style={{ minWidth: 0 }}>
            <div className="dash-request__name">
              <Link href={`/marketplace/${listing.id}`}>{listing.title}</Link>
            </div>
            <div className="dash-request__contact">
              <span>{deal.id}</span>
              <span>{formatDate(deal.createdAt)}</span>
              {listing.city && <span>{listing.city}</span>}
            </div>
          </div>
        </div>
        <span className={`dash-pill ${accepted ? 'dash-pill--active' : 'dash-pill--reserved'}`}>
          {deal.statusLabel}
        </span>
      </div>

      <DealSteps timeline={deal.timeline} status={deal.status} />

      <div className="dash-request__item">
        <span className="dash-request__item-name">
          <span className="icon" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4, color: 'var(--primary)' }}>
            sell
          </span>
          {listing.condition} · {listing.category}
        </span>
        <span className="dash-offer">
          {deal.offerPrice ? (
            <>
              <span className="dash-offer__ask">{money(listing.price)}</span>
              <span className="dash-offer__value dash-offer__value--under">{money(deal.offerPrice)}</span>
            </>
          ) : (
            <span className="dash-offer__value dash-offer__value--full">{money(listing.price)}</span>
          )}
        </span>
      </div>

      <div className={`dash-note${accepted ? ' dash-note--good' : ''}`}>
        {accepted && deal.seller ? (
          <>
            <strong>
              <span className="icon">handshake</span> Seller accepted — arrange the handover
            </strong>
            <span>
              {deal.seller.name} ·{' '}
              <a className="text-link" href={`tel:+91${deal.seller.phone}`}>+91 {deal.seller.phone}</a>
              {deal.seller.city ? ` · ${deal.seller.city}` : ''}
            </span>
          </>
        ) : (
          <span>
            <span className="icon">lock_clock</span> Waiting on the seller. Their contact details appear
            here as soon as they accept.
          </span>
        )}
      </div>

      <div className="dash-request__actions">
        <Link className="btn btn-secondary btn-small" href={`/track?id=${deal.id}&phone=${phone}`}>
          <span className="icon" style={{ fontSize: 16 }}>local_shipping</span> Full Timeline
        </Link>
        <Link className="btn btn-secondary btn-small" href={`/marketplace/${listing.id}`}>
          <span className="icon" style={{ fontSize: 16 }}>visibility</span> View Listing
        </Link>
        {accepted && (
          <Link className="btn btn-primary btn-small" href={`/invoice/${deal.id}?phone=${phone}`}>
            <span className="icon" style={{ fontSize: 16 }}>description</span> Invoice
          </Link>
        )}
      </div>
    </div>
  );
}

function OrderRow({ order, phone }: { order: BuyerOrder; phone: string }) {
  const items = order.items ?? [];

  return (
    <div className="dash-request">
      <div className="dash-request__top">
        <div className="dash-request__buyer">
          <div className="dash-request__avatar">
            <span className="icon">shopping_bag</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="dash-request__name">
              {items.length === 1 ? items[0].name : `${items.length} items`}
            </div>
            <div className="dash-request__contact">
              <span>{order.id}</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
          </div>
        </div>
        <span className="dash-pill dash-pill--active">{order.statusLabel}</span>
      </div>

      <DealSteps timeline={order.timeline} status={order.status} />

      <div className="dash-request__item">
        <span className="dash-request__item-name">
          {items.map((i) => `${i.name} × ${i.qty}`).join(', ')}
        </span>
        <span className="dash-offer">
          <span className="dash-offer__value dash-offer__value--full">{money(order.total)}</span>
        </span>
      </div>

      <div className="dash-request__actions">
        <Link className="btn btn-secondary btn-small" href={`/track?id=${order.id}&phone=${phone}`}>
          <span className="icon" style={{ fontSize: 16 }}>local_shipping</span> Track Order
        </Link>
        <Link className="btn btn-primary btn-small" href={`/invoice/${order.id}?phone=${phone}`}>
          <span className="icon" style={{ fontSize: 16 }}>description</span> Invoice
        </Link>
      </div>
    </div>
  );
}

function ServiceRow({ request, phone }: { request: BuyerServiceRequest; phone: string }) {
  const isSell = request.id.includes('SELL');
  const device = (request.device ?? request.details ?? {}) as Record<string, unknown>;
  const summary = [device.brand, device.model, device.deviceType, device.issue]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="dash-request">
      <div className="dash-request__top">
        <div className="dash-request__buyer">
          <div className="dash-request__avatar">
            <span className="icon">{isSell ? 'sell' : 'build'}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="dash-request__name">{isSell ? 'Buy-back valuation' : 'Repair booking'}</div>
            <div className="dash-request__contact">
              <span>{request.id}</span>
              <span>{formatDate(request.createdAt)}</span>
            </div>
          </div>
        </div>
        <span className="dash-pill dash-pill--reserved">{request.statusLabel}</span>
      </div>

      <DealSteps timeline={request.timeline} status={request.status} />

      {summary && (
        <div className="dash-request__item">
          <span className="dash-request__item-name">{summary}</span>
        </div>
      )}

      <div className="dash-request__actions">
        <Link className="btn btn-secondary btn-small" href={`/track?id=${request.id}&phone=${phone}`}>
          <span className="icon" style={{ fontSize: 16 }}>local_shipping</span> Full Timeline
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auth gate
// ---------------------------------------------------------------------------

const BENEFITS = [
  { icon: 'inventory_2', title: 'Every order in one place', body: 'Store purchases and marketplace deals together.' },
  { icon: 'description', title: 'Invoices on demand', body: 'Download or print an invoice for any confirmed order.' },
  { icon: 'notifications_active', title: 'Live status', body: 'Follow each deal from request to handover.' },
];

function BuyerAuth({
  onSignedIn,
}: {
  onSignedIn: (creds: BuyerCredentials, buyer: Buyer) => void;
}) {
  const { toast } = useStore();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [form, setForm] = useState({ phone: '', pin: '', name: '', email: '', city: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => {
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
      const payload =
        mode === 'register'
          ? { phone: form.phone, pin: form.pin, name: form.name, email: form.email || undefined, city: form.city }
          : { phone: form.phone, pin: form.pin };

      const { buyer } = await api.buyerAuth(payload);
      onSignedIn({ phone: form.phone, pin: form.pin }, buyer);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        toast(Object.keys(err.fieldErrors).length ? 'Please correct the highlighted fields' : err.message, 'error');
      } else {
        toast('Could not sign you in. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="auth-split">
          <form className="dash-panel" onSubmit={submit} noValidate>
            <div className="dash-panel__head">
              <div>
                <h2 className="dash-panel__title">
                  <span className="icon">{mode === 'signin' ? 'login' : 'person_add'}</span>
                  {mode === 'signin' ? 'Sign in to your account' : 'Create your buyer account'}
                </h2>
                <p className="dash-panel__sub">
                  Your mobile number and a PIN — the same number you use when ordering.
                </p>
              </div>
            </div>

            <div className="dash-panel__body">
              <div className="form-grid">
                <label className="field">
                  <span>Mobile Number * (10 digits)</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="9876543210"
                  />
                  {errors.phone && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{errors.phone}</small>}
                </label>

                <label className="field">
                  <span>{mode === 'register' ? 'Choose a PIN * (4+ digits)' : 'Your PIN *'}</span>
                  <input
                    type="password"
                    value={form.pin}
                    onChange={(e) => update('pin', e.target.value.replace(/\D/g, '').slice(0, 12))}
                    inputMode="numeric"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    placeholder="••••"
                  />
                  {errors.pin && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{errors.pin}</small>}
                </label>

                {mode === 'register' && (
                  <>
                    <label className="field">
                      <span>Your Name *</span>
                      <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} autoComplete="name" />
                      {errors.name && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{errors.name}</small>}
                    </label>
                    <label className="field">
                      <span>City</span>
                      <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} />
                    </label>
                    <label className="field full">
                      <span>Email (optional)</span>
                      <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" />
                      {errors.email && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{errors.email}</small>}
                    </label>
                  </>
                )}
              </div>

              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting} style={{ marginTop: '1.5rem' }}>
                <span className="icon">{mode === 'signin' ? 'login' : 'person_add'}</span>
                {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create My Account'}
              </button>

              <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 13, color: 'var(--on-surface-variant)' }}>
                {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
                <button
                  type="button"
                  className="text-link"
                  style={{ background: 'none', border: 0, cursor: 'pointer' }}
                  onClick={() => {
                    setMode(mode === 'signin' ? 'register' : 'signin');
                    setErrors({});
                  }}
                >
                  {mode === 'signin' ? 'Create an account' : 'Sign in instead'}
                </button>
              </p>
            </div>
          </form>

          <aside className="auth-aside">
            <span className="eyebrow green">Your account</span>
            <h2 style={{ fontSize: '1.4rem', letterSpacing: '-0.03em', margin: '0.35rem 0 1.25rem' }}>
              Track every purchase in one dashboard
            </h2>

            {BENEFITS.map((b) => (
              <div className="mini-trust" key={b.title} style={{ marginBottom: '1.1rem', alignItems: 'flex-start' }}>
                <span className="icon" style={{ color: 'var(--primary)' }}>{b.icon}</span>
                <span>
                  <strong>{b.title}</strong>
                  <small>{b.body}</small>
                </span>
              </div>
            ))}

            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--border)',
                fontSize: 13,
                color: 'var(--on-surface-variant)',
              }}
            >
              <strong style={{ color: 'var(--navy)' }}>Ordered as a guest?</strong> You can still{' '}
              <Link className="text-link" href="/track">track any request</Link> with its reference number.
              Create an account with the same mobile number and every past order appears here automatically.
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
