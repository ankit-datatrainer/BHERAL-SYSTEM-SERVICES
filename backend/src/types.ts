/**
 * Shared domain types. The frontend mirrors these in `frontend/src/lib/types.ts`
 * so both sides of the wire agree on the shape of every payload.
 */

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  images: string[];
  price: number;
  originalPrice?: number;
  discount?: number;
  processor: string;
  ram: number;
  storage: number;
  storageType: string;
  gpu: string;
  screenSize: number;
  operatingSystem: string;
  condition: string;
  rating: number;
  reviewCount: number;
  stock: number;
  warranty: string;
  isNew: boolean;
  featured: boolean;
  description: string;
  specifications: Record<string, string>;
}

export interface RepairService {
  id: string;
  name: string;
  device: string;
  icon: string;
  description: string;
  time: string;
  popular: boolean;
}

export interface ValuationConfig {
  basePrices: Record<string, number>;
  brandMultipliers: Record<string, number>;
  processorMultipliers: Record<string, number>;
  ramMultipliers: Record<string, number>;
  storageMultipliers: Record<string, number>;
  storageTypeMultipliers: Record<string, number>;
  yearMultipliers: Record<string, number>;
  conditionMultipliers: Record<string, number>;
  componentRules: Record<string, Record<string, Record<string, number>>>;
}

/** The 13 yes/no answers on the laptop selling wizard. */
export interface FunctionalQuestions {
  powersOn: boolean;
  displayWorking: boolean;
  screenDamage: boolean;
  keyboardWorking: boolean;
  trackpadWorking: boolean;
  batteryWorking: boolean;
  chargingWorking: boolean;
  chargerAvailable: boolean;
  wifiWorking: boolean;
  usbWorking: boolean;
  bodyDamage: boolean;
  liquidDamage: boolean;
  motherboardProblem: boolean;
}

export interface ValuationInput {
  category: string;
  brand?: string;
  model?: string;
  processor?: string;
  ram?: string;
  storage?: string;
  storageType?: string;
  year?: string;
  cosmeticCondition?: string;
  accessories?: string[];
  functionalQuestions?: Partial<FunctionalQuestions>;
  capacity?: string;
  interfaceType?: string;
  health?: string;
  badSectors?: string;
  generation?: string;
  vram?: string;
}

export interface ValuationResult {
  estimate: number;
  minRange: number;
  maxRange: number;
  currency: 'INR';
}

export type RequestType = 'order' | 'sell' | 'repair' | 'marketplace';

export interface TrackedRequest {
  id: string;
  type: RequestType;
  status: number;
  phone: string;
  payload: Record<string, unknown>;
  createdAt: string;
  timeline: string[];
  statusLabel: string;
}
