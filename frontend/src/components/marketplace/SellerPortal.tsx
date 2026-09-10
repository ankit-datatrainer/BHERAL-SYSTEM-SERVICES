'use client';

/**
 * Seller dashboard — sign in, publish listings, manage stock and respond to
 * buyer requests.
 *
 * Identity is phone + PIN, verified inside Postgres. The PIN lives in
 * sessionStorage only, so it does not survive closing the browser.
 */
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatDate, money } from '@/lib/format';
import {
  categoryMeta,
  clearSellerSession,
  listingImage,
  readSellerSession,
  writeSellerSession,
  CATEGORY_META,
} from '@/lib/marketplace';
import type { Listing, ListingOrder, Seller, SellerCredentials, SellerDashboard } from '@/lib/types';
import { useStore } from '../StoreProvider';
import { Reveal } from '../Reveal';
import { DashEmpty, DashPanel, DashStat, DealSteps, initials, StatusPill } from './DashboardUI';

const CONDITIONS = ['Like New', 'Excellent', 'Good', 'Fair', 'For Parts / Not Working'];
const CATEGORIES = Object.keys(CATEGORY_META);

type Tab = 'overview' | 'listings' | 'requests' | 'new';

const NAV: Array<{ id: Tab; icon: string; label: string }> = [
  { id: 'overview', icon: 'dashboard', label: 'Overview' },
  { id: 'listings', icon: 'inventory_2', label: 'My Listings' },
  { id: 'requests', icon: 'forum', label: 'Buyer Requests' },
  { id: 'new', icon: 'add_circle', label: 'List an Item' },
];

const EMPTY_LISTING = {
  title: '',
  category: 'Laptop',
  brand: '',
  model: '',
  description: '',
  condition: 'Good',
  price: '',
  negotiable: true,
  city: 'Delhi',
  pincode: '',
  imageUrl: '',
};

