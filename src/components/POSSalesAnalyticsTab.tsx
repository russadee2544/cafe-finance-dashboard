import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  TrendingUp,
  CreditCard,
  Landmark,
  Calendar,
  Plus,
  PieChart as PieChartIcon,
  BarChart2,
  X,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  Search,
  Eye,
  ChevronRight,
  Check
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import type { DailySalesRecord, CashFlowRecord, CashFlowCategory, Transaction, CategoryId } from '../types/finance';

interface POSSalesAnalyticsTabProps {
  dailySales: DailySalesRecord[];
  cashFlow: CashFlowRecord[];
  transactions?: Transaction[];
  onImportSales: (file: File) => void;
  onImportCashFlow: (file: File) => void;
  onAddCashFlowRecord?: (record: Omit<CashFlowRecord, 'id'>) => void;
}

const mapCategoryIdToCashFlowCategory = (cat: CategoryId, desc: string = ''): CashFlowCategory => {
  if (desc && desc.includes('น้ำแข็ง')) {
    return 'raw_ice';
  }
  switch (cat) {
    case 'coffee_beans':
    case 'dairy_syrup':
      return 'raw_beverage';
    case 'bakery_food':
      return 'raw_food';
    case 'packaging':
      return 'packaging';
    case 'wages':
      return 'staff_wages';
    case 'utilities':
      return 'utilities';
    case 'pos_sales':
    case 'delivery_sales':
    case 'other_income':
      return 'cash_in';
    case 'rent':
    case 'debt_repayment':
    case 'other_expense':
    default:
      return 'other';
  }
};

const CATEGORY_META: Record<string, { label: string; color: string; emoji: string }> = {
  raw_ice: { label: 'น้ำแข็ง', color: '#60A5FA', emoji: '🧊' },
  raw_food: { label: 'วัตถุดิบอาหาร', color: '#F87171', emoji: '🍳' },
  raw_beverage: { label: 'วัตถุดิบเครื่องดื่ม', color: '#FCD34D', emoji: '☕' },
  raw_bakery: { label: 'เบเกอรี่', color: '#FBBF24', emoji: '🥐' },
  packaging: { label: 'บรรจุภัณฑ์', color: '#34D399', emoji: '📦' },
  staff_wages: { label: 'ค่าแรง', color: '#A78BFA', emoji: '👥' },
  staff_meals: { label: 'อาหารพนักงาน', color: '#F472B6', emoji: '🍚' },
  utilities: { label: 'ค่าน้ำ/ค่าไฟ', color: '#38BDF8', emoji: '⚡' },
  wholesale: { label: 'ซื้อส่ง/Makro', color: '#FB923C', emoji: '🛒' },
  equipment: { label: 'อุปกรณ์', color: '#94A3B8', emoji: '🔧' },
  cash_in: { label: 'เงินเข้า', color: '#4ADE80', emoji: '💰' },
  other: { label: 'อื่นๆ', color: '#CBD5E1', emoji: '📝' },
};

const MAIN_CATEGORY_GROUPS: Record<string, { label: string; color: string; emoji: string; subCategories: string[] }> = {
  raw_beverage: {
    label: 'วัตถุดิบเครื่องดื่มและของสด',
    color: '#FCD34D',
    emoji: '☕',
    subCategories: ['raw_beverage', 'raw_food', 'raw_bakery', 'wholesale']
  },
  raw_ice: {
    label: 'ค่าน้ำแข็ง',
    color: '#60A5FA',
    emoji: '🧊',
    subCategories: ['raw_ice']
  },
  wages: {
    label: 'ค่าแรงและพนักงาน',
    color: '#A78BFA',
    emoji: '👥',
    subCategories: ['staff_wages', 'staff_meals']
  },
  utilities: {
    label: 'ค่าน้ำ/ค่าไฟ',
    color: '#38BDF8',
    emoji: '⚡',
    subCategories: ['utilities']
  },
  packaging_equipment: {
    label: 'บรรจุภัณฑ์และอุปกรณ์',
    color: '#34D399',
    emoji: '📦',
    subCategories: ['packaging', 'equipment']
  },
  other: {
    label: 'ค่าใช้จ่ายอื่นๆ',
    color: '#CBD5E1',
    emoji: '📝',
    subCategories: ['other']
  }
};

const getMonthString = (dateStr: string) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  const isoMatch = trimmed.match(/^(\d{4}-\d{2})/);
  if (isoMatch) {
    const yyyyMm = isoMatch[1];
    const monthNum = parseInt(yyyyMm.split('-')[1], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return yyyyMm;
    }
  }
  if (trimmed.includes('/')) {
    const parts = trimmed.split(' ')[0].split('/');
    if (parts.length === 3) {
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      if (year.length === 4 && parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12) {
        return `${year}-${month}`;
      }
    }
  }
  return '';
};

