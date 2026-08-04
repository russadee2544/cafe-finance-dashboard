import type { Transaction, DebtItem, FixedCostItem, CafeSettings, DailyClosing } from '../types/finance';
import { SAMPLE_DEMO_TRANSACTIONS, SAMPLE_DEMO_DEBTS, SAMPLE_DEMO_DAILY_CLOSINGS } from '../data/mockData';

const TRANSACTIONS_KEY = 'cafe_finance_transactions_v2';
const DEBTS_KEY = 'cafe_finance_debts_v2';
const FIXED_COSTS_KEY = 'cafe_finance_fixed_costs_v1';
const CAFE_SETTINGS_KEY = 'cafe_finance_settings_v1';
const DAILY_CLOSINGS_KEY = 'cafe_finance_daily_closings_v1';

export const getStoredTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(TRANSACTIONS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load transactions from localStorage', err);
  }
  // Default to sample demo transactions on first load
  saveTransactions(SAMPLE_DEMO_TRANSACTIONS);
  return SAMPLE_DEMO_TRANSACTIONS;
};

export const saveTransactions = (transactions: Transaction[]): void => {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions to localStorage', err);
  }
};

export const getStoredDebts = (): DebtItem[] => {
  try {
    const data = localStorage.getItem(DEBTS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load debts from localStorage', err);
  }
  // Default to sample demo debts on first load
  saveDebts(SAMPLE_DEMO_DEBTS);
  return SAMPLE_DEMO_DEBTS;
};

export const saveDebts = (debts: DebtItem[]): void => {
  try {
    localStorage.setItem(DEBTS_KEY, JSON.stringify(debts));
  } catch (err) {
    console.error('Failed to save debts to localStorage', err);
  }
};

export const clearAllData = (): { transactions: Transaction[]; debts: DebtItem[] } => {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify([]));
  localStorage.setItem(DEBTS_KEY, JSON.stringify([]));
  return {
    transactions: [],
    debts: [],
  };
};

// ===== NEW: Fixed Costs Storage =====

const DEFAULT_FIXED_COSTS: FixedCostItem[] = [
  {
    id: 'fc-default-1',
    name: 'ค่าแรงพนักงาน 3 คน (แม่ครัว+บาริสต้า)',
    category: 'wages',
    amount: 5400,
    frequency: 'weekly',
    isActive: true,
    note: '3 คน × 30 บาท/ชม. × 8-9 ชม. × 6 วัน',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fc-default-2',
    name: 'ค่าผู้จัดการ + คนสวน',
    category: 'wages',
    amount: 16600,
    frequency: 'monthly',
    isActive: true,
    note: 'รวมค่าแรงทั้งหมด ~40,000/เดือน',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fc-default-3',
    name: 'ผ่อนสินเชื่อ',
    category: 'loan',
    amount: 13000,
    frequency: 'monthly',
    dueDay: 25,
    isActive: true,
    note: 'ผ่อนสินเชื่อรายเดือน',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fc-default-4',
    name: 'ค่าไฟฟ้า',
    category: 'utilities',
    amount: 3000,
    frequency: 'monthly',
    isActive: true,
    note: 'ค่าไฟเฉลี่ยต่อเดือน',
    createdAt: new Date().toISOString(),
  },
];

export const getStoredFixedCosts = (): FixedCostItem[] => {
  try {
    const data = localStorage.getItem(FIXED_COSTS_KEY);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load fixed costs from localStorage', err);
  }
  // Return defaults on first load
  return DEFAULT_FIXED_COSTS;
};

export const saveFixedCosts = (items: FixedCostItem[]): void => {
  try {
    localStorage.setItem(FIXED_COSTS_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save fixed costs to localStorage', err);
  }
};

// ===== NEW: Cafe Settings Storage =====

const DEFAULT_CAFE_SETTINGS: CafeSettings = {
  cogsPercent: 40,
  workingDaysPerMonth: 26,
  monthlyFixedCostTarget: 56000,
  currency: 'THB',
};

export const getStoredCafeSettings = (): CafeSettings => {
  try {
    const data = localStorage.getItem(CAFE_SETTINGS_KEY);
    if (data) return { ...DEFAULT_CAFE_SETTINGS, ...JSON.parse(data) };
  } catch (err) {
    console.error('Failed to load cafe settings from localStorage', err);
  }
  return DEFAULT_CAFE_SETTINGS;
};

export const saveCafeSettings = (settings: CafeSettings): void => {
  try {
    localStorage.setItem(CAFE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save cafe settings to localStorage', err);
  }
};

// ===== NEW: Daily Closings Storage =====

export const getStoredDailyClosings = (): DailyClosing[] => {
  try {
    const data = localStorage.getItem(DAILY_CLOSINGS_KEY);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load daily closings from localStorage', err);
  }
  saveDailyClosings(SAMPLE_DEMO_DAILY_CLOSINGS);
  return SAMPLE_DEMO_DAILY_CLOSINGS;
};

export const saveDailyClosings = (closings: DailyClosing[]): void => {
  try {
    localStorage.setItem(DAILY_CLOSINGS_KEY, JSON.stringify(closings));
  } catch (err) {
    console.error('Failed to save daily closings to localStorage', err);
  }
};

export const populateDemoData = (): { transactions: Transaction[]; debts: DebtItem[]; closings: DailyClosing[] } => {
  saveTransactions(SAMPLE_DEMO_TRANSACTIONS);
  saveDebts(SAMPLE_DEMO_DEBTS);
  saveDailyClosings(SAMPLE_DEMO_DAILY_CLOSINGS);
  return {
    transactions: SAMPLE_DEMO_TRANSACTIONS,
    debts: SAMPLE_DEMO_DEBTS,
    closings: SAMPLE_DEMO_DAILY_CLOSINGS,
  };
};

// ===== GPOS Sunmi Storage =====
const GPOS_URL_KEY = 'cafe_gpos_google_sheet_url_v1';

export const getStoredGPOSUrl = (): string => {
  try {
    return localStorage.getItem(GPOS_URL_KEY) || '';
  } catch (err) {
    return '';
  }
};

export const saveGPOSUrl = (url: string): void => {
  try {
    localStorage.setItem(GPOS_URL_KEY, url);
  } catch (err) {
    console.error('Failed to save GPOS URL to localStorage', err);
  }
};

// ===== Master POS Storage & Sync Engine =====
export {
  getStoredDailySales,
  saveDailySales,
  mergeDailySales,
  getStoredCashFlow,
  saveCashFlow,
  mergeCashFlow,
} from './posStorage';

