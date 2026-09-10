'use client';

/**
 * Checkout. The API is the authority on pricing and stock — this form only
 * collects the delivery details and posts the cart's ids and quantities.
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { imageUrl, money, whatsappUrl } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useStore } from './StoreProvider';

const DELIVERY_METHODS = [
  { value: 'Free Doorstep Delivery', label: 'Free Doorstep Delivery', hint: 'Insured handover across eligible Delhi NCR pincodes.' },
  { value: 'Store Pickup (Nehru Place)', label: 'Store Pickup (Nehru Place)', hint: 'Collect from our bench, Mon–Sat 10:00 AM – 8:30 PM.' },
];

const PAYMENT_METHODS = [
  { value: 'Cash on Delivery', label: 'Cash on Delivery', hint: 'Pay the technician in cash at handover.' },
  { value: 'UPI on Confirmation', label: 'UPI on Confirmation', hint: 'We send a UPI request once the unit is packed.' },
  { value: 'Card on Delivery', label: 'Card on Delivery', hint: 'Card machine carried by the delivery technician.' },
  { value: 'NEFT / RTGS (Corporate GST)', label: 'NEFT / RTGS (Corporate GST Invoice)', hint: 'Direct bank transfer with a tax invoice for business orders.' },
];

interface Confirmation {
  id: string;
  total: number;
  items: Array<{ name: string; qty: number; price: number }>;
  phone: string;
}

const EMPTY_FORM = {
  name: '', phone: '', email: '',
  street: '', area: '', city: 'Delhi', state: 'Delhi', pincode: '',
  deliveryMethod: DELIVERY_METHODS[0].value,
  paymentPreference: PAYMENT_METHODS[0].value,
};

export function CheckoutForm() {
  const { cart, hydrated, clearCart, toast } = useStore();
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const ids = cart.map((l) => l.id).sort().join(',');

  useEffect(() => {
    if (!hydrated) return;
    if (!ids) {
      setProducts({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    Promise.all(ids.split(',').map((id) => api.product(id).then((r) => r.product).catch(() => null)))
      .then((rows) => {
        if (cancelled) return;
        const map: Record<string, Product> = {};
        for (const p of rows) if (p) map[p.id] = p;
        setProducts(map);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [ids, hydrated]);

  const lines = useMemo(
    () => cart.map((l) => ({ line: l, product: products[l.id] })).filter((r) => r.product),
    [cart, products],
  );
  const subtotal = lines.reduce((sum, r) => sum + r.product!.price * r.line.qty, 0);

  const update = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => {
      if (!e[`customer.${field}`]) return e;
      const next = { ...e };
      delete next[`customer.${field}`];
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      const result = await api.createOrder({
        customer: form,
        items: cart.map((l) => ({ id: l.id, qty: l.qty })),
      });

      setConfirmation({ id: result.id, total: result.total, items: result.items, phone: form.phone });
      clearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = err.fieldErrors;
        setErrors(fields);
        toast(Object.keys(fields).length ? 'Please correct the highlighted fields' : err.message, 'error');
      } else {
        toast('Could not reach the order service. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <div className="container" style={{ maxWidth: 800, padding: 0 }}>
        <div className="cart-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--emerald-soft)', color: 'var(--emerald)', display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem' }}>
            <span className="icon" style={{ fontSize: 48 }}>check_circle</span>
          </div>
          <span className="badge badge-green" style={{ fontSize: 12, padding: '0.35rem 0.75rem', marginBottom: '0.75rem' }}>Order Confirmed</span>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Thank You — Your Order is Placed!</h1>
          <p style={{ color: 'var(--on-surface-variant)', maxWidth: 520, margin: '0 auto 1.5rem' }}>
            Our Delhi dispatch desk will call <strong>+91 {confirmation.phone}</strong> to confirm the delivery slot.
          </p>

          <div style={{ background: 'var(--surface-container-low)', border: '1.5px dashed var(--primary)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 480, margin: '0 auto 2rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 700 }}>Order Reference</span>
              <span className="badge badge-blue">Save this ID</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: 1, marginBottom: '0.75rem' }}>
              {confirmation.id}
            </div>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {confirmation.items.map((i) => (
                <div key={i.name}><strong>{i.qty}×</strong> {i.name} — {money(i.price * i.qty)}</div>
              ))}
              <div style={{ marginTop: '0.35rem' }}><strong>Total:</strong> {money(confirmation.total)} ({form.paymentPreference})</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn btn-primary btn-lg" href={`/track?id=${confirmation.id}&phone=${confirmation.phone}`}>
              <span className="icon">local_shipping</span> Track This Order
            </Link>
            <Link className="btn btn-secondary btn-lg" href={`/invoice/${confirmation.id}?phone=${confirmation.phone}`}>
              <span className="icon">description</span> View Invoice
            </Link>
            <Link className="btn btn-secondary btn-lg" href="/">
              <span className="icon">home</span> Return Home
            </Link>
            <a className="btn btn-green btn-lg" target="_blank" rel="noopener noreferrer"
               href={whatsappUrl(`Hi Bheral Systems, I just placed order ${confirmation.id} for ${money(confirmation.total)}. Please confirm dispatch.`)}>
              <span className="icon">chat</span> WhatsApp Us
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!hydrated || loading) return <div className="aw-skeleton" style={{ minHeight: 320 }} />;

  if (!lines.length) {
    return (
      <div className="cart-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface-container)', color: 'var(--primary)', display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem' }}>
          <span className="icon" style={{ fontSize: 36 }}>shopping_bag</span>
        </div>
        <h2>No Items to Checkout</h2>
        <p style={{ color: 'var(--on-surface-variant)', maxWidth: 420, margin: '0 auto 2rem' }}>
          Add a refurbished laptop or computer component to your cart before proceeding.
        </p>
        <Link className="btn btn-primary" href="/buy">Browse Refurbished Laptops</Link>
      </div>
    );
  }

  const err = (field: string) => errors[`customer.${field}`];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: '2rem', alignItems: 'start' }} className="checkout-layout">
      <form className="form-card" onSubmit={submit} noValidate>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>Delivery Details</h2>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, marginBottom: '1.5rem' }}>
          No payment is taken online. We confirm the slot by phone and collect on handover.
        </p>

        <div className="form-grid">
          <Field label="Full Name *" error={err('name')}>
            <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Ankit Kumar" autoComplete="name" />
          </Field>
          <Field label="Mobile Phone * (10 digits)" error={err('phone')}>
            <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" inputMode="numeric" autoComplete="tel-national" />
          </Field>
          <Field label="Email Address *" error={err('email')} full>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </Field>
          <Field label="Street Address *" error={err('street')} full>
            <input type="text" value={form.street} onChange={(e) => update('street', e.target.value)} placeholder="House/Flat No., Street, Building" autoComplete="address-line1" />
          </Field>
          <Field label="Area / Locality *" error={err('area')}>
            <input type="text" value={form.area} onChange={(e) => update('area', e.target.value)} placeholder="e.g. Lajpat Nagar" autoComplete="address-line2" />
          </Field>
          <Field label="City *" error={err('city')}>
            <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} autoComplete="address-level2" />
          </Field>
          <Field label="State *" error={err('state')}>
            <input type="text" value={form.state} onChange={(e) => update('state', e.target.value)} autoComplete="address-level1" />
          </Field>
          <Field label="Pincode *" error={err('pincode')}>
            <input type="text" value={form.pincode} onChange={(e) => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="110091" inputMode="numeric" autoComplete="postal-code" />
          </Field>
        </div>

        <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: 'var(--on-surface-variant)', margin: '2rem 0 0.75rem' }}>Delivery Method</h3>
        <div className="choice-grid">
          {DELIVERY_METHODS.map((m) => (
            <label className={`choice${form.deliveryMethod === m.value ? ' selected' : ''}`} key={m.value}>
              <input type="radio" name="deliveryMethod" value={m.value} checked={form.deliveryMethod === m.value} onChange={() => update('deliveryMethod', m.value)} />
              <div><strong>{m.label}</strong><p style={{ margin: 0, fontSize: 12, color: 'var(--on-surface-variant)' }}>{m.hint}</p></div>
            </label>
          ))}
        </div>

        <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: 'var(--on-surface-variant)', margin: '2rem 0 0.75rem' }}>Payment Preference</h3>
        <div className="choice-grid">
          {PAYMENT_METHODS.map((m) => (
            <label className={`choice${form.paymentPreference === m.value ? ' selected' : ''}`} key={m.value}>
              <input type="radio" name="paymentPreference" value={m.value} checked={form.paymentPreference === m.value} onChange={() => update('paymentPreference', m.value)} />
              <div><strong>{m.label}</strong><p style={{ margin: 0, fontSize: 12, color: 'var(--on-surface-variant)' }}>{m.hint}</p></div>
            </label>
          ))}
        </div>

        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting} style={{ marginTop: '2rem' }}>
          <span className="icon">check_circle</span>
          {submitting ? 'Placing Order…' : `Place Order (${money(subtotal)})`}
        </button>
      </form>

      <aside className="cart-card" style={{ position: 'sticky', top: 180 }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Order Summary</h3>
        {lines.map(({ line, product }) => (
          <div key={product!.id} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(product!.image)} alt="" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 'var(--radius-sm)', background: 'var(--surface-container-low)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{product!.name}</div>
              <small style={{ color: 'var(--on-surface-variant)' }}>Qty {line.qty}</small>
            </div>
            <strong style={{ fontSize: 13 }}>{money(product!.price * line.qty)}</strong>
          </div>
        ))}
        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Subtotal</span><strong>{money(subtotal)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Delivery</span><strong style={{ color: 'var(--emerald-text)' }}>FREE</strong>
        </div>
        <div className="summary-row total" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem' }}>
          <strong>Total</strong>
          <strong style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>{money(subtotal)}</strong>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, error, full, children }: { label: string; error?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`field${full ? ' full' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</small>}
    </label>
  );
}