const formatThaiMonth = (yyyyMm: string) => {
  if (!yyyyMm || !yyyyMm.includes('-')) return yyyyMm;
  const [y, m] = yyyyMm.split('-');
  const monthNum = parseInt(m, 10);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return yyyyMm;
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  return `${months[monthNum - 1]} ${y}`;
};

export const POSSalesAnalyticsTab: React.FC<POSSalesAnalyticsTabProps> = ({
  dailySales,
  cashFlow,
  transactions = [],
  onImportSales,
  onImportCashFlow,
  onAddCashFlowRecord
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [activeDashboardView, setActiveDashboardView] = useState<'sales' | 'cashflow' | 'pnl'>('sales');
  const [isAddTransferModalOpen, setIsAddTransferModalOpen] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState<'all' | 'cash' | 'transfer'>('all');
  const [groupingMode, setGroupingMode] = useState<'consolidated' | 'detailed' | 'custom'>('consolidated');
  const [selectedCustomCats, setSelectedCustomCats] = useState<string[]>([]);

  // Detail Modal State
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    items: {
      id?: string;
      date: string;
      description: string;
      amount: number;
      category?: string;
      paymentMethod?: string;
      type?: 'income' | 'expense';
    }[];
  }>({
    isOpen: false,
    title: '',
    items: []
  });

  const [modalSearch, setModalSearch] = useState('');

  const filteredModalItems = useMemo(() => {
    if (!modalSearch.trim()) return detailModal.items;
    const q = modalSearch.toLowerCase();
    return detailModal.items.filter(
      item =>
        item.description.toLowerCase().includes(q) ||
        item.date.includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
    );
  }, [detailModal.items, modalSearch]);
  
  const [transferForm, setTransferForm] = useState({
    date: new Date().toISOString().split('T')[0],
    note: '',
    amount: '',
    category: 'other' as any,
    paymentMethod: 'transfer' as const
  });

  const salesFileInput = useRef<HTMLInputElement>(null);
  const cashFlowFileInput = useRef<HTMLInputElement>(null);

  const handleSalesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportSales(e.target.files[0]);
    }
  };

  const handleCashFlowUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportCashFlow(e.target.files[0]);
    }
  };

  // Build POS daily-sales records from imported transactions (excel_import etc.)
  // so the analytics dashboard shows real data even without separate POS exports.
  const derivedDailySales = useMemo<DailySalesRecord[]>(() => {
    const byDate = new Map<string, { net: number; count: number }>();
    transactions
      .filter(t => t.type === 'income' && (t.category === 'pos_sales' || t.category === 'delivery_sales'))
      .forEach(t => {
        const cur = byDate.get(t.date) || { net: 0, count: 0 };
        cur.net += t.amount;
        cur.count += 1;
        byDate.set(t.date, cur);
      });
    return Array.from(byDate.entries())
      .map(([date, v]) => ({
        date,
        channel: 'ALL',
        salesChannel: 'ALL',
        totalSales: v.net,
        orderCount: v.count,
        netSales: v.net,
        serviceFee: 0,
        discount: 0,
        tax: 0,
        tip: 0,
        rounding: 0,
        deliveryFee: 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  const derivedCashFlow = useMemo<CashFlowRecord[]>(() => {
    return transactions
      .filter(t => t.type === 'expense')
      .map(t => ({
        id: t.id,
        paymentTime: `${t.date} 12:00:00`,
        type: 'CashOut' as const,
        recipient: '',
        note: t.description,
        amount: -Math.abs(t.amount),
        category: mapCategoryIdToCashFlowCategory(t.category, t.description),
        paymentMethod: t.paymentMethod === 'transfer' ? 'transfer' as const : t.paymentMethod === 'credit_card' ? 'credit_card' as const : 'cash' as const,
      }));
  }, [transactions]);

  // Use provided POS records if present, otherwise fall back to derived ones
  const effectiveDailySales = useMemo(() => {
    if (dailySales && dailySales.length > 0) return dailySales;
    return derivedDailySales;
  }, [dailySales, derivedDailySales]);

  const effectiveCashFlow = useMemo(() => {
    if (cashFlow && cashFlow.length > 0) return cashFlow;
    return derivedCashFlow;
  }, [cashFlow, derivedCashFlow]);

  // Calculate unique months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    effectiveDailySales.forEach(r => {
      const m = getMonthString(r.date);
      if (m && /^\d{4}-\d{2}$/.test(m)) months.add(m);
    });
    effectiveCashFlow.forEach(r => {
      const m = getMonthString(r.paymentTime);
      if (m && /^\d{4}-\d{2}$/.test(m)) months.add(m);
    });
    return Array.from(months).sort().reverse();
  }, [effectiveDailySales, effectiveCashFlow]);

  // Auto-select latest month on load if selectedMonth is invalid or 'all'
  useEffect(() => {
    if (availableMonths.length > 0 && (!selectedMonth || selectedMonth === 'all' || !availableMonths.includes(selectedMonth))) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // Filter Data by Month
  const filteredSales = useMemo(() => {
    if (selectedMonth === 'all') return effectiveDailySales;
    return effectiveDailySales.filter(r => getMonthString(r.date) === selectedMonth);
  }, [effectiveDailySales, selectedMonth]);

  const filteredCashFlow = useMemo(() => {
    if (selectedMonth === 'all') return effectiveCashFlow;
    return effectiveCashFlow.filter(r => getMonthString(r.paymentTime) === selectedMonth);
  }, [effectiveCashFlow, selectedMonth]);

  // --- View 1: POS Sales Analytics Data ---
  const salesKpis = useMemo(() => {
    const totalSales = filteredSales.reduce((sum, r) => sum + r.netSales, 0);
    const totalOrders = filteredSales.reduce((sum, r) => sum + r.orderCount, 0);
    const avgSalesPerDay = filteredSales.length > 0 ? totalSales / filteredSales.filter(r => r.netSales > 0).length : 0;
    const avgSalesPerOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
    const totalDiscount = filteredSales.reduce((sum, r) => sum + r.discount, 0);
    const totalDeliveryFee = filteredSales.reduce((sum, r) => sum + r.deliveryFee, 0);

    return { totalSales, totalOrders, avgSalesPerDay, avgSalesPerOrder, totalDiscount, totalDeliveryFee };
  }, [filteredSales]);

  // --- View 2: Cash Flow & Expenses Data ---
  const expensesList = useMemo(() => {
    let out = filteredCashFlow.filter(r => r.type === 'CashOut' && r.amount < 0);
    if (expenseFilter === 'cash') out = out.filter(r => r.paymentMethod !== 'transfer');
    if (expenseFilter === 'transfer') out = out.filter(r => r.paymentMethod === 'transfer');
    return out;
  }, [filteredCashFlow, expenseFilter]);

  const expenseByCategory = useMemo(() => {
    const rawGroups: Record<string, number> = {};
    expensesList.forEach(r => {
      rawGroups[r.category] = (rawGroups[r.category] || 0) + Math.abs(r.amount);
    });

    if (groupingMode === 'consolidated') {
      const consolidated: { catKeys: string[]; name: string; value: number; color: string; emoji: string }[] = [];
      const assignedSubCats = new Set<string>();

      Object.entries(MAIN_CATEGORY_GROUPS).forEach(([_, groupInfo]) => {
        let sum = 0;
        const matchedCatKeys: string[] = [];
        groupInfo.subCategories.forEach(subCat => {
          if (rawGroups[subCat]) {
            sum += rawGroups[subCat];
            matchedCatKeys.push(subCat);
            assignedSubCats.add(subCat);
          }
        });
        if (sum > 0) {
          consolidated.push({
            catKeys: matchedCatKeys,
            name: groupInfo.label,
            value: sum,
            color: groupInfo.color,
            emoji: groupInfo.emoji
          });
        }
      });

      let otherSum = 0;
      const unassignedCatKeys: string[] = [];
      Object.entries(rawGroups).forEach(([cat, amt]) => {
        if (!assignedSubCats.has(cat)) {
          otherSum += amt;
          unassignedCatKeys.push(cat);
        }
      });
      if (otherSum > 0) {
        consolidated.push({
          catKeys: unassignedCatKeys,
          name: 'ค่าใช้จ่ายอื่นๆ',
          value: otherSum,
          color: '#CBD5E1',
          emoji: '📝'
        });
      }

      return consolidated.sort((a, b) => b.value - a.value);
    }

    if (groupingMode === 'custom' && selectedCustomCats.length > 0) {
      let mergedSum = 0;
      const mergedCatKeys: string[] = [];
      const result: { catKeys: string[]; name: string; value: number; color: string; emoji: string }[] = [];

      Object.entries(rawGroups).forEach(([cat, amt]) => {
        if (selectedCustomCats.includes(cat)) {
          mergedSum += amt;
          mergedCatKeys.push(cat);
        } else {
          result.push({
            catKeys: [cat],
            name: CATEGORY_META[cat as any]?.label || cat,
            value: amt,
            color: CATEGORY_META[cat as any]?.color || '#CBD5E1',
            emoji: CATEGORY_META[cat as any]?.emoji || '📝'
          });
        }
      });

      if (mergedSum > 0) {
        const mergedNames = selectedCustomCats
          .map(c => CATEGORY_META[c]?.label || c)
          .join(', ');
        result.unshift({
          catKeys: mergedCatKeys,
          name: `รวมยอดเลือก (${mergedNames})`,
          value: mergedSum,
          color: '#D2E875',
          emoji: '⚡'
        });
      }

      return result.sort((a, b) => b.value - a.value);
    }

    // Default: 'detailed'
    return Object.entries(rawGroups)
      .map(([cat, amt]) => ({
        catKeys: [cat],
        name: CATEGORY_META[cat as any]?.label || cat,
        value: amt,
        color: CATEGORY_META[cat as any]?.color || '#CBD5E1',
        emoji: CATEGORY_META[cat as any]?.emoji || '📝'
      }))
      .sort((a, b) => b.value - a.value);
  }, [expensesList, groupingMode, selectedCustomCats]);

  const totalExpense = expenseByCategory.reduce((sum, i) => sum + i.value, 0);

  const handleOpenCategoryDetail = (catKeys: string[], catName: string, totalAmount: number) => {
    const matched = expensesList.filter(item => catKeys.includes(item.category));
    setModalSearch('');
    setDetailModal({
      isOpen: true,
      title: `รายละเอียดค่าใช้จ่าย: ${catName}`,
      subtitle: `รวมทั้งหมด ฿${totalAmount.toLocaleString()} (${matched.length} รายการ)`,
      items: matched.map(m => ({
        id: m.id,
        date: m.paymentTime.split(' ')[0],
        description: m.note || CATEGORY_META[m.category]?.label || catName,
        amount: Math.abs(m.amount),
        category: CATEGORY_META[m.category]?.label || m.category,
        paymentMethod: m.paymentMethod === 'cash' ? 'เงินสด' : m.paymentMethod === 'transfer' ? 'เงินโอน' : 'อื่นๆ',
        type: 'expense'
      }))
    });
  };

  const handleOpenAllExpensesDetail = () => {
    setModalSearch('');
    setDetailModal({
      isOpen: true,
      title: 'รายละเอียดรายจ่ายทั้งหมด',
      subtitle: `รวมรายจ่ายทั้งสิ้น ฿${totalExpense.toLocaleString()} (${expensesList.length} รายการ)`,
      items: expensesList.map(m => ({
        id: m.id,
        date: m.paymentTime.split(' ')[0],
        description: m.note || CATEGORY_META[m.category]?.label || 'รายจ่าย',
        amount: Math.abs(m.amount),
        category: CATEGORY_META[m.category]?.label || m.category,
        paymentMethod: m.paymentMethod === 'cash' ? 'เงินสด' : m.paymentMethod === 'transfer' ? 'เงินโอน' : 'อื่นๆ',
        type: 'expense'
      }))
    });
  };

  const handleOpenSalesDetail = () => {
    setModalSearch('');
    setDetailModal({
      isOpen: true,
      title: 'รายละเอียดรายได้ยอดขาย',
      subtitle: `รวมยอดขายทั้งสิ้น ฿${salesKpis.totalSales.toLocaleString()} (${filteredSales.length} วัน)`,
      items: filteredSales.map(s => ({
        id: `sales-${s.date}`,
        date: s.date,
        description: `ยอดขายหน้าร้าน (${s.orderCount} ออเดอร์)`,
        amount: s.netSales,
        category: 'ยอดขาย POS',
        paymentMethod: 'โอน/เงินสด',
        type: 'income'
      }))
    });
  };

  // --- View 3: P&L & MoM Summary Data ---
  const momData = useMemo(() => {
    const monthlyStats: Record<string, { sales: number; expenses: number }> = {};
    
    // Get last 4 months max
    const targetMonths = availableMonths.slice(0, 4).reverse();
    
    targetMonths.forEach(m => {
      monthlyStats[m] = { sales: 0, expenses: 0 };
    });

    effectiveDailySales.forEach(r => {
      const m = getMonthString(r.date);
      if (monthlyStats[m]) monthlyStats[m].sales += r.netSales;
    });

    effectiveCashFlow.forEach(r => {
      const m = getMonthString(r.paymentTime);
      if (monthlyStats[m] && r.type === 'CashOut') {
        monthlyStats[m].expenses += Math.abs(r.amount);
      }
    });

    return targetMonths.map(m => ({
      name: formatThaiMonth(m),
      sales: monthlyStats[m].sales,
      expenses: monthlyStats[m].expenses,
      profit: monthlyStats[m].sales - monthlyStats[m].expenses
    }));
  }, [effectiveDailySales, effectiveCashFlow, availableMonths]);

  const pnlSummary = useMemo(() => {
    const cashOut = filteredCashFlow.filter(r => r.type === 'CashOut' && r.paymentMethod !== 'transfer').reduce((sum, r) => sum + Math.abs(r.amount), 0);
    const bankTransferOut = filteredCashFlow.filter(r => r.type === 'CashOut' && r.paymentMethod === 'transfer').reduce((sum, r) => sum + Math.abs(r.amount), 0);
    const totalExp = cashOut + bankTransferOut;
    const grossProfit = salesKpis.totalSales - totalExp;
    
    const cogsCategories = ['raw_ice', 'raw_food', 'raw_beverage', 'raw_bakery', 'wholesale', 'packaging'];
    const cogsAmount = expensesList
      .filter(r => cogsCategories.includes(r.category))
      .reduce((sum, r) => sum + Math.abs(r.amount), 0);
      
    const cogsPercent = salesKpis.totalSales > 0 ? (cogsAmount / salesKpis.totalSales) * 100 : 0;

    return { cashOut, bankTransferOut, totalExp, grossProfit, cogsAmount, cogsPercent };
  }, [filteredCashFlow, salesKpis.totalSales, expensesList]);

  // Handlers
  const handleAddTransfer = () => {
    if (!transferForm.note || !transferForm.amount) return;
    
    if (onAddCashFlowRecord) {
      onAddCashFlowRecord({
        paymentTime: `${transferForm.date} 12:00:00`,
        type: 'CashOut',
        recipient: 'ผู้รับโอน',
        note: transferForm.note,
        amount: -Math.abs(parseFloat(transferForm.amount)),
        category: transferForm.category,
        paymentMethod: 'transfer'
      });
    }
    
    setIsAddTransferModalOpen(false);
    setTransferForm({
      date: new Date().toISOString().split('T')[0],
      note: '',
      amount: '',
      category: 'other' as any,
      paymentMethod: 'transfer'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-[#D2E875]" />
            ศูนย์วิเคราะห์ยอดขายและบัญชี
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">ภาพรวมรายได้ รายจ่าย และกำไรของร้าน</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => salesFileInput.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#D2E875] text-gray-900 font-bold rounded-xl text-xs hover:brightness-95 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            นำเข้ายอดขาย (.xlsx)
          </button>
          <button 
            onClick={() => cashFlowFileInput.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold rounded-xl text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <Upload className="w-4 h-4 text-emerald-500" />
            นำเข้าเงินเข้า-ออก (.xlsx)
          </button>

          <input type="file" ref={salesFileInput} className="hidden" accept=".xlsx,.xls" onChange={handleSalesUpload} />
          <input type="file" ref={cashFlowFileInput} className="hidden" accept=".xlsx,.xls" onChange={handleCashFlowUpload} />

          <div className="flex items-center gap-2 bg-white dark:bg-[#181A1C] px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select 
              className="bg-transparent border-none text-xs font-bold text-gray-900 dark:text-white focus:ring-0 cursor-pointer outline-none"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {availableMonths.map(m => (
                <option key={m} value={m} className="dark:bg-[#181A1C] dark:text-white">{formatThaiMonth(m)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
        <button
          onClick={() => setActiveDashboardView('sales')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${
            activeDashboardView === 'sales'
              ? 'bg-[#D2E875] text-[#181A1C] shadow-sm'
              : 'bg-white dark:bg-[#181A1C] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          📈 POS Sales Analytics (วิเคราะห์ยอดขาย)
        </button>
        <button
          onClick={() => setActiveDashboardView('cashflow')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${
            activeDashboardView === 'cashflow'
              ? 'bg-[#D2E875] text-[#181A1C] shadow-sm'
              : 'bg-white dark:bg-[#181A1C] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          💸 Cash Flow & Expenses (กระแสเงินสด & รายจ่าย)
        </button>
        <button
          onClick={() => setActiveDashboardView('pnl')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${
            activeDashboardView === 'pnl'
              ? 'bg-[#D2E875] text-[#181A1C] shadow-sm'
              : 'bg-white dark:bg-[#181A1C] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          <PieChartIcon className="w-4 h-4" />
          📊 P&L & MoM Summary (งบกำไรขาดทุน)
        </button>
      </div>

      {/* DASHBOARD 1: SALES */}
      {activeDashboardView === 'sales' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              onClick={handleOpenSalesDetail}
              className="bg-white dark:bg-[#181A1C] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer hover:border-[#D2E875] group transition-all"
              title="คลิกเพื่อดูรายละเอียดการขายรายวัน"
            >
              <div className="text-gray-700 dark:text-gray-300 text-xs font-semibold mb-1 flex items-center justify-between">
                <span>ยอดขายรวมสุทธิ (Net Sales)</span>
                <Eye className="w-3.5 h-3.5 text-[#D2E875] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white group-hover:text-[#D2E875] transition-colors">฿{salesKpis.totalSales.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-[#181A1C] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="text-gray-700 dark:text-gray-300 text-xs font-semibold mb-1">จำนวนออเดอร์ (Total Orders)</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">{salesKpis.totalOrders.toLocaleString()} <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">บิล</span></div>
            </div>
            <div className="bg-white dark:bg-[#181A1C] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="text-gray-700 dark:text-gray-300 text-xs font-semibold mb-1">เฉลี่ยยอดขาย/วัน (Avg Sales/Day)</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">฿{Math.round(salesKpis.avgSalesPerDay).toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-[#181A1C] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="text-gray-700 dark:text-gray-300 text-xs font-semibold mb-1">เฉลี่ยยอดขาย/ออเดอร์ (Avg / Order)</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">฿{Math.round(salesKpis.avgSalesPerOrder).toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#181A1C] p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">แนวโน้มยอดขายรายวัน</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredSales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(v) => v.split('-')[2] || v} stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `฿${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#181A1C', borderColor: '#333', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any) => [`฿${Number(value || 0).toLocaleString()}`, 'ยอดขายสุทธิ']}
                      labelFormatter={(label) => `วันที่: ${label}`}
                    />
                    <Bar dataKey="netSales" fill="#D2E875" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-[#181A1C] p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">จำนวนออเดอร์รายวัน</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredSales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(v) => v.split('-')[2] || v} stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#181A1C', borderColor: '#333', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any) => [`${value} บิล`, 'จำนวนออเดอร์']}
                    />
                    <Line type="monotone" dataKey="orderCount" stroke="#60A5FA" strokeWidth={3} dot={{ r: 4, fill: '#181A1C', stroke: '#60A5FA' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-2 rounded-xl text-sm font-medium">
              <span>ส่วนลดรวม (Discount): ฿{salesKpis.totalDiscount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-xl text-sm font-medium">
              <span>ค่าจัดส่งรวม (Delivery Fee): ฿{salesKpis.totalDeliveryFee.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD 2: CASH FLOW */}
      {activeDashboardView === 'cashflow' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setExpenseFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${expenseFilter === 'all' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setExpenseFilter('cash')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${expenseFilter === 'cash' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}
              >
                💵 เงินสด
              </button>
              <button
                onClick={() => setExpenseFilter('transfer')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${expenseFilter === 'transfer' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}
              >
                🏦 เงินโอนธนาคาร
              </button>
            </div>

            <button 
              onClick={() => setIsAddTransferModalOpen(true)}
              className="flex items-center gap-2 bg-[#D2E875] text-gray-900 px-4 py-2 rounded-xl font-bold text-sm hover:brightness-95 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              บันทึกรายจ่ายเงินโอน (Bank Transfer)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#181A1C] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 lg:col-span-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">สัดส่วนรายจ่าย</h3>
                
                {/* Mode Selector */}
                <div className="flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl text-[11px] font-bold">
                  <button
                    onClick={() => setGroupingMode('consolidated')}
                    className={`px-2 py-0.5 rounded-lg transition-all ${
                      groupingMode === 'consolidated'
                        ? 'bg-white dark:bg-[#141618] text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title="รวมหมวดหมู่หลักที่มีชื่อใกล้เคียงกัน"
                  >
                    📁 รวมหมวดหลัก
                  </button>
                  <button
                    onClick={() => setGroupingMode('detailed')}
                    className={`px-2 py-0.5 rounded-lg transition-all ${
                      groupingMode === 'detailed'
                        ? 'bg-white dark:bg-[#141618] text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title="แยกแสดงผลยอดละเอียดทุกหมวด"
                  >
                    🏷️ แยกหมวดย่อย
                  </button>
                  <button
                    onClick={() => setGroupingMode('custom')}
                    className={`px-2 py-0.5 rounded-lg transition-all ${
                      groupingMode === 'custom'
                        ? 'bg-[#D2E875] text-gray-900 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title="เลือกหมวดมารวมยอดเอง"
                  >
                    ⚡ รวมยอดเอง
                  </button>
                </div>
              </div>

              {/* Custom Selection Toolbar when groupingMode === 'custom' */}
              {groupingMode === 'custom' && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs space-y-2">
                  <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center justify-between">
                    <span>เลือกหมวดที่ต้องการนำมารวมยอด:</span>
                    {selectedCustomCats.length > 0 && (
                      <button
                        onClick={() => setSelectedCustomCats([])}
                        className="text-red-500 hover:underline text-[11px]"
                      >
                        ล้างตัวเลือก ({selectedCustomCats.length})
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
                    {Object.entries(CATEGORY_META)
                      .filter(([k]) => k !== 'cash_in')
                      .map(([k, meta]) => {
                        const isChecked = selectedCustomCats.includes(k);
                        return (
                          <button
                            key={k}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedCustomCats(selectedCustomCats.filter(c => c !== k));
                              } else {
                                setSelectedCustomCats([...selectedCustomCats, k]);
                              }
                            }}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                              isChecked
                                ? 'bg-[#D2E875] border-[#D2E875] text-gray-900 shadow-sm font-bold'
                                : 'bg-white dark:bg-[#141618] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                            }`}
                          >
                            <span>{meta.emoji} {meta.label}</span>
                            {isChecked && <Check className="w-3 h-3 text-gray-900" />}
                          </button>
                        );
                      })}
                  </div>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400">
                    * หมวดที่ติ๊กเลือกจะถูกยุบรวมคำนวณเป็นยอดก้อนเดียวกัน
                  </p>
                </div>
              )}

              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expenseByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => `฿${Number(value || 0).toLocaleString()}`}
                      contentStyle={{ backgroundColor: '#181A1C', borderColor: '#333', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div 
                  onClick={handleOpenAllExpensesDetail}
                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group hover:scale-105 transition-transform"
                  title="คลิกเพื่อดูรายละเอียดรายจ่ายทั้งหมด"
                >
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 group-hover:text-[#D2E875] transition-colors flex items-center gap-1">
                    <span>รวมรายจ่าย</span>
                    <Eye className="w-3 h-3 text-[#D2E875]" />
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#D2E875] transition-colors">฿{totalExpense.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                {expenseByCategory.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => handleOpenCategoryDetail(cat.catKeys, cat.name, cat.value)}
                    className="w-full flex justify-between items-center text-sm p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800/80 transition-all group cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    title={`คลิกดูรายละเอียด: ${cat.name}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-[#D2E875] transition-colors">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-900 dark:text-white group-hover:text-[#D2E875] transition-colors">฿{cat.value.toLocaleString()}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-[#181A1C] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 lg:col-span-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">รายการรายจ่ายล่าสุด</h3>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {expensesList.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
                    ไม่มีข้อมูลรายจ่ายในเดือนนี้
                  </div>
                ) : (
                  expensesList.map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg">
                          {CATEGORY_META[item.category as any]?.emoji || '📝'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{item.note || 'ไม่ระบุรายละเอียด'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span>{item.paymentTime.split(' ')[0]}</span>
                            <span>•</span>
                            <span className={item.paymentMethod === 'transfer' ? 'text-blue-500' : 'text-green-500'}>
                              {item.paymentMethod === 'transfer' ? '🏦 เงินโอน' : '💵 เงินสด'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-red-500">
                        -฿{Math.abs(item.amount).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD 3: P&L */}
      {activeDashboardView === 'pnl' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#181A1C] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 md:col-span-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">สรุปงบกำไรขาดทุน (P&L Summary)</h3>
              
              <div className="space-y-4">
                <div 
                  onClick={handleOpenSalesDetail}
                  className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 p-2 rounded-xl transition-colors group"
                  title="คลิกเพื่อดูรายละเอียดรายได้ยอดขาย"
                >
                  <span className="text-gray-600 dark:text-gray-400 font-medium group-hover:text-green-500 transition-colors flex items-center gap-1.5">
                    <span>ยอดขายสุทธิ (Net Sales)</span>
                    <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="text-xl font-bold text-green-500">฿{salesKpis.totalSales.toLocaleString()}</span>
                </div>
                
                <div className="pl-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">หัก: รายจ่ายเงินสดร้าน (Cash Out)</span>
                    <span className="text-red-400">-฿{pnlSummary.cashOut.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">หัก: รายจ่ายเงินโอน (Bank Transfer Out)</span>
                    <span className="text-red-400">-฿{pnlSummary.bankTransferOut.toLocaleString()}</span>
                  </div>
                </div>
                
                <div 
                  onClick={handleOpenAllExpensesDetail}
                  className="flex justify-between items-center py-4 border-b border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 p-2 rounded-xl transition-colors group"
                  title="คลิกเพื่อดูรายละเอียดรายจ่ายทั้งหมด"
                >
                  <span className="text-gray-900 dark:text-white font-bold group-hover:text-red-500 transition-colors flex items-center gap-1.5">
                    <span>รายจ่ายรวมทั้งหมด (Total Expenses)</span>
                    <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="text-lg font-bold text-red-500">-฿{pnlSummary.totalExp.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">กำไรขั้นต้น (Gross Profit)</span>
                  <span className={`text-2xl font-bold ${pnlSummary.grossProfit >= 0 ? 'text-[#D2E875]' : 'text-red-500'}`}>
                    ฿{pnlSummary.grossProfit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-[#181A1C] p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">สัดส่วนต้นทุน (COGS %)</h3>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">{pnlSummary.cogsPercent.toFixed(1)}%</span>
                  <span className="text-sm text-gray-500 mb-1">เป้าหมาย &lt; 40%</span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                  <div 
                    className={`h-2.5 rounded-full ${pnlSummary.cogsPercent > 40 ? 'bg-red-500' : 'bg-green-500'}`} 
                    style={{ width: `${Math.min(pnlSummary.cogsPercent, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {pnlSummary.cogsPercent > 40 
                    ? '⚠️ ต้นทุนวัตถุดิบสูงกว่าเกณฑ์ที่กำหนด ควรตรวจสอบการรั่วไหลหรือปรับราคา' 
                    : '✅ ต้นทุนวัตถุดิบอยู่ในเกณฑ์มาตรฐาน ควบคุมได้ดี'}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">คำแนะนำ (Insights)</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                      อย่าลืมบันทึก <span className="font-bold">รายจ่ายเงินโอนธนาคาร</span> ทั้งหมด เพื่อให้ระบบคำนวณกำไรสุทธิได้อย่างแม่นยำ เนื่องจากระบบ POS จะบันทึกเฉพาะเงินสดที่จ่ายออกจากลิ้นชักเท่านั้น
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#181A1C] p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">เปรียบเทียบผลประกอบการรายเดือน (MoM Summary)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={momData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `฿${v / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#181A1C', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => `฿${Number(value || 0).toLocaleString()}`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="sales" name="ยอดขายรวม" fill="#D2E875" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="expenses" name="รายจ่ายรวม" fill="#F87171" radius={[4, 4, 0, 0]} barSize={30} />
                  <Line type="monotone" dataKey="profit" name="กำไรขั้นต้น" stroke="#60A5FA" strokeWidth={3} dot={{ r: 4, fill: '#181A1C', stroke: '#60A5FA' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* MODAL: ADD TRANSFER EXPENSE */}
      {isAddTransferModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181A1C] rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-500" />
                บันทึกรายจ่ายเงินโอนธนาคาร
              </h3>
              <button 
                onClick={() => setIsAddTransferModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วันที่ (Date)</label>
                <input 
                  type="date" 
                  value={transferForm.date}
                  onChange={(e) => setTransferForm({...transferForm, date: e.target.value})}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D2E875]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รายละเอียด (Note)</label>
                <input 
                  type="text" 
                  placeholder="เช่น ค่าเช่าร้าน, ค่าไฟรอบบิล"
                  value={transferForm.note}
                  onChange={(e) => setTransferForm({...transferForm, note: e.target.value})}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D2E875]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">จำนวนเงิน (Amount)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">฿</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({...transferForm, amount: e.target.value})}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D2E875]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หมวดหมู่ (Category)</label>
                <select 
                  value={transferForm.category}
                  onChange={(e) => setTransferForm({...transferForm, category: e.target.value as any})}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D2E875]"
                >
                  {Object.entries(CATEGORY_META).filter(([k]) => k !== 'cash_in').map(([key, meta]) => (
                    <option key={key} value={key}>{meta.emoji} {meta.label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/30 flex items-start gap-2">
                  <CreditCard className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    รายการนี้จะถูกบันทึกเป็น <strong>เงินโอน (Bank Transfer)</strong> และไม่ส่งผลกระทบต่อยอดเงินสดในลิ้นชัก POS
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button 
                onClick={() => setIsAddTransferModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleAddTransfer}
                disabled={!transferForm.note || !transferForm.amount}
                className="flex-1 py-2.5 rounded-xl font-bold text-gray-900 bg-[#D2E875] hover:brightness-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                บันทึกรายจ่าย
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL BREAKDOWN MODAL */}
      {detailModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#181A1C] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#D2E875]" />
                  <span>{detailModal.title}</span>
                </h3>
                {detailModal.subtitle && (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-[#D2E875] mt-1">
                    {detailModal.subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={() => setDetailModal({ ...detailModal, isOpen: false })}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full bg-gray-100 dark:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหารายการ, วันที่ หรือคีย์เวิร์ด..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#141618] border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D2E875]"
              />
            </div>

            {/* Modal Item List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[400px] custom-scrollbar">
              {filteredModalItems.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm font-medium">
                  ไม่พบบันทึกที่ตรงตามคำค้นหา
                </div>
              ) : (
                filteredModalItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141618] hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors border border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        item.type === 'income'
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400'
                      }`}>
                        {item.type === 'income' ? '+' : '-'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {item.description}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                          <span>📅 {item.date}</span>
                          {item.paymentMethod && <span>• 💳 {item.paymentMethod}</span>}
                          {item.category && <span className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">{item.category}</span>}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold shrink-0 pl-2 ${
                      item.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {item.type === 'income' ? '+' : '-'}฿{item.amount.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-between items-center text-xs text-gray-500">
              <span>แสดง {filteredModalItems.length} จาก {detailModal.items.length} รายการ</span>
              <button
                onClick={() => setDetailModal({ ...detailModal, isOpen: false })}
                className="px-5 py-2 bg-gray-900 dark:bg-gray-700 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
              >
                ปิด
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
