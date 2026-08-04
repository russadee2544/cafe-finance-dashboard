import React, { useState, useEffect } from "react";
import {
  X,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Banknote,
  QrCode,
  Building2,
  CreditCard,
  Coffee,
  ShoppingBag,
  Receipt,
  Wrench,
  Home,
  CircleDollarSign,
} from "lucide-react";
import type {
  Transaction,
  TransactionType,
  CategoryId,
} from "../types/finance";
import { CATEGORIES } from "../data/categories";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, "id" | "createdAt">) => void;
}

const PaymentIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-4 h-4" />,
  qr: <QrCode className="w-4 h-4" />,
  transfer: <Building2 className="w-4 h-4" />,
  credit_card: <CreditCard className="w-4 h-4" />,
};

const PaymentLabels: Record<string, string> = {
  cash: "เงินสด",
  qr: "QR พร้อมเพย์",
  transfer: "โอนเงิน",
  credit_card: "บัตรเครดิต",
};

// Generic icons mapped for categories (fallback logic)
const getCategoryIcon = (id: string, type: "income" | "expense") => {
  if (type === "income") return <CircleDollarSign className="w-5 h-5" />;
  if (id.includes("coffee") || id.includes("bean"))
    return <Coffee className="w-5 h-5" />;
  if (id.includes("rent") || id.includes("utility"))
    return <Home className="w-5 h-5" />;
  if (id.includes("maintain") || id.includes("fix"))
    return <Wrench className="w-5 h-5" />;
  if (id.includes("buy") || id.includes("stock"))
    return <ShoppingBag className="w-5 h-5" />;
  return <Receipt className="w-5 h-5" />;
};

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CategoryId>("pos_sales");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "transfer" | "credit_card" | "qr"
  >("qr");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Validation state
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setTimeout(() => setIsVisible(true), 10);
      // Reset defaults when opened
      setType("income");
      setCategory("pos_sales");
      setAmount("");
      setDescription("");
      setPaymentMethod("qr");
      setDate(new Date().toISOString().split("T")[0]);
      setShowError(false);
    } else {
      setIsVisible(false);
      setTimeout(() => setIsRendered(false), 300); // match transition duration
    }
  }, [isOpen]);

  if (!isRendered) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setShowError(true);
      return;
    }

    onSave({
      date,
      type,
      amount: amountNum,
      category,
      description:
        description || (type === "income" ? "ยอดขายคาเฟ่" : "ค่าใช้จ่ายร้าน"),
      paymentMethod,
      source: "manual",
    });

    onClose();
  };

  const currentCategories = Object.values(CATEGORIES).filter(
    (c) => c.type === type,
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-lg bg-[#FFFFFF] border border-gray-100 rounded-[28px] shadow-2xl overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh] ${isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}`}
      >
        {/* Dynamic Gradient Header Bar */}
        <div
          className={`h-2 w-full transition-colors duration-500 ${type === "income" ? "bg-[#00D2A0]" : "bg-[#FF6B6B]"}`}
        />

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-[#181A1C] flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${type === "income" ? "bg-[#00D2A0]/10 text-[#00D2A0]" : "bg-[#FF6B6B]/10 text-[#FF6B6B]"}`}
              >
                <PlusCircle className="w-6 h-6" />
              </div>
              บันทึกรายการใหม่
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-[#181A1C] hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Toggle */}
            <div className="relative flex p-1 bg-gray-100 rounded-2xl">
              <div
                className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 shadow-sm ${
                  type === "income"
                    ? "left-1 bg-white border border-gray-200"
                    : "left-[calc(50%+2px)] bg-white border border-gray-200"
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  setType("income");
                  setCategory("pos_sales");
                }}
                className={`relative flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-colors z-10 ${
                  type === "income"
                    ? "text-[#00D2A0]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <TrendingUp className="w-4 h-4" /> รายรับ
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("expense");
                  setCategory("coffee_beans");
                }}
                className={`relative flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-colors z-10 ${
                  type === "expense"
                    ? "text-[#FF6B6B]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <TrendingDown className="w-4 h-4" /> รายจ่าย
              </button>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                จำนวนเงิน *
              </label>
              <div
                className={`relative flex items-center bg-gray-50 border rounded-2xl transition-colors overflow-hidden ${
                  showError && !amount
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 focus-within:bg-white focus-within:border-[#232729] focus-within:ring-2 focus-within:ring-[#232729]/20"
                }`}
              >
                <div className="pl-4 text-2xl font-bold text-gray-400">฿</div>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setShowError(false);
                  }}
                  className={`w-full bg-transparent px-4 py-3 text-2xl font-bold focus:outline-none placeholder-gray-400 ${
                    type === "income" ? "text-[#00D2A0]" : "text-[#FF6B6B]"
                  }`}
                />
              </div>
              {showError && !amount && (
                <p className="text-xs text-red-500 ml-1">กรุณาระบุจำนวนเงิน</p>
              )}
            </div>

            {/* Date Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                วันที่ทำรายการ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-gray-900 focus:bg-white focus:border-[#232729] focus:ring-2 focus:ring-[#232729]/20 outline-none transition"
              />
            </div>

            {/* Category Grid */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                หมวดหมู่
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {currentCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 ${
                      category === cat.id
                        ? "bg-[#D2E875] border-[#D2E875] text-[#181A1C] shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <div
                      className={`mb-2 ${category === cat.id ? "text-[#181A1C]" : "text-gray-500"}`}
                    >
                      {getCategoryIcon(cat.id, type)}
                    </div>
                    <span className="text-xs text-center line-clamp-1 font-medium">
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Pills */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                ช่องทางการชำระเงิน
              </label>
              <div className="flex flex-wrap gap-2">
                {(["cash", "qr", "transfer", "credit_card"] as const).map(
                  (method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        paymentMethod === method
                          ? "bg-[#232729] text-white shadow-sm"
                          : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {PaymentIcons[method]}
                      {PaymentLabels[method]}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                รายละเอียดเพิ่มเติม (ไม่บังคับ)
              </label>
              <input
                type="text"
                placeholder="เช่น บิลโต๊ะ 4, ซื้อนมสดเพิ่ม..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-gray-900 focus:bg-white focus:border-[#232729] focus:ring-2 focus:ring-[#232729]/20 outline-none transition"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-6 rounded-2xl bg-[#F1F3F5] hover:bg-gray-200 text-[#181A1C] font-bold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-6 rounded-2xl bg-[#232729] hover:bg-[#181A1C] text-white font-bold shadow-md transition-colors"
              >
                บันทึกรายการ
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
