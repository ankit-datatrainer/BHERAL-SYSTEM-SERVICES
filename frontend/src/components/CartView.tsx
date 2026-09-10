'use client';

/**
 * Cart and wishlist views.
 *
 * The cart stores only ids and quantities; product details and prices are
 * always refetched, so a cart left open for a week cannot show a stale price.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { imageUrl, money } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useStore } from './StoreProvider';
import { ProductCard } from './ProductCard';
import { Reveal } from './Reveal';

/** Resolves a list of product ids to full products. */
function useProducts(ids: string[]) {
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const key = ids.slice().sort().join(',');

  useEffect(() => {
    if (!key) {
      setProducts({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // One request per id keeps this simple and they run in parallel.
    Promise.all(
      key.split(',').map((id) =>
        api
          .product(id)
          .then((r) => r.product)
          .catch(() => null),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const map: Record<string, Product> = {};
        for (const p of results) if (p) map[p.id] = p;
        setProducts(map);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { products, loading };
}

function EmptyState({ icon, title, body, cta }: { icon: string; title: string; body: string; cta: { href: string; label: string } }) {
  return (
    <div className="cart-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <div
        style={{
          width: 72, height: 72, borderRadius: '50%', background: 'var(--surface-container)',
          color: 'var(--primary)', display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem',
        }}
      >
        <span className="icon" style={{ fontSize: 36 }}>{icon}</span>
      </div>
      <h2>{title}</h2>
      <p style={{ color: 'var(--on-surface-variant)', maxWidth: 420, margin: '0 auto 2rem' }}>{body}</p>
      <Link className="btn btn-primary" href={cta.href}>{cta.label}</Link>
    </div>
  );
}

export function CartView() {
  const { cart, setQty, removeFromCart, hydrated } = useStore();
  const { products, loading } = useProducts(cart.map((l) => l.id));

  if (!hydrated || loading) {
    return <div className="aw-skeleton" style={{ minHeight: 320 }} />;
  }

  const lines = cart
    .map((line) => ({ line, product: products[line.id] }))
    .filter((row): row is { line: typeof row.line; product: Product } => Boolean(row.product));

  if (!lines.length) {
    return (
      <EmptyState
        icon="shopping_bag"
        title="Your Cart is Empty"
        body="Add a certified refurbished laptop or a computer component to get started."
        cta={{ href: '/buy', label: 'Browse Refurbished Laptops' }}
      />
    );
  }

  const subtotal = lines.reduce((sum, r) => sum + r.product.price * r.line.qty, 0);

  return (
    <div className="cart-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: '2rem', alignItems: 'start' }}>
      <div>
        {lines.map(({ line, product }) => (
          <div
            className="cart-card"
            key={product.id}
            style={{ display: 'grid', gridTemplateColumns: '110px 1fr auto', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}
          >
            <Link href={`/product/${product.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl(product.image)}
                alt={product.name}
                style={{ width: '100%', borderRadius: 'var(--radius-md)', background: 'var(--surface-container-low)' }}
              />
            </Link>

            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>
                <Link href={`/product/${product.id}`}>{product.name}</Link>
              </h3>
              <div className="spec-pills-row" style={{ marginBottom: '0.5rem' }}>
                {product.ram > 0 && <span className="spec">{product.ram}GB RAM</span>}
                {product.storage > 0 && <span className="spec">{product.storage}GB {product.storageType}</span>}
                <span className="spec">{product.condition}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <label style={{ fontSize: 13 }}>
                  Qty{' '}
                  <select
                    value={line.qty}
                    onChange={(e) => setQty(product.id, Number(e.target.value))}
                    style={{ padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                  >
                    {Array.from({ length: Math.min(10, Math.max(1, product.stock)) }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="text-link"
                  onClick={() => removeFromCart(product.id)}
                  style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--red)' }}
                >
                  Remove
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div className="price">{money(product.price * line.qty)}</div>
              {line.qty > 1 && (
                <small style={{ color: 'var(--on-surface-variant)' }}>{money(product.price)} each</small>
              )}
            </div>
          </div>
        ))}
        <Reveal deps={[lines.length]} />
      </div>

      <aside className="cart-card" style={{ position: 'sticky', top: 180 }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Order Summary</h3>
        <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Subtotal ({lines.reduce((n, r) => n + r.line.qty, 0)} items)</span>
          <strong>{money(subtotal)}</strong>
        </div>
        <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Doorstep Delivery</span>
          <strong style={{ color: 'var(--emerald-text)' }}>FREE</strong>
        </div>
        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
        <div className="summary-row total" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <strong>Total</strong>
          <strong style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>{money(subtotal)}</strong>
        </div>
        <Link className="btn btn-primary btn-block" href="/checkout">
          <span className="icon">lock</span> Proceed to Checkout
        </Link>
        <Link className="btn btn-secondary btn-block" href="/buy" style={{ marginTop: '0.6rem' }}>
          Continue Shopping
        </Link>
      </aside>
    </div>
  );
}

export function WishlistView() {
  const { wishlist, hydrated } = useStore();
  const { products, loading } = useProducts(wishlist);

  if (!hydrated || loading) {
    return <div className="aw-skeleton" style={{ minHeight: 320 }} />;
  }

  const items = wishlist.map((id) => products[id]).filter(Boolean);

  if (!items.length) {
    return (
      <EmptyState
        icon="favorite"
        title="Your Wishlist is Empty"
        body="Tap the heart on any product to save it here for later."
        cta={{ href: '/buy', label: 'Browse Refurbished Laptops' }}
      />
    );
  }

  return (
    <>
      <div className="product-grid">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      <Reveal deps={[items.length]} />
    </>
  );
}
