import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, ShoppingCart, PieChart, Target, CheckCircle2, 
  ChevronRight, ChevronLeft, History, Sparkles, Plus, Trash2,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import confetti from 'canvas-confetti';
import type { 
  Transaction, DebtItem, DailyClosing, FixedCostItem, CafeSettings, DailyAllocation, DailySalesRecord, CashFlowRecord
} from '../types/finance';
import { 
  getStoredFixedCosts, getStoredCafeSettings, getStoredDailyClosings, saveDailyClosings 
} from '../utils/storage';

interface DailyClosingWizardProps {
  transactions: Transaction[];
  debts: DebtItem[];
  dailySales?: DailySalesRecord[];
  cashFlow?: CashFlowRecord[];
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

export const DailyClosingWizard: React.FC<DailyClosingWizardProps> = ({ 
  transactions, 
  debts, 
  dailySales = [],
  cashFlow = [],
  onAddTransaction: _onAddTransaction 
}) => {
  const [step, setStep] = useState(1);
  const [manualSales, setManualSales] = useState<string>('');

  // Latest date from POS or today
  const defaultDate = useMemo(() => {
    if (dailySales.length > 0) {
      const sorted = [...dailySales].sort((a, b) => b.date.localeCompare(a.date));
      return sorted[0].date;
    }
    return new Date().toISOString().split('T')[0];
  }, [dailySales]);

  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);

  useEffect(() => {
    setSelectedDate(defaultDate);
  }, [defaultDate]);
  
  // Settings & Fixed Costs
  const [settings, setSettings] = useState<CafeSettings>({
    cogsPercent: 35, workingDaysPerMonth: 30, monthlyFixedCostTarget: 0, currency: 'THB'
  });
  const [fixedCosts, setFixedCosts] = useState<FixedCostItem[]>([]);
  const [closings, setClosings] = useState<DailyClosing[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedClosingId, setExpandedClosingId] = useState<string | null>(null);

