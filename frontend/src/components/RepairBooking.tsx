'use client';

/**
 * Repair services catalogue + booking wizard.
 *
 * Photos stay on the device: we only send the file names with the booking and
 * ask the customer to WhatsApp the images, which avoids handling uploads (and
 * storing customer photos) entirely.
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { whatsappUrl } from '@/lib/format';
import type { RepairService, Serviceability } from '@/lib/types';
import { useStore } from './StoreProvider';
import { Reveal } from './Reveal';

const WIZARD_STEPS = ['Choose Device', 'Select Problem', 'Brand & Model', 'Issue Description', 'Photos', 'Service Method', 'Contact Details', 'Review'];

const DEVICES = [
  { value: 'Laptop', icon: 'laptop' },
  { value: 'Desktop', icon: 'desktop_windows' },
  { value: 'Printer', icon: 'print' },
  { value: 'Storage Drive', icon: 'hard_drive' },
  { value: 'Network', icon: 'lan' },
];

const SERVICE_METHODS = [
  { value: 'Free Doorstep Pickup & Drop', hint: 'We collect, repair at the bench and return the device.' },
  { value: 'Visit Service Center (Nehru Place)', hint: 'Walk in Mon–Sat, 10:00 AM – 8:30 PM.' },
  { value: 'On-Site Engineer Visit', hint: 'For desktops, networking and office installations.' },
];

const TIME_SLOTS = ['10:00 AM – 01:00 PM', '01:00 PM – 04:00 PM', '04:00 PM – 07:30 PM'];

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().split('T')[0];

interface Props {
  services: RepairService[];
  devices: string[];
}

export function RepairBooking({ services, devices }: Props) {
  const searchParams = useSearchParams();
  const { toast } = useStore();
  const preselected = searchParams.get('service') ?? '';

  const [filter, setFilter] = useState('All');
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState({
    device: 'Laptop',
    problem: preselected || 'Laptop Repair',
    brand: '',
    model: '',
    description: '',
    serviceMethod: SERVICE_METHODS[0].value,
    photoNames: [] as string[],
  });
  const [customer, setCustomer] = useState({
    name: '', phone: '', whatsapp: '', email: '',
    address: '', area: '', city: 'Delhi', pincode: '',
    preferredDate: tomorrow(), preferredTime: TIME_SLOTS[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  // Pincode checker on the eligibility banner.
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeResult, setPincodeResult] = useState<Serviceability | null>(null);

  // A ?service= link should preselect the matching device too.
  useEffect(() => {
    if (!preselected) return;
    const match = services.find((s) => s.name === preselected);
    setBooking((b) => ({ ...b, problem: preselected, device: match?.device ?? b.device }));
  }, [preselected, services]);

  const visibleServices = useMemo(
    () => (filter === 'All' ? services : services.filter((s) => s.device === filter)),
    [services, filter],
  );

  const problemsForDevice = useMemo(() => {
    const matches = services.filter((s) => s.device === booking.device);
    return (matches.length ? matches : services).map((s) => s.name);
  }, [services, booking.device]);

  const checkPincode = async () => {
    try {
      setPincodeResult(await api.serviceability(pincodeInput));
    } catch {
      setPincodeResult({ valid: false, message: 'Could not check that pincode right now.' });
    }
  };

  const startBooking = (service: RepairService) => {
    setBooking((b) => ({ ...b, problem: service.name, device: service.device }));
    setStep(2);
    document.getElementById('book-repair-wizard')?.scrollIntoView({ behavior: 'smooth' });
  };

  const next = () => {
    if (step === 2 && !booking.brand.trim()) {
      toast('Please enter the device brand', 'error');
      return;
    }
    if (step === WIZARD_STEPS.length - 1) {
      void submit();
      return;
    }
    setStep((s) => s + 1);
    document.getElementById('book-repair-wizard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async () => {
    setSubmitting(true);
    setErrors({});
    try {
      const result = await api.createRepairRequest({ details: booking, customer });
      setReference(result.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        toast(Object.keys(err.fieldErrors).length ? 'Please correct the highlighted fields' : err.message, 'error');
        // Jump back to the contact step when the problem is there.
        if (Object.keys(err.fieldErrors).some((k) => k.startsWith('customer.'))) setStep(6);
      } else {
        toast('Could not submit your booking. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (reference) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="cart-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem' }}>
              <span className="icon" style={{ fontSize: 48 }}>handyman</span>
            </div>
            <span className="badge badge-blue" style={{ fontSize: 12, padding: '0.35rem 0.75rem', marginBottom: '0.75rem' }}>Repair Booked</span>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Your Repair is Scheduled!</h1>
            <p style={{ color: 'var(--on-surface-variant)', maxWidth: 520, margin: '0 auto 1.5rem' }}>
              Our technician desk will call <strong>+91 {customer.phone}</strong> to confirm the pickup window.
            </p>

            <div style={{ background: 'var(--surface-container-low)', border: '1.5px dashed var(--primary)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 480, margin: '0 auto 2rem', textAlign: 'left' }}>
              <span style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 700 }}>Repair Reference ID</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: 1, margin: '0.5rem 0 0.75rem' }}>
                {reference}
              </div>
              <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div><strong>Device:</strong> {booking.brand} {booking.model} ({booking.device})</div>
                <div><strong>Problem:</strong> {booking.problem}</div>
                <div><strong>Service Method:</strong> {booking.serviceMethod}</div>
                <div><strong>Scheduled:</strong> {customer.preferredDate} ({customer.preferredTime})</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn btn-primary btn-lg" href={`/track?id=${reference}&phone=${customer.phone}`}>
                <span className="icon">local_shipping</span> Track Repair Status
              </Link>
              <Link className="btn btn-secondary btn-lg" href="/"><span className="icon">home</span> Return Home</Link>
              <a className="btn btn-green btn-lg" target="_blank" rel="noopener noreferrer"
                 href={whatsappUrl(`Hi Bheral Systems, I booked repair ${reference} for my ${booking.brand} ${booking.model} (${booking.problem}). Sending photos now.`)}>
                <span className="icon">chat</span> Send Photos on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Nehru Place Hardware Laboratory</span>
              <h2>Explore Repair Services</h2>
              <p>Transparent turnaround times, genuine OEM spare parts, and written service warranties.</p>
            </div>
            <a className="btn btn-primary" href="#book-repair-wizard">
              <span className="icon">handyman</span> Jump to Booking Wizard
            </a>
          </div>

          <div className="component-strip" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginBottom: '2rem' }}>
            {['All', ...devices].map((d) => (
              <button
                type="button"
                key={d}
                className={`btn ${filter === d ? 'btn-primary' : 'btn-secondary'} btn-small`}
                style={{ justifyContent: 'center' }}
                onClick={() => setFilter(d)}
              >
                {d === 'All' ? `All Services (${services.length})` : d}
              </button>
            ))}
          </div>

          <div className="service-grid">
            {visibleServices.map((s) => (
              <article className="service-card" key={s.id}>
                <span className="service-icon"><span className="icon">{s.icon}</span></span>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.25rem' }}>{s.device}</div>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <footer>
                  <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span className="icon" style={{ fontSize: 14 }}>schedule</span> {s.time}
                  </span>
                  <button
                    onClick={() => startBooking(s)}
                    style={{ fontWeight: 700, background: 'none', border: 0, cursor: 'pointer', color: 'var(--primary)' }}
                  >
                    Book now →
                  </button>
                </footer>
              </article>
            ))}
          </div>
          <Reveal deps={[filter, visibleServices.length]} />
        </div>
      </section>

      <section className="section-sm">
        <div className="container pickup-banner">
          <div>
            <span className="eyebrow">Delhi NCR Convenience</span>
            <h2>Free Doorstep Pickup &amp; Drop Service</h2>
            <p>Available for eligible locations in Delhi NCR. Check your postal pincode below.</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', maxWidth: 440 }}>
              <input
                type="text"
                value={pincodeInput}
                onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && checkPincode()}
                placeholder="Enter 6-digit Delhi pincode"
                inputMode="numeric"
                style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: 'var(--radius-DEFAULT)', border: '1px solid var(--border)', outline: 'none' }}
              />
              <button type="button" className="btn btn-secondary" onClick={checkPincode}>Check</button>
            </div>
            {pincodeResult && (
              <div style={{ fontSize: 12, marginTop: '0.5rem', fontWeight: 600, color: !pincodeResult.valid ? 'var(--red)' : pincodeResult.freePickup ? 'var(--emerald-text)' : 'var(--primary)' }}>
                {pincodeResult.valid && pincodeResult.freePickup ? '✓ ' : ''}{pincodeResult.message}
              </div>
            )}
          </div>
          <div>
            <a className="btn btn-secondary" target="_blank" rel="noopener noreferrer"
               href={whatsappUrl('Hi Bheral Systems, I want to check repair pickup availability for my location in Delhi.')}>
              <span className="icon">chat</span> WhatsApp Technician Desk
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="book-repair-wizard">
        <div className="container">
          <div className="wizard-layout">
            <aside className="wizard-side">
              <span className="eyebrow">Booking Wizard</span>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>Book a Repair</h2>
              <ol className="wizard-progress">
                {WIZARD_STEPS.map((label, i) => (
                  <li key={label} className={i < step ? 'done' : i === step ? 'active' : ''}>
                    <span className="dot">{i < step ? '✓' : i + 1}</span>
                    <span>{label}</span>
                  </li>
                ))}
              </ol>
            </aside>

            <div className="wizard-card">
              <span className="eyebrow">Step {step + 1} of {WIZARD_STEPS.length}</span>

              {step === 0 && (
                <>
                  <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Which device needs attention?</h2>
                  <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Pick the hardware category so we assign the right technician.</p>
                  <div className="option-grid">
                    {DEVICES.map((d) => (
                      <label className={`option${booking.device === d.value ? ' selected' : ''}`} key={d.value}>
                        <input type="radio" name="wizDevice" checked={booking.device === d.value} onChange={() => setBooking({ ...booking, device: d.value })} />
                        <span className="icon">{d.icon}</span>
                        <strong>{d.value}</strong>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>What is the problem?</h2>
                  <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Choose the closest match — the engineer confirms after diagnosis.</p>
                  <div className="option-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
                    {problemsForDevice.map((p) => (
                      <label className={`option${booking.problem === p ? ' selected' : ''}`} key={p}>
                        <input type="radio" name="wizProblem" checked={booking.problem === p} onChange={() => setBooking({ ...booking, problem: p })} />
                        <strong>{p}</strong>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Brand &amp; Model</h2>
                  <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Helps us carry the right spare parts to your doorstep.</p>
                  <div className="form-grid">
                    <label className="field">
                      <span>Brand *</span>
                      <input type="text" value={booking.brand} onChange={(e) => setBooking({ ...booking, brand: e.target.value })} placeholder="e.g. Lenovo, Dell, HP, Apple" />
                      {errors['details.brand'] && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{errors['details.brand']}</small>}
                    </label>
                    <label className="field">
                      <span>Model / Series</span>
                      <input type="text" value={booking.model} onChange={(e) => setBooking({ ...booking, model: e.target.value })} placeholder="e.g. ThinkPad T480" />
                    </label>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Describe the issue</h2>
                  <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>What happens, when it started, and anything already tried.</p>
                  <label className="field full">
                    <span>Issue Description</span>
                    <textarea
                      rows={6}
                      value={booking.description}
                      onChange={(e) => setBooking({ ...booking, description: e.target.value })}
                      placeholder="e.g. Vertical purple lines appeared after the lid was pressed. Screen works on an external monitor."
                    />
                  </label>
                </>
              )}

              {step === 4 && (
                <>
                  <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Add photos (optional)</h2>
                  <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
                    Photos stay on your device — we record only the file names and you send the images on WhatsApp after booking.
                  </p>
                  <label className="field full">
                    <span>Select photos of the fault</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setBooking({ ...booking, photoNames: Array.from(e.target.files ?? []).map((f) => f.name) })
                      }
                    />
                  </label>
                  {booking.photoNames.length > 0 && (
                    <div className="spec-pills-row" style={{ marginTop: '1rem' }}>
                      {booking.photoNames.map((n) => <span className="spec" key={n}>{n}</span>)}
                    </div>
                  )}
                </>
              )}

              {step === 5 && (
                <>
                  <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>How should we service it?</h2>
                  <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Doorstep pickup is free across eligible Delhi NCR pincodes.</p>
                  <div className="choice-grid">
                    {SERVICE_METHODS.map((m) => (
                      <label className={`choice${booking.serviceMethod === m.value ? ' selected' : ''}`} key={m.value}>
                        <input type="radio" name="serviceMethod" checked={booking.serviceMethod === m.value} onChange={() => setBooking({ ...booking, serviceMethod: m.value })} />
                        <div>
                          <strong>{m.value}</strong>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--on-surface-variant)' }}>{m.hint}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {step === 6 && (
                <>
                  <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Contact &amp; Pickup Details</h2>
                  <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>We confirm the exact technician window by phone.</p>
                  <div className="form-grid">
                    <RepairField label="Full Name *" error={errors['customer.name']}>
                      <input type="text" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} autoComplete="name" />
                    </RepairField>
                    <RepairField label="Mobile Phone * (10 digits)" error={errors['customer.phone']}>
                      <input type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} inputMode="numeric" autoComplete="tel-national" />
                    </RepairField>
                    <RepairField label="WhatsApp Number (optional)" error={errors['customer.whatsapp']}>
                      <input type="tel" value={customer.whatsapp} onChange={(e) => setCustomer({ ...customer, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 10) })} inputMode="numeric" />
                    </RepairField>
                    <RepairField label="Email (optional)" error={errors['customer.email']}>
                      <input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} autoComplete="email" />
                    </RepairField>
                    <RepairField label="Address *" error={errors['customer.address']} full>
                      <input type="text" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="House/Flat No., Street, Building" />
                    </RepairField>
                    <RepairField label="Area / Locality *" error={errors['customer.area']}>
                      <input type="text" value={customer.area} onChange={(e) => setCustomer({ ...customer, area: e.target.value })} />
                    </RepairField>
                    <RepairField label="City *" error={errors['customer.city']}>
                      <input type="text" value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} />
                    </RepairField>
                    <RepairField label="Pincode *" error={errors['customer.pincode']}>
                      <input type="text" value={customer.pincode} onChange={(e) => setCustomer({ ...customer, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} inputMode="numeric" />
                    </RepairField>
                    <RepairField label="Preferred Date *" error={errors['customer.preferredDate']}>
                      <input type="date" value={customer.preferredDate} min={tomorrow()} onChange={(e) => setCustomer({ ...customer, preferredDate: e.target.value })} />
                    </RepairField>
                    <RepairField label="Preferred Time Slot *" error={errors['customer.preferredTime']}>
                      <select value={customer.preferredTime} onChange={(e) => setCustomer({ ...customer, preferredTime: e.target.value })}>
                        {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </RepairField>
                  </div>
                </>
              )}

              {step === 7 && (
                <>
                  <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Review your request</h2>
                  <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Check the details, then confirm the booking.</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      {[
                        ['Device', `${booking.device} — ${booking.brand} ${booking.model}`.trim()],
                        ['Problem', booking.problem],
                        ['Description', booking.description || '—'],
                        ['Photos', booking.photoNames.length ? booking.photoNames.join(', ') : 'None attached'],
                        ['Service Method', booking.serviceMethod],
                        ['Contact', `${customer.name} · +91 ${customer.phone}`],
                        ['Address', `${customer.address}, ${customer.area}, ${customer.city} - ${customer.pincode}`],
                        ['Scheduled', `${customer.preferredDate} (${customer.preferredTime})`],
                      ].map(([k, v]) => (
                        <tr key={k}>
                          <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--navy)', width: '32%', verticalAlign: 'top' }}>{k}</td>
                          <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--on-surface-variant)' }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              <div className="wizard-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
                  <span className="icon">arrow_back</span> Back
                </button>
                <button type="button" className="btn btn-primary" onClick={next} disabled={submitting}>
                  {submitting ? 'Booking…' : step === WIZARD_STEPS.length - 1 ? 'Confirm Repair Booking' : 'Continue'}{' '}
                  <span className="icon">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
          <Reveal deps={[step]} />
        </div>
      </section>
    </>
  );
}

function RepairField({ label, error, full, children }: { label: string; error?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`field${full ? ' full' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</small>}
    </label>
  );
}