export function SellerPortal() {
  const { toast } = useStore();

  const [creds, setCreds] = useState<SellerCredentials | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [dashboard, setDashboard] = useState<SellerDashboard | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [booting, setBooting] = useState(true);

  const loadDashboard = useCallback(
    async (c: SellerCredentials) => {
      try {
        setDashboard(await api.sellerDashboard(c));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearSellerSession();
          setCreds(null);
          setSeller(null);
          toast('Your session expired — please sign in again.', 'error');
        } else {
          toast('Could not load your listings.', 'error');
        }
      }
    },
    [toast],
  );

  useEffect(() => {
    const saved = readSellerSession();
    if (!saved) {
      setBooting(false);
      return;
    }
    api
      .sellerAuth(saved)
      .then(({ seller: s }) => {
        setCreds(saved);
        setSeller(s);
        return loadDashboard(saved);
      })
      .catch(() => clearSellerSession())
      .finally(() => setBooting(false));
  }, [loadDashboard]);

  const listings = useMemo(() => dashboard?.listings ?? [], [dashboard]);
  const orders = useMemo(() => dashboard?.orders ?? [], [dashboard]);
  const timeline = dashboard?.timeline ?? [];

  const stats = useMemo(() => {
    // Anything still on the marketplace, so a reserved item does not make the
    // dashboard read "0 listings" while its value is shown alongside.
    const live = listings.filter((l) => l.status === 'active' || l.status === 'reserved').length;
    const sold = listings.filter((l) => l.status === 'sold');
    return {
      live,
      views: listings.reduce((n, l) => n + l.views, 0),
      openRequests: orders.filter((o) => o.status < timeline.length - 1).length,
      // What the still-for-sale stock is worth if it all sells at asking price.
      pipeline: listings
        .filter((l) => l.status === 'active' || l.status === 'reserved')
        .reduce((n, l) => n + l.price, 0),
      earned: sold.reduce((n, l) => n + l.price, 0),
      soldCount: sold.length,
    };
  }, [listings, orders, timeline.length]);

  if (booting) {
    return (
      <section className="section">
        <div className="container">
          <div className="dash">
            <div className="aw-skeleton" style={{ minHeight: 300 }} />
            <div className="aw-skeleton" style={{ minHeight: 420 }} />
          </div>
        </div>
      </section>
    );
  }

  if (!creds || !seller) {
    return (
      <SellerAuthCard
        onSignedIn={(c, s) => {
          writeSellerSession(c);
          setCreds(c);
          setSeller(s);
          void loadDashboard(c);
        }}
      />
    );
  }

  const signOut = () => {
    clearSellerSession();
    setCreds(null);
    setSeller(null);
    setDashboard(null);
    setTab('overview');
  };

  const badgeFor = (id: Tab): { text: string; alert?: boolean } | null => {
    if (id === 'listings' && listings.length) return { text: String(listings.length) };
    if (id === 'requests' && stats.openRequests) return { text: String(stats.openRequests), alert: true };
    return null;
  };

  return (
    <section className="section">
      <div className="container">
        <div className="dash">
          <aside className="dash__side">
            <div className="dash-id">
              <div className="dash-id__avatar">{initials(seller.name)}</div>
              <div className="dash-id__name">{seller.name}</div>
              <span className="dash-id__meta">+91 {seller.phone}</span>
              {seller.city && <span className="dash-id__meta">{seller.city}</span>}
              <div className="dash-id__actions">
                <button className="btn btn-secondary btn-small" onClick={signOut}>
                  <span className="icon" style={{ fontSize: 16 }}>logout</span> Sign Out
                </button>
              </div>
            </div>

            <nav className="dash-nav" aria-label="Seller dashboard sections">
              {NAV.map((item) => {
                const badge = badgeFor(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`dash-nav__item${tab === item.id ? ' is-active' : ''}`}
                    aria-current={tab === item.id ? 'page' : undefined}
                    onClick={() => setTab(item.id)}
                  >
                    <span className="icon">{item.icon}</span>
                    {item.label}
                    {badge && (
                      <span className={`dash-nav__badge${badge.alert ? ' is-alert' : ''}`}>{badge.text}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="dash__main">
            <div className="dash-stats">
              <DashStat icon="storefront" tone="green" value={String(stats.live)} label="Live listings" />
              <DashStat icon="visibility" value={String(stats.views)} label="Total views" />
              <DashStat icon="forum" tone="amber" value={String(stats.openRequests)} label="Open requests" />
              <DashStat icon="payments" tone="navy" value={money(stats.pipeline)} label="Listed value" />
            </div>

            {tab === 'overview' && (
              <Overview
                listings={listings}
                orders={orders}
                timeline={timeline}
                stats={stats}
                onGo={setTab}
              />
            )}

            {tab === 'listings' && (
              <MyListings listings={listings} creds={creds} onChanged={() => loadDashboard(creds)} onCreate={() => setTab('new')} />
            )}

            {tab === 'requests' && (
              <BuyerRequests orders={orders} timeline={timeline} creds={creds} onChanged={() => loadDashboard(creds)} />
            )}

            {tab === 'new' && (
              <NewListingForm
                creds={creds}
                defaultCity={seller.city ?? 'Delhi'}
                onCreated={() => {
                  void loadDashboard(creds);
                  setTab('listings');
                }}
              />
            )}
          </div>
        </div>

        <Reveal deps={[tab, listings.length, orders.length]} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function Overview({
  listings,
  orders,
  timeline,
  stats,
  onGo,
}: {
  listings: Listing[];
  orders: ListingOrder[];
  timeline: string[];
  stats: { soldCount: number; earned: number; openRequests: number };
  onGo: (t: Tab) => void;
}) {
  const recentListings = listings.slice(0, 3);
  const recentOrders = orders.slice(0, 3);

  if (!listings.length && !orders.length) {
    return (
      <DashPanel title="Get started" icon="rocket_launch">
        <DashEmpty
          icon="storefront"
          title="Your marketplace stall is empty"
          body="List a laptop, screen, hard disk or any spare part and buyers across Delhi NCR can find it within minutes."
          action={
            <button className="btn btn-primary" onClick={() => onGo('new')}>
              <span className="icon">add_circle</span> List Your First Item
            </button>
          }
        />
      </DashPanel>
    );
  }

  return (
    <>
      {stats.soldCount > 0 && (
        <DashPanel title="Completed sales" icon="verified" sub={`${stats.soldCount} item${stats.soldCount === 1 ? '' : 's'} sold for ${money(stats.earned)} in total`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span className="icon" style={{ fontSize: 40, color: 'var(--emerald)' }}>celebration</span>
            <div>
              <strong style={{ fontSize: '1.5rem', color: 'var(--emerald-text)', fontFamily: 'var(--font-headline)' }}>
                {money(stats.earned)}
              </strong>
              <div style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>
                earned across {stats.soldCount} completed sale{stats.soldCount === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </DashPanel>
      )}

      <DashPanel
        title="Latest buyer requests"
        icon="forum"
        sub={stats.openRequests ? `${stats.openRequests} still need your response` : 'Nothing waiting on you'}
        action={orders.length > 3 ? <button className="btn btn-secondary btn-small" onClick={() => onGo('requests')}>View all</button> : undefined}
        flush
      >
        {recentOrders.length ? (
          recentOrders.map((o) => (
            <div className="dash-request" key={o.id}>
              <div className="dash-request__top">
                <div className="dash-request__buyer">
                  <div className="dash-request__avatar">{initials(o.buyerName)}</div>
                  <div>
                    <div className="dash-request__name">{o.buyerName}</div>
                    <div className="dash-request__contact">
                      <span>{o.listingTitle}</span>
                    </div>
                  </div>
                </div>
                <span className="dash-pill dash-pill--reserved">{o.statusLabel}</span>
              </div>
              <DealSteps timeline={timeline} status={o.status} />
            </div>
          ))
        ) : (
          <DashEmpty
            icon="forum"
            title="No buyer requests yet"
            body="When somebody wants to buy one of your items, their request and contact details appear here."
          />
        )}
      </DashPanel>

      <DashPanel
        title="Your listings"
        icon="inventory_2"
        action={
          <button className="btn btn-primary btn-small" onClick={() => onGo('new')}>
            <span className="icon" style={{ fontSize: 16 }}>add</span> New listing
          </button>
        }
        flush
      >
        {recentListings.map((l) => (
          <ListingRow key={l.id} listing={l} />
        ))}
      </DashPanel>
    </>
  );
}

/** Read-only listing row used on the overview. */
function ListingRow({ listing, children }: { listing: Listing; children?: React.ReactNode }) {
  return (
    <div className="dash-row">
      <Link className="dash-row__thumb" href={`/marketplace/${listing.id}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={listingImage(listing)} alt={listing.title} loading="lazy" />
      </Link>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusPill status={listing.status} />
          <span className="badge badge-blue" style={{ fontSize: 9 }}>{listing.category}</span>
          <span className="badge badge-amber" style={{ fontSize: 9 }}>{listing.condition}</span>
        </div>
        <h4 className="dash-row__title">
          <Link href={`/marketplace/${listing.id}`}>{listing.title}</Link>
        </h4>
        <div className="dash-row__meta">
          <span>{listing.id}</span>
          <span><span className="icon" style={{ fontSize: 13 }}>visibility</span>{listing.views}</span>
          <span>{formatDate(listing.createdAt)}</span>
        </div>
      </div>

      <div className="dash-row__aside">
        <span className="dash-row__price">{money(listing.price)}</span>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sign in / register
// ---------------------------------------------------------------------------

function SellerAuthCard({ onSignedIn }: { onSignedIn: (c: SellerCredentials, s: Seller) => void }) {
  const { toast } = useStore();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [form, setForm] = useState({ phone: '', pin: '', name: '', email: '', city: 'Delhi' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof typeof form, value: string) => {
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
      const payload =
        mode === 'register'
          ? { phone: form.phone, pin: form.pin, name: form.name, email: form.email || undefined, city: form.city }
          : { phone: form.phone, pin: form.pin };

      const { seller } = await api.sellerAuth(payload);
      onSignedIn({ phone: form.phone, pin: form.pin }, seller);
      toast(mode === 'register' ? 'Seller account created!' : `Welcome back, ${seller.name}`, 'success');
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

  const BENEFITS = [
    { icon: 'payments', title: 'Keep 100% of the sale', body: 'No commission. The buyer pays you directly.' },
    { icon: 'groups', title: 'Reach local buyers', body: 'Shown to everyone browsing across Delhi NCR.' },
    { icon: 'shield_with_heart', title: 'Your number stays private', body: 'Shared only when you accept a request.' },
  ];

  return (
    <section className="section">
      <div className="container">
        <div className="auth-split">
          <form className="dash-panel" onSubmit={submit} noValidate>
            <div className="dash-panel__head">
              <div>
                <h2 className="dash-panel__title">
                  <span className="icon">{mode === 'signin' ? 'login' : 'person_add'}</span>
                  {mode === 'signin' ? 'Sign in to your seller account' : 'Create your seller account'}
                </h2>
                <p className="dash-panel__sub">
                  Your mobile number and a PIN — no email verification, no password to forget.
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
                {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account & Start Selling'}
              </button>

              <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 13, color: 'var(--on-surface-variant)' }}>
                {mode === 'signin' ? "Don't have an account yet? " : 'Already listed with us? '}
                <button
                  type="button"
                  className="text-link"
                  style={{ background: 'none', border: 0, cursor: 'pointer' }}
                  onClick={() => {
                    setMode(mode === 'signin' ? 'register' : 'signin');
                    setErrors({});
                  }}
                >
                  {mode === 'signin' ? 'Create one' : 'Sign in instead'}
                </button>
              </p>
            </div>
          </form>

          <aside className="auth-aside">
            <span className="eyebrow green">Why sell here</span>
            <h2 style={{ fontSize: '1.4rem', letterSpacing: '-0.03em', margin: '0.35rem 0 1.25rem' }}>
              List it yourself, keep the full price
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
              <strong style={{ color: 'var(--navy)' }}>Want a guaranteed price instead?</strong> Our{' '}
              <Link className="text-link" href="/sell">instant buy-back</Link> pays you on the spot with
              free doorstep pickup — no listing, no waiting for a buyer.
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// My listings
// ---------------------------------------------------------------------------

function MyListings({
  listings,
  creds,
  onChanged,
  onCreate,
}: {
  listings: Listing[];
  creds: SellerCredentials;
  onChanged: () => void;
  onCreate: () => void;
}) {
  const { toast } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'sold'>('all');

  const setStatus = async (id: string, status: string) => {
    setBusy(id);
    try {
      await api.setListingStatus(id, { ...creds, status });
      toast(`Listing marked ${status}.`, 'success');
      onChanged();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not update that listing.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const visible = listings.filter((l) =>
    filter === 'all' ? true : filter === 'active' ? l.status === 'active' || l.status === 'reserved' : l.status === 'sold',
  );

  if (!listings.length) {
    return (
      <DashPanel title="My listings" icon="inventory_2">
        <DashEmpty
          icon="inventory_2"
          title="You have not listed anything yet"
          body="List a laptop, screen, hard disk or any spare part and buyers across Delhi NCR can find it."
          action={
            <button className="btn btn-primary" onClick={onCreate}>
              <span className="icon">add_circle</span> List Your First Item
            </button>
          }
        />
      </DashPanel>
    );
  }

  return (
    <DashPanel
      title="My listings"
      icon="inventory_2"
      sub={`${visible.length} of ${listings.length} shown`}
      action={
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['all', 'active', 'sold'] as const).map((f) => (
            <button
              key={f}
              className={`btn btn-small ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'On sale' : 'Sold'}
            </button>
          ))}
          <button className="btn btn-primary btn-small" onClick={onCreate}>
            <span className="icon" style={{ fontSize: 16 }}>add</span> New
          </button>
        </div>
      }
      flush
    >
      {visible.length ? (
        visible.map((l) => (
          <ListingRow key={l.id} listing={l}>
            <div className="dash-row__actions">
              {l.status !== 'sold' && (
                <button className="btn btn-secondary btn-small" disabled={busy === l.id} onClick={() => setStatus(l.id, 'sold')}>
                  Mark Sold
                </button>
              )}
              {l.status === 'active' ? (
                <button className="btn btn-secondary btn-small" disabled={busy === l.id} onClick={() => setStatus(l.id, 'withdrawn')}>
                  Withdraw
                </button>
              ) : (
                <button className="btn btn-primary btn-small" disabled={busy === l.id} onClick={() => setStatus(l.id, 'active')}>
                  Relist
                </button>
              )}
            </div>
          </ListingRow>
        ))
      ) : (
        <DashEmpty icon="filter_alt_off" title="Nothing in this filter" body="Switch back to “All” to see your other listings." />
      )}
    </DashPanel>
  );
}

// ---------------------------------------------------------------------------
// Buyer requests
// ---------------------------------------------------------------------------

function BuyerRequests({
  orders,
  timeline,
  creds,
  onChanged,
}: {
  orders: ListingOrder[];
  timeline: string[];
  creds: SellerCredentials;
  onChanged: () => void;
}) {
  const { toast } = useStore();
  const [busy, setBusy] = useState<string | null>(null);

  const advance = async (id: string, status: number) => {
    setBusy(id);
    try {
      const res = await api.setListingOrderStatus(id, { ...creds, status });
      toast(`Request moved to "${res.statusLabel}".`, 'success');
      onChanged();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not update that request.', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!orders.length) {
    return (
      <DashPanel title="Buyer requests" icon="forum">
        <DashEmpty
          icon="forum"
          title="No buyer requests yet"
          body="When somebody wants to buy one of your items, their request and contact details appear here."
        />
      </DashPanel>
    );
  }

  return (
    <DashPanel title="Buyer requests" icon="forum" sub={`${orders.length} total`} flush>
      {orders.map((o) => {
        const under = o.offerPrice !== null && o.offerPrice < o.listingPrice;
        return (
          <div className="dash-request" key={o.id}>
            <div className="dash-request__top">
              <div className="dash-request__buyer">
                <div className="dash-request__avatar">{initials(o.buyerName)}</div>
                <div>
                  <div className="dash-request__name">{o.buyerName}</div>
                  <div className="dash-request__contact">
                    <a className="text-link" href={`tel:+91${o.buyerPhone}`}>+91 {o.buyerPhone}</a>
                    {o.buyerEmail && <span>{o.buyerEmail}</span>}
                    {o.buyerCity && <span>{o.buyerCity}</span>}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="dash-pill dash-pill--reserved">{o.statusLabel}</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)', marginTop: '0.35rem' }}>
                  {o.id} · {formatDate(o.createdAt)}
                </div>
              </div>
            </div>

            <DealSteps timeline={timeline} status={o.status} />

            <div className="dash-request__item">
              <span className="dash-request__item-name">
                <span className="icon" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4, color: 'var(--primary)' }}>
                  inventory_2
                </span>
                {o.listingTitle}
              </span>
              <span className="dash-offer">
                {o.offerPrice !== null ? (
                  <>
                    <span className="dash-offer__ask">{money(o.listingPrice)}</span>
                    <span className={`dash-offer__value ${under ? 'dash-offer__value--under' : 'dash-offer__value--full'}`}>
                      {money(o.offerPrice)}
                    </span>
                  </>
                ) : (
                  <span className="dash-offer__value dash-offer__value--full">
                    {money(o.listingPrice)} <span style={{ fontSize: 12, fontWeight: 400 }}>asking price</span>
                  </span>
                )}
              </span>
            </div>

            {o.message && <p className="dash-request__message">“{o.message}”</p>}

            <div className="dash-request__actions">
              {o.status < 2 && (
                <button className="btn btn-green btn-small" disabled={busy === o.id} onClick={() => advance(o.id, 2)}>
                  <span className="icon" style={{ fontSize: 16 }}>handshake</span> Accept &amp; Share My Contact
                </button>
              )}
              {o.status >= 2 && o.status < timeline.length - 1 && (
                <button className="btn btn-primary btn-small" disabled={busy === o.id} onClick={() => advance(o.id, o.status + 1)}>
                  <span className="icon" style={{ fontSize: 16 }}>arrow_forward</span>
                  Move to “{timeline[o.status + 1]}”
                </button>
              )}
              <a className="btn btn-secondary btn-small" href={`tel:+91${o.buyerPhone}`}>
                <span className="icon" style={{ fontSize: 16 }}>call</span> Call Buyer
              </a>
              <Link className="btn btn-secondary btn-small" href={`/marketplace/${o.listingId}`}>
                <span className="icon" style={{ fontSize: 16 }}>visibility</span> View Listing
              </Link>
            </div>

            {o.status < 2 && (
              <small className="dash-request__hint">
                <span className="icon" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 3 }}>lock</span>
                Your phone number is shared with the buyer only once you accept.
              </small>
            )}
          </div>
        );
      })}
    </DashPanel>
  );
}

