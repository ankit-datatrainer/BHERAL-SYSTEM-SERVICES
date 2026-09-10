import { redirect } from 'next/navigation';

/**
 * The buyer dashboard now covers store orders and service requests too, so it
 * lives at /account. This keeps the old marketplace-only URL working.
 */
export default function PurchasesPage() {
  redirect('/account');
}
