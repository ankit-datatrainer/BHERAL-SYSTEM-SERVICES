/**
 * Buy-back valuation engine.
 *
 * This is a direct port of the calculation that used to live in the browser
 * (js/sell.js `calculateEstimate`). Moving it server-side means the multipliers
 * and penalties are no longer visible to — or editable by — the customer.
 */
import type { ValuationConfig, ValuationInput, ValuationResult, FunctionalQuestions } from '../types.js';

/** Value lost per failed/faulty answer, as a fraction of the running multiplier. */
const PENALTIES: Array<{ key: keyof FunctionalQuestions; whenTrue: boolean; amount: number }> = [
  { key: 'powersOn', whenTrue: false, amount: 0.35 },
  { key: 'displayWorking', whenTrue: false, amount: 0.25 },
  { key: 'screenDamage', whenTrue: true, amount: 0.2 },
  { key: 'keyboardWorking', whenTrue: false, amount: 0.08 },
  { key: 'trackpadWorking', whenTrue: false, amount: 0.05 },
  { key: 'batteryWorking', whenTrue: false, amount: 0.12 },
  { key: 'chargingWorking', whenTrue: false, amount: 0.1 },
  { key: 'chargerAvailable', whenTrue: false, amount: 0.06 },
  { key: 'wifiWorking', whenTrue: false, amount: 0.05 },
  { key: 'usbWorking', whenTrue: false, amount: 0.04 },
  { key: 'bodyDamage', whenTrue: true, amount: 0.1 },
  { key: 'liquidDamage', whenTrue: true, amount: 0.25 },
  { key: 'motherboardProblem', whenTrue: true, amount: 0.3 },
];

const ACCESSORY_BONUS: Record<string, number> = {
  'Original Charger': 1.05,
  Box: 1.03,
  Invoice: 1.04,
};

const DEFAULT_QUESTIONS: FunctionalQuestions = {
  powersOn: true,
  displayWorking: true,
  screenDamage: false,
  keyboardWorking: true,
  trackpadWorking: true,
  batteryWorking: true,
  chargingWorking: true,
  chargerAvailable: true,
  wifiWorking: true,
  usbWorking: true,
  bodyDamage: false,
  liquidDamage: false,
  motherboardProblem: false,
};

/** Multipliers below this floor are clamped — a dead device is still worth scrap. */
const MIN_MULTIPLIER = 0.12;
const MAX_PENALTY = 0.85;
const MIN_ESTIMATE = 400;
const ROUND_TO = 50;

export function calculateValuation(input: ValuationInput, cfg: ValuationConfig): ValuationResult {
  const base = cfg.basePrices[input.category] ?? 15000;
  let multiplier = cfg.brandMultipliers[input.brand ?? ''] ?? 1;

  if (input.category === 'Laptop') {
    multiplier *= cfg.processorMultipliers[input.processor ?? ''] ?? 1;
    multiplier *= cfg.ramMultipliers[input.ram ?? ''] ?? 1;
    multiplier *= cfg.storageMultipliers[input.storage ?? ''] ?? 1;
    multiplier *= cfg.storageTypeMultipliers[input.storageType ?? ''] ?? 1;
    multiplier *= cfg.yearMultipliers[input.year ?? ''] ?? 0.65;
    multiplier *= cfg.conditionMultipliers[input.cosmeticCondition ?? ''] ?? 0.86;

    const answers = { ...DEFAULT_QUESTIONS, ...(input.functionalQuestions ?? {}) };
    const penalty = PENALTIES.reduce(
      (sum, rule) => (answers[rule.key] === rule.whenTrue ? sum + rule.amount : sum),
      0,
    );

    multiplier = Math.max(MIN_MULTIPLIER, multiplier * (1 - Math.min(MAX_PENALTY, penalty)));

    for (const accessory of input.accessories ?? []) {
      multiplier *= ACCESSORY_BONUS[accessory] ?? 1;
    }
  } else {
    multiplier *= cfg.conditionMultipliers[input.cosmeticCondition ?? ''] ?? 0.85;
    multiplier *= cfg.yearMultipliers[input.year ?? ''] ?? 0.7;

    const rules = cfg.componentRules;
    switch (input.category) {
      case 'SSD':
        multiplier *= rules.SSD?.capacity?.[input.capacity ?? ''] ?? 1;
        multiplier *= rules.SSD?.health?.[input.health ?? ''] ?? 1;
        break;
      case 'HDD':
        multiplier *= rules.HDD?.capacity?.[input.capacity ?? ''] ?? 1;
        multiplier *= rules.HDD?.badSectors?.[input.badSectors ?? ''] ?? 1;
        break;
      case 'RAM':
        multiplier *= rules.RAM?.capacity?.[input.ram ?? ''] ?? 1;
        multiplier *= rules.RAM?.generation?.[input.generation ?? ''] ?? 1;
        break;
      case 'GPU':
        multiplier *= rules.GPU?.vram?.[input.vram ?? ''] ?? 1;
        break;
      default:
        break;
    }
  }

  const estimate = Math.max(MIN_ESTIMATE, Math.round((base * multiplier) / ROUND_TO) * ROUND_TO);

  return {
    estimate,
    minRange: Math.round(estimate * 0.92),
    maxRange: Math.round(estimate * 1.08),
    currency: 'INR',
  };
}