// ---------------------------------------------------------------------------
// New listing
// ---------------------------------------------------------------------------

function NewListingForm({
  creds,
  defaultCity,
  onCreated,
}: {
  creds: SellerCredentials;
  defaultCity: string;
  onCreated: () => void;
}) {
  const { toast } = useStore();
  const [form, setForm] = useState({ ...EMPTY_LISTING, city: defaultCity });
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; title: string } | null>(null);

  const meta = categoryMeta(form.category);

  const update = (field: keyof typeof EMPTY_LISTING, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => {
      if (!e[field as string]) return e;
      const next = { ...e };
      delete next[field as string];
      return next;
    });
  };

  const changeCategory = (category: string) => {
    setForm((f) => ({ ...f, category }));
    setSpecs({});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      const cleanSpecs = Object.fromEntries(Object.entries(specs).filter(([, v]) => v && v.trim()));

      const result = await api.createListing({
        ...creds,
        title: form.title,
        category: form.category,
        brand: form.brand,
        model: form.model,
        description: form.description,
        condition: form.condition,
        price: Number(form.price),
        negotiable: form.negotiable,
        specs: cleanSpecs,
        images: form.imageUrl.trim() ? [form.imageUrl.trim()] : [],
        city: form.city,
        pincode: form.pincode,
      });

      setCreated({ id: result.id, title: result.title });
      toast('Your listing is live!', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        toast(Object.keys(err.fieldErrors).length ? 'Please correct the highlighted fields' : err.message, 'error');
      } else {
        toast('Could not publish your listing. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <DashPanel title="Listing published" icon="check_circle">
        <DashEmpty
          icon="check_circle"
          title={`${created.title} is live`}
          body="Buyers can find it in the marketplace now. Requests will appear under Buyer Requests."
          action={
            <>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--tertiary)', marginBottom: '1.25rem' }}>
                {created.id}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link className="btn btn-primary" href={`/marketplace/${created.id}`}>
                  <span className="icon">visibility</span> View Public Listing
                </Link>
                <button className="btn btn-secondary" onClick={onCreated}>
                  <span className="icon">inventory_2</span> My Listings
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setCreated(null);
                    setForm({ ...EMPTY_LISTING, city: defaultCity });
                    setSpecs({});
                  }}
                >
                  <span className="icon">add_circle</span> List Another
                </button>
              </div>
            </>
          }
        />
      </DashPanel>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <DashPanel title="List an item" icon="add_circle" sub="Be honest about faults — accurate listings sell fastest.">
        <div className="dash-section-label">What are you selling</div>
        <div className="dash-category-grid">
          {CATEGORIES.map((c) => (
            <label className={`dash-category${form.category === c ? ' is-selected' : ''}`} key={c}>
              <input type="radio" name="listingCategory" checked={form.category === c} onChange={() => changeCategory(c)} />
              <span className="icon">{categoryMeta(c).icon}</span>
              <strong>{c}</strong>
            </label>
          ))}
        </div>

        <div className="dash-section-label">The basics</div>
        <div className="form-grid">
          <ListingField label="Listing Title *" error={errors.title} full>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Dell XPS 13 9310 (Core i7, 16GB) — excellent condition"
            />
          </ListingField>

          <ListingField label="Brand *" error={errors.brand}>
            <input type="text" value={form.brand} onChange={(e) => update('brand', e.target.value)} placeholder="e.g. Dell" />
          </ListingField>

          <ListingField label="Model / Series" error={errors.model}>
            <input type="text" value={form.model} onChange={(e) => update('model', e.target.value)} placeholder="e.g. XPS 13 9310" />
          </ListingField>

          <ListingField label="Condition *" error={errors.condition}>
            <select value={form.condition} onChange={(e) => update('condition', e.target.value)}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </ListingField>

          <ListingField label="Asking Price (₹) *" error={errors.price}>
            <input type="number" value={form.price} onChange={(e) => update('price', e.target.value)} placeholder="52000" min={100} />
          </ListingField>

          <ListingField label="Your City *" error={errors.city}>
            <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} />
          </ListingField>

          <ListingField label="Pincode *" error={errors.pincode}>
            <input
              type="text"
              value={form.pincode}
              onChange={(e) => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="110016"
            />
          </ListingField>

          <ListingField label="Description *" error={errors.description} full>
            <textarea
              rows={5}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="How long you have owned it, why you are selling, any scratches or faults, what is included in the box."
            />
          </ListingField>

          <ListingField label="Photo URL (optional)" error={errors.images} full>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => update('imageUrl', e.target.value)}
              placeholder="https://… — leave blank to use a stock image for this category"
            />
          </ListingField>
        </div>

        <div className="dash-section-label">{form.category} specifications</div>
        <div className="form-grid">
          {meta.fields.map((field) => (
            <label className="field" key={field.label}>
              <span>{field.label}</span>
              {field.options ? (
                <select value={specs[field.label] ?? ''} onChange={(e) => setSpecs((s) => ({ ...s, [field.label]: e.target.value }))}>
                  <option value="">Not specified</option>
                  {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={specs[field.label] ?? ''}
                  onChange={(e) => setSpecs((s) => ({ ...s, [field.label]: e.target.value }))}
                  placeholder={field.placeholder}
                />
              )}
            </label>
          ))}
        </div>

        <label className="check-label" style={{ marginTop: '1.5rem' }}>
          <input type="checkbox" checked={form.negotiable} onChange={(e) => update('negotiable', e.target.checked)} />
          Price is negotiable — let buyers make an offer
        </label>

        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting} style={{ marginTop: '1.5rem' }}>
          <span className="icon">publish</span> {submitting ? 'Publishing…' : 'Publish Listing'}
        </button>
      </DashPanel>
    </form>
  );
}

function ListingField({
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
