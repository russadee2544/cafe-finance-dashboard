import type { DailySalesRecord, CashFlowRecord } from '../types/finance';
import { REAL_DAILY_SALES, REAL_CASH_FLOW, REAL_DATASET_TRANSACTIONS } from '../data/realDataset';

const POS_DAILY_SALES_KEY = 'cafe_pos_daily_sales_v1';
const POS_CASH_FLOW_KEY = 'cafe_pos_cash_flow_v1';

export const getStoredDailySales = (): DailySalesRecord[] => {
  try {
    const stored = localStorage.getItem(POS_DAILY_SALES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading daily sales from local storage', e);
  }
  return REAL_DAILY_SALES;
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
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const expSum = parsed.reduce((acc: number, r: any) => acc + Math.abs(r.amount || 0), 0);
        if (expSum === 186326) return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading cash flow from local storage', e);
  }
  saveCashFlow(REAL_CASH_FLOW);
  return REAL_CASH_FLOW;
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

export const resetToRealDataset = (): { sales: DailySalesRecord[]; cashFlow: CashFlowRecord[] } => {
  saveDailySales(REAL_DAILY_SALES);
  saveCashFlow(REAL_CASH_FLOW);
  try {
    localStorage.setItem('cafe_finance_transactions_v2', JSON.stringify(REAL_DATASET_TRANSACTIONS));
  } catch (e) {
    console.error('Error saving real transactions to storage', e);
  }
  return { sales: REAL_DAILY_SALES, cashFlow: REAL_CASH_FLOW };
};
