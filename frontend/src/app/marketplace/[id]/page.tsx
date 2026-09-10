import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { PageHero } from '@/components/PageHero';
import { ListingDetail } from '@/components/marketplace/ListingDetail';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  try {
    const { listing } = await api.listing(id);
    return {
      title: `${listing.title} — Marketplace`,
      description: listing.description.slice(0, 160),
    };
  } catch {
    return { title: 'Marketplace Listing' };
  }
}

export default async function ListingPage({ params }: Params) {
  const { id } = await params;

  let data;
  try {
    data = await api.listing(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <>
      <PageHero
        title={data.listing.title}
        description={`${data.listing.condition} · ${data.listing.category}${data.listing.city ? ` · ${data.listing.city}` : ''}`}
        crumbs={[
          { label: 'Marketplace', href: '/marketplace' },
          { label: data.listing.category, href: `/marketplace?category=${encodeURIComponent(data.listing.category)}` },
          { label: data.listing.title },
        ]}
      />
      <ListingDetail listing={data.listing} similar={data.similar} />
    </>
  );
}
