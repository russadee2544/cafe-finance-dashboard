import type { Transaction, DebtItem, DailyClosing } from '../types/finance';
import { REAL_DATASET_TRANSACTIONS } from './realDataset';

export const INITIAL_TRANSACTIONS: Transaction[] = [];
export const INITIAL_DEBTS: DebtItem[] = [];

export const SAMPLE_DEMO_TRANSACTIONS: Transaction[] = REAL_DATASET_TRANSACTIONS;

export const SAMPLE_DEMO_DEBTS: DebtItem[] = [
  {
    id: 'debt-001',
    title: 'ค่าเมล็ดกาแฟค้างชำระ (โรงคั่ว Hillkoff)',
    creditor: 'โรงคั่ว Hillkoff เชียงใหม่',
    totalAmount: 12500,
    remainingAmount: 12500,
    interestRate: 0,
    dueDate: '2026-07-29',
    quadrant: 'q1',
    priorityReason: 'ด่วนมาก! ต้องชำระภายในพรุ่งนี้ เพื่อให้ส่งเมล็ดกาแฟล็อตใหม่ตามกำหนด',
    status: 'pending',
    createdAt: '2026-07-20T00:00:00Z',
    repaymentHistory: [],
  },
  {
    id: 'debt-002',
    title: 'งวดสินเชื่อพัฒนาและปรับปรุงร้าน (กสิกรไทย)',
    creditor: 'ธนาคารกสิกรไทย',
    totalAmount: 13000,
    remainingAmount: 13000,
    interestRate: 5.5,
    dueDate: '2026-08-05',
    quadrant: 'q2',
    priorityReason: 'สินเชื่อหลักของร้าน ตัดบัญชีทุกวันที่ 5 ต้องสำรองเงินไว้ให้พร้อม',
    status: 'pending',
    createdAt: '2026-07-01T00:00:00Z',
    repaymentHistory: [],
  },
  {
    id: 'debt-003',
    title: 'ค่าน้ำแข็ง + ก๊าซหุงต้มค้างจ่ายรายสัปดาห์',
    creditor: 'ร้านน้ำแข็งพี่สมหมาย',
    totalAmount: 1800,
    remainingAmount: 1800,
    interestRate: 0,
    dueDate: '2026-07-30',
    quadrant: 'q3',
    priorityReason: 'ค่าน้ำแข็งหลอดยูนิตยอดสะสม เคลียร์ทุกสิ้นสัปดาห์',
    status: 'pending',
    createdAt: '2026-07-22T00:00:00Z',
    repaymentHistory: [],
  },
  {
    id: 'debt-004',
    title: 'ค่าติดตั้งป้ายไฟและเมนูบอร์ดคาเฟ่',
    creditor: 'ร้านป้ายไออุ่นดีไซน์',
    totalAmount: 8000,
    remainingAmount: 3500,
    interestRate: 0,
    dueDate: '2026-08-15',
    quadrant: 'q4',
    priorityReason: 'ผ่อนชำระ 0% ยอดคงเหลือสุดท้าย ยืดหยุ่นได้ตามข้อตกลง',
    status: 'partially_paid',
    createdAt: '2026-06-15T00:00:00Z',
    repaymentHistory: [
      {
        id: 'rh-1',
        date: '2026-07-10',
        amount: 4500,
        note: 'ชำระงวดแรก 4,500 บาท',
      },
    ],
  },
];

export const SAMPLE_DEMO_DAILY_CLOSINGS: DailyClosing[] = [
  {
    id: 'close-20260727',
    date: '2026-07-27',
    totalSales: 3800,
    totalPurchases: 2400,
    cogsPercent: 40,
    fixedCostDaily: 2154,
    allocations: [
      { label: 'ต้นทุนสินค้า (COGS 40%)', emoji: '💰', amount: 1520, percent: 40, color: '#D2E875' },
      { label: 'กองทุนค่าแรงพนักงาน', emoji: '👥', amount: 1538, percent: 40.5, color: '#6366f1' },
      { label: 'กองทุนผ่อนสินเชื่อ', emoji: '🏦', amount: 500, percent: 13.2, color: '#dc2626' },
      { label: 'กองทุนค่าไฟ/สาธารณูปโภค', emoji: '⚡', amount: 116, percent: 3.1, color: '#3b82f6' },
      { label: 'กำไรสุทธิจริง', emoji: '🟢', amount: 126, percent: 3.2, color: '#10b981' },
    ],
    netProfit: 126,
    note: 'วันจันทร์ ยอดขายตามเป้าปกติ หักต้นทุนและ Fixed Cost เหลือกำไรสุทธิ 126 บาท',
    createdAt: '2026-07-27T19:30:00Z',
  },
  {
    id: 'close-20260726',
    date: '2026-07-26',
    totalSales: 9300,
    totalPurchases: 1800,
    cogsPercent: 40,
    fixedCostDaily: 2154,
    allocations: [
      { label: 'ต้นทุนสินค้า (COGS 40%)', emoji: '💰', amount: 3720, percent: 40, color: '#D2E875' },
      { label: 'กองทุนค่าแรงพนักงาน', emoji: '👥', amount: 1538, percent: 16.5, color: '#6366f1' },
      { label: 'กองทุนผ่อนสินเชื่อ', emoji: '🏦', amount: 500, percent: 5.4, color: '#dc2626' },
      { label: 'กองทุนค่าไฟ/สาธารณูปโภค', emoji: '⚡', amount: 116, percent: 1.2, color: '#3b82f6' },
      { label: 'กำไรสุทธิจริง', emoji: '🟢', amount: 3426, percent: 36.9, color: '#10b981' },
    ],
    netProfit: 3426,
    note: 'วันอาทิตย์ลูกค้าแน่นมาก! ยอดขายทะลุ 9,300 บาท กำไรสุทธิจริงหลังหักภาระคงเหลือ 3,426 บาท',
    createdAt: '2026-07-26T20:00:00Z',
  },
];

