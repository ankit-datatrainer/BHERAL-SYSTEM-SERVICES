import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { PageHero } from '@/components/PageHero';
import { ProductCard } from '@/components/ProductCard';
import { ProductPurchasePanel } from '@/components/ProductPurchasePanel';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  try {
    const { product } = await api.product(id);
    return {
      title: product.name,
      description: product.description.slice(0, 160),
      openGraph: { title: product.name, description: product.description.slice(0, 160) },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: Params) {
  const { id } = await params;

  let data;
  try {
    data = await api.product(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const { product, related } = data;

  return (
    <>
      <PageHero
        title={product.name}
        description={product.description}
        crumbs={[{ label: 'Buy Refurbished', href: '/buy' }, { label: product.name }]}
      />

      <section className="section">
        <div className="container">
          <div className="detail-grid">
            <ProductPurchasePanel product={product} />
          </div>

          <div className="spec-table" style={{ marginTop: '3rem' }}>
            <div className="section-head">
              <div>
                <span className="eyebrow">Verified Hardware Report</span>
                <h2>Full Technical Specifications</h2>
                <p>Every value below is recorded during our 50-point bench audit before the unit is listed.</p>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {Object.entries(product.specifications).map(([key, value]) => (
                  <tr key={key}>
                    <td
                      style={{
                        padding: '0.85rem 1rem',
                        borderBottom: '1px solid var(--border)',
                        fontWeight: 700,
                        color: 'var(--navy)',
                        width: '32%',
                        verticalAlign: 'top',
                      }}
                    >
                      {key}
                    </td>
                    <td
                      style={{
                        padding: '0.85rem 1rem',
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--on-surface-variant)',
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--navy)' }}>Listed Price</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--primary)', fontWeight: 700 }}>
                    {money(product.price)}
                    {product.originalPrice ? (
                      <span style={{ color: 'var(--on-surface-variant)', fontWeight: 400 }}>
                        {' '}
                        (MRP {money(product.originalPrice)})
                      </span>
                    ) : null}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section-sm">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow green">Similar Certified Stock</span>
                <h2>You May Also Consider</h2>
                <p>Other tested {product.category.toLowerCase()} options in the same bracket.</p>
              </div>
              <Link className="text-link" href="/buy">
                View all stock →
              </Link>
            </div>
            <div className="product-grid">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
