'use client';

/**
 * Multi-step buy-back wizard.
 *
 * Laptops get six steps (config, functional checks, cosmetics, valuation,
 * pickup); components get five. The estimate is always computed by the API,
 * debounced as the customer edits, so pricing rules stay server-side.
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { whatsappUrl } from '@/lib/format';
import { STORAGE_KEYS, readJSON, removeKey, writeJSON } from '@/lib/storage';
import { useStore } from './StoreProvider';
import { Reveal } from './Reveal';

const LAPTOP_STEPS = ['Category & Brand', 'Model & Config', 'Functional Checks', 'Cosmetics & Spares', 'Review Summary', 'Doorstep Pickup'];
const PART_STEPS = ['Category & Brand', 'Component Details', 'Condition & Health', 'Review Summary', 'Doorstep Pickup'];

const DEVICE_CATEGORIES = [
  { value: 'Laptop', icon: 'laptop' }, { value: 'Desktop', icon: 'desktop_windows' },
  { value: 'Monitor', icon: 'tv' }, { value: 'Printer', icon: 'print' },
  { value: 'SSD', icon: 'hard_drive' }, { value: 'HDD', icon: 'album' },
  { value: 'RAM', icon: 'developer_board' }, { value: 'GPU', icon: 'memory' },
  { value: 'Processor', icon: 'stream_apps' }, { value: 'Motherboard', icon: 'check_indeterminate_small' },
];

const LAPTOP_BRANDS = ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'MSI', 'Other'];
const PART_BRANDS = ['Samsung', 'Crucial', 'Kingston', 'Western Digital', 'Seagate', 'Corsair', 'Intel', 'AMD', 'ASUS', 'HP', 'Dell', 'Other'];

const BRAND_LOGOS_MAP: Record<string, { src: string; height: number }> = {
  Apple: { src: '/assets/images/brands/apple.svg', height: 26 },
  Dell: { src: '/assets/images/brands/dell.svg', height: 28 },
  HP: { src: '/assets/images/brands/hp.svg', height: 26 },
  Lenovo: { src: '/assets/images/brands/lenovo.svg', height: 18 },
  ASUS: { src: '/assets/images/brands/asus.svg', height: 16 },
  Acer: { src: '/assets/images/brands/acer.svg', height: 18 },
  MSI: { src: '/assets/images/brands/msi.svg', height: 16 },
  Samsung: { src: '/assets/images/brands/samsung.svg', height: 15 },
};

const PROCESSORS = ['Apple M-series (M1/M2/M3)', 'Core i7 / Ryzen 7 (High End)', 'Core i5 / Ryzen 5 (Mainstream)', 'Core i3 / Ryzen 3 (Entry)', 'Intel Core i9 / Ryzen 9', 'Intel Xeon / Workstation', 'Other / Older Dual-Core'];
const RAMS = ['4GB', '8GB', '16GB', '32GB+'];
const STORAGES = ['128GB', '256GB', '512GB', '1TB+'];
const STORAGE_TYPES = ['NVMe SSD', 'SATA SSD', 'SSD + HDD', 'HDD Only'];
const SCREEN_SIZES = ['13.3-inch', '14-inch', '15.6-inch', '16-inch or larger'];
const YEARS = ['2025-2026', '2023-2024', '2021-2022', '2019-2020', 'Before 2019'];
const TIME_SLOTS = ['10:00 AM – 01:00 PM (Morning)', '01:00 PM – 04:00 PM (Afternoon)', '04:00 PM – 07:30 PM (Evening)'];
const ACCESSORIES = ['Original Charger', 'Box', 'Invoice', 'Laptop Bag', 'Wireless Mouse'];

const QUESTIONS: Array<{ key: string; label: string }> = [
  { key: 'powersOn', label: 'Does the laptop switch on / power up properly?' },
  { key: 'displayWorking', label: 'Is the display screen completely working with no lines?' },
  { key: 'screenDamage', label: 'Are there cracks, dead pixels, or glass damage on screen?' },
  { key: 'keyboardWorking', label: 'Do all keyboard keys function smoothly?' },
  { key: 'trackpadWorking', label: 'Is the trackpad & touch gestures working?' },
  { key: 'batteryWorking', label: 'Does the laptop battery hold charge (minimum 1.5–2 hours)?' },
  { key: 'chargingWorking', label: 'Does the charging port work without loose connection?' },
  { key: 'chargerAvailable', label: 'Do you have the original power adapter / charger available?' },
  { key: 'wifiWorking', label: 'Are Wi-Fi and Bluetooth wireless working?' },
  { key: 'usbWorking', label: 'Are USB / Type-C ports functioning properly?' },
  { key: 'bodyDamage', label: 'Are there broken hinges, body cracks, or severe dents?' },
  { key: 'liquidDamage', label: 'Has the laptop ever suffered liquid or water spill?' },
  { key: 'motherboardProblem', label: 'Has there been any motherboard heating or previous chip repair?' },
];

const LAPTOP_COSMETICS = [
  { value: 'Excellent', label: 'Excellent (Like New)', desc: 'Flawless body, zero visible scratches or paint peel.' },
  { value: 'Good', label: 'Good (Minor Scratches)', desc: 'Normal light signs of office use. No cracks or broken parts.' },
  { value: 'Fair', label: 'Fair (Noticeable Wear)', desc: 'Visible scuffs, corner rub marks, or minor chassis wear.' },
  { value: 'Poor', label: 'Poor (Heavy Wear)', desc: 'Deep scratches, loose rubber pads, or noticeable dents.' },
  { value: 'Damaged', label: 'Damaged / Broken Part', desc: 'Cracked plastic, broken casing, or damaged hinges.' },
];

const PART_COSMETICS = [
  { value: 'Excellent', label: 'Fully Working & Tested', desc: 'No faults, clean board, flawless operation in testing.' },
  { value: 'Good', label: 'Normal Working Order', desc: 'Tested working with standard cosmetic signs of installation.' },
  { value: 'Fair', label: 'Intermittent / Minor Issues', desc: 'Works but occasional detection delays or high temperatures.' },
  { value: 'Damaged', label: 'Dead / Non-Functional', desc: 'No display, dead chip, or physical damage (scrap salvage).' },
];

interface WizardState {
  category: string; brand: string; model: string;
  processor: string; ram: string; storage: string; storageType: string; screenSize: string; year: string;
  partModel: string; capacity: string; interfaceType: string; health: string; badSectors: string;
  generation: string; vram: string;
  functionalQuestions: Record<string, boolean>;
  cosmeticCondition: string;
  accessories: string[];
}

const DEFAULT_QUESTIONS: Record<string, boolean> = {
  powersOn: true, displayWorking: true, screenDamage: false, keyboardWorking: true,
  trackpadWorking: true, batteryWorking: true, chargingWorking: true, chargerAvailable: true,
  wifiWorking: true, usbWorking: true, bodyDamage: false, liquidDamage: false, motherboardProblem: false,
};

const defaultState = (category: string): WizardState => ({
  category, brand: '', model: '',
  processor: 'Core i5 / Ryzen 5 (Mainstream)', ram: '8GB', storage: '512GB',
  storageType: 'NVMe SSD', screenSize: '14-inch', year: '2021-2022',
  partModel: '', capacity: '512GB', interfaceType: 'NVMe', health: '90–100%',
  badSectors: 'No bad sectors', generation: 'DDR4', vram: '4GB',
  functionalQuestions: { ...DEFAULT_QUESTIONS },
  cosmeticCondition: 'Good',
  accessories: ['Original Charger', 'Invoice'],
});

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().split('T')[0];

interface Confirmation {
  id: string; brand: string; model: string;
  date: string; time: string; address: string; phone: string;
}

export function SellWizard() {
  const searchParams = useSearchParams();
  const { toast } = useStore();
  const initialCategory = searchParams.get('category') || 'Laptop';

  const [state, setState] = useState<WizardState>(() => defaultState(initialCategory));
  const [step, setStep] = useState(0);
  const [pickup, setPickup] = useState({
    name: '', phone: '', whatsapp: '', email: '',
    address: '', area: '', city: 'Delhi', pincode: '',
    preferredDate: tomorrow(), preferredTime: TIME_SLOTS[0], instructions: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const isLaptop = state.category === 'Laptop' || state.category === 'Desktop';
  const steps = isLaptop ? LAPTOP_STEPS : PART_STEPS;

  // Restore an in-progress valuation, but let ?category= win.
  useEffect(() => {
    const saved = readJSON<Partial<WizardState> | null>(STORAGE_KEYS.sellProgress, null);
    if (saved?.category) {
      setState((s) => ({ ...s, ...saved, category: searchParams.get('category') || saved.category! }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    writeJSON(STORAGE_KEYS.sellProgress, state);
  }, [state]);

  /** Payload the API's valuation schema expects. */
  const devicePayload = useMemo(
    () => ({
      category: state.category,
      brand: state.brand || undefined,
      model: state.model || state.partModel || undefined,
      processor: state.processor,
      ram: state.ram,
      storage: state.storage,
      storageType: state.storageType,
      year: state.year,
      cosmeticCondition: state.cosmeticCondition,
      accessories: state.accessories,
      functionalQuestions: state.functionalQuestions,
      capacity: state.capacity,
      interfaceType: state.interfaceType,
      health: state.health,
      badSectors: state.badSectors,
      generation: state.generation,
      vram: state.vram,
    }),
    [state],
  );

  const set = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  }, []);

  const changeCategory = (category: string) => {
    setState({ ...defaultState(category) });
    setStep(0);
  };

  const next = () => {
    if (step === 0 && !state.brand) {
      toast('Please select the manufacturer brand', 'error');
      return;
    }
    if (step === 1 && isLaptop && !state.model.trim()) {
      toast('Please enter the model name', 'error');
      return;
    }
    if (step === steps.length - 1) {
      void submit();
      return;
    }
    setStep((s) => s + 1);
    document.getElementById('sell-wizard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async () => {
    setSubmitting(true);
    setErrors({});
    try {
      const result = await api.createSellRequest({ device: devicePayload, customer: pickup });
      setConfirmation({
        id: result.id,
        brand: state.brand,
        model: state.model || state.partModel || state.category,
        date: pickup.preferredDate,
        time: pickup.preferredTime,
        address: `${pickup.address}, ${pickup.area}, ${pickup.city} - ${pickup.pincode}`,
        phone: pickup.phone,
      });
      removeKey(STORAGE_KEYS.sellProgress);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        toast(Object.keys(err.fieldErrors).length ? 'Please correct the highlighted fields' : err.message, 'error');
      } else {
        toast('Could not submit your request. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="cart-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--emerald-soft)', color: 'var(--emerald)', display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem' }}>
              <span className="icon" style={{ fontSize: 48 }}>check_circle</span>
            </div>
            <span className="badge badge-green" style={{ fontSize: 12, padding: '0.35rem 0.75rem', marginBottom: '0.75rem' }}>Sell Request Registered</span>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Doorstep Inspection Scheduled!</h1>
            <p style={{ color: 'var(--on-surface-variant)', maxWidth: 520, margin: '0 auto 1.5rem' }}>
              Our Delhi pickup representative will call <strong>+91 {confirmation.phone}</strong> to confirm technician arrival.
            </p>

            <div style={{ background: 'var(--surface-container-low)', border: '1.5px dashed var(--tertiary)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 480, margin: '0 auto 2rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 700 }}>Sell Request ID</span>
                <span className="badge badge-green">Save this ID</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--tertiary)', letterSpacing: 1, marginBottom: '0.75rem' }}>
                {confirmation.id}
              </div>
              <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div><strong>Device:</strong> {confirmation.brand} {confirmation.model}</div>
                <div><strong>Pickup Scheduled:</strong> {confirmation.date} ({confirmation.time})</div>
                <div><strong>Pickup Address:</strong> {confirmation.address}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn btn-primary btn-lg" href={`/track?id=${confirmation.id}&phone=${confirmation.phone}`}>
                <span className="icon">local_shipping</span> Track Inspection Status
              </Link>
              <Link className="btn btn-secondary btn-lg" href="/"><span className="icon">home</span> Return Home</Link>
              <a className="btn btn-green btn-lg" target="_blank" rel="noopener noreferrer"
                 href={whatsappUrl(`Hi Bheral Systems, I scheduled selling request ${confirmation.id} for my ${confirmation.brand} ${confirmation.model}. Please share my quote and confirm the technician slot.`)}>
                <span className="icon">chat</span> WhatsApp Selling Desk
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const brands = isLaptop ? LAPTOP_BRANDS : PART_BRANDS;
  const cosmetics = isLaptop ? LAPTOP_COSMETICS : PART_COSMETICS;
  const valuationStepIndex = isLaptop ? 4 : 3;
  const pickupStepIndex = steps.length - 1;

  return (
    <section className="section" id="sell-wizard">
      <div className="container">
        <div className="wizard-layout">
          <aside className="wizard-side">
            <span className="eyebrow green">Step-by-Step Valuation</span>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>Selling Wizard</h2>
            <ol className="wizard-progress">
              {steps.map((label, i) => (
                <li key={label} className={i < step ? 'done' : i === step ? 'active' : ''}>
                  <span className="dot">{i < step ? '✓' : i + 1}</span>
                  <span>{label}</span>
                </li>
              ))}
            </ol>

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--emerald-soft)', border: '1px solid var(--emerald-border)', borderRadius: 'var(--radius-md)' }}>
              <small style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--emerald-text)', fontWeight: 700 }}>
                Your quote
              </small>
              <strong style={{ fontSize: 13.5, color: 'var(--navy)', display: 'block', marginTop: '0.3rem', lineHeight: 1.5 }}>
                We will notify you on your WhatsApp within 1&ndash;2 working days.
              </strong>
            </div>

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-DEFAULT)', fontSize: 12, color: 'var(--on-surface-variant)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="icon" style={{ color: 'var(--emerald-text)', fontSize: 18 }}>verified</span>
                <span>100% Genuine Spot Cash / UPI</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="icon" style={{ color: 'var(--primary)', fontSize: 18 }}>electric_moped</span>
                <span>Free Doorstep Pickup in Delhi NCR</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="icon" style={{ color: 'var(--tertiary)', fontSize: 18 }}>lock_reset</span>
                <span>DoD Certified Free Data Wiping</span>
              </div>
            </div>
          </aside>

          <div className="wizard-card">
            <span className="eyebrow">Step {step + 1} of {steps.length}</span>

            {step === 0 && (
              <>
                <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Select Device &amp; Brand</h2>
                <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
                  Choose what you want to sell and its manufacturer.
                </p>
                <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>Device Type</h3>
                <div className="option-grid" style={{ marginBottom: '2rem' }}>
                  {DEVICE_CATEGORIES.map((c) => (
                    <label className={`option${state.category === c.value ? ' selected' : ''}`} key={c.value}>
                      <input type="radio" name="sellCategory" checked={state.category === c.value} onChange={() => changeCategory(c.value)} />
                      <span className="icon">{c.icon}</span>
                      <strong>{c.value}</strong>
                    </label>
                  ))}
                </div>
                <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>Brand</h3>
                <div className="option-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                  {brands.map((b) => {
                    const brandLogo = BRAND_LOGOS_MAP[b];
                    return (
                      <label className={`option${state.brand === b ? ' selected' : ''}`} key={b} style={{ minHeight: 74, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.75rem 0.5rem' }}>
                        <input type="radio" name="sellBrand" checked={state.brand === b} onChange={() => set('brand', b)} />
                        {brandLogo ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={brandLogo.src}
                              alt={b}
                              style={{ height: brandLogo.height, maxWidth: 85, objectFit: 'contain' }}
                              loading="lazy"
                            />
                            <strong style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{b}</strong>
                          </>
                        ) : (
                          <>
                            <span className="icon" style={{ fontSize: 24, color: 'var(--primary)' }}>devices</span>
                            <strong>{b}</strong>
                          </>
                        )}
                      </label>
                    );
                  })}
                </div>
              </>
            )}

            {step === 1 && isLaptop && (
              <>
                <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Model &amp; Hardware Configuration</h2>
                <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
                  Enter the model or series name and the installed specifications.
                </p>
                <div className="form-grid">
                  <label className="field full">
                    <span>Model / Series Name *</span>
                    <input type="text" value={state.model} onChange={(e) => set('model', e.target.value)} placeholder="e.g. ThinkPad T14 Gen 2 / MacBook Air M1" />
                  </label>
                  <Select label="Processor Family *" value={state.processor} options={PROCESSORS} onChange={(v) => set('processor', v)} />
                  <Select label="Installed RAM *" value={state.ram} options={RAMS} onChange={(v) => set('ram', v)} />
                  <Select label="Storage Capacity *" value={state.storage} options={STORAGES} onChange={(v) => set('storage', v)} />
                  <Select label="Storage Drive Type *" value={state.storageType} options={STORAGE_TYPES} onChange={(v) => set('storageType', v)} />
                  <Select label="Screen Size" value={state.screenSize} options={SCREEN_SIZES} onChange={(v) => set('screenSize', v)} />
                  <Select label="Approximate Purchase Year" value={state.year} options={YEARS} onChange={(v) => set('year', v)} />
                </div>
              </>
            )}

            {step === 1 && !isLaptop && (
              <>
                <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{state.category} Specifications</h2>
                <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
                  Provide the exact hardware metrics for your {state.category}.
                </p>
                <div className="form-grid">
                  {state.category === 'SSD' && (
                    <>
                      <Select label="Capacity *" value={state.capacity} options={['128GB', '256GB', '512GB', '1TB+']} onChange={(v) => set('capacity', v)} />
                      <Select label="Interface *" value={state.interfaceType} options={['NVMe', 'SATA']} onChange={(v) => set('interfaceType', v)} />
                      <Select label="Reported Health (SMART) *" value={state.health} options={['90–100%', '70–89%', 'Below 70%']} onChange={(v) => set('health', v)} />
                    </>
                  )}
                  {state.category === 'HDD' && (
                    <>
                      <Select label="Capacity *" value={state.capacity} options={['500GB', '1TB', '2TB+']} onChange={(v) => set('capacity', v)} />
                      <Select label="Bad Sector Status *" value={state.badSectors} options={['No bad sectors', 'Minor bad sectors', 'Clicking/Dead']} onChange={(v) => set('badSectors', v)} />
                    </>
                  )}
                  {state.category === 'RAM' && (
                    <>
                      <Select label="Capacity *" value={state.ram} options={RAMS} onChange={(v) => set('ram', v)} />
                      <Select label="DDR Generation *" value={state.generation} options={['DDR3', 'DDR4', 'DDR5']} onChange={(v) => set('generation', v)} />
                    </>
                  )}
                  {state.category === 'GPU' && (
                    <>
                      <Select label="VRAM Capacity *" value={state.vram} options={['2GB', '4GB', '6GB/8GB', '10GB+']} onChange={(v) => set('vram', v)} />
                      <label className="field">
                        <span>Graphics Card Model</span>
                        <input type="text" value={state.partModel} onChange={(e) => set('partModel', e.target.value)} placeholder="e.g. RTX 3060 / RX 580" />
                      </label>
                    </>
                  )}
                  {['Processor', 'Motherboard', 'Monitor', 'Printer'].includes(state.category) && (
                    <label className="field full">
                      <span>Exact Model / Series</span>
                      <input type="text" value={state.partModel} onChange={(e) => set('partModel', e.target.value)} placeholder="e.g. Core i7-10700K / B450M / 24-inch IPS" />
                    </label>
                  )}
                  <Select label="Approximate Purchase Year" value={state.year} options={YEARS} onChange={(v) => set('year', v)} />
                </div>
              </>
            )}

            {step === 2 && isLaptop && (
              <>
                <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Functional Condition Questions</h2>
                <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
                  Answer accurately so the quote we send you matches the device we collect.
                </p>
                <div className="question-list">
                  {QUESTIONS.map((q) => (
                    <div key={q.key} className="question" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.875rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-DEFAULT)', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{q.label}</span>
                      <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                        {[true, false].map((val) => (
                          <label className="choice" key={String(val)} style={{ margin: 0, padding: '0.35rem 0.75rem', fontSize: 13, borderRadius: 'var(--radius-DEFAULT)' }}>
                            <input
                              type="radio"
                              name={`q_${q.key}`}
                              checked={state.functionalQuestions[q.key] === val}
                              onChange={() => set('functionalQuestions', { ...state.functionalQuestions, [q.key]: val })}
                            />{' '}
                            {val ? 'Yes' : 'No'}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {((step === 3 && isLaptop) || (step === 2 && !isLaptop)) && (
              <>
                <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>
                  {isLaptop ? 'Cosmetic Condition & Accessories' : 'Working Condition & Status'}
                </h2>
                <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
                  {isLaptop ? 'Select the physical appearance rating and included accessories.' : 'Select the operating reliability status of the component.'}
                </p>
                <div className="choice-grid" style={{ marginBottom: isLaptop ? '2rem' : 0 }}>
                  {cosmetics.map((c) => (
                    <label className={`choice${state.cosmeticCondition === c.value ? ' selected' : ''}`} key={c.value}>
                      <input type="radio" name="cosmeticGrade" checked={state.cosmeticCondition === c.value} onChange={() => set('cosmeticCondition', c.value)} />
                      <div>
                        <strong>{c.label}</strong>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--on-surface-variant)' }}>{c.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {isLaptop && (
                  <>
                    <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>
                      Available Accessories (Increases Value)
                    </h3>
                    <div className="option-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                      {ACCESSORIES.map((a) => (
                        <label className={`option${state.accessories.includes(a) ? ' selected' : ''}`} key={a}>
                          <input
                            type="checkbox"
                            checked={state.accessories.includes(a)}
                            onChange={() =>
                              set('accessories', state.accessories.includes(a)
                                ? state.accessories.filter((x) => x !== a)
                                : [...state.accessories, a])
                            }
                          />
                          <span className="icon">check_circle</span>
                          <strong>{a}</strong>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {step === valuationStepIndex && (
              <>
                <span className="eyebrow green">Almost done</span>
                <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Review your device details</h2>
                <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
                  Check everything below is right. Our team reviews each device individually before quoting.
                </p>

                <div className="quote-promise">
                  <span className="icon">chat</span>
                  <div>
                    <strong>We will notify you on your WhatsApp in 1&ndash;2 working days.</strong>
                    <p>
                      A specialist checks your configuration against current Delhi NCR market rates and
                      sends you a firm price on WhatsApp. No obligation &mdash; accept it and we schedule
                      a free doorstep pickup, or simply ignore it.
                    </p>
                  </div>
                </div>

                <div className="highlight-specs">
                  <div className="highlight-spec">
                    <small>Item</small>
                    <strong>{state.brand} {state.model || state.partModel || state.category}</strong>
                  </div>
                  <div className="highlight-spec">
                    <small>Declared Condition</small>
                    <strong>{state.cosmeticCondition}</strong>
                  </div>
                  <div className="highlight-spec">
                    <small>Storage / RAM</small>
                    <strong>{state.storage || state.capacity || '—'} / {state.ram || '—'}</strong>
                  </div>
                  <div className="highlight-spec">
                    <small>Quote Delivery</small>
                    <strong>WhatsApp, 1&ndash;2 working days</strong>
                  </div>
                </div>
              </>
            )}

            {step === pickupStepIndex && (
              <>
                <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Schedule Doorstep Inspection &amp; Pickup</h2>
                <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
                  Once you accept the quote we send on WhatsApp, our Delhi technician collects the device and pays you on the spot.
                </p>
                <div className="form-grid">
                  <PickupField label="Full Name *" error={errors['customer.name']}>
                    <input type="text" value={pickup.name} onChange={(e) => setPickup({ ...pickup, name: e.target.value })} placeholder="e.g. Vikram Mehra" autoComplete="name" />
                  </PickupField>
                  <PickupField label="Mobile Phone * (10 digits)" error={errors['customer.phone']}>
                    <input type="tel" value={pickup.phone} onChange={(e) => setPickup({ ...pickup, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="9876543210" inputMode="numeric" autoComplete="tel-national" />
                  </PickupField>
                  <PickupField label="WhatsApp Number (optional)" error={errors['customer.whatsapp']}>
                    <input type="tel" value={pickup.whatsapp} onChange={(e) => setPickup({ ...pickup, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="9876543210" inputMode="numeric" />
                  </PickupField>
                  <PickupField label="Email Address (optional)" error={errors['customer.email']}>
                    <input type="email" value={pickup.email} onChange={(e) => setPickup({ ...pickup, email: e.target.value })} placeholder="you@example.com" autoComplete="email" />
                  </PickupField>
                  <PickupField label="Pickup Street Address *" error={errors['customer.address']} full>
                    <input type="text" value={pickup.address} onChange={(e) => setPickup({ ...pickup, address: e.target.value })} placeholder="House/Flat No., Street, Building" />
                  </PickupField>
                  <PickupField label="Area / Locality *" error={errors['customer.area']}>
                    <input type="text" value={pickup.area} onChange={(e) => setPickup({ ...pickup, area: e.target.value })} placeholder="e.g. Lajpat Nagar" />
                  </PickupField>
                  <PickupField label="City *" error={errors['customer.city']}>
                    <input type="text" value={pickup.city} onChange={(e) => setPickup({ ...pickup, city: e.target.value })} />
                  </PickupField>
                  <PickupField label="Delhi NCR Pincode *" error={errors['customer.pincode']}>
                    <input type="text" value={pickup.pincode} onChange={(e) => setPickup({ ...pickup, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="110024" inputMode="numeric" />
                  </PickupField>
                  <PickupField label="Preferred Inspection Date *" error={errors['customer.preferredDate']}>
                    <input type="date" value={pickup.preferredDate} min={tomorrow()} onChange={(e) => setPickup({ ...pickup, preferredDate: e.target.value })} />
                  </PickupField>
                  <PickupField label="Preferred Time Slot *" error={errors['customer.preferredTime']}>
                    <select value={pickup.preferredTime} onChange={(e) => setPickup({ ...pickup, preferredTime: e.target.value })}>
                      {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </PickupField>
                  <PickupField label="Special Instructions / Landmark" full>
                    <textarea value={pickup.instructions} onChange={(e) => setPickup({ ...pickup, instructions: e.target.value })} placeholder="Near metro station, call before arrival, etc." />
                  </PickupField>
                </div>
              </>
            )}

            <div className="wizard-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
                <span className="icon">arrow_back</span> Back
              </button>
              <button type="button" className="btn btn-primary" onClick={next} disabled={submitting}>
                {submitting ? 'Submitting…' : step === steps.length - 1 ? 'Schedule Doorstep Pickup' : 'Continue'}{' '}
                <span className="icon">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
        <Reveal deps={[step, state.category]} />
      </div>
    </section>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function PickupField({ label, error, full, children }: { label: string; error?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`field${full ? ' full' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <small style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</small>}
    </label>
  );
}
