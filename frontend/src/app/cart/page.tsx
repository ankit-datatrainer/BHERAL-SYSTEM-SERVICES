import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { CartView } from '@/components/CartView';

export const metadata: Metadata = { title: 'Shopping Cart' };

export default function CartPage() {
  return (
    <>
      <PageHero
        title="Your Shopping Cart"
        description="Review your selected hardware before checkout. Prices are always re-checked live against current stock."
        crumbs={[{ label: 'Cart' }]}
      />
      <section className="section">
        <div className="container">
          <CartView />
        </div>
      </section>
    </>
  );
}
