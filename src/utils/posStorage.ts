import type { DailySalesRecord, CashFlowRecord } from '../types/finance';

const POS_DAILY_SALES_KEY = 'cafe_pos_daily_sales_v1';
const POS_CASH_FLOW_KEY = 'cafe_pos_cash_flow_v1';

export const getStoredDailySales = (): DailySalesRecord[] => {
  try {
    const stored = localStorage.getItem(POS_DAILY_SALES_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Error reading daily sales from local storage', e);
  }
  return [];
};

export const saveDailySales = (records: DailySalesRecord[]): void => {
  try {
    localStorage.setItem(POS_DAILY_SALES_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving daily sales to local storage', e);
  }
};

export const mergeDailySales = (newRecords: DailySalesRecord[]): DailySalesRecord[] => {
  const existing = getStoredDailySales();
  const dateMap = new Map<string, DailySalesRecord>();
  existing.forEach(r => dateMap.set(r.date, r));
  newRecords.forEach(r => dateMap.set(r.date, r));
  const merged = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  saveDailySales(merged);
  return merged;
};

export const getStoredCashFlow = (): CashFlowRecord[] => {
  try {
    const stored = localStorage.getItem(POS_CASH_FLOW_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Error reading cash flow from local storage', e);
  }
  return [];
};

export const saveCashFlow = (records: CashFlowRecord[]): void => {
  try {
    localStorage.setItem(POS_CASH_FLOW_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving cash flow to local storage', e);
  }
};

export const mergeCashFlow = (newRecords: CashFlowRecord[]): CashFlowRecord[] => {
  const existing = getStoredCashFlow();
  const timeSet = new Set(existing.map(r => r.paymentTime));
  const unique = newRecords.filter(r => !timeSet.has(r.paymentTime));
  const merged = [...existing, ...unique].sort((a, b) => b.paymentTime.localeCompare(a.paymentTime));
  saveCashFlow(merged);
  return merged;
};
