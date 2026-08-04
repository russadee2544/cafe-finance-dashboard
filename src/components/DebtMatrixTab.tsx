import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Target, 
  CheckCircle2, 
  PlusCircle, 
  DollarSign, 
  Trash2, 
  Info,
  Filter,
  CalendarDays,
  TrendingUp,
  AlertCircle,
  Compass,
  Search,
  User
} from 'lucide-react';
import type { DebtItem, DebtQuadrant } from '../types/finance';
import { DEBT_QUADRANTS } from '../data/quadrants';

interface DebtMatrixTabProps {
  debts: DebtItem[];
  onAddDebt: () => void;
  onUpdateDebt: (updatedDebt: DebtItem) => void;
  onDeleteDebt: (debtId: string) => void;
}

export const DebtMatrixTab: React.FC<DebtMatrixTabProps> = ({
  debts,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('pending');
  const [selectedQuadrant, setSelectedQuadrant] = useState<'all' | DebtQuadrant>('all');
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Payment Modal State
  const [paymentModalDebt, setPaymentModalDebt] = useState<DebtItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');

  // Repay Payment Handler
  const handleConfirmPayment = () => {
    if (!paymentModalDebt) return;
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const newRemaining = Math.max(0, paymentModalDebt.remainingAmount - amountNum);
    const newStatus = newRemaining === 0 ? 'paid' : 'partially_paid';

    const updatedHistory = [
      ...paymentModalDebt.repaymentHistory,
      {
        id: `rh-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        amount: amountNum,
        note: paymentNote || 'ชำระหนี้ผ่านระบบ',
      },
    ];

    const updated: DebtItem = {
      ...paymentModalDebt,
      remainingAmount: newRemaining,
      status: newStatus,
      repaymentHistory: updatedHistory,
    };

    onUpdateDebt(updated);

    if (newRemaining === 0) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#232729', '#D2E875', '#FDCB6E']
      });
    }

    setPaymentModalDebt(null);
    setPaymentAmount('');
    setPaymentNote('');
  };

  const handleChangeQuadrant = (debt: DebtItem, newQuadrant: DebtQuadrant) => {
    onUpdateDebt({
      ...debt,
      quadrant: newQuadrant,
    });
  };

  // Multi-select and custom filter states
  const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [creditorFilter, setCreditorFilter] = useState<string>('all');

  const uniqueCreditors = Array.from(new Set(debts.map(d => d.creditor).filter(Boolean)));

  const toggleSelectDebt = (id: string) => {
    setSelectedDebtIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredDebts.map(d => d.id);
    const allSelected = filteredIds.every(id => selectedDebtIds.includes(id));
    if (allSelected) {
      setSelectedDebtIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedDebtIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const filteredDebts = debts.filter((d) => {
    if (filterStatus === 'pending' && d.status === 'paid') return false;
    if (filterStatus === 'paid' && d.status !== 'paid') return false;
    if (selectedQuadrant !== 'all' && d.quadrant !== selectedQuadrant) return false;
    if (creditorFilter !== 'all' && d.creditor !== creditorFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchCreditor = (d.creditor || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCreditor) return false;
    }
    return true;
  });

  // Selected debts calculations
  const selectedDebts = debts.filter(d => selectedDebtIds.includes(d.id));
  const selectedTotalRemaining = selectedDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const selectedTotalOriginal = selectedDebts.reduce((sum, d) => sum + d.totalAmount, 0);

  const getDebtsByQuadrant = (q: DebtQuadrant) => {
    return filteredDebts.filter((d) => d.quadrant === q);
  };

  const getDaysUntilDueText = (dueDate: string) => {
    if (!dueDate) return { text: 'ไม่มีกำหนด', color: 'text-gray-400', urgent: false };
    const due = new Date(dueDate);
    due.setHours(0,0,0,0);
    const now = new Date();
    now.setHours(0,0,0,0);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `เกินกำหนด ${Math.abs(diffDays)} วัน`, color: 'text-red-500 font-bold', urgent: true };
    if (diffDays === 0) return { text: 'ครบกำหนดวันนี้', color: 'text-amber-500 font-bold', urgent: true };
    if (diffDays <= 3) return { text: `เหลือ ${diffDays} วัน`, color: 'text-amber-500', urgent: true };
    return { text: `เหลือ ${diffDays} วัน`, color: 'text-gray-500', urgent: false };
  };

  // Dynamic summary stats based on active filters and selection
  const isFilteredActive = selectedDebtIds.length > 0 || searchQuery || creditorFilter !== 'all' || selectedQuadrant !== 'all' || filterStatus !== 'pending';
  const targetDebts = selectedDebtIds.length > 0 
    ? debts.filter(d => selectedDebtIds.includes(d.id))
    : filteredDebts;

  const totalDebtAmount = targetDebts.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalRemainingAmount = targetDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalPaidAmount = totalDebtAmount - totalRemainingAmount;
  const totalProgress = totalDebtAmount > 0 ? (totalPaidAmount / totalDebtAmount) * 100 : 0;

  const quadrantStyles: Record<string, { border: string, bg: string, emoji: string, shadow: string, header: string }> = {
    q1: { border: 'border-red-400/60', bg: 'bg-gradient-to-b from-red-500/15 via-red-500/5 to-transparent', emoji: '🔴', shadow: 'shadow-sm', header: 'bg-gradient-to-b from-red-500/25 to-red-500/10' },
    q2: { border: 'border-amber-400/60', bg: 'bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent', emoji: '🟡', shadow: 'shadow-sm', header: 'bg-gradient-to-b from-amber-500/25 to-amber-500/10' },
    q3: { border: 'border-blue-400/60', bg: 'bg-gradient-to-b from-blue-500/15 via-blue-500/5 to-transparent', emoji: '🟠', shadow: 'shadow-sm', header: 'bg-gradient-to-b from-blue-500/25 to-blue-500/10' },
    q4: { border: 'border-emerald-400/60', bg: 'bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent', emoji: '🟢', shadow: 'shadow-sm', header: 'bg-gradient-to-b from-emerald-500/25 to-emerald-500/10' }
  };

  const emptyStateMessages = {
    q1: 'ยอดเยี่ยม! ไม่มีหนี้สินด่วนและสำคัญในขณะนี้',
    q2: 'ไม่มีหนี้สินระยะยาวที่สำคัญที่ต้องจัดการ',
    q3: 'ไม่มีหนี้สินด่วนที่ไม่สำคัญกวนใจ',
    q4: 'ไม่มีหนี้สินที่ไม่ด่วนและไม่สำคัญ'
  };

  return (
    <div className={`triton-main-card rounded-[28px] p-8 shadow-sm space-y-6 transition-opacity duration-700 ease-out ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-[#181A1C] dark:text-white flex items-center gap-3">
            <Compass className="w-6 h-6 text-[#145A38] dark:text-[#D2E875] shrink-0" />
            เมทริกซ์จัดลำดับความสำคัญหนี้สิน <span className="text-gray-400 font-light hidden sm:inline">| Eisenhower 4 Quadrants</span>
          </h2>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">
            จัดระเบียบและวางแผนคืนหนี้สินตาม <strong className="text-gray-700">ความสำคัญ</strong> และ <strong className="text-gray-700">ความเร่งด่วน</strong> เพื่อป้องกันผลกระทบต่อสภาพคล่องของคาเฟ่ และลดภาระดอกเบี้ยได้อย่างมีประสิทธิภาพ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onAddDebt}
            className="px-5 py-2.5 bg-[#232729] hover:bg-black text-white rounded-full font-bold text-sm transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2 transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-5 h-5" />
            เพิ่มหนี้สิน/สินเชื่อ
          </button>
        </div>
      </div>

      {/* Filter & Multi-Select Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2">
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <div className="p-1.5 bg-[#F1F3F5] dark:bg-gray-800 rounded-full mr-1">
            <Filter className="w-4 h-4 text-gray-500" />
          </div>
          
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
              filterStatus === 'pending'
                ? 'bg-[#D2E875] text-[#181A1C]'
                : 'bg-[#F1F3F5] dark:bg-[#181A1C] text-[#181A1C] dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            ค้างชำระ <span className="ml-1 px-2 py-0.5 rounded-full bg-black/10 text-xs">{debts.filter(d => d.status !== 'paid').length}</span>
          </button>

          <button
            onClick={() => setFilterStatus('paid')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
              filterStatus === 'paid'
                ? 'bg-[#D2E875] text-[#181A1C]'
                : 'bg-[#F1F3F5] dark:bg-[#181A1C] text-[#181A1C] dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            ชำระแล้ว <span className="ml-1 px-2 py-0.5 rounded-full bg-black/10 text-xs">{debts.filter(d => d.status === 'paid').length}</span>
          </button>

          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
              filterStatus === 'all'
                ? 'bg-[#232729] text-white'
                : 'bg-[#F1F3F5] dark:bg-[#181A1C] text-[#181A1C] dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            ทั้งหมด <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-xs">{debts.length}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          {/* Search Bar */}
          <div className="flex items-center gap-2 bg-[#F1F3F5] dark:bg-[#181A1C] px-3 py-2 rounded-full border border-gray-200 dark:border-gray-800 flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อหนี้ / เจ้าหนี้..."
              className="bg-transparent text-xs font-bold text-gray-900 dark:text-white outline-none w-36 sm:w-44"
            />
          </div>

          {/* Creditor Filter Dropdown */}
          {uniqueCreditors.length > 0 && (
            <div className="flex items-center space-x-2 bg-[#F1F3F5] dark:bg-[#181A1C] px-3.5 py-2 rounded-full border border-gray-200 dark:border-gray-800">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <select
                value={creditorFilter}
                onChange={(e) => setCreditorFilter(e.target.value)}
                className="bg-transparent text-gray-900 dark:text-white text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all">👤 เจ้าหนี้ทั้งหมด ({uniqueCreditors.length})</option>
                {uniqueCreditors.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Quadrant Selector */}
          <div className="flex items-center space-x-2 bg-[#F1F3F5] dark:bg-[#181A1C] px-3.5 py-2 rounded-full border border-gray-200 dark:border-gray-800">
            <Target className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={selectedQuadrant}
              onChange={(e) => setSelectedQuadrant(e.target.value as any)}
              className="bg-transparent text-gray-900 dark:text-white text-xs font-bold outline-none cursor-pointer"
            >
              <option value="all">แสดงทุก Q</option>
              <option value="q1">Q1: ด่วน & สำคัญ 🔴</option>
              <option value="q2">Q2: ไม่ด่วน & สำคัญ 🟡</option>
              <option value="q3">Q3: ด่วน & ไม่สำคัญ 🟠</option>
              <option value="q4">Q4: ไม่ด่วน & ไม่สำคัญ 🟢</option>
            </select>
          </div>

          {/* Select All Checkbox Button */}
          <button
            onClick={handleSelectAllFiltered}
            className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-full font-bold text-xs border border-emerald-300 dark:border-emerald-800 transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{filteredDebts.every(id => selectedDebtIds.includes(id.id)) && filteredDebts.length > 0 ? 'ยกเลิกการเลือก' : `เลือกทั้งหมด (${filteredDebts.length})`}</span>
          </button>
        </div>
      </div>

      {/* Selected Debts Summary Banner */}
      {selectedDebtIds.length > 0 && (
        <div className="bg-white dark:bg-[#181A1C] p-5 rounded-2xl border-2 border-[#D2E875] shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300 mt-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#D2E875] text-[#181A1C] flex items-center justify-center font-black text-lg shadow-md shrink-0">
              {selectedDebtIds.length}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900 dark:text-[#D2E875] uppercase tracking-wider">📌 สรุปยอดหนี้รวมเฉพาะรายการที่เลือก</span>
                <span className="text-[10px] bg-gray-100 dark:bg-white/20 text-gray-700 dark:text-white px-2 py-0.5 rounded-full font-mono font-bold">{selectedDebtIds.length} รายการ</span>
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">
                ฿{selectedTotalRemaining.toLocaleString('th-TH')}{' '}
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium ml-2">
                  (จากเงินกู้ตั้งต้น ฿{selectedTotalOriginal.toLocaleString('th-TH')})
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setSelectedDebtIds([])}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all"
            >
              ล้างรายการที่เลือก
            </button>
          </div>
        </div>
      )}

      {/* Clean Matrix Legend Banner (Prevents text overlap 100%) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 mb-2 p-3.5 bg-white dark:bg-[#181A1C] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 flex-wrap">
          <Compass className="w-4 h-4 text-emerald-500" />
          <span>แกนแนวตั้ง (ความสำคัญ):</span>
          <span className="bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 font-extrabold">↑ สำคัญมาก (Q1, Q2)</span>
          <span className="text-gray-400">/</span>
          <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-lg font-medium">↓ ไม่สำคัญ (Q3, Q4)</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 flex-wrap">
          <span>แกนแนวนอน (ความด่วน):</span>
          <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900 font-extrabold">← ด่วนที่สุด (Q1, Q3)</span>
          <span className="text-gray-400">/</span>
          <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-lg font-medium">ไม่ด่วน (Q2, Q4) →</span>
        </div>
      </div>

      {/* The 2x2 Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative mt-4">
          {(['q1', 'q2', 'q3', 'q4'] as DebtQuadrant[]).map((quadrantKey) => {
            const info = DEBT_QUADRANTS[quadrantKey];
            const qStyle = quadrantStyles[quadrantKey];
            const quadDebts = getDebtsByQuadrant(quadrantKey);
            const totalQuadRemaining = quadDebts
              .filter((d) => d.status !== 'paid')
              .reduce((sum, d) => sum + d.remainingAmount, 0);

            const hasPendingQ1 = quadrantKey === 'q1' && quadDebts.some(d => d.status !== 'paid');
            const containerClass = `rounded-[28px] border-2 flex flex-col overflow-hidden transition-all duration-500 
              ${qStyle.bg} ${qStyle.border} ${qStyle.shadow}
              ${hasPendingQ1 ? 'animate-[pulse_3s_ease-in-out_infinite] hover:animate-none' : 'hover:-translate-y-1 hover:shadow-md'}`;

            return (
              <div key={quadrantKey} className={containerClass}>
                {/* Quadrant Header */}
                <div className={`p-5 border-b border-gray-100 ${qStyle.header}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl drop-shadow-sm">{qStyle.emoji}</span>
                        <h3 className="text-lg font-black text-[#181A1C] tracking-wide">{info.name}</h3>
                      </div>
                      <p className="text-xs text-gray-600 mt-1.5 font-bold ml-9">{info.subName}</p>
                    </div>
                    <div className="text-right bg-white/60 px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                      <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-bold mb-0.5">ยอดคงเหลือ</span>
                      <span className="text-base font-black text-[#181A1C]">
                        ฿{totalQuadRemaining.toLocaleString('th-TH')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 px-3 py-2 bg-white/70 rounded-xl text-xs text-gray-700 border border-gray-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{info.description}</span>
                  </div>
                </div>

                {/* Quadrant Body / Debts List */}
                <div className="p-4 space-y-4 h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-track-transparent bg-white">
                  {quadDebts.length > 0 ? (
                    quadDebts.map((debt) => {
                      const isPaid = debt.status === 'paid';
                      const isSelected = selectedDebtIds.includes(debt.id);
                      const progress = debt.totalAmount > 0 ? ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100 : 0;
                      const dueInfo = getDaysUntilDueText(debt.dueDate);

                      return (
                        <div
                          key={debt.id}
                          className={`p-5 rounded-2xl border transition-all duration-300 group ${
                            isSelected
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-[#D2E875] ring-2 ring-[#D2E875]/70 shadow-md'
                              : isPaid
                                ? 'bg-gray-50 border-gray-200 opacity-70 grayscale-[20%]'
                                : 'bg-white dark:bg-[#181A1C] border-gray-200 dark:border-gray-800 shadow-sm hover:border-gray-300'
                          }`}
                        >
                          {/* Debt Card Header */}
                          <div className="flex justify-between items-start mb-3 gap-3">
                            <div className="flex items-start gap-2.5 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectDebt(debt.id)}
                                className="mt-1 w-4 h-4 rounded border-gray-300 text-[#181A1C] focus:ring-[#D2E875] cursor-pointer"
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className={`font-black text-base ${isPaid ? 'text-gray-500' : 'text-[#181A1C] dark:text-white'}`}>
                                    {debt.title}
                                  </h4>
                                  {isSelected && (
                                    <span className="bg-[#D2E875] text-[#181A1C] text-[10px] px-2 py-0.5 rounded-full font-black">
                                      เลือกอยู่
                                    </span>
                                  )}
                                  {isPaid && (
                                    <span className="bg-[#D2E875]/20 text-[#181A1C] text-[10px] px-2 py-0.5 rounded-full border border-[#D2E875]/50 font-bold flex items-center gap-1 uppercase tracking-wider">
                                      <CheckCircle2 className="w-3 h-3" /> ชำระแล้ว
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5 font-bold">
                                  <span className="bg-[#F1F3F5] dark:bg-[#232729] px-2 py-0.5 rounded-md text-gray-600 dark:text-gray-300">{debt.creditor}</span>
                                  {debt.interestRate !== undefined && debt.interestRate > 0 && (
                                    <span className="text-red-500 flex items-center gap-1">
                                      <TrendingUp className="w-3 h-3" /> {debt.interestRate}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <span className={`text-lg font-black block ${isPaid ? 'text-gray-400' : 'text-[#181A1C]'}`}>
                                ฿{debt.remainingAmount.toLocaleString('th-TH')}
                              </span>
                              {debt.remainingAmount < debt.totalAmount && (
                                <span className="text-[10px] text-gray-400 font-bold">
                                  จาก ฿{debt.totalAmount.toLocaleString('th-TH')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1.5">
                              <span>ความคืบหน้า</span>
                              <span>{progress.toFixed(0)}%</span>
                            </div>
                            <div className="h-2 bg-[#F1F3F5] rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  isPaid ? 'bg-[#D2E875]' : progress > 50 ? 'bg-[#D2E875]' : 'bg-[#D2E875]'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Debt Details */}
                          <div className="bg-[#F1F3F5] rounded-xl p-3 mb-4 border border-gray-100 space-y-2">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-gray-600 font-medium text-[11px] leading-relaxed">
                                {debt.priorityReason || 'ไม่มีเหตุผลที่ระบุ'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                              <CalendarDays className={`w-3.5 h-3.5 ${dueInfo.urgent ? 'text-red-500' : 'text-gray-400'}`} />
                              <span className={`text-xs ${dueInfo.color}`}>
                                กำหนด: <span className="font-bold">{debt.dueDate || '-'}</span> ({dueInfo.text})
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between gap-3 pt-2">
                            <select
                              value={debt.quadrant}
                              onChange={(e) => handleChangeQuadrant(debt, e.target.value as DebtQuadrant)}
                              className="bg-[#F1F3F5] border border-gray-200 hover:border-gray-300 rounded-full px-3 py-1.5 text-gray-700 text-[11px] font-bold outline-none transition-colors cursor-pointer"
                            >
                              <option value="q1">ย้ายไป Q1 🔴</option>
                              <option value="q2">ย้ายไป Q2 🟡</option>
                              <option value="q3">ย้ายไป Q3 🟠</option>
                              <option value="q4">ย้ายไป Q4 🟢</option>
                            </select>

                            <div className="flex items-center gap-2">
                              {!isPaid && (
                                <button
                                  onClick={() => {
                                    setPaymentModalDebt(debt);
                                    setPaymentAmount(debt.remainingAmount.toString());
                                    setPaymentNote('');
                                  }}
                                  className="px-4 py-1.5 bg-[#232729] hover:bg-black text-white text-[11px] font-bold rounded-full transition-all duration-300 shadow-sm flex items-center gap-1.5"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  ชำระเงิน
                                </button>
                              )}
                              <button
                                onClick={() => onDeleteDebt(debt.id)}
                                title="ลบรายการหนี้"
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                      <div className="text-4xl mb-3">{qStyle.emoji}</div>
                      <p className="text-sm font-bold text-gray-500 px-6">
                        {emptyStateMessages[quadrantKey as keyof typeof emptyStateMessages]}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      {/* Global Summary Bar */}
      <div className="mt-8 bg-white dark:bg-[#181A1C] border border-[#edf0f4] dark:border-gray-800 rounded-[28px] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                สรุปภาพรวมหนี้สิน
              </h3>
              {isFilteredActive && (
                <span className="text-xs bg-[#D2E875] text-[#181A1C] px-2.5 py-0.5 rounded-full font-black">
                  ตามตัวกรองที่เลือก ({targetDebts.length} รายการ)
                </span>
              )}
            </div>
            <div className="h-3 bg-[#F1F3F5] dark:bg-gray-800 rounded-full overflow-hidden w-full max-w-xl">
              <div 
                className="h-full bg-[#D2E875] rounded-full transition-all duration-1000"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-bold">
              ชำระแล้ว {totalProgress.toFixed(1)}% ของรายการที่เลือก ({targetDebts.length} รายการ)
            </p>
          </div>
          
          <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-end">
            <div className="text-center lg:text-right">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">หนี้รวมทั้งหมด</p>
              <p className="text-xl font-black text-[#181A1C]">฿{totalDebtAmount.toLocaleString('th-TH')}</p>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div className="text-center lg:text-right">
              <p className="text-xs text-[#232729] font-bold uppercase tracking-wider mb-1">ชำระแล้ว</p>
              <p className="text-xl font-black text-[#232729]">฿{totalPaidAmount.toLocaleString('th-TH')}</p>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div className="text-center lg:text-right">
              <p className="text-xs text-[#F87171] font-bold uppercase tracking-wider mb-1">คงเหลือ</p>
              <p className="text-xl font-black text-[#F87171]">฿{totalRemainingAmount.toLocaleString('th-TH')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Payment Modal */}
      {paymentModalDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setPaymentModalDebt(null)}></div>
          
          <div className="relative w-full max-w-lg bg-white rounded-[28px] p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#232729] flex items-center justify-center shadow-sm">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">บันทึกการชำระเงิน</h3>
                  <p className="text-sm text-gray-500 font-medium">อัปเดตยอดคงเหลือสำหรับรายการหนี้นี้</p>
                </div>
              </div>
              
              <div className="bg-[#F1F3F5] rounded-2xl p-5 border border-gray-100 mb-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-gray-500 font-bold">รายการ</span>
                  <span className="text-sm font-black text-gray-900 text-right">{paymentModalDebt.title}</span>
                </div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs text-gray-500 font-bold">เจ้าหนี้</span>
                  <span className="text-sm font-bold text-gray-700 text-right">{paymentModalDebt.creditor}</span>
                </div>
                <div className="h-px bg-gray-200 w-full mb-4"></div>
                <div className="flex justify-between items-end">
                  <span className="text-sm text-gray-500 font-bold">ยอดที่ต้องชำระ</span>
                  <span className="text-3xl font-black text-[#F87171]">
                    ฿{paymentModalDebt.remainingAmount.toLocaleString('th-TH')}
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">เลือกจำนวนเงิน</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(paymentModalDebt.remainingAmount.toString())}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-[#D2E875]/20 border border-gray-200 hover:border-[#D2E875] text-xs font-bold text-[#181A1C] transition-all"
                    >
                      ชำระเต็มจำนวน
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount((paymentModalDebt.remainingAmount / 2).toString())}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-[#D2E875]/20 border border-gray-200 hover:border-[#D2E875] text-xs font-bold text-[#181A1C] transition-all"
                    >
                      ชำระ 50%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentAmount('');
                        document.getElementById('custom-amount-input')?.focus();
                      }}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-amber-50 border border-gray-200 hover:border-amber-300 text-xs font-bold text-gray-700 hover:text-amber-600 transition-all"
                    >
                      กำหนดเอง
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">ระบุจำนวนเงิน (บาท)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-500 font-bold">฿</span>
                    </div>
                    <input
                      id="custom-amount-input"
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-[#181A1C] text-lg font-black focus:border-[#232729] focus:ring-1 focus:ring-[#232729] outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">หมายเหตุ / สลิป (ถ้ามี)</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="เช่น โอนผ่าน K PLUS สลิป #889"
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-[#181A1C] text-sm font-medium focus:border-[#232729] focus:ring-1 focus:ring-[#232729] outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-100">
                <button
                  onClick={() => setPaymentModalDebt(null)}
                  className="px-6 py-2.5 bg-[#F1F3F5] hover:bg-gray-200 text-[#181A1C] rounded-full text-sm font-bold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmPayment}
                  className="px-6 py-2.5 bg-[#232729] hover:bg-black text-white rounded-full text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  ยืนยันการชำระเงิน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
