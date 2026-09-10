'use client';

/**
 * Buyer portal — browse everything private sellers have listed.
 *
 * Filter state lives in the URL so a filtered view is shareable, matching how
 * the main catalogue behaves.
 */
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { categoryMeta } from '@/lib/marketplace';
import type { ListingListResponse } from '@/lib/types';
import { Reveal } from '../Reveal';
import { ListingCard } from './ListingCard';

const SORTS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'low', label: 'Price: Low to High' },
  { value: 'high', label: 'Price: High to Low' },
];

export function MarketplaceBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<ListingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [term, setTerm] = useState(searchParams.get('q') ?? '');

  const category = searchParams.get('category') ?? '';
  const condition = searchParams.get('condition') ?? '';
  const city = searchParams.get('city') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const sort = searchParams.get('sort') ?? 'newest';
  const page = Number(searchParams.get('page') ?? 1);
  const query = searchParams.get('q') ?? '';

  const setParam = useCallback(
    (updates: Record<string, string | null>, keepPage = false) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      if (!keepPage) next.delete('page');
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const apiParams = useMemo(
    () => ({ q: query, category, condition, city, maxPrice, sort, page, pageSize: 12 }),
    [query, category, condition, city, maxPrice, sort, page],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .listings(apiParams)
      .then((res) => !cancelled && setData(res))
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [apiParams]);

  // Keep the search box in step when the URL changes (back button, chip clear).
  useEffect(() => setTerm(query), [query]);

  const facets = data?.facets;
  const clearAll = () => router.push(pathname, { scroll: false });
  const activeCount = [category, condition, city, maxPrice, query].filter(Boolean).length;

  return (
    <div className="catalog-layout">
      <button
        type="button"
        className="btn btn-secondary filter-toggle"
        aria-expanded={filtersOpen}
        aria-controls="marketplace-filters"
        onClick={() => setFiltersOpen((o) => !o)}
      >
        <span className="icon">tune</span>
        {filtersOpen ? 'Hide Filters' : 'Show Filters'}
        {activeCount > 0 && <span className="badge badge-blue">{activeCount}</span>}
      </button>

      <aside className={`filter-sidebar${filtersOpen ? ' is-open' : ''}`} id="marketplace-filters">
        <div className="filter-head">
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Filters</h2>
          <button
            className="text-link"
            onClick={clearAll}
            style={{ background: 'none', border: 0, cursor: 'pointer' }}
          >
            Clear All
          </button>
        </div>

        <div className="filter-group">
          <h3>Search</h3>
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setParam({ q: term })}
            onBlur={() => term !== query && setParam({ q: term })}
            placeholder="ThinkPad, 1TB, RTX…"
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: 'var(--radius-DEFAULT)',
              border: '1px solid var(--border)',
              outline: 'none',
            }}
          />
        </div>

        {!!facets?.priceRange.max && (
          <div className="filter-group">
            <h3>Maximum Price</h3>
            <div className="range-wrap">
              <input
                type="range"
                min={facets.priceRange.min}
                max={facets.priceRange.max}
                step={500}
                value={maxPrice || facets.priceRange.max}
                onChange={(e) => setParam({ maxPrice: e.target.value })}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--on-surface-variant)' }}>
                <span>{money(facets.priceRange.min)}</span>
                <span>Up to {money(Number(maxPrice) || facets.priceRange.max)}</span>
              </div>
            </div>
          </div>
        )}

        <RadioGroup
          title="Category"
          options={facets?.categories ?? []}
          value={category}
          onChange={(v) => setParam({ category: v })}
        />
        <RadioGroup
          title="Condition"
          options={facets?.conditions ?? []}
          value={condition}
          onChange={(v) => setParam({ condition: v })}
        />
        <RadioGroup
          title="City"
          options={facets?.cities ?? []}
          value={city}
          onChange={(v) => setParam({ city: v })}
        />
      </aside>

      <div>
        <div className="catalog-toolbar">
          <strong>
            {loading ? 'Loading…' : `${data?.total ?? 0} listing${data?.total === 1 ? '' : 's'} from private sellers`}
          </strong>
          <div className="catalog-sort">
            <label htmlFor="mkt-sort" style={{ fontSize: 13, marginRight: '0.5rem' }}>Sort By:</label>
            <select id="mkt-sort" value={sort} onChange={(e) => setParam({ sort: e.target.value })}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {activeCount > 0 && (
          <div className="active-filter-chips">
            {query && (
              <button className="filter-chip" onClick={() => setParam({ q: null })}>
                Search: {query} <span className="icon" style={{ fontSize: 14 }}>close</span>
              </button>
            )}
            {[
              ['category', category],
              ['condition', condition],
              ['city', city],
            ]
              .filter(([, v]) => v)
              .map(([key, value]) => (
                <button className="filter-chip" key={key} onClick={() => setParam({ [key as string]: null })}>
                  {value} <span className="icon" style={{ fontSize: 14 }}>close</span>
                </button>
              ))}
            {maxPrice && (
              <button className="filter-chip" onClick={() => setParam({ maxPrice: null })}>
                Under {money(Number(maxPrice))} <span className="icon" style={{ fontSize: 14 }}>close</span>
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="cart-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <h3>Could not load the marketplace</h3>
            <p style={{ color: 'var(--on-surface-variant)' }}>{error}</p>
          </div>
        )}

        {loading && !data && (
          <div className="product-grid">
            {Array.from({ length: 6 }).map((_, i) => <div className="aw-skeleton" key={i} />)}
          </div>
        )}

        {data && !error && (
          data.items.length ? (
            <>
              <div className="product-grid">
                {data.items.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
              <Reveal deps={[data.items.map((i) => i.id).join(',')]} />

              {data.totalPages > 1 && (
                <nav
                  className="pagination"
                  style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}
                  aria-label="Pagination"
                >
                  <button className="btn btn-secondary btn-small" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) }, true)}>
                    ← Previous
                  </button>
                  {Array.from({ length: data.totalPages }).map((_, i) => (
                    <button
                      key={i}
                      className={`btn btn-small ${i + 1 === page ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setParam({ page: String(i + 1) }, true)}
                      aria-current={i + 1 === page ? 'page' : undefined}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button className="btn btn-secondary btn-small" disabled={page >= data.totalPages} onClick={() => setParam({ page: String(page + 1) }, true)}>
                    Next →
                  </button>
                </nav>
              )}
            </>
          ) : (
            <div className="cart-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <span className="icon" style={{ fontSize: 48, color: 'var(--primary)' }}>storefront</span>
              <h3 style={{ marginTop: '1rem' }}>
                {activeCount > 0 ? 'No listings match those filters' : 'No listings yet'}
              </h3>
              <p style={{ color: 'var(--on-surface-variant)', maxWidth: 440, margin: '0 auto 1.5rem' }}>
                {activeCount > 0
                  ? 'Try widening your price range or clearing a filter.'
                  : 'Be the first to list your laptop, screen, hard disk or spare part.'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {activeCount > 0 && (
                  <button className="btn btn-secondary" onClick={clearAll}>Clear All Filters</button>
                )}
                <Link className="btn btn-primary" href="/marketplace/sell">
                  <span className="icon">sell</span> List Your Item
                </Link>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/** Single-select filter group rendered as radio-style checkboxes. */
function RadioGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: string[];
  value: string;
  onChange: (v: string | null) => void;
}) {
  if (!options.length) return null;

  return (
    <div className="filter-group">
      <h3>{title}</h3>
      {options.map((opt) => (
        <label className="check-label" key={opt}>
          <input
            type="checkbox"
            checked={value === opt}
            onChange={() => onChange(value === opt ? null : opt)}
          />
          {title === 'Category' && (
            <span className="icon" style={{ fontSize: 16, marginRight: 4, color: 'var(--primary)' }}>
              {categoryMeta(opt).icon}
            </span>
          )}
          {opt}
        </label>
      ))}
    </div>
  );
}
