'use client';

/**
 * Filterable catalogue used by /buy and /parts.
 *
 * Filter state lives in the URL, so a filtered view is shareable and the
 * back button works. Every change refetches from the API — filtering,
 * sorting and pagination are all server-side.
 */
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import type { ProductListResponse } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { Reveal } from './Reveal';

/** Multi-value filters are comma-joined in the query string. */
const MULTI_KEYS = ['category', 'brand', 'storageType', 'os', 'condition', 'ram', 'storage', 'gpu'] as const;
type MultiKey = (typeof MULTI_KEYS)[number];

const SORTS: Array<{ value: string; label: string }> = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'low', label: 'Price: Low to High' },
  { value: 'high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Customer Rating' },
  { value: 'discount', label: 'Biggest Discount' },
  { value: 'newest', label: 'Newest Arrivals' },
];

interface Props {
  /** Restricts the browser to these categories (used by /parts). */
  lockedCategories?: string[];
  pageSize?: number;
}

export function CatalogBrowser({ lockedCategories, pageSize = 12 }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Below 1024px the sidebar collapses behind a toggle so the results are
  // not pushed a full screen down by ten filter groups.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const getMulti = useCallback(
    (key: MultiKey): string[] => {
      const raw = searchParams.get(key);
      return raw ? raw.split(',').filter(Boolean) : [];
    },
    [searchParams],
  );

  const query = searchParams.get('q') ?? '';
  const sort = searchParams.get('sort') ?? 'recommended';
  const page = Number(searchParams.get('page') ?? 1);
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const inStock = searchParams.get('inStock') === 'true';

  /** Rewrites the query string, always resetting to page 1 unless paging. */
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

  const toggleMulti = useCallback(
    (key: MultiKey, value: string) => {
      const current = getMulti(key);
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      setParam({ [key]: next.join(',') });
    },
    [getMulti, setParam],
  );

  // Build the API query from the URL every time it changes.
  const apiParams = useMemo(() => {
    const params: Record<string, unknown> = { sort, page, pageSize };
    if (query) params.q = query;
    if (maxPrice) params.maxPrice = maxPrice;
    if (inStock) params.inStock = true;
    for (const key of MULTI_KEYS) {
      const values = getMulti(key);
      if (values.length) params[key] = values;
    }
    // /parts pins the category list; an explicit category filter narrows within it.
    if (lockedCategories?.length && !getMulti('category').length) {
      params.category = lockedCategories;
    }
    return params;
  }, [sort, page, pageSize, query, maxPrice, inStock, getMulti, lockedCategories]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .products(apiParams)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiParams]);

  const facets = data?.facets;
  const categoryOptions = lockedCategories ?? facets?.categories ?? [];

  const activeChips = MULTI_KEYS.flatMap((key) =>
    getMulti(key).map((value) => ({ key, value })),
  );

  const clearAll = () => router.push(pathname, { scroll: false });

  const activeFilterCount = MULTI_KEYS.reduce((n, key) => n + getMulti(key).length, 0)
    + (maxPrice ? 1 : 0) + (inStock ? 1 : 0);

  return (
    <div className="catalog-layout">
      <button
        type="button"
        className="btn btn-secondary filter-toggle"
        aria-expanded={filtersOpen}
        aria-controls="catalog-filters"
        onClick={() => setFiltersOpen((o) => !o)}
      >
        <span className="icon">tune</span>
        {filtersOpen ? 'Hide Filters' : 'Show Filters'}
        {activeFilterCount > 0 && <span className="badge badge-blue">{activeFilterCount}</span>}
      </button>

      <aside className={`filter-sidebar${filtersOpen ? ' is-open' : ''}`} id="catalog-filters">
        <div className="filter-head">
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Filters</h2>
          <button className="text-link" onClick={clearAll} style={{ background: 'none', border: 0, cursor: 'pointer' }}>
            Clear All
          </button>
        </div>

        <div className="filter-group">
          <h3>Maximum Price</h3>
          <div className="range-wrap">
            <input
              type="range"
              min={facets?.priceRange.min ?? 0}
              max={facets?.priceRange.max ?? 100000}
              step={500}
              value={maxPrice || facets?.priceRange.max || 100000}
              onChange={(e) => setParam({ maxPrice: e.target.value })}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--on-surface-variant)' }}>
              <span>{money(facets?.priceRange.min ?? 0)}</span>
              <span>Up to {money(Number(maxPrice) || facets?.priceRange.max || 0)}</span>
            </div>
          </div>
        </div>

        {categoryOptions.length > 1 && (
          <FilterGroup
            title="Device Category"
            options={categoryOptions}
            selected={getMulti('category')}
            onToggle={(v) => toggleMulti('category', v)}
          />
        )}

        {!!facets?.brands.length && (
          <FilterGroup title="Brand" options={facets.brands} selected={getMulti('brand')} onToggle={(v) => toggleMulti('brand', v)} />
        )}

        {!!facets?.ram.length && (
          <FilterGroup
            title="RAM"
            options={facets.ram.map(String)}
            labels={facets.ram.map((r) => `${r} GB`)}
            selected={getMulti('ram')}
            onToggle={(v) => toggleMulti('ram', v)}
          />
        )}

        {!!facets?.storage.length && (
          <FilterGroup
            title="Storage"
            options={facets.storage.map(String)}
            labels={facets.storage.map((s) => (s >= 1000 ? `${s / 1000} TB` : `${s} GB`))}
            selected={getMulti('storage')}
            onToggle={(v) => toggleMulti('storage', v)}
          />
        )}

        {!!facets?.storageTypes.length && (
          <FilterGroup title="Storage Type" options={facets.storageTypes} selected={getMulti('storageType')} onToggle={(v) => toggleMulti('storageType', v)} />
        )}

        <FilterGroup title="Graphics" options={['Integrated', 'Dedicated']} selected={getMulti('gpu')} onToggle={(v) => toggleMulti('gpu', v)} />

        {!!facets?.operatingSystems.length && (
          <FilterGroup title="Operating System" options={facets.operatingSystems} selected={getMulti('os')} onToggle={(v) => toggleMulti('os', v)} />
        )}

        {!!facets?.conditions.length && (
          <FilterGroup title="Condition" options={facets.conditions} selected={getMulti('condition')} onToggle={(v) => toggleMulti('condition', v)} />
        )}

        <div className="filter-group">
          <h3>Availability</h3>
          <label className="check-label">
            <input type="checkbox" checked={inStock} onChange={(e) => setParam({ inStock: e.target.checked ? 'true' : null })} />
            In Stock Only
          </label>
        </div>
      </aside>

      <div>
        <div className="catalog-toolbar">
          <strong>
            {loading ? 'Loading…' : `${data?.total ?? 0} product${data?.total === 1 ? '' : 's'} available`}
          </strong>
          <div className="catalog-sort">
            <label htmlFor="sort-select" style={{ fontSize: 13, marginRight: '0.5rem' }}>Sort By:</label>
            <select id="sort-select" value={sort} onChange={(e) => setParam({ sort: e.target.value })}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {(activeChips.length > 0 || query) && (
          <div className="active-filter-chips">
            {query && (
              <button className="filter-chip" onClick={() => setParam({ q: null })}>
                Search: {query} <span className="icon" style={{ fontSize: 14 }}>close</span>
              </button>
            )}
            {activeChips.map((chip) => (
              <button className="filter-chip" key={`${chip.key}-${chip.value}`} onClick={() => toggleMulti(chip.key, chip.value)}>
                {chip.value} <span className="icon" style={{ fontSize: 14 }}>close</span>
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="cart-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <h3>Could not load the catalogue</h3>
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
                {data.items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              <Reveal deps={[data.items.map((i) => i.id).join(',')]} />

              {data.totalPages > 1 && (
                <nav className="pagination" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }} aria-label="Pagination">
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
              <span className="icon" style={{ fontSize: 48, color: 'var(--primary)' }}>search_off</span>
              <h3 style={{ marginTop: '1rem' }}>No products match those filters</h3>
              <p style={{ color: 'var(--on-surface-variant)', maxWidth: 420, margin: '0 auto 1.5rem' }}>
                Try widening your price range or clearing a few filters.
              </p>
              <button className="btn btn-primary" onClick={clearAll}>Clear All Filters</button>
              <div style={{ marginTop: '1rem' }}>
                <Link className="text-link" href="/contact">Ask us to source it →</Link>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  options,
  labels,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  labels?: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="filter-group">
      <h3>{title}</h3>
      {options.map((opt, i) => (
        <label className="check-label" key={opt}>
          <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} />
          {labels?.[i] ?? opt}
        </label>
      ))}
    </div>
  );
}
