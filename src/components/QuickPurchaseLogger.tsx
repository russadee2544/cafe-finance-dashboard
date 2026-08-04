import React, { useState, useMemo } from 'react';
import { 
  Coffee, 
  Milk, 
  Cake, 
  Box, 
  Zap, 
  FileText, 
  Check, 
  ArrowLeft, 
  ShoppingCart, 
  CreditCard,
  Banknote,
  QrCode
} from 'lucide-react';
import type { Transaction, CategoryId } from '../types/finance';

interface QuickPurchaseLoggerProps {
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  recentTransactions: Transaction[];
}

const CATEGORIES = [
  { id: 'coffee_beans', label: 'กาแฟ/ชา', icon: Coffee, color: 'text-amber-600 dark:text-amber-500', bgFrom: 'from-amber-500/20', bgTo: 'to-amber-500/5', barColor: 'bg-amber-500' },
  { id: 'dairy_syrup', label: 'นม/ไซรัป', icon: Milk, color: 'text-orange-500 dark:text-orange-400', bgFrom: 'from-orange-500/20', bgTo: 'to-orange-500/5', barColor: 'bg-orange-500' },
  { id: 'bakery_food', label: 'เบเกอรี่/อาหาร', icon: Cake, color: 'text-pink-500 dark:text-pink-400', bgFrom: 'from-pink-500/20', bgTo: 'to-pink-500/5', barColor: 'bg-pink-500' },
  { id: 'packaging', label: 'บรรจุภัณฑ์', icon: Box, color: 'text-purple-500 dark:text-purple-400', bgFrom: 'from-purple-500/20', bgTo: 'to-purple-500/5', barColor: 'bg-purple-500' },
  { id: 'utilities', label: 'ค่าน้ำ/ไฟ', icon: Zap, color: 'text-blue-500 dark:text-blue-400', bgFrom: 'from-blue-500/20', bgTo: 'to-blue-500/5', barColor: 'bg-blue-500' },
  { id: 'other_expense', label: 'อื่นๆ', icon: FileText, color: 'text-slate-500 dark:text-slate-400', bgFrom: 'from-slate-500/20', bgTo: 'to-slate-500/5', barColor: 'bg-slate-500' },
] as const;

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000];

