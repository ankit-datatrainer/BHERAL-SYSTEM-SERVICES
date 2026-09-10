'use client';

/**
 * Super-admin console.
 *
 * Every call carries the username and password, and every one of them is
 * re-verified inside Postgres — there is no client-side "am I an admin?"
 * check that could be bypassed by editing sessionStorage.
 */
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatDate, money } from '@/lib/format';
import { clearAdminSession, readAdminSession, writeAdminSession } from '@/lib/marketplace';
import type { AdminCredentials, AdminOverview, AdminRequestKind } from '@/lib/types';
import { useStore } from '../StoreProvider';
import { Reveal } from '../Reveal';
import { DashEmpty, DashPanel, DashStat } from '../marketplace/DashboardUI';

type Tab = 'overview' | 'listings' | 'deals' | 'orders' | 'requests' | 'people' | 'messages';

const NAV: Array<{ id: Tab; icon: string; label: string }> = [
  { id: 'overview', icon: 'dashboard', label: 'Overview' },
  { id: 'listings', icon: 'inventory_2', label: 'Listings' },
  { id: 'deals', icon: 'handshake', label: 'Marketplace Deals' },
  { id: 'orders', icon: 'receipt_long', label: 'Store Orders' },
  { id: 'requests', icon: 'build', label: 'Sell & Repair' },
  { id: 'people', icon: 'group', label: 'Sellers & Buyers' },
  { id: 'messages', icon: 'mail', label: 'Enquiries' },
];

