import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip
} from 'recharts';
import type { Transaction, DebtItem, DailySalesRecord, CashFlowRecord } from '../types/finance';
import { CATEGORIES } from '../data/categories';
import { convertDailySalesToTransactions, convertCashFlowToTransactions } from '../utils/excelParser';

interface OverviewTabProps {
  transactions: Transaction[];
  debts: DebtItem[];
  dailySales?: DailySalesRecord[];
  cashFlow?: CashFlowRecord[];
  onNavigateToDebtMatrix: () => void;
  onNavigateToTransactions?: () => void;
  onNavigateToSmartImport?: () => void;
  onOpenAddTransaction?: () => void;
}

export type TimePreset = 'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export const OverviewTab: React.FC<OverviewTabProps> = ({
  transactions,
  debts,
  dailySales = [],
  cashFlow = [],
  onNavigateToDebtMatrix,
  onNavigateToTransactions,
  onNavigateToSmartImport,
  onOpenAddTransaction,
}) => {
  const [timePreset, setTimePreset] = useState<TimePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Auto-combine POS sales & cash flow into unified transactions list
  const combinedTransactions = useMemo(() => {
    const posSalesTxs = convertDailySalesToTransactions(dailySales);
    const posCashFlowTxs = convertCashFlowToTransactions(cashFlow);
    
    const mappedPosSales: Transaction[] = posSalesTxs.map(t => ({
      ...t,
      id: `pos-sale-${t.date}`,
      createdAt: new Date().toISOString(),
    }));
    
    const mappedPosCashFlow: Transaction[] = posCashFlowTxs.map((t, idx) => ({
      ...t,
      id: `pos-cf-${idx}`,
      createdAt: new Date().toISOString(),
    }));

    // Keep manual transactions or OCR transactions that don't duplicate POS dates
    const otherTxs = transactions.filter(t => t.source !== 'excel_import');
    return [...mappedPosSales, ...mappedPosCashFlow, ...otherTxs];
  }, [transactions, dailySales, cashFlow]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const getFilteredTransactions = (): Transaction[] => {
    return combinedTransactions.filter((t) => {
      if (timePreset === 'all') return true;

      if (timePreset === 'today') {
        return t.date === todayStr;
      }

      if (timePreset === 'this_week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        return t.date >= weekAgoStr && t.date <= todayStr;
      }

      if (timePreset === 'this_month') {
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        return t.date >= firstDayOfMonth && t.date <= todayStr;
      }

      if (timePreset === 'last_month') {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        return t.date >= firstDayLastMonth && t.date <= lastDayLastMonth;
      }

      if (timePreset === 'custom') {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
      }

      return true;
    });
  };

  const filteredTxs = getFilteredTransactions();

  const totalIncome = filteredTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0';

  const totalDebtRemaining = debts
    .filter((d) => d.status !== 'paid')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const q1Debts = debts.filter((d) => d.quadrant === 'q1' && d.status !== 'paid');



  const dateMap: Record<string, { date: string; income: number; expense: number }> = {};
  filteredTxs.forEach((t) => {
    if (!dateMap[t.date]) {
      dateMap[t.date] = { date: t.date, income: 0, expense: 0 };
    }
    if (t.type === 'income') {
      dateMap[t.date].income += t.amount;
    } else {
      dateMap[t.date].expense += t.amount;
    }
  });

  const barChartData = Object.values(dateMap)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-8 pb-10 font-prompt text-slate-800">
      <style>{`
        .donezo-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .donezo-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .donezo-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}</style>

      {/* POS Auto-Sync Banner */}
      <div className="flex items-center justify-between p-3.5 bg-white dark:bg-[#181A1C] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5 text-xs font-bold text-gray-700 dark:text-gray-200">
          <div className="w-7 h-7 rounded-xl bg-[#D2E875]/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#9EBB2B] dark:text-[#D2E875]" />
          </div>
          <span>เชื่อมโยงข้อมูลรายรับ-รายจ่ายจาก <span className="text-[#9EBB2B] dark:text-[#D2E875] font-black">วิเคราะห์ POS</span> อัตโนมัติ</span>
        </div>
        <span className="text-xs text-gray-400 font-medium">แชร์ข้อมูลชุดเดียวกัน 100%</span>
      </div>

      {/* 4 Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Card 1: Total Income (Lime Green Top-to-Bottom Gradient) */}
        <div className="bg-gradient-to-b from-[#9EBB2B] via-[#C3E04F] to-[#E3F592] text-[#181A1C] rounded-[24px] p-6 flex flex-col justify-between group shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-white/30">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-[#232729] text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm">
               <TrendingUp className="w-5 h-5 text-[#D2E875]" />
            </div>
          </div>
          <div className="mb-6">
            <div className="text-sm font-bold opacity-80 mb-1">รายรับรวม (Total Income)</div>
            <div className="text-3xl font-extrabold font-kanit tracking-tight text-[#181A1C]">฿{totalIncome.toLocaleString('th-TH')}</div>
            <div className="text-xs font-semibold opacity-75 mt-2">ยอดขาย POS & Delivery</div>
          </div>
          <button onClick={onNavigateToTransactions} className="w-full bg-[#232729] hover:bg-black text-white text-sm font-bold py-3 rounded-full transition-colors shadow-sm">
            ดูรายละเอียด
          </button>
        </div>

        {/* Card 2: Total Expense (Lilac Purple Top-to-Bottom Gradient) */}
        <div className="bg-gradient-to-b from-[#9478D8] via-[#B8A2EA] to-[#DCCEFA] text-[#181A1C] rounded-[24px] p-6 flex flex-col justify-between group shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-white/30">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-[#232729] text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm">
               <TrendingDown className="w-5 h-5 text-[#C8B6EE]" />
            </div>
          </div>
          <div className="mb-6">
            <div className="text-sm font-bold opacity-80 mb-1">รายจ่ายรวม (Total Expense)</div>
            <div className="text-3xl font-extrabold font-kanit tracking-tight text-[#181A1C]">฿{totalExpense.toLocaleString('th-TH')}</div>
            <div className="text-xs font-semibold opacity-75 mt-2">ต้นทุนวัตถุดิบ & ค่าใช้จ่าย</div>
          </div>
          <button onClick={onOpenAddTransaction} className="w-full bg-[#232729] hover:bg-black text-white text-sm font-bold py-3 rounded-full transition-colors shadow-sm">
            + บันทึกรายจ่าย
          </button>
        </div>

        {/* Card 3: Net Profit (Soft Slate Top-to-Bottom Gradient) */}
        <div className="bg-gradient-to-b from-[#A5BABC] via-[#C7D7D9] to-[#E7F0F2] text-[#181A1C] rounded-[24px] p-6 flex flex-col justify-between group shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-white/30">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-[#232729] text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm">
               <TrendingUp className="w-5 h-5 text-[#DCE4E6]" />
            </div>
          </div>
          <div className="mb-6">
            <div className="text-sm font-bold opacity-80 mb-1">กำไรสุทธิ (Net Profit)</div>
            <div className="text-3xl font-extrabold font-kanit tracking-tight text-[#181A1C]">฿{netProfit.toLocaleString('th-TH')}</div>
            <div className="text-xs font-semibold opacity-75 mt-2">อัตรากำไร (Margin) {profitMargin}%</div>
          </div>
          <button onClick={onNavigateToSmartImport} className="w-full bg-[#232729] hover:bg-black text-white text-sm font-bold py-3 rounded-full transition-colors shadow-sm">
            ดูรายงาน
          </button>
        </div>

        {/* Card 4: Pending Debt (Rose Pink Top-to-Bottom Gradient) */}
        <div className="bg-gradient-to-b from-[#E55353] via-[#F88B8B] to-[#FCD4D4] text-[#181A1C] rounded-[24px] p-6 flex flex-col justify-between group shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-white/30">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-[#232729] text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm">
               <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
            </div>
          </div>
          <div className="mb-6">
            <div className="text-sm font-bold opacity-80 mb-1">ยอดหนี้คงเหลือรวม (Remaining Debt)</div>
            <div className="text-3xl font-extrabold font-kanit tracking-tight text-[#181A1C]">฿{totalDebtRemaining.toLocaleString('th-TH')}</div>
            <div className="text-xs font-semibold opacity-75 mt-2">Q1 ด่วน {q1Debts.length} รายการ</div>
          </div>
          <button onClick={onNavigateToDebtMatrix} className="w-full bg-[#232729] hover:bg-black text-white text-sm font-bold py-3 rounded-full transition-colors shadow-sm">
            ดูตารางหนี้
          </button>
        </div>
      </div>

      {/* Main Section */}
      <div className="triton-main-card p-6 md:p-8 shadow-sm">
        
        {/* Header & Value & Filter */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-8 gap-6">
          <div>
             <h2 className="text-xl font-bold text-gray-900 dark:text-white font-kanit">แนวโน้มและสภาพคล่องการเงิน</h2>
             <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Estimate your profits</p>
             <div className="text-4xl font-extrabold text-gray-900 dark:text-white font-kanit">฿{netProfit.toLocaleString('th-TH')}</div>
          </div>

          {/* Time Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'today', label: 'วันนี้' },
              { id: 'this_week', label: '7 วัน' },
              { id: 'this_month', label: 'เดือนนี้' },
              { id: 'custom', label: 'กำหนดเอง' }
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setTimePreset(preset.id as TimePreset)}
                className={`rounded-xl px-5 py-2.5 font-bold text-sm transition-all shadow-sm ${
                  timePreset === preset.id
                    ? 'bg-[#D2E875] text-[#181A1C]'
                    : 'bg-gray-100 dark:bg-[#2A2E33] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
            {timePreset === 'custom' && (
              <div className="flex items-center gap-2 xl:ml-2 mt-2 xl:mt-0">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-gray-100 dark:bg-[#2A2E33] rounded-xl px-3 py-2.5 text-sm outline-none font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700" />
                <span className="text-gray-400 font-bold">-</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-gray-100 dark:bg-[#2A2E33] rounded-xl px-3 py-2.5 text-sm outline-none font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700" />
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="w-full h-[320px] mb-8">
          {barChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return d.toLocaleDateString('th-TH', { weekday: 'short' });
                  }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(v) => `฿${v / 1000}k`} 
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(210, 232, 117, 0.05)' }}
                  contentStyle={{ 
                    backgroundColor: '#181A1C', 
                    borderColor: '#2E3338', 
                    borderRadius: '16px', 
                    color: '#ffffff',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  itemStyle={{ fontWeight: 700, padding: '2px 0', color: '#ffffff' }}
                  formatter={(value: any) => [`฿${Number(value).toLocaleString('th-TH')}`, '']}
                  labelStyle={{ color: '#9CA3AF', marginBottom: '4px', fontWeight: 600, fontSize: '12px' }}
                />
                <Bar dataKey="income" name="Income" fill="#D2E875" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Expense" fill="#C8B6EE" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-[#181A1C]/50 rounded-2xl text-gray-400 text-sm font-medium border border-gray-100 dark:border-gray-800">
              ไม่มีข้อมูล
            </div>
          )}
        </div>

        {/* Sub-cards: Recent & Q1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Col 1: Recent Tx List */}
          <div className="bg-gray-100/70 dark:bg-[#181A1C]/80 rounded-[24px] p-5 sm:p-6 flex flex-col border border-gray-200/80 dark:border-gray-800 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white font-kanit">รายการธุรกรรมล่าสุด</h3>
            </div>
            <div className="space-y-3 overflow-hidden">
              {filteredTxs.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex items-center justify-between bg-white dark:bg-[#232729] p-3.5 rounded-[18px] shadow-sm border border-gray-200/80 dark:border-gray-700/60 overflow-hidden gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-[#D2E875] text-[#181A1C]' : 'bg-[#C8B6EE] text-[#181A1C]'}`}>
                      {tx.type === 'income' ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                        {tx.description || CATEGORIES[tx.category]?.name || tx.category}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">{tx.date}</div>
                    </div>
                  </div>
                  <div className={`text-xs sm:text-sm font-black shrink-0 px-3 py-1.5 rounded-xl border ${
                    tx.type === 'income' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/20'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}฿{tx.amount.toLocaleString('th-TH')}
                  </div>
                </div>
              ))}
              {filteredTxs.length === 0 && (
                <div className="text-center text-gray-400 text-sm font-medium py-8">ไม่มีข้อมูล</div>
              )}
            </div>
          </div>

          {/* Col 2: Reminders */}
          <div className="bg-gray-100/70 dark:bg-[#181A1C]/80 rounded-[24px] p-5 sm:p-6 flex flex-col border border-gray-200/80 dark:border-gray-800 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white font-kanit">รายการหนี้เร่งด่วน Q1</h3>
            </div>
            
            <div className="flex-1 flex flex-col justify-start overflow-y-auto pr-1 max-h-[340px] overflow-hidden">
              {q1Debts.length > 0 ? (
                <div className="space-y-3">
                  {q1Debts.map(debt => (
                    <div key={debt.id} className="p-4 bg-white dark:bg-[#232729] rounded-[18px] shadow-sm flex flex-col border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                      <div className="font-bold text-gray-900 dark:text-white text-sm mb-1 leading-snug truncate">{debt.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5" /> ครบกำหนด: {debt.dueDate}
                      </div>
                      <button onClick={onNavigateToDebtMatrix} className="w-full bg-[#232729] hover:bg-black dark:bg-[#D2E875] dark:hover:bg-[#c3dc60] text-white dark:text-[#181A1C] text-xs py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm">
                         ดำเนินการชำระ (฿{debt.remainingAmount.toLocaleString('th-TH')})
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-gray-400 text-sm font-medium min-h-[200px]">
                  ไม่มีรายการหนี้เร่งด่วน Q1 🎉
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Bottom Action Button */}
        <button onClick={onNavigateToTransactions} className="w-full bg-[#232729] hover:bg-black text-white rounded-2xl py-4 font-bold text-base transition-colors shadow-md">
          ส่งออกรายงานการเงิน Excel
        </button>

      </div>
    </div>
  );
};
