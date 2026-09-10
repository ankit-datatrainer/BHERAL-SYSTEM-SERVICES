import { Suspense } from 'react';
import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { PageHero } from '@/components/PageHero';
import { RepairBooking } from '@/components/RepairBooking';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Computer Repair Lab & Doorstep Service Delhi NCR',
  description:
    'Specialised diagnostic, chip-level micro-soldering and performance upgrade services with free doorstep pickup across Delhi NCR.',
};

export default async function RepairPage() {
  const data = await api.repairServices().catch(() => ({ items: [], total: 0, devices: [] }));

  return (
    <>
      <PageHero
        title="Precision Computer Hardware & Chip-Level Repair"
        description={`${data.total || 24} specialised diagnostic, chip-level micro-soldering, and performance upgrade services across Delhi NCR.`}
        crumbs={[{ label: 'Computer Repair' }]}
      />
      <Suspense fallback={<div className="container"><div className="aw-skeleton" style={{ minHeight: 480, margin: '3rem 0' }} /></div>}>
        <RepairBooking services={data.items} devices={data.devices} />
      </Suspense>
    </>
  );
}