export function AdminConsole() {
  const { toast } = useStore();
  const [creds, setCreds] = useState<AdminCredentials | null>(null);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    setCreds(readAdminSession());
    setReady(true);
  }, []);

  const load = useCallback(
    async (c: AdminCredentials) => {
      setLoading(true);
      try {
        setData(await api.adminOverview(c));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearAdminSession();
          setCreds(null);
          toast('Your session expired. Please sign in again.', 'error');
        } else {
          toast('Could not load the console. Please try again.', 'error');
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

  if (!ready) {
    return <div className="aw-skeleton" style={{ minHeight: 420, margin: '3rem auto', maxWidth: 1100 }} />;
  }

  if (!creds) {
    return (
      <AdminLogin
        onSignedIn={(c, name) => {
          writeAdminSession(c);
          setCreds(c);
          toast(`Signed in as ${name}`, 'success');
        }}
      />
    );
  }

  const refresh = () => void load(creds);

  const signOut = () => {
    clearAdminSession();
    setCreds(null);
    setData(null);
    setTab('overview');
    toast('Signed out.', 'info');
  };

  const stats = data?.stats;

  return (
    <section className="section">
      <div className="container">
        <div className="dash">
          <aside className="dash__side">
            <div className="dash-id">
              <div className="dash-id__avatar">
                <span className="icon" style={{ fontSize: 24 }}>admin_panel_settings</span>
              </div>
              <div className="dash-id__name">Super Admin</div>
              <span className="dash-id__meta">{creds.username}</span>
              <span className="dash-id__meta">Full control</span>
              <div className="dash-id__actions">
                <button className="btn btn-secondary btn-small" onClick={refresh} disabled={loading}>
                  <span className="icon" style={{ fontSize: 16 }}>refresh</span>
                  {loading ? 'Loading…' : 'Refresh'}
                </button>
                <button className="btn btn-secondary btn-small" onClick={signOut}>
                  <span className="icon" style={{ fontSize: 16 }}>logout</span> Sign out
                </button>
              </div>
            </div>

            <nav className="dash-nav" aria-label="Admin sections">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  className={`dash-nav__item${tab === item.id ? ' is-active' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  <span className="icon">{item.icon}</span> {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="dash__main">
            <div className="dash-stats">
              <DashStat icon="inventory_2" value={String(stats?.liveListings ?? 0)} label="Live listings" />
              <DashStat icon="handshake" tone="amber" value={String(stats?.deals ?? 0)} label="Marketplace deals" />
              <DashStat icon="receipt_long" tone="green" value={String(stats?.shopOrders ?? 0)} label="Store orders" />
              <DashStat icon="payments" tone="navy" value={money(stats?.gmv ?? 0)} label="Gross value" />
            </div>

            {loading && !data ? (
              <div className="aw-skeleton" style={{ minHeight: 340 }} />
            ) : data ? (
              <AdminTabs tab={tab} data={data} creds={creds} onChanged={refresh} setTab={setTab} />
            ) : (
              <DashPanel title="Nothing loaded" icon="error">
                <DashEmpty icon="cloud_off" title="Could not reach the API" body="Check the backend is running, then refresh." />
              </DashPanel>
            )}
          </div>
        </div>

        <Reveal deps={[tab, loading, data?.stats.listings]} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function AdminTabs({
  tab,
  data,
  creds,
  onChanged,
  setTab,
}: {
  tab: Tab;
  data: AdminOverview;
  creds: AdminCredentials;
  onChanged: () => void;
  setTab: (t: Tab) => void;
}) {
  const { toast } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  /** Runs an admin mutation, reporting the outcome and reloading on success. */
  const run = async (key: string, fn: () => Promise<unknown>, okMessage: string) => {
    setBusy(key);
    try {
      await fn();
      toast(okMessage, 'success');
      onChanged();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'That change did not go through.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const filter = <T,>(rows: T[], fields: (row: T) => Array<string | number | null | undefined>) => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      fields(row).some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  };


  if (tab === 'overview') {
    return <AdminOverviewTab data={data} setTab={setTab} />;
  }

  if (tab === 'listings') {
    const rows = filter(data.listings, (l) => [l.id, l.title, l.brand, l.category, l.sellerName, l.sellerPhone, l.city]);
    return (
      <DashPanel
        title="Seller listings"
        icon="inventory_2"
        sub={`${data.listings.length} listing${data.listings.length === 1 ? '' : 's'} across ${data.stats.sellers} seller${data.stats.sellers === 1 ? '' : 's'}`}
      >
        <SearchBar value={query} onChange={setQuery} placeholder="Search by title, seller, brand or city…" />
        {rows.length ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Seller</th>
                  <th>Price</th>
                  <th>Views</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Link className="dash-table__title" href={`/marketplace/${l.id}`}>{l.title}</Link>
                      <span className="dash-table__sub">{l.id} · {l.category} · {l.condition}</span>
                    </td>
                    <td>
                      <span className="dash-table__title" style={{ maxWidth: 160 }}>{l.sellerName}</span>
                      <span className="dash-table__sub">{l.sellerPhone}{l.city ? ` · ${l.city}` : ''}</span>
                    </td>
                    <td className="mono">{money(l.price)}</td>
                    <td className="mono">{l.views}</td>
                    <td>
                      <select
                        className="dash-select"
                        value={l.status}
                        disabled={busy === l.id}
                        onChange={(e) =>
                          run(l.id, () => api.adminSetListingStatus(l.id, { ...creds, status: e.target.value }), 'Listing updated.')
                        }
                      >
                        <option value="active">Available</option>
                        <option value="reserved">Reserved</option>
                        <option value="sold">Sold</option>
                        <option value="removed">Removed</option>
                      </select>
                    </td>
                    <td>
                      <div className="dash-table__actions">
                        <Link className="btn btn-secondary btn-small" href={`/marketplace/${l.id}`}>View</Link>
                        <button
                          className="btn btn-secondary btn-small"
                          disabled={busy === l.id}
                          onClick={() => {
                            if (!window.confirm(`Delete "${l.title}" permanently? Its buyer requests go too.`)) return;
                            void run(l.id, () => api.adminDeleteListing(l.id, creds), 'Listing deleted.');
                          }}
                        >
                          <span className="icon" style={{ fontSize: 16 }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <DashEmpty icon="search_off" title="No listings match" body="Try a different search term, or clear the filter." />
        )}
      </DashPanel>
    );
  }

  if (tab === 'deals') {
    const rows = filter(data.deals, (d) => [d.id, d.listingTitle, d.buyerName, d.buyerPhone, d.sellerName, d.sellerPhone]);
    const timeline = data.timelines.marketplace ?? [];
    return (
      <DashPanel title="Marketplace deals" icon="handshake" sub="Buyer requests against private-seller listings">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by reference, item, buyer or seller…" />
        {rows.length ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Item</th>
                  <th>Buyer</th>
                  <th>Seller</th>
                  <th>Value</th>
                  <th>Stage</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="mono">{d.id}</span>
                      <span className="dash-table__sub">{formatDate(d.createdAt)}</span>
                    </td>
                    <td>
                      <Link className="dash-table__title" href={`/marketplace/${d.listingId}`}>{d.listingTitle}</Link>
                      <span className="dash-table__sub">{money(d.listingPrice)} asked</span>
                    </td>
                    <td>
                      <span className="dash-table__title" style={{ maxWidth: 150 }}>{d.buyerName}</span>
                      <span className="dash-table__sub">{d.buyerPhone}</span>
                    </td>
                    <td>
                      <span className="dash-table__title" style={{ maxWidth: 150 }}>{d.sellerName}</span>
                      <span className="dash-table__sub">{d.sellerPhone}</span>
                    </td>
                    <td className="mono">{money(d.offerPrice ?? d.listingPrice)}</td>
                    <td>
                      <StatusSelect
                        timeline={timeline}
                        status={d.status}
                        busy={busy === d.id}
                        onChange={(status) =>
                          run(d.id, () => api.adminSetRequestStatus('deal', d.id, { ...creds, status }), 'Deal updated.')
                        }
                      />
                    </td>
                    <td>
                      <Link className="btn btn-secondary btn-small" href={`/invoice/${d.id}?phone=${d.buyerPhone}`}>
                        <span className="icon" style={{ fontSize: 16 }}>description</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <DashEmpty icon="handshake" title="No deals yet" body="Buyer requests against seller listings show up here." />
        )}
      </DashPanel>
    );
  }

  if (tab === 'orders') {
    const rows = filter(data.orders, (o) => [o.id, o.phone, o.customer?.name, o.customer?.city]);
    const timeline = data.timelines.order ?? [];
    return (
      <DashPanel title="Store orders" icon="receipt_long" sub="Orders placed against our own certified catalogue">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by reference, name or number…" />
        {rows.length ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Stage</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <span className="mono">{o.id}</span>
                      <span className="dash-table__sub">{formatDate(o.created_at)}</span>
                    </td>
                    <td>
                      <span className="dash-table__title" style={{ maxWidth: 160 }}>{o.customer?.name ?? '—'}</span>
                      <span className="dash-table__sub">{o.phone}{o.customer?.city ? ` · ${o.customer.city}` : ''}</span>
                    </td>
                    <td>
                      <span className="dash-table__sub" style={{ maxWidth: 220, display: 'block' }}>
                        {(o.items ?? []).map((i: any) => `${i.name} × ${i.qty}`).join(', ')}
                      </span>
                    </td>
                    <td className="mono">{money(Number(o.total))}</td>
                    <td>
                      <StatusSelect
                        timeline={timeline}
                        status={o.status}
                        busy={busy === o.id}
                        onChange={(status) =>
                          run(o.id, () => api.adminSetRequestStatus('order', o.id, { ...creds, status }), 'Order updated.')
                        }
                      />
                    </td>
                    <td>
                      <Link className="btn btn-secondary btn-small" href={`/invoice/${o.id}?phone=${o.phone}`}>
                        <span className="icon" style={{ fontSize: 16 }}>description</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <DashEmpty icon="receipt_long" title="No store orders yet" body="Checkout orders from the catalogue appear here." />
        )}
      </DashPanel>
    );
  }

  if (tab === 'requests') {
    return (
      <>
        <RequestTable
          title="Buy-back valuations"
          icon="sell"
          kind="sell"
          rows={data.sellRequests}
          timeline={data.timelines.sell ?? []}
          creds={creds}
          busy={busy}
          run={run}
        />
        <RequestTable
          title="Repair bookings"
          icon="build"
          kind="repair"
          rows={data.repairRequests}
          timeline={data.timelines.repair ?? []}
          creds={creds}
          busy={busy}
          run={run}
        />
      </>
    );
  }

  if (tab === 'people') {
    return (
      <>
        <DashPanel title="Sellers" icon="storefront" sub={`${data.sellers.length} registered`}>
          {data.sellers.length ? (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr><th>Name</th><th>Phone</th><th>City</th><th>Listings</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {data.sellers.map((s) => (
                    <tr key={s.phone}>
                      <td>
                        <span className="dash-table__title">{s.name}</span>
                        {s.email && <span className="dash-table__sub">{s.email}</span>}
                      </td>
                      <td className="mono">{s.phone}</td>
                      <td>{s.city ?? '—'}</td>
                      <td className="mono">{s.listings}</td>
                      <td className="dash-table__sub">{formatDate(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <DashEmpty icon="storefront" title="No sellers yet" body="Sellers appear here as soon as they register." />
          )}
        </DashPanel>

        <DashPanel title="Buyers" icon="group" sub={`${data.buyers.length} with an account`}>
          {data.buyers.length ? (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr><th>Name</th><th>Phone</th><th>City</th><th>Deals</th><th>Orders</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {data.buyers.map((b) => (
                    <tr key={b.phone}>
                      <td>
                        <span className="dash-table__title">{b.name}</span>
                        {b.email && <span className="dash-table__sub">{b.email}</span>}
                      </td>
                      <td className="mono">{b.phone}</td>
                      <td>{b.city ?? '—'}</td>
                      <td className="mono">{b.deals}</td>
                      <td className="mono">{b.orders}</td>
                      <td className="dash-table__sub">{formatDate(b.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <DashEmpty icon="group" title="No buyer accounts yet" body="Buyers who register get listed here." />
          )}
        </DashPanel>
      </>
    );
  }

  return (
    <DashPanel title="Enquiries" icon="mail" sub={`${data.messages.length} message${data.messages.length === 1 ? '' : 's'}`}>
      {data.messages.length ? (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr><th>From</th><th>Subject</th><th>Message</th><th>Received</th></tr>
            </thead>
            <tbody>
              {data.messages.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="dash-table__title">{m.name}</span>
                    <span className="dash-table__sub">{m.phone ?? m.email ?? '—'}</span>
                  </td>
                  <td>
                    <span className="dash-table__title">{m.subject ?? '—'}</span>
                    <span className="dash-table__sub">{m.enquiry_type}</span>
                  </td>
                  <td><span className="dash-table__sub" style={{ maxWidth: 320, display: 'block' }}>{m.message}</span></td>
                  <td className="dash-table__sub">{formatDate(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <DashEmpty icon="mail" title="No enquiries yet" body="Contact-form messages land here." />
      )}
    </DashPanel>
  );
}

/**
 * Declared at module scope on purpose: a component defined inside AdminTabs is
 * a new type on every render, so React would unmount the input and the field
 * would lose focus after each keystroke.
 */
function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="dash-toolbar">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button className="btn btn-secondary btn-small" type="button" onClick={() => onChange('')}>
          <span className="icon" style={{ fontSize: 16 }}>close</span> Clear
        </button>
      )}
    </div>
  );
}

function AdminOverviewTab({ data, setTab }: { data: AdminOverview; setTab: (t: Tab) => void }) {
  const s = data.stats;
  const pendingDeals = useMemo(() => data.deals.filter((d) => d.status < 2).length, [data.deals]);

  const TILES: Array<{ tab: Tab; icon: string; value: number; label: string }> = [
    { tab: 'listings', icon: 'inventory_2', value: s.listings, label: 'Total listings' },
    { tab: 'deals', icon: 'pending_actions', value: pendingDeals, label: 'Deals awaiting seller' },
    { tab: 'orders', icon: 'receipt_long', value: s.shopOrders, label: 'Store orders' },
    { tab: 'requests', icon: 'sell', value: s.sellRequests, label: 'Buy-back requests' },
    { tab: 'requests', icon: 'build', value: s.repairRequests, label: 'Repair bookings' },
    { tab: 'people', icon: 'storefront', value: s.sellers, label: 'Sellers' },
    { tab: 'people', icon: 'group', value: s.buyers, label: 'Buyers' },
    { tab: 'messages', icon: 'mail', value: s.messages, label: 'Enquiries' },
  ];

  return (
    <>
      <DashPanel title="At a glance" icon="query_stats" sub="Click any figure to jump to its list">
        <div className="dash-category-grid">
          {TILES.map((t) => (
            <button className="dash-tile" key={t.label} onClick={() => setTab(t.tab)}>
              <span className="icon">{t.icon}</span>
              <strong>{t.value}</strong>
              <small>{t.label}</small>
            </button>
          ))}
        </div>
      </DashPanel>

      <DashPanel title="Latest deals" icon="bolt" sub="Newest buyer requests across the marketplace">
        {data.deals.length ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr><th>Reference</th><th>Item</th><th>Buyer</th><th>Value</th><th>Stage</th></tr>
              </thead>
              <tbody>
                {data.deals.slice(0, 6).map((d) => (
                  <tr key={d.id}>
                    <td className="mono">{d.id}</td>
                    <td><span className="dash-table__title">{d.listingTitle}</span></td>
                    <td>
                      <span className="dash-table__title" style={{ maxWidth: 140 }}>{d.buyerName}</span>
                      <span className="dash-table__sub">{d.buyerPhone}</span>
                    </td>
                    <td className="mono">{money(d.offerPrice ?? d.listingPrice)}</td>
                    <td><span className="dash-pill dash-pill--reserved">{d.statusLabel}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <DashEmpty icon="handshake" title="No deals yet" body="As soon as a buyer requests a listing it shows up here." />
        )}
      </DashPanel>
    </>
  );
}

function RequestTable({
  title,
  icon,
  kind,
  rows,
  timeline,
  creds,
  busy,
  run,
}: {
  title: string;
  icon: string;
  kind: AdminRequestKind;
  rows: Array<Record<string, any>>;
  timeline: string[];
  creds: AdminCredentials;
  busy: string | null;
  run: (key: string, fn: () => Promise<unknown>, ok: string) => Promise<void>;
}) {
  return (
    <DashPanel title={title} icon={icon} sub={`${rows.length} request${rows.length === 1 ? '' : 's'}`}>
      {rows.length ? (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr><th>Reference</th><th>Customer</th><th>Details</th><th>Stage</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const payload = (r.device ?? r.details ?? {}) as Record<string, unknown>;
                const summary = [payload.brand, payload.model, payload.deviceType, payload.issue]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <tr key={r.id}>
                    <td>
                      <span className="mono">{r.id}</span>
                      <span className="dash-table__sub">{formatDate(r.created_at)}</span>
                    </td>
                    <td>
                      <span className="dash-table__title" style={{ maxWidth: 150 }}>{r.customer?.name ?? '—'}</span>
                      <span className="dash-table__sub">{r.phone}</span>
                    </td>
                    <td>
                      <span className="dash-table__sub" style={{ maxWidth: 260, display: 'block' }}>
                        {summary || '—'}
                        {r.estimate ? ` · est. ${money(Number(r.estimate))}` : ''}
                      </span>
                    </td>
                    <td>
                      <StatusSelect
                        timeline={timeline}
                        status={r.status}
                        busy={busy === r.id}
                        onChange={(status) =>
                          run(r.id, () => api.adminSetRequestStatus(kind, r.id, { ...creds, status }), 'Request updated.')
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <DashEmpty icon={icon} title={`No ${title.toLowerCase()} yet`} body="New submissions land here automatically." />
      )}
    </DashPanel>
  );
}

function StatusSelect({
  timeline,
  status,
  busy,
  onChange,
}: {
  timeline: string[];
  status: number;
  busy: boolean;
  onChange: (status: number) => void;
}) {
  return (
    <select
      className="dash-select"
      value={status}
      disabled={busy || !timeline.length}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Change stage"
    >
      {timeline.map((label, i) => (
        <option value={i} key={label}>{`${i + 1}. ${label}`}</option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

function AdminLogin({ onSignedIn }: { onSignedIn: (creds: AdminCredentials, name: string) => void }) {
  const { toast } = useStore();
  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      const { admin } = await api.adminAuth(form);
      onSignedIn(form, admin.name);
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
                  <span className="icon">admin_panel_settings</span> Staff sign in
                </h2>
                <p className="dash-panel__sub">This console is for Bheral staff only.</p>
              </div>
            </div>

            <div className="dash-panel__body">
              <div className="form-grid">
                <label className="field full">
                  <span>Username *</span>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.trim() }))}
                    autoComplete="username"
                    autoCapitalize="none"
                    placeholder="superadmin"
                  />
                  {errors.username && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{errors.username}</small>}
                </label>

                <label className="field full">
                  <span>Password *</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                  {errors.password && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{errors.password}</small>}
                </label>
              </div>

              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting} style={{ marginTop: '1.5rem' }}>
                <span className="icon">login</span> {submitting ? 'Checking…' : 'Sign In'}
              </button>
            </div>
          </form>

          <aside className="auth-aside">
            <span className="eyebrow green">Admin console</span>
            <h2 style={{ fontSize: '1.4rem', letterSpacing: '-0.03em', margin: '0.35rem 0 1.25rem' }}>
              Run the whole business from here
            </h2>

            {[
              { icon: 'inventory_2', title: 'Moderate listings', body: 'Change status or remove anything a seller posts.' },
              { icon: 'timeline', title: 'Move any request forward', body: 'Deals, orders, buy-backs and repairs.' },
              { icon: 'description', title: 'Open any invoice', body: 'For every confirmed order on the platform.' },
            ].map((b) => (
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
              <strong style={{ color: 'var(--navy)' }}>Not staff?</strong> Sellers sign in on the{' '}
              <Link className="text-link" href="/marketplace/sell">seller portal</Link>, buyers on{' '}
              <Link className="text-link" href="/account">their account</Link>.
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
