'use client';

/** Gallery + buy box for the product detail page. */
import Link from 'next/link';
import { useState } from 'react';
import { imageUrl, money, whatsappUrl } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useStore } from './StoreProvider';
import { WhatsAppIcon } from './WhatsAppIcon';

const BRAND_LOGOS_MAP: Record<string, { src: string; height: number }> = {
  Apple: { src: '/assets/images/brands/apple.svg', height: 20 },
  Dell: { src: '/assets/images/brands/dell.svg', height: 22 },
  HP: { src: '/assets/images/brands/hp.svg', height: 20 },
  Lenovo: { src: '/assets/images/brands/lenovo.svg', height: 16 },
  ASUS: { src: '/assets/images/brands/asus.svg', height: 14 },
  Acer: { src: '/assets/images/brands/acer.svg', height: 16 },
  MSI: { src: '/assets/images/brands/msi.svg', height: 14 },
  Samsung: { src: '/assets/images/brands/samsung.svg', height: 14 },
};

export function ProductPurchasePanel({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWished, hydrated } = useStore();
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);

  const gallery = product.images?.length ? product.images : [product.image];
  const wished = hydrated && isWished(product.id);
  const inStock = product.stock > 0;
  const maxQty = Math.min(10, Math.max(1, product.stock));
  const brandLogo = product.brand ? BRAND_LOGOS_MAP[product.brand] : undefined;

  return (
    <>
      <div className="detail-gallery">
        <div className="gallery-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(gallery[activeImage])} alt={product.name} />
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
                <img src={imageUrl(src)} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="detail-summary">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
          {brandLogo && (
            <span className="badge" style={{ background: 'var(--surface-container-low)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.2rem 0.6rem' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brandLogo.src}
                alt={product.brand}
                style={{ height: brandLogo.height, width: 'auto', maxWidth: 65, objectFit: 'contain' }}
              />
            </span>
          )}
          <span className="badge badge-green">
            <span className="icon" style={{ fontSize: 14 }}>fact_check</span> 50-Point Audit Passed
          </span>
          <span className="badge badge-blue">
            {product.condition === 'New' ? 'Brand New OEM' : `${product.condition} Condition`}
          </span>
          <span className="badge badge-amber">{product.warranty}</span>
        </div>

        <h2 style={{ fontSize: '1.8rem', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>{product.name}</h2>

        <div className="rating-row" style={{ marginBottom: '1rem' }}>
          <span className="icon" style={{ fontSize: 18, color: 'var(--amber)' }}>star</span>
          <strong>{product.rating}</strong>
          <span className="muted">({product.reviewCount} customer reviews)</span>
          <span style={{ margin: '0 0.35rem', color: 'var(--outline-variant)' }}>·</span>
          <span style={{ color: inStock ? 'var(--emerald-text)' : 'var(--red)', fontWeight: 600, fontSize: 13 }}>
            {inStock ? 'Verified Nehru Place Stock' : 'Currently Out of Stock'}
          </span>
        </div>

        <div className="price-box" style={{ marginBottom: '1.25rem' }}>
          <span className="price" style={{ fontSize: '2rem' }}>{money(product.price)}</span>
          {product.originalPrice ? <span className="old-price">{money(product.originalPrice)}</span> : null}
          {product.discount ? <span className="discount">{product.discount}% OFF</span> : null}
        </div>

        <div className="highlight-specs" style={{ marginBottom: '1.5rem' }}>
          {product.processor && product.processor !== '—' && (
            <div className="highlight-spec">
              <small>Processor</small>
              <strong>{product.processor}</strong>
            </div>
          )}
          {product.ram > 0 && (
            <div className="highlight-spec">
              <small>Installed Memory</small>
              <strong>{product.ram}GB RAM</strong>
            </div>
          )}
          {product.storage > 0 && (
            <div className="highlight-spec">
              <small>Storage Drive</small>
              <strong>{product.storage}GB {product.storageType !== '—' ? product.storageType : 'SSD'}</strong>
            </div>
          )}
          {product.operatingSystem && product.operatingSystem !== '—' && (
            <div className="highlight-spec">
              <small>Operating System</small>
              <strong>{product.operatingSystem}</strong>
            </div>
          )}
        </div>

        {inStock && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <label htmlFor="qty-select" style={{ fontSize: 13, fontWeight: 600 }}>Quantity</label>
            <select
              id="qty-select"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-DEFAULT)', border: '1px solid var(--border)' }}
            >
              {Array.from({ length: maxQty }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
            {product.stock <= 5 && (
              <span className="badge badge-amber">Only {product.stock} left in stock</span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <button className="btn btn-primary btn-lg" onClick={() => addToCart(product.id, qty)} disabled={!inStock}>
            <span className="icon">shopping_bag</span> {inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => toggleWishlist(product.id)}>
            <span className="icon">favorite</span> {wished ? 'Saved' : 'Save for Later'}
          </button>
          <a
            className="btn btn-green btn-lg"
            href={whatsappUrl(`Hi Bheral Systems, I am interested in the ${product.name} listed at ${money(product.price)}. Is it available?`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon size={18} color="#ffffff" /> Ask on WhatsApp
          </a>
        </div>

        <div className="hero-features" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 0 }}>
          <div className="mini-trust">
            <span className="icon" style={{ color: 'var(--primary)' }}>shield_with_heart</span>
            <span>
              <strong>{product.warranty}</strong>
              <small>Written hardware guarantee</small>
            </span>
          </div>
          <div className="mini-trust">
            <span className="icon" style={{ color: 'var(--emerald-text)' }}>local_shipping</span>
            <span>
              <strong>Free Delhi NCR Delivery</strong>
              <small>Doorstep, insured handover</small>
            </span>
          </div>
          <div className="mini-trust">
            <span className="icon" style={{ color: 'var(--navy)' }}>receipt_long</span>
            <span>
              <strong>GST Invoice</strong>
              <small>Available for business buyers</small>
            </span>
          </div>
          <div className="mini-trust">
            <span className="icon" style={{ color: 'var(--primary)' }}>handyman</span>
            <span>
              <strong>In-house Service</strong>
              <small><Link className="text-link" href="/repair">Book bench support</Link></small>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