export const QuickPurchaseLogger: React.FC<QuickPurchaseLoggerProps> = ({ onAddTransaction, recentTransactions }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'qr'>('cash');
  const [isDetailedMode, setIsDetailedMode] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  const today = new Date().toISOString().split('T')[0];

  const todaysExpenses = useMemo(() => {
    return recentTransactions.filter(
      (tx) => tx.date.startsWith(today) && tx.type === 'expense'
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [recentTransactions, today]);

  const todaysTotal = useMemo(() => {
    return todaysExpenses.reduce((sum, tx) => sum + tx.amount, 0);
  }, [todaysExpenses]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = todaysExpenses.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(breakdown).sort(([, a], [, b]) => b - a);
  }, [todaysExpenses]);

  const handleLogPurchase = () => {
    if (!selectedCategory || !amount || isNaN(Number(amount))) return;

    const newTx: Omit<Transaction, 'id' | 'createdAt'> = {
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      amount: Number(amount),
      category: selectedCategory,
      description: description || CATEGORIES.find(c => c.id === selectedCategory)?.label || 'ซื้อของ',
      paymentMethod,
      source: 'manual',
    };

    onAddTransaction(newTx);
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setSelectedCategory(null);
      setAmount('');
      setDescription('');
      setPaymentMethod('cash');
    }, 1500);
  };

  const selectedCategoryData = CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <div className="flex flex-col gap-6">
      <div className="triton-main-card rounded-[28px] p-6 relative overflow-hidden">
        {/* Success Overlay */}
        {showSuccess && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 dark:bg-[#141618]/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#D2E875] p-4 rounded-full mb-4 shadow-lg scale-in">
              <Check className="w-12 h-12 text-[#181A1C]" />
            </div>
            <p className="text-2xl font-black text-[#181A1C] dark:text-white slide-up">บันทึกสำเร็จ!</p>
            <p className="text-[#181A1C]/70 dark:text-white/70 mt-2 slide-up">เพิ่มรายจ่ายเข้าสู่ระบบแล้ว</p>
          </div>
        )}

        {/* Header Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-[#181A1C] dark:text-white">
            <ShoppingCart className="w-6 h-6" />
            <h2 className="text-xl font-black">บันทึกรายจ่ายด่วน</h2>
          </div>
          <div className="flex bg-[#232729]/10 dark:bg-white/10 rounded-full p-1">
            <button 
              onClick={() => setIsDetailedMode(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${!isDetailedMode ? 'bg-white dark:bg-[#232729] text-[#181A1C] dark:text-white shadow-sm' : 'text-[#181A1C]/60 dark:text-white/60'}`}
            >
              โหมดเร็ว
            </button>
            <button 
              onClick={() => setIsDetailedMode(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${isDetailedMode ? 'bg-white dark:bg-[#232729] text-[#181A1C] dark:text-white shadow-sm' : 'text-[#181A1C]/60 dark:text-white/60'}`}
            >
              โหมดละเอียด
            </button>
          </div>
        </div>

        {/* State 1: Category Selection */}
        {!selectedCategory ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as CategoryId)}
                className={`flex flex-col items-center justify-center gap-3 min-h-[100px] rounded-[20px] bg-gradient-to-b ${cat.bgFrom} ${cat.bgTo} border border-transparent hover:border-[#181A1C]/10 dark:hover:border-white/10 transition-all duration-300 active:scale-95`}
              >
                <cat.icon className={`w-8 h-8 ${cat.color}`} />
                <span className="font-bold text-[#181A1C] dark:text-white text-sm">{cat.label}</span>
              </button>
            ))}
          </div>
        ) : (
          /* State 2: Input Details */
          <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 text-[#181A1C] dark:text-white">
              <button 
                onClick={() => setSelectedCategory(null)}
                className="p-2 hover:bg-[#181A1C]/5 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className={`p-2 rounded-xl bg-gradient-to-b ${selectedCategoryData?.bgFrom} ${selectedCategoryData?.bgTo}`}>
                {selectedCategoryData && <selectedCategoryData.icon className={`w-5 h-5 ${selectedCategoryData.color}`} />}
              </div>
              <span className="font-bold text-lg">{selectedCategoryData?.label}</span>
            </div>

            {/* Amount Input */}
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-xs">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#181A1C]/40 dark:text-white/40">฿</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full text-center text-4xl font-black bg-transparent border-b-2 border-[#181A1C]/10 dark:border-white/10 focus:border-[#D2E875] outline-none py-3 text-[#181A1C] dark:text-white transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt.toString())}
                  className="px-4 py-2 rounded-full bg-[#181A1C]/5 dark:bg-white/5 text-[#181A1C] dark:text-white text-sm font-bold hover:bg-[#D2E875] hover:text-[#181A1C] dark:hover:bg-[#D2E875] dark:hover:text-[#181A1C] transition-all"
                >
                  +{amt}
                </button>
              ))}
            </div>

            {/* Detailed Mode Extras */}
            {isDetailedMode && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                  className="w-full bg-[#181A1C]/5 dark:bg-white/5 rounded-xl px-4 py-3 text-[#181A1C] dark:text-white placeholder:text-[#181A1C]/40 dark:placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[#D2E875]"
                />
                
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-[#181A1C]/60 dark:text-white/60">ช่องทางการชำระเงิน</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${paymentMethod === 'cash' ? 'border-[#D2E875] bg-[#D2E875]/10 text-[#181A1C] dark:text-[#D2E875]' : 'border-transparent bg-[#181A1C]/5 dark:bg-white/5 text-[#181A1C]/60 dark:text-white/60'}`}
                    >
                      <Banknote className="w-5 h-5" />
                      <span className="text-xs font-bold">เงินสด</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('transfer')}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${paymentMethod === 'transfer' ? 'border-[#D2E875] bg-[#D2E875]/10 text-[#181A1C] dark:text-[#D2E875]' : 'border-transparent bg-[#181A1C]/5 dark:bg-white/5 text-[#181A1C]/60 dark:text-white/60'}`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="text-xs font-bold">โอนเงิน</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('qr')}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${paymentMethod === 'qr' ? 'border-[#D2E875] bg-[#D2E875]/10 text-[#181A1C] dark:text-[#D2E875]' : 'border-transparent bg-[#181A1C]/5 dark:bg-white/5 text-[#181A1C]/60 dark:text-white/60'}`}
                    >
                      <QrCode className="w-5 h-5" />
                      <span className="text-xs font-bold">QR Code</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <button
              onClick={handleLogPurchase}
              disabled={!amount || isNaN(Number(amount)) || Number(amount) <= 0}
              className="w-full bg-[#D2E875] text-[#181A1C] py-4 rounded-full font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#c4db67] transition-all flex items-center justify-center gap-2 mt-2"
            >
              <Check className="w-5 h-5" />
              บันทึกรายจ่าย
            </button>
          </div>
        )}
      </div>

      {/* Today's Summary */}
      <div className="triton-main-card rounded-[28px] p-6 text-[#181A1C] dark:text-white">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#181A1C]/60 dark:text-white/60 mb-1">ยอดซื้อของวันนี้</h3>
            <div className="text-2xl font-black">
              ฿{todaysTotal.toLocaleString()}
            </div>
          </div>
        </div>

        {todaysExpenses.length > 0 ? (
          <>
            {/* Tiny Chart / Breakdown */}
            <div className="flex h-2 w-full rounded-full overflow-hidden mb-4 bg-[#181A1C]/5 dark:bg-white/5">
              {categoryBreakdown.map(([catId, amt]) => {
                const cat = CATEGORIES.find(c => c.id === catId);
                const percent = (amt / todaysTotal) * 100;
                return (
                  <div 
                    key={catId} 
                    className={`h-full ${cat?.barColor || 'bg-slate-500'}`} 
                    style={{ width: `${percent}%` }}
                    title={`${cat?.label}: ฿${amt}`}
                  />
                );
              })}
            </div>

            {/* List */}
            <div className="flex flex-col gap-3">
              {todaysExpenses.slice(0, 5).map(tx => {
                const cat = CATEGORIES.find(c => c.id === tx.category);
                return (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-[#181A1C]/5 dark:border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-gradient-to-b ${cat?.bgFrom} ${cat?.bgTo}`}>
                        {cat && <cat.icon className={`w-4 h-4 ${cat.color}`} />}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{tx.description}</p>
                        <p className="text-xs text-[#181A1C]/60 dark:text-white/60">
                          {new Date(tx.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </p>
                      </div>
                    </div>
                    <div className="font-bold text-red-500 dark:text-red-400">
                      -฿{tx.amount.toLocaleString()}
                    </div>
                  </div>
                );
              })}
              {todaysExpenses.length > 5 && (
                <div className="text-center mt-2">
                  <span className="text-xs font-bold text-[#181A1C]/40 dark:text-white/40">
                    ดูอีก {todaysExpenses.length - 5} รายการในประวัติ
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-[#181A1C]/40 dark:text-white/40 font-bold text-sm">
            ยังไม่มีรายการใช้จ่ายวันนี้
          </div>
        )}
      </div>
    </div>
  );
};
