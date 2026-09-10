'use client';

/** Catalogue tile used on the home page, buy page, parts page and wishlist. */
import Link from 'next/link';
import { imageUrl, money } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useStore } from './StoreProvider';

const BRAND_LOGOS_MAP: Record<string, { src: string; height: number }> = {
  Apple: { src: '/assets/images/brands/apple.svg', height: 16 },
  Dell: { src: '/assets/images/brands/dell.svg', height: 18 },
  HP: { src: '/assets/images/brands/hp.svg', height: 16 },
  Lenovo: { src: '/assets/images/brands/lenovo.svg', height: 13 },
  ASUS: { src: '/assets/images/brands/asus.svg', height: 12 },
  Acer: { src: '/assets/images/brands/acer.svg', height: 13 },
  MSI: { src: '/assets/images/brands/msi.svg', height: 12 },
  Samsung: { src: '/assets/images/brands/samsung.svg', height: 11 },
};

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWished, hydrated } = useStore();
  const wished = hydrated && isWished(product.id);

  const conditionClass = product.condition === 'New' ? 'badge-blue' : 'badge-green';
  const conditionText =
    product.condition === 'New' ? 'Brand New OEM' : `Refurbished ${product.condition}`;
  const brandLogo = product.brand ? BRAND_LOGOS_MAP[product.brand] : undefined;

  return (
    <article className="product-card" data-product={product.id}>
      <div className="product-card-top" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span className={`badge ${conditionClass}`}>{conditionText}</span>
          {brandLogo && (
            <span
              className="badge"
              style={{
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--border)',
                padding: '0.15rem 0.45rem',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title={product.brand}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brandLogo.src}
                alt={product.brand}
                style={{ height: brandLogo.height, width: 'auto', maxWidth: 45, objectFit: 'contain' }}
              />
            </span>
          )}
        </div>
        <button
          className={`wish-btn${wished ? ' active' : ''}`}
          onClick={() => toggleWishlist(product.id)}
          aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={wished}
          title="Save to wishlist"
          style={{ marginLeft: 'auto' }}
        >
          <span className="icon">favorite</span>
        </button>
      </div>

      <Link className="product-image-wrap" href={`/product/${product.id}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(product.image)} alt={product.name} loading="lazy" />
      </Link>

      <h3>
        <Link href={`/product/${product.id}`}>{product.name}</Link>
      </h3>

      <div className="spec-pills-row">
        {product.processor && product.processor !== '—' && (
          <span className="spec">{product.processor.split('(')[0].trim()}</span>
        )}
        {product.ram > 0 && <span className="spec">{product.ram}GB RAM</span>}
        {product.storage > 0 && (
          <span className="spec">
            {product.storage}GB {product.storageType && product.storageType !== '—' ? product.storageType : 'SSD'}
          </span>
        )}
      </div>

      <div className="rating-row">
        <span className="icon" style={{ fontSize: 16 }}>star</span>
        <strong>{product.rating}</strong>
        <span className="muted">({product.reviewCount})</span>
        {product.stock > 0 && product.stock <= 5 && (
          <span className="badge badge-amber" style={{ marginLeft: 'auto', fontSize: 9 }}>
            Only {product.stock} Left
          </span>
        )}
      </div>

      <div className="price-box">
        <span className="price">{money(product.price)}</span>
        {product.originalPrice ? <span className="old-price">{money(product.originalPrice)}</span> : null}
        {product.discount ? <span className="discount">{product.discount}% OFF</span> : null}
      </div>

      <div className="card-actions">
        <button
          className="btn btn-primary btn-small"
          onClick={() => addToCart(product.id)}
          disabled={product.stock <= 0}
        >
          <span className="icon" style={{ fontSize: 16 }}>shopping_bag</span>
          {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
        </button>
        <Link className="btn btn-secondary btn-small" href={`/product/${product.id}`}>
          Details
        </Link>
      </div>
    </article>
  );
}
