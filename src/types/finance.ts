export type TransactionType = 'income' | 'expense';

export type CategoryId = 
  | 'coffee_beans'
  | 'dairy_syrup'
  | 'packaging'
  | 'bakery_food'
  | 'rent'
  | 'utilities'
  | 'wages'
  | 'pos_sales'
  | 'delivery_sales'
  | 'debt_repayment'
  | 'other_expense'
  | 'other_income';

export interface Category {
  id: CategoryId;
  name: string;
  type: TransactionType;
  iconName: string;
  color: string;
}

export type DebtQuadrant = 'q1' | 'q2' | 'q3' | 'q4';

export interface QuadrantInfo {
  id: DebtQuadrant;
  name: string;
  subName: string;
  description: string;
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    badge: string;
    lightBg: string;
  };
}

export interface DebtItem {
  id: string;
  title: string;
  creditor: string; // เจ้าหนี้ / สถาบันการเงิน / ซัพพลายเออร์
  totalAmount: number;
  remainingAmount: number;
  interestRate?: number; // %
  dueDate: string; // YYYY-MM-DD
  quadrant: DebtQuadrant; // Q1-Q4
  priorityReason: string; // เหตุผลความสำคัญ
  status: 'pending' | 'partially_paid' | 'paid';
  createdAt: string;
  repaymentHistory: {
    id: string;
    date: string;
    amount: number;
    note?: string;
  }[];
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number;
  category: CategoryId;
  description: string;
  paymentMethod: 'cash' | 'transfer' | 'credit_card' | 'qr';
  receiptUrl?: string;
  source: 'manual' | 'receipt_ocr' | 'excel_import';
  createdAt: string;
}

export interface ReceiptScanResult {
  storeName: string;
  date: string;
  totalAmount: number;
  category: CategoryId;
  confidence: number;
  rawText: string;
  items: { name: string; price: number }[];
}

export interface ExcelImportRow {
  date: string;
  type: TransactionType;
  amount: number;
  category: CategoryId;
  description: string;
  paymentMethod: string;
  isValid: boolean;
  error?: string;
}

// ===== NEW: Fixed Cost Engine =====

export type FixedCostFrequency = 'monthly' | 'weekly' | 'daily';

export type FixedCostCategory = 'wages' | 'loan' | 'utilities' | 'rent' | 'insurance' | 'subscription' | 'other';

export interface FixedCostItem {
  id: string;
  name: string;
  category: FixedCostCategory;
  amount: number; // Amount per frequency period (e.g. 25000/month)
  frequency: FixedCostFrequency;
  dueDay?: number; // Day of month when payment is due (1-31)
  isActive: boolean;
  note?: string;
  createdAt: string;
}

// ===== NEW: Cafe Settings (COGS, Working Days, etc.) =====

export interface CafeSettings {
  cogsPercent: number; // Default 40
  workingDaysPerMonth: number; // Default 26
  monthlyFixedCostTarget: number; // Auto-calculated from fixedCosts
  currency: string; // Default 'THB'
}

// ===== NEW: Daily Cash Allocation =====

export interface DailyAllocation {
  label: string;
  emoji: string;
  amount: number;
  percent: number;
  color: string;
}

// ===== NEW: Daily Closing =====

export interface DailyClosing {
  id: string;
  date: string; // YYYY-MM-DD
  totalSales: number;
  totalPurchases: number;
  cogsPercent: number; // Snapshot of COGS% used that day
  fixedCostDaily: number; // Snapshot of daily fixed cost burden
  allocations: DailyAllocation[];
  netProfit: number; // True net after everything
  note?: string;
  createdAt: string;
}

// ===== NEW: POS Daily Sales Record =====

export interface DailySalesRecord {
  date: string;               // DD/MM/YYYY or YYYY-MM-DD
  channel: string;            // 'ALL' or specific channel
  salesChannel: string;       // 'ALL' or specific
  totalSales: number;         // ยอดขายรวม (฿)
  orderCount: number;         // จำนวนออเดอร์
  netSales: number;           // ยอดขายสุทธิ (฿)
  serviceFee: number;
  discount: number;
  tax: number;
  tip: number;
  rounding: number;
  deliveryFee: number;
}

// ===== NEW: Cash Flow Record =====

export type CashFlowType = 'CashIn' | 'CashOut';

export type CashFlowCategory = 
  | 'raw_ice'
  | 'raw_food'
  | 'raw_beverage'
  | 'raw_bakery'
  | 'packaging'
  | 'staff_wages'
  | 'staff_meals'
  | 'utilities'
  | 'wholesale'
  | 'equipment'
  | 'cash_in'
  | 'other';

export interface CashFlowRecord {
  id: string;
  paymentTime: string;        // YYYY-MM-DD HH:MM:SS
  type: CashFlowType;
  recipient: string;
  note: string;
  amount: number;             // negative for CashOut, positive for CashIn
  category: CashFlowCategory; // Auto-categorized
  paymentMethod?: 'cash' | 'transfer' | 'credit_card';
}
