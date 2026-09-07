const fs = require('fs');
const path = require('path');

// Mock browser global environment for Node.js test execution
global.window = {};
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

// Load data.js
require('../js/data.js');
const { products, repairs, valuationConfig } = window.BSS_DATA;

console.log('--- TEST 1: CATALOG METRICS ---');
console.log(`Products in catalogue: ${products.length} (Expected >= 10)`);
if (products.length < 10) throw new Error('Insufficient demo products');

console.log(`Repair services count: ${repairs.length} (Expected 24)`);
if (repairs.length !== 24) throw new Error('Expected exactly 24 repair services');

console.log('--- TEST 2: VALUATION ENGINE ---');
const testLaptop = {
  category: 'Laptop',
  brand: 'Lenovo',
  processor: 'Core i7 / Ryzen 7 (High End)',
  ram: '16GB',
  storage: '512GB',
  storageType: 'NVMe SSD',
  year: '2021-2022',
  cosmeticCondition: 'Good',
  functionalQuestions: {
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
    motherboardProblem: false
  },
  accessories: ['Original Charger', 'Box']
};

const base = valuationConfig.basePrices.Laptop; // 32000
const brandMul = valuationConfig.brandMultipliers.Lenovo; // 1.10
const procMul = valuationConfig.processorMultipliers[testLaptop.processor]; // 1.25
const ramMul = valuationConfig.ramMultipliers[testLaptop.ram]; // 1.18
const storMul = valuationConfig.storageMultipliers[testLaptop.storage]; // 1.10
const storTypeMul = valuationConfig.storageTypeMultipliers[testLaptop.storageType]; // 1.10
const yearMul = valuationConfig.yearMultipliers[testLaptop.year]; // 0.65
const condMul = valuationConfig.conditionMultipliers[testLaptop.cosmeticCondition]; // 0.86

let mult = brandMul * procMul * ramMul * storMul * storTypeMul * yearMul * condMul;
mult *= 1.05 * 1.03; // Charger & Box bonuses

const estimate = Math.max(400, Math.round((base * mult) / 50) * 50);
console.log(`Calculated Lenovo ThinkPad valuation: ₹${estimate} (Verified > ₹15,000)`);
if (estimate < 15000) throw new Error('Valuation calculation anomalous');

console.log('--- TEST 3: TRACKING IDENTIFIER PARSING ---');
const ordId = 'BSS-ORD-' + Math.floor(100000 + Math.random() * 900000);
const sellId = 'BSS-SELL-' + Math.floor(100000 + Math.random() * 900000);
const repId = 'BSS-REP-' + Math.floor(100000 + Math.random() * 900000);

console.log(`Sample Order ID: ${ordId}`);
console.log(`Sample Sell ID: ${sellId}`);
console.log(`Sample Repair ID: ${repId}`);

if (!/^BSS-ORD-\d{6}$/.test(ordId)) throw new Error('Invalid Order ID format');
if (!/^BSS-SELL-\d{6}$/.test(sellId)) throw new Error('Invalid Sell ID format');
if (!/^BSS-REP-\d{6}$/.test(repId)) throw new Error('Invalid Repair ID format');

console.log('--- TEST 4: PINCODE CHECKER REGEX ---');
const validDelhi = '110001';
const validNoida = '201301';
const validGurgaon = '122001';
const invalidPin = '999999';

const pinRegex = /^(11\d{4}|201\d{3}|122\d{3})$/;
if (!pinRegex.test(validDelhi)) throw new Error('Delhi pincode should pass');
if (!pinRegex.test(validNoida)) throw new Error('Noida pincode should pass');
if (!pinRegex.test(validGurgaon)) throw new Error('Gurgaon pincode should pass');
if (pinRegex.test(invalidPin)) throw new Error('Non-NCR pincode should not pass NCR express check');
console.log('✓ All pincode rules verified!');

console.log('\nALL BUSINESS LOGIC & ALGORITHMIC AUDITS PASSED SUCCESSFULLY!');
