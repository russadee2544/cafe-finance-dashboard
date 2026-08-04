import type { DailySalesRecord, CashFlowRecord } from '../types/finance';

const POS_DAILY_SALES_KEY = 'cafe_pos_daily_sales_v1';
const POS_CASH_FLOW_KEY = 'cafe_pos_cash_flow_v1';

const SAMPLE_DAILY_SALES: DailySalesRecord[] = [
  { date: '2026-07-01', channel: 'ALL', salesChannel: 'ALL', totalSales: 5905, orderCount: 18, netSales: 5905, serviceFee: 0, discount: 9, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-02', channel: 'ALL', salesChannel: 'ALL', totalSales: 4417, orderCount: 14, netSales: 4417, serviceFee: 0, discount: 0, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-03', channel: 'ALL', salesChannel: 'ALL', totalSales: 0, orderCount: 0, netSales: 0, serviceFee: 0, discount: 0, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-04', channel: 'ALL', salesChannel: 'ALL', totalSales: 7484, orderCount: 37, netSales: 7484, serviceFee: 0, discount: 0, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-05', channel: 'ALL', salesChannel: 'ALL', totalSales: 7753, orderCount: 27, netSales: 7753, serviceFee: 0, discount: 63, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-06', channel: 'ALL', salesChannel: 'ALL', totalSales: 4007, orderCount: 18, netSales: 4007, serviceFee: 0, discount: 5, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-07', channel: 'ALL', salesChannel: 'ALL', totalSales: 3184, orderCount: 10, netSales: 3184, serviceFee: 0, discount: 15, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-08', channel: 'ALL', salesChannel: 'ALL', totalSales: 4178, orderCount: 11, netSales: 4178, serviceFee: 0, discount: 0, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-09', channel: 'ALL', salesChannel: 'ALL', totalSales: 4291, orderCount: 14, netSales: 4291, serviceFee: 0, discount: 45, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-10', channel: 'ALL', salesChannel: 'ALL', totalSales: 0, orderCount: 0, netSales: 0, serviceFee: 0, discount: 0, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-11', channel: 'ALL', salesChannel: 'ALL', totalSales: 4299, orderCount: 21, netSales: 4299, serviceFee: 0, discount: 0, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-12', channel: 'ALL', salesChannel: 'ALL', totalSales: 5808, orderCount: 22, netSales: 5808, serviceFee: 0, discount: 55, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-13', channel: 'ALL', salesChannel: 'ALL', totalSales: 2792, orderCount: 17, netSales: 2792, serviceFee: 0, discount: 25, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-14', channel: 'ALL', salesChannel: 'ALL', totalSales: 5537, orderCount: 15, netSales: 5537, serviceFee: 0, discount: 10, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-15', channel: 'ALL', salesChannel: 'ALL', totalSales: 2893, orderCount: 12, netSales: 2893, serviceFee: 0, discount: 0, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-16', channel: 'ALL', salesChannel: 'ALL', totalSales: 7845, orderCount: 19, netSales: 7845, serviceFee: 0, discount: 1, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-17', channel: 'ALL', salesChannel: 'ALL', totalSales: 0, orderCount: 0, netSales: 0, serviceFee: 0, discount: 0, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-18', channel: 'ALL', salesChannel: 'ALL', totalSales: 7619, orderCount: 34, netSales: 7619, serviceFee: 0, discount: 15, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-19', channel: 'ALL', salesChannel: 'ALL', totalSales: 13288, orderCount: 32, netSales: 13288, serviceFee: 0, discount: 0, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-20', channel: 'ALL', salesChannel: 'ALL', totalSales: 1793, orderCount: 13, netSales: 1793, serviceFee: 0, discount: 0, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-21', channel: 'ALL', salesChannel: 'ALL', totalSales: 2401, orderCount: 13, netSales: 2401, serviceFee: 0, discount: 70, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-22', channel: 'ALL', salesChannel: 'ALL', totalSales: 2371, orderCount: 11, netSales: 2371, serviceFee: 0, discount: 30, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-23', channel: 'ALL', salesChannel: 'ALL', totalSales: 3889, orderCount: 12, netSales: 3889, serviceFee: 0, discount: 67, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-24', channel: 'ALL', salesChannel: 'ALL', totalSales: 0, orderCount: 0, netSales: 0, serviceFee: 0, discount: 0, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-25', channel: 'ALL', salesChannel: 'ALL', totalSales: 6890, orderCount: 31, netSales: 6890, serviceFee: 0, discount: 163, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-26', channel: 'ALL', salesChannel: 'ALL', totalSales: 6353, orderCount: 27, netSales: 6353, serviceFee: 0, discount: 30, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-27', channel: 'ALL', salesChannel: 'ALL', totalSales: 4233, orderCount: 21, netSales: 4233, serviceFee: 0, discount: 65, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-28', channel: 'ALL', salesChannel: 'ALL', totalSales: 14625, orderCount: 34, netSales: 14625, serviceFee: 0, discount: 30, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-29', channel: 'ALL', salesChannel: 'ALL', totalSales: 11603, orderCount: 26, netSales: 11603, serviceFee: 0, discount: 141, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
  { date: '2026-07-30', channel: 'ALL', salesChannel: 'ALL', totalSales: 7522, orderCount: 27, netSales: 7522, serviceFee: 0, discount: 0, tax: 0, tip: 0, rounding: 0, deliveryFee: 0 },
];

const SAMPLE_CASH_FLOW: CashFlowRecord[] = [
  { id: 'cf-1', paymentTime: '2026-07-30 17:48:18', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'น้ำแข็ง', amount: -200, category: 'raw_ice' },
  { id: 'cf-2', paymentTime: '2026-07-30 17:48:05', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'บังวี', amount: -100, category: 'staff_wages' },
  { id: 'cf-3', paymentTime: '2026-07-30 17:47:57', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'กะสุ', amount: -700, category: 'staff_wages' },
  { id: 'cf-4', paymentTime: '2026-07-30 17:47:45', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'ส่วนเกินแม่ขรี', amount: -783, category: 'wholesale' },
  { id: 'cf-5', paymentTime: '2026-07-29 18:35:09', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'เงินค่าพนักงาน กะฝน', amount: -500, category: 'staff_wages' },
  { id: 'cf-6', paymentTime: '2026-07-29 18:29:31', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'ไข่', amount: -40, category: 'raw_food' },
  { id: 'cf-7', paymentTime: '2026-07-29 18:29:20', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'ไข่ 1แผง', amount: -130, category: 'raw_food' },
  { id: 'cf-8', paymentTime: '2026-07-29 18:28:57', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'เปลี่ยนน้ำ 3ถัง', amount: -45, category: 'utilities' },
  { id: 'cf-9', paymentTime: '2026-07-29 18:28:35', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'เมล็ดกาแฟและวิปครีม', amount: -370, category: 'raw_beverage' },
  { id: 'cf-10', paymentTime: '2026-07-29 18:28:20', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'น้ำแข็ง', amount: -200, category: 'raw_ice' },
  { id: 'cf-11', paymentTime: '2026-07-28 17:59:40', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'makro', amount: -874, category: 'wholesale' },
  { id: 'cf-12', paymentTime: '2026-07-28 17:59:24', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'ค่าน้ำ', amount: -110, category: 'utilities' },
  { id: 'cf-13', paymentTime: '2026-07-28 17:57:42', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'ถุงๆ', amount: -1028, category: 'packaging' },
  { id: 'cf-14', paymentTime: '2026-07-25 18:37:50', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'ค่าน้ำ', amount: -407, category: 'utilities' },
  { id: 'cf-15', paymentTime: '2026-07-23 18:33:05', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'ค่าแรงกะฝน', amount: -1500, category: 'staff_wages' },
  { id: 'cf-16', paymentTime: '2026-07-23 17:39:44', type: 'CashIn', recipient: 'ผู้ดูแลร้าน', note: 'ร้านม่อนซื้อ', amount: 839, category: 'cash_in' },
  { id: 'cf-17', paymentTime: '2026-07-19 18:31:39', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'บานอฟฟี่', amount: -600, category: 'raw_bakery' },
  { id: 'cf-18', paymentTime: '2026-07-01 18:29:42', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'ซื้อของล่วงหน้า', amount: -1300, category: 'wholesale' },
  { id: 'cf-19', paymentTime: '2026-07-01 18:29:25', type: 'CashOut', recipient: 'ผู้ดูแลร้าน', note: 'ซื้อของ', amount: -1305, category: 'wholesale' },
];

export const getStoredDailySales = (): DailySalesRecord[] => {
  try {
    const stored = localStorage.getItem(POS_DAILY_SALES_KEY);
    if (!stored) {
      saveDailySales(SAMPLE_DAILY_SALES);
      return SAMPLE_DAILY_SALES;
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error('Error reading daily sales from local storage', e);
    return SAMPLE_DAILY_SALES;
  }
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
    if (!stored) {
      saveCashFlow(SAMPLE_CASH_FLOW);
      return SAMPLE_CASH_FLOW;
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error('Error reading cash flow from local storage', e);
    return SAMPLE_CASH_FLOW;
  }
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
