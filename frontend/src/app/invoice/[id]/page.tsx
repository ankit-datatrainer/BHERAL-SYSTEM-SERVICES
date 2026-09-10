import { Suspense } from 'react';
import type { Metadata } from 'next';
import { InvoiceView } from '@/components/InvoiceView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Invoice ${id.toUpperCase()}`,
    description: 'Invoice for your Bheral Systems & Services order.',
    robots: { index: false, follow: false },
  };
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="container">
          <div className="aw-skeleton" style={{ minHeight: 420, margin: '3rem 0' }} />
        </div>
      }
    >
      <InvoiceView id={id.toUpperCase()} />
    </Suspense>
  );
}