  // Quick expenses added in step 2
  const [quickExpenses, setQuickExpenses] = useState<{id: string, category: string, amount: number}[]>([]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('อื่นๆ');

  useEffect(() => {
    try {
      const storedSettings = getStoredCafeSettings();
      if (storedSettings) setSettings(storedSettings);
      
      const storedFC = getStoredFixedCosts();
      if (storedFC) setFixedCosts(storedFC);
      
      const storedClosings = getStoredDailyClosings();
      if (storedClosings) setClosings(storedClosings);
    } catch (error) {
      console.error("Error loading data", error);
    }
  }, []);

  // Derived: Selected date transactions
  const selectedDateTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedDate));
  }, [transactions, selectedDate]);

  // Pull directly from POS Sales Analytics!
  const posSalesRecord = useMemo(() => {
    return dailySales.find(d => d.date === selectedDate);
  }, [dailySales, selectedDate]);

  const posCashOutAmount = useMemo(() => {
    return cashFlow
      .filter(c => c.paymentTime.startsWith(selectedDate) && c.type === 'CashOut')
      .reduce((sum, c) => sum + Math.abs(c.amount), 0);
  }, [cashFlow, selectedDate]);

  const autoSales = useMemo(() => {
    if (posSalesRecord) return posSalesRecord.netSales;
    return selectedDateTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [posSalesRecord, selectedDateTransactions]);

  const autoPurchases = useMemo(() => {
    if (posCashOutAmount > 0) return posCashOutAmount;
    return selectedDateTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [posCashOutAmount, selectedDateTransactions]);

  const todaySales = manualSales !== '' ? parseFloat(manualSales) || 0 : autoSales;
  const totalPurchases = autoPurchases + quickExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Allocations calculation
  const allocations = useMemo(() => {
    if (todaySales === 0) return [];

    const cogs = todaySales * (settings.cogsPercent / 100);
    
    // Calculate daily fixed costs
    let wagesMonthly = 0;
    let loanMonthly = 0;
    let utilitiesMonthly = 0;
    
    fixedCosts.filter(fc => fc.isActive).forEach(fc => {
      let monthlyAmt = fc.amount;
      if (fc.frequency === 'weekly') monthlyAmt = fc.amount * 4;
      else if (fc.frequency === 'daily') monthlyAmt = fc.amount * settings.workingDaysPerMonth;
      
      if (fc.category === 'wages') wagesMonthly += monthlyAmt;
      else if (fc.category === 'loan') loanMonthly += monthlyAmt;
      else if (fc.category === 'utilities') utilitiesMonthly += monthlyAmt;
    });

    const wagesDaily = wagesMonthly / settings.workingDaysPerMonth;
    const loanDaily = loanMonthly / settings.workingDaysPerMonth;
    const utilitiesDaily = utilitiesMonthly / settings.workingDaysPerMonth;

    const netProfit = todaySales - cogs - wagesDaily - loanDaily - utilitiesDaily;

    const data: DailyAllocation[] = [
      { label: 'ต้นทุนสินค้า', emoji: '💰', amount: cogs, percent: (cogs/todaySales)*100, color: '#D2E875' },
      { label: 'กองทุนค่าแรง', emoji: '👥', amount: wagesDaily, percent: (wagesDaily/todaySales)*100, color: '#6366f1' },
      { label: 'กองทุนผ่อนหนี้', emoji: '🏦', amount: loanDaily, percent: (loanDaily/todaySales)*100, color: '#dc2626' },
      { label: 'กองทุนน้ำไฟ', emoji: '⚡', amount: utilitiesDaily, percent: (utilitiesDaily/todaySales)*100, color: '#3b82f6' },
      { label: 'กำไรสุทธิจริง', emoji: '🟢', amount: Math.max(0, netProfit), percent: (Math.max(0, netProfit)/todaySales)*100, color: '#10b981' }
    ];

    return data;
  }, [todaySales, settings, fixedCosts]);

  const netProfit = allocations.find(a => a.label === 'กำไรสุทธิจริง')?.amount || 0;
  const totalFixedDaily = allocations
    .filter(a => ['กองทุนค่าแรง', 'กองทุนผ่อนหนี้', 'กองทุนน้ำไฟ'].includes(a.label))
    .reduce((sum, a) => sum + a.amount, 0);

  // Recommendations
  const recommendedDebts = useMemo(() => {
    return debts
      .filter(d => d.remainingAmount > 0)
      .sort((a, b) => {
        const qRank = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4 } as Record<string, number>;
        return (qRank[a.quadrant] || 5) - (qRank[b.quadrant] || 5);
      })
      .slice(0, 3);
  }, [debts]);

  const handleAddQuickExpense = () => {
    const amt = parseFloat(expenseAmount);
    if (!isNaN(amt) && amt > 0) {
      setQuickExpenses([...quickExpenses, {
        id: Date.now().toString(),
        category: expenseCategory,
        amount: amt
      }]);
      setExpenseAmount('');
    }
  };

  const handleRemoveQuickExpense = (id: string) => {
    setQuickExpenses(quickExpenses.filter(e => e.id !== id));
  };

  const handleSaveClosing = () => {
    const newClosing: DailyClosing = {
      id: Date.now().toString(),
      date: selectedDate,
      totalSales: todaySales,
      totalPurchases: totalPurchases,
      cogsPercent: settings.cogsPercent,
      fixedCostDaily: totalFixedDaily,
      allocations,
      netProfit,
      createdAt: new Date().toISOString()
    };

    const updated = [newClosing, ...closings];
    setClosings(updated);
    saveDailyClosings(updated);

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D2E875', '#10b981', '#ffffff']
    });

    setStep(1);
    setManualSales('');
    setQuickExpenses([]);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
  };

  // Stacked chart data format
  const chartData = [
    allocations.reduce((acc, curr) => {
      acc[curr.label] = curr.amount;
      return acc;
    }, {} as any)
  ];

  return (
    <div className="w-full space-y-6">
      {/* Wizard Card */}
      <div className="triton-main-card p-6 md:p-8 rounded-[28px]">
        {/* Header & Steps */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#D2E875]" />
            ปิดยอดประจำวัน
          </h2>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div 
                key={s} 
                className={`h-2 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-[#D2E875]' : 'w-2 bg-gray-200 dark:bg-gray-700'}`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[300px] transition-all duration-300">
          
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-[#D2E875]/20 text-[#D2E875] rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold dark:text-white">ปิดยอดประจำวัน (Daily Closing)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">ระบบดึงยอดขายและรายจ่ายจาก POS อัตโนมัติ</p>
              </div>
              
              <div className="max-w-md mx-auto space-y-4">
                {/* POS Auto-Sync Banner */}
                <div className="flex items-center justify-between p-3 bg-[#D2E875]/10 border border-[#D2E875]/30 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-lime-800 dark:text-[#D2E875]">
                    <Sparkles className="w-4 h-4 text-[#D2E875]" />
                    ดึงตรงจากข้อมูลวิเคราะห์ POS
                  </div>
                  <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-white dark:bg-[#181A1C] border border-gray-200 dark:border-gray-700 text-xs rounded-xl px-3 py-1.5 text-gray-900 dark:text-white font-bold outline-none cursor-pointer"
                  />
                </div>

                <div className="p-4 bg-gray-50 dark:bg-[#181A1C] rounded-[20px] text-center border border-gray-100 dark:border-gray-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">ยอดขาย POS สุทธิ ({selectedDate})</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white">{formatNumber(autoSales)}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold dark:text-gray-300">ปรับยอดขายด้วยตัวเอง (หากต้องการ)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">฿</span>
                    <input 
                      type="number"
                      value={manualSales}
                      onChange={(e) => setManualSales(e.target.value)}
                      placeholder={autoSales.toString()}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#181A1C] border border-gray-200 dark:border-gray-700 rounded-[20px] focus:ring-2 focus:ring-[#D2E875] focus:outline-none dark:text-white transition-all text-lg font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold dark:text-white">รายจ่ายวันนี้</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">บันทึกรายจ่ายจิปาถะ หรือวัตถุดิบที่ซื้อเพิ่มวันนี้</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {['กาแฟ/ชา', 'นม/ไซรัป', 'เบเกอรี่', 'บรรจุภัณฑ์', 'อื่นๆ'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setExpenseCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                          expenseCategory === cat 
                            ? 'bg-[#232729] text-white dark:bg-white dark:text-[#181A1C]' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#181A1C] dark:text-gray-400 dark:hover:bg-gray-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">฿</span>
                      <input 
                        type="number"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        placeholder="จำนวนเงิน"
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#181A1C] border border-gray-200 dark:border-gray-700 rounded-[20px] focus:ring-2 focus:ring-[#D2E875] focus:outline-none dark:text-white"
                      />
                    </div>
                    <button 
                      onClick={handleAddQuickExpense}
                      disabled={!expenseAmount}
                      className="bg-[#D2E875] text-[#181A1C] px-6 py-3 rounded-full font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" /> เพิ่ม
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-[#181A1C] p-4 rounded-[20px] border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold dark:text-gray-300">รวมรายจ่ายวันนี้</span>
                    <span className="text-xl font-black text-red-500">{formatNumber(totalPurchases)}</span>
                  </div>
                  
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                    {autoPurchases > 0 && (
                      <div className="flex justify-between items-center text-sm p-2 bg-white dark:bg-gray-800/50 rounded-lg">
                        <span className="dark:text-gray-300">จากระบบ</span>
                        <span className="font-bold dark:text-white">{formatNumber(autoPurchases)}</span>
                      </div>
                    )}
                    {quickExpenses.map(exp => (
                      <div key={exp.id} className="flex justify-between items-center text-sm p-2 bg-white dark:bg-gray-800/50 rounded-lg">
                        <span className="dark:text-gray-300">{exp.category}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold dark:text-white">{formatNumber(exp.amount)}</span>
                          <button onClick={() => handleRemoveQuickExpense(exp.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {autoPurchases === 0 && quickExpenses.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-4">ไม่มีรายจ่ายวันนี้</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PieChart className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold dark:text-white">การจัดสรรเงิน</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">เงิน {formatNumber(todaySales)} ไปไหนบ้าง?</p>
              </div>

              {/* Stacked Bar Chart */}
              <div className="h-12 w-full mt-4 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip cursor={false} contentStyle={{ borderRadius: '12px', border: 'none', background: '#181A1C', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    {allocations.map((a, i) => (
                      <Bar key={a.label} dataKey={a.label} stackId="a" fill={a.color} radius={
                        i === 0 ? [100, 0, 0, 100] : i === allocations.length - 1 ? [0, 100, 100, 0] : [0, 0, 0, 0]
                      } />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Allocation Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                {allocations.map(a => (
                  <div key={a.label} className="p-4 rounded-[20px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#181A1C] shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{a.emoji}</span>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{a.label}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-lg font-black dark:text-white">{formatNumber(a.amount)}</span>
                      <span className="text-xs font-bold" style={{ color: a.color }}>{a.percent.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-purple-500/20 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold dark:text-white">แนะนำการจ่ายหนี้</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {netProfit > 0 
                    ? `คุณมีกำไร ${formatNumber(netProfit)} วันนี้ แบ่งไปโปะหนี้ดีไหม?`
                    : 'วันนี้ยังไม่มีกำไรสุทธิ สู้ๆ นะ!'}
                </p>
              </div>

              {netProfit > 0 && recommendedDebts.length > 0 ? (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {recommendedDebts.map((debt, idx) => (
                    <div key={debt.id} className="p-4 rounded-[20px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#181A1C] flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                          ${debt.quadrant === 'q1' ? 'bg-red-500' : debt.quadrant === 'q2' ? 'bg-orange-500' : 'bg-blue-500'}`}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="font-bold dark:text-white">{debt.title}</h4>
                          <p className="text-sm text-gray-500">คงเหลือ {formatNumber(debt.remainingAmount)}</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white rounded-full text-sm font-bold transition-all whitespace-nowrap">
                        บันทึกจ่ายหนี้
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 bg-gray-50 dark:bg-[#181A1C] rounded-[20px] max-w-lg mx-auto">
                  ไม่มีหนี้ที่ต้องชำระ หรือไม่มีกำไรในวันนี้
                </div>
              )}
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-[#D2E875]/20 text-[#D2E875] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold dark:text-white">สรุปประจำวัน</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">ตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก</p>
              </div>

              <div className="max-w-md mx-auto bg-gradient-to-b from-[#181A1C] to-[#232729] dark:from-[#232729] dark:to-[#181A1C] p-6 rounded-[28px] text-white shadow-xl">
                <div className="text-center mb-6">
                  <p className="text-gray-400 text-sm mb-1">{selectedDate}</p>
                  <h4 className="text-4xl font-black text-[#D2E875]">{formatNumber(netProfit)}</h4>
                  <p className="text-sm font-semibold mt-1">กำไรสุทธิจริงวันนี้</p>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-gray-700/50">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">ยอดขายรวม</span>
                    <span className="font-bold">{formatNumber(todaySales)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">ต้นทุนสินค้า (COGS)</span>
                    <span className="font-bold">{formatNumber(allocations.find(a=>a.label==='ต้นทุนสินค้า')?.amount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">รายจ่ายหน้าร้าน</span>
                    <span className="font-bold">{formatNumber(totalPurchases)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">กองทุนต่างๆ (รายวัน)</span>
                    <span className="font-bold">{formatNumber(totalFixedDaily)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-all dark:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 bg-[#232729] dark:bg-white text-white dark:text-[#181A1C] px-8 py-3 rounded-full font-bold hover:scale-105 transition-all"
            >
              ต่อไป <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSaveClosing}
              className="flex items-center gap-2 bg-[#D2E875] text-[#181A1C] px-8 py-3 rounded-full font-black hover:scale-105 transition-all"
            >
              บันทึกปิดยอด
            </button>
          )}
        </div>
      </div>

      {/* History Section */}
      <div className="triton-main-card p-6 rounded-[28px] mt-6">
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between text-gray-900 dark:text-white font-bold text-lg"
        >
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            ประวัติปิดยอด
          </div>
          {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showHistory && (
          <div className="mt-6 space-y-4">
            {closings.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">ยังไม่มีประวัติการปิดยอด</p>
            ) : (
              closings.map(closing => (
                <div key={closing.id} className="border border-gray-100 dark:border-gray-800 rounded-[20px] overflow-hidden bg-white dark:bg-[#181A1C]">
                  <div 
                    onClick={() => setExpandedClosingId(expandedClosingId === closing.id ? null : closing.id)}
                    className="p-4 flex flex-wrap items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                  >
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{closing.date}</p>
                      <p className="font-bold dark:text-white">ยอดขาย {formatNumber(closing.totalSales)}</p>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">กำไรสุทธิ</p>
                        <p className={`font-black ${closing.netProfit >= 0 ? 'text-[#10b981]' : 'text-red-500'}`}>
                          {formatNumber(closing.netProfit)}
                        </p>
                      </div>
                      {expandedClosingId === closing.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>
                  
                  {expandedClosingId === closing.id && (
                    <div className="p-4 bg-gray-50 dark:bg-[#232729] border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 md:grid-cols-5 gap-2">
                      {closing.allocations.map((a, i) => (
                        <div key={i} className="bg-white dark:bg-[#181A1C] p-2 rounded-xl text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{a.label}</p>
                          <p className="font-bold text-sm mt-1" style={{color: a.color}}>{formatNumber(a.amount)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
