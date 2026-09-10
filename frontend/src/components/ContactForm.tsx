'use client';

/** Contact / enquiry form. Corporate links land here with ?type=corporate. */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useStore } from './StoreProvider';

const ENQUIRY_TYPES = [
  { value: 'general', label: 'General Enquiry' },
  { value: 'buy', label: 'Buying a Refurbished Device' },
  { value: 'sell', label: 'Selling My Device' },
  { value: 'repair', label: 'Repair & Diagnostics' },
  { value: 'corporate', label: 'Corporate / Bulk Order' },
  { value: 'warranty', label: 'Warranty Claim' },
];

export function ContactForm() {
  const searchParams = useSearchParams();
  const { toast } = useStore();

  const [form, setForm] = useState({
    name: '', phone: '', email: '', subject: '', enquiryType: 'general', message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // Preselect the enquiry type from ?type=.
  useEffect(() => {
    const type = searchParams.get('type');
    if (type && ENQUIRY_TYPES.some((t) => t.value === type)) {
      setForm((f) => ({ ...f, enquiryType: type }));
    }
  }, [searchParams]);

  const update = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const res = await api.contact(form);
      setSent(true);
      toast(res.message, 'success');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        toast(Object.keys(err.fieldErrors).length ? 'Please correct the highlighted fields' : err.message, 'error');
      } else {
        toast('Could not send your message. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="form-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--emerald-soft)', color: 'var(--emerald)', display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem' }}>
          <span className="icon" style={{ fontSize: 36 }}>mark_email_read</span>
        </div>
        <h2>Message Received</h2>
        <p style={{ color: 'var(--on-surface-variant)', maxWidth: 420, margin: '0 auto 1.5rem' }}>
          Thanks {form.name.split(' ')[0]} — our Delhi team will reply shortly. For anything urgent, call us or message on WhatsApp.
        </p>
        <button className="btn btn-secondary" onClick={() => { setSent(false); setForm({ name: '', phone: '', email: '', subject: '', enquiryType: 'general', message: '' }); }}>
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form className="form-card" onSubmit={submit} noValidate>
      <h2 style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>Send Us a Message</h2>
      <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, marginBottom: '1.5rem' }}>
        Tell us what you need and we will get back to you with a clear answer.
      </p>

      <div className="form-grid">
        <label className="field">
          <span>Your Name *</span>
          <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} autoComplete="name" />
          {errors.name && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{errors.name}</small>}
        </label>

        <label className="field">
          <span>Enquiry Type</span>
          <select value={form.enquiryType} onChange={(e) => update('enquiryType', e.target.value)}>
            {ENQUIRY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Mobile Number</span>
          <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" autoComplete="tel-national" />
          {errors.phone && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{errors.phone}</small>}
        </label>

        <label className="field">
          <span>Email Address</span>
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" />
          {errors.email && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{errors.email}</small>}
        </label>

        <label className="field full">
          <span>Subject</span>
          <input type="text" value={form.subject} onChange={(e) => update('subject', e.target.value)} placeholder="e.g. Bulk order for 20 ThinkPads" />
        </label>

        <label className="field full">
          <span>Message *</span>
          <textarea rows={6} value={form.message} onChange={(e) => update('message', e.target.value)} placeholder="How can we help?" />
          {errors.message && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{errors.message}</small>}
        </label>
      </div>

      <button className="btn btn-primary btn-lg" type="submit" disabled={submitting} style={{ marginTop: '1.5rem' }}>
        <span className="icon">send</span> {submitting ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}
