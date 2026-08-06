import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Download, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  FileText,
  Scan,
  Filter,
  XCircle,
  FolderOpen
} from 'lucide-react';
import type { Transaction, DailySalesRecord, CashFlowRecord } from '../types/finance';
import { CATEGORIES } from '../data/categories';
import { convertDailySalesToTransactions, convertCashFlowToTransactions } from '../utils/excelParser';

interface TransactionsTabProps {
  transactions: Transaction[];
  dailySales?: DailySalesRecord[];
  cashFlow?: CashFlowRecord[];
  onAddTransaction: () => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  dailySales = [],
  cashFlow = [],
  onAddTransaction,
  onDeleteTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Auto-combine POS sales & cash flow entries
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

    // Signatures already covered by POS daily sales / cash flow records,
    // so excel_import transactions that duplicate them are not counted twice.
    const posSignatures = new Set<string>();
    posSalesTxs.forEach(t => posSignatures.add(`${t.date}|pos_sales`));
    posCashFlowTxs.forEach(t => posSignatures.add(`${t.date}|${t.category}|${t.amount}`));

    // Manual / OCR transactions are always kept. Excel-imported transactions are
    // kept unless they are already represented by the POS records above.
    const otherTxs = transactions.filter(t => {
      if (t.source !== 'excel_import') return true;
      const sig = t.category === 'pos_sales'
        ? `${t.date}|pos_sales`
        : `${t.date}|${t.category}|${t.amount}`;
      return !posSignatures.has(sig);
    });
    return [...mappedPosSales, ...mappedPosCashFlow, ...otherTxs].sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, dailySales, cashFlow]);

  const filtered = useMemo(() => combinedTransactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchCat = (CATEGORIES[t.category]?.name || '').toLowerCase().includes(q);
      if (!matchDesc && !matchCat) return false;
    }
    return true;
  }), [combinedTransactions, filterType, filterCategory, startDate, endDate, searchQuery]);

  const handleExportExcel = () => {
    const exportData = filtered.map((t) => ({
      'วันที่': t.date,
      'ประเภท': t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
      'หมวดหมู่': CATEGORIES[t.category]?.name || t.category,
      'รายการ / คำอธิบาย': t.description,
      'จำนวนเงิน (บาท)': t.amount,
      'ช่องทางชำระเงิน': t.paymentMethod,
      'แหล่งที่มา': t.source === 'receipt_ocr' ? 'สแกนใบเสร็จ' : t.source === 'excel_import' ? 'ไฟล์ Excel' : 'คีย์มือ',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายรับ-รายจ่าย');
    
    XLSX.writeFile(workbook, `Cafe_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterCategory('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = searchQuery || filterType !== 'all' || filterCategory !== 'all' || startDate || endDate;

  return (
    <div className="triton-main-card rounded-[28px] p-8 space-y-6 shadow-sm">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
          <FileText className="w-6 h-6 text-[#145A38] dark:text-[#D2E875] shrink-0" />
          ประวัติธุรกรรม รายรับ - รายจ่าย
        </h2>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex-1 md:flex-none px-5 py-2.5 bg-[#F1F3F5] hover:bg-gray-200 text-[#232729] rounded-full text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>

          <button
            onClick={onAddTransaction}
            className="flex-1 md:flex-none px-5 py-2.5 bg-[#232729] hover:bg-[#181A1C] text-white rounded-full text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            + บันทึกรายรับ/รายจ่าย
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหารายการ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#181A1C] border border-gray-200 dark:border-gray-700 rounded-full pl-10 pr-4 py-2.5 text-sm text-gray-700 dark:text-white focus:outline-none focus:border-[#232729] dark:focus:border-[#D2E875] transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide items-center">
          {['all', 'income', 'expense'].map((type) => {
             let label = 'ทุกประเภท';
             if (type === 'income') label = 'รายรับ';
             if (type === 'expense') label = 'รายจ่าย';
             
             const isActive = filterType === type;
             
             return (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                  isActive
                    ? 'bg-[#D2E875] text-[#181A1C] border-[#D2E875]'
                    : 'bg-white dark:bg-[#181A1C] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#232729]'
                }`}
              >
                {label}
              </button>
            )
          })}

          <div className="flex items-center gap-2 bg-white dark:bg-[#181A1C] border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 focus-within:border-[#232729] transition-colors ml-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent border-none text-sm text-gray-600 dark:text-gray-200 outline-none cursor-pointer pr-2"
            >
              <option value="all" className="dark:bg-[#181A1C] dark:text-white">ทุกหมวดหมู่</option>
              {Object.values(CATEGORIES).map((cat) => (
                <option key={cat.id} value={cat.id} className="dark:bg-[#181A1C] dark:text-white">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-[#181A1C] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {filtered.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-[#232729] text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="p-4 pl-6 font-medium">รายการ</th>
                    <th className="p-4 font-medium">หมวดหมู่</th>
                    <th className="p-4 font-medium">ที่มา</th>
                    <th className="p-4 text-right font-medium">จำนวนเงิน</th>
                    <th className="p-4 text-center pr-6 font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filtered.map((t) => {
                    const catInfo = CATEGORIES[t.category];
                    const isIncome = t.type === 'income';
                    return (
                      <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-[#232729]/50 transition-colors group">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                              {isIncome ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{t.description}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{t.date}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full px-3 py-1 text-xs font-medium">
                            {catInfo?.name || t.category}
                          </span>
                        </td>
                        <td className="p-4">
                          {t.source === 'receipt_ocr' ? (
                            <span className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1 w-fit">
                              <Scan className="w-3 h-3" /> OCR
                            </span>
                          ) : t.source === 'excel_import' ? (
                            <span className="text-[10px] text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800 flex items-center gap-1 w-fit">
                              <FileText className="w-3 h-3" /> Excel
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">Keyed</span>
                          )}
                        </td>
                        <td className={`p-4 text-right font-bold tracking-tight ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
                        }`}>
                          {isIncome ? '+' : '-'}฿{t.amount.toLocaleString('th-TH')}
                        </td>
                        <td className="p-4 text-center pr-6">
                          <button
                            onClick={() => onDeleteTransaction(t.id)}
                            className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((t) => {
                const catInfo = CATEGORIES[t.category];
                const isIncome = t.type === 'income';
                return (
                  <div key={t.id} className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                      {isIncome ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate pr-2">{t.description}</p>
                        <span className={`font-bold shrink-0 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                          {isIncome ? '+' : '-'}฿{t.amount.toLocaleString('th-TH')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t.date}</span>
                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5 text-[10px] font-medium">
                          {catInfo?.name || t.category}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteTransaction(t.id)}
                      className="p-2 text-gray-400 hover:text-rose-500 bg-gray-50 dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-gray-50 dark:bg-[#232729] border-t border-gray-100 dark:border-gray-800 p-4 text-center">
               <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                รายการทั้งหมด <span className="text-gray-900 dark:text-white font-bold">{filtered.length}</span> รายการ
              </p>
            </div>
          </>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 mb-4 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">ไม่พบรายการธุรกรรม</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
              ยังไม่มีการบันทึกข้อมูล หรือไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
