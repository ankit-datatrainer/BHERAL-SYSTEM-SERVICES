'use client';

/** Marketplace tile. Mirrors ProductCard's shape so the grids match visually. */
import Link from 'next/link';
import { money } from '@/lib/format';
import { categoryMeta, listingImage, LISTING_STATUS_BADGE } from '@/lib/marketplace';
import type { Listing } from '@/lib/types';

export function ListingCard({ listing }: { listing: Listing }) {
  const badge = LISTING_STATUS_BADGE[listing.status] ?? LISTING_STATUS_BADGE.active;
  const meta = categoryMeta(listing.category);
  const specEntries = Object.entries(listing.specs).filter(([, v]) => v).slice(0, 3);

  return (
    <article className="product-card" data-listing={listing.id}>
      <div className="product-card-top">
        <span className={`badge ${badge.className}`}>{badge.label}</span>
        <span className="badge badge-blue" style={{ fontSize: 9 }}>
          {listing.condition}
        </span>
      </div>

      <Link className="product-image-wrap" href={`/marketplace/${listing.id}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={listingImage(listing)} alt={listing.title} loading="lazy" />
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          color: 'var(--primary)',
          marginBottom: '0.35rem',
        }}
      >
        <span className="icon" style={{ fontSize: 15 }}>{meta.icon}</span>
        {listing.category}
      </div>

      <h3>
        <Link href={`/marketplace/${listing.id}`}>{listing.title}</Link>
      </h3>

      {specEntries.length > 0 && (
        <div className="spec-pills-row">
          {specEntries.map(([key, value]) => (
            <span className="spec" key={key}>{value}</span>
          ))}
        </div>
      )}

      <div className="rating-row">
        <span className="icon" style={{ fontSize: 16 }}>person</span>
        <span className="muted">Private seller</span>
        {listing.city && (
          <>
            <span style={{ color: 'var(--outline-variant)' }}>·</span>
            <span className="muted">{listing.city}</span>
          </>
        )}
      </div>

      <div className="price-box">
        <span className="price">{money(listing.price)}</span>
        {listing.negotiable && (
          <span className="badge badge-green" style={{ fontSize: 9 }}>Negotiable</span>
        )}
      </div>

      <div className="card-actions">
        <Link className="btn btn-primary btn-small" href={`/marketplace/${listing.id}`}>
          <span className="icon" style={{ fontSize: 16 }}>visibility</span> View Details
        </Link>
      </div>
    </article>
  );
}
