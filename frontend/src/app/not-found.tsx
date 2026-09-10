import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="cart-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '4rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.05em' }}>
            404
          </div>
          <h1 style={{ fontSize: '1.6rem', margin: '0.5rem 0' }}>We could not find that page</h1>
          <p style={{ color: 'var(--on-surface-variant)', marginBottom: '2rem' }}>
            The link may be out of date, or the product may no longer be listed.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" href="/">Back to Home</Link>
            <Link className="btn btn-secondary" href="/buy">Browse Laptops</Link>
            <Link className="btn btn-secondary" href="/contact">Contact Support</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
