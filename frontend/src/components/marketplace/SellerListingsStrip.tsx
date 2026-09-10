import Link from 'next/link';
import { api } from '@/lib/api';
import { ListingCard } from './ListingCard';

/**
 * Live private-seller listings, surfaced on the main site.
 *
 * A seller publishing an item is all it takes for it to appear here — the
 * strip reads the same public `active` listings the marketplace does, so
 * there is no separate approval or copy step.
 */
export async function SellerListingsStrip({
  limit = 4,
  category,
  eyebrow = 'From Our Sellers',
  title = 'Listed by People Near You',
  description = 'Hardware sold directly by owners across Delhi NCR. You deal with the seller; we just make the introduction.',
}: {
  limit?: number;
  category?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  const data = await api
    .listings({ sort: 'newest', pageSize: limit, category })
    .catch(() => null);

  const listings = data?.items ?? [];

  // Nothing live yet — say nothing rather than showing an empty grid.
  if (!listings.length) return null;

  return (
    <section className="section" id="seller-listings">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow green">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <Link className="text-link" href="/marketplace">
            Browse the marketplace →
          </Link>
        </div>

        <div className="product-grid">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>

        <p
          style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: 13.5,
            color: 'var(--on-surface-variant)',
          }}
        >
          Have something to sell?{' '}
          <Link className="text-link" href="/marketplace/sell">
            List it yourself
          </Link>{' '}
          and keep the full price — it goes live on this page straight away.
        </p>
      </div>
    </section>
  );
}
