import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { WishlistView } from '@/components/CartView';

export const metadata: Metadata = { title: 'Saved Wishlist' };

export default function WishlistPage() {
  return (
    <>
      <PageHero
        title="Your Saved Wishlist"
        description="Hardware you have bookmarked for later. Saved on this browser."
        crumbs={[{ label: 'Wishlist' }]}
      />
      <section className="section">
        <div className="container">
          <WishlistView />
        </div>
      </section>
    </>
  );
}
