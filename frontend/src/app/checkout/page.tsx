import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { CheckoutForm } from '@/components/CheckoutForm';

export const metadata: Metadata = { title: 'Secure Checkout' };

export default function CheckoutPage() {
  return (
    <>
      <PageHero
        title="Secure Checkout"
        description="Review your delivery destination and preferred payment method for this hardware order."
        crumbs={[{ label: 'Cart', href: '/cart' }, { label: 'Checkout' }]}
      />
      <section className="section">
        <div className="container">
          <CheckoutForm />
        </div>
      </section>
    </>
  );
}
