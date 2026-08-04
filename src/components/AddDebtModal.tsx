import React, { useState, useEffect } from "react";
import {
  X,
  Target,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Building,
  Percent,
  Calendar,
} from "lucide-react";
import type { DebtItem, DebtQuadrant } from "../types/finance";
import { DEBT_QUADRANTS } from "../data/quadrants";

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    debt: Omit<DebtItem, "id" | "createdAt" | "status" | "repaymentHistory">,
  ) => void;
}

const QuadrantIcons: Record<DebtQuadrant, React.ReactNode> = {
  q1: <AlertTriangle className="w-6 h-6 text-red-600" />,
  q2: <Target className="w-6 h-6 text-amber-600" />,
  q3: <AlertCircle className="w-6 h-6 text-blue-600" />,
  q4: <Clock className="w-6 h-6 text-slate-600" />,
};

const QuadrantColors: Record<DebtQuadrant, string> = {
  q1: "bg-red-50 border-red-200 text-red-700",
  q2: "bg-amber-50 border-amber-200 text-amber-700",
  q3: "bg-blue-50 border-blue-200 text-blue-700",
  q4: "bg-slate-50 border-slate-200 text-slate-700",
};

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState("");
  const [creditor, setCreditor] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [quadrant, setQuadrant] = useState<DebtQuadrant>("q1");
  const [priorityReason, setPriorityReason] = useState("");

  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setTimeout(() => setIsVisible(true), 10);
      // Reset defaults
      setTitle("");
      setCreditor("");
      setTotalAmount("");
      setInterestRate("");
      setDueDate(new Date().toISOString().split("T")[0]);
      setQuadrant("q1");
      setPriorityReason("");
      setShowError(false);
    } else {
      setIsVisible(false);
      setTimeout(() => setIsRendered(false), 300);
    }
  }, [isOpen]);

  if (!isRendered) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(totalAmount);

    if (!title || isNaN(amountNum) || amountNum <= 0) {
      setShowError(true);
      return;
    }

    onSave({
      title,
      creditor: creditor || "ไม่ระบุเจ้าหนี้",
      totalAmount: amountNum,
      remainingAmount: amountNum,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      dueDate: dueDate || new Date().toISOString().split("T")[0],
      quadrant,
      priorityReason: priorityReason || DEBT_QUADRANTS[quadrant].description,
    });

    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-2xl bg-[#FFFFFF] border border-gray-100 rounded-[28px] shadow-2xl overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh] ${isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}`}
      >
        <div className="p-6 sm:p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-[#181A1C] flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#232729] text-[#D2E875]">
                <Target className="w-6 h-6" />
              </div>
              เพิ่มรายการหนี้สิน / บิลรอจ่าย
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-[#181A1C] hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Primary Details Section */}
            <div className="space-y-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title Input */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">
                    ชื่อรายการ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ค่าเมล็ดกาแฟ, ค่าน้ำไฟ"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setShowError(false);
                    }}
                    className={`w-full rounded-2xl bg-white border px-4 py-3 text-gray-900 focus:outline-none transition-colors ${
                      showError && !title
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 focus:border-[#232729] focus:ring-2 focus:ring-[#232729]/20"
                    }`}
                  />
                  {showError && !title && (
                    <p className="text-xs text-red-500 ml-1">
                      กรุณาระบุชื่อรายการ
                    </p>
                  )}
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">
                    ยอดเงินรวม (บาท) *
                  </label>
                  <div
                    className={`relative flex items-center bg-white border rounded-2xl transition-colors overflow-hidden ${
                      showError &&
                      (!totalAmount || isNaN(parseFloat(totalAmount)))
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 focus-within:border-[#232729] focus-within:ring-2 focus-within:ring-[#232729]/20"
                    }`}
                  >
                    <div className="pl-4 text-xl font-bold text-gray-400">
                      ฿
                    </div>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      value={totalAmount}
                      onChange={(e) => {
                        setTotalAmount(e.target.value);
                        setShowError(false);
                      }}
                      className="w-full bg-transparent px-3 py-3 text-2xl font-bold text-[#181A1C] focus:outline-none placeholder-gray-400"
                    />
                  </div>
                  {showError &&
                    (!totalAmount || isNaN(parseFloat(totalAmount))) && (
                      <p className="text-xs text-red-500 ml-1">
                        กรุณาระบุยอดเงินที่ถูกต้อง
                      </p>
                    )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Creditor Input */}
                <div className="space-y-2 md:col-span-1">
                  <label className="text-sm font-semibold text-gray-700 ml-1 flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-500" />
                    เจ้าหนี้
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น โรงคั่ว, ธนาคาร"
                    value={creditor}
                    onChange={(e) => setCreditor(e.target.value)}
                    className="w-full rounded-2xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-[#232729] focus:ring-2 focus:ring-[#232729]/20 outline-none transition"
                  />
                </div>

                {/* Interest Rate */}
                <div className="space-y-2 md:col-span-1">
                  <label className="text-sm font-semibold text-gray-700 ml-1 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-gray-500" />
                    ดอกเบี้ย
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="6.5%"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full rounded-2xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-[#232729] focus:ring-2 focus:ring-[#232729]/20 outline-none transition"
                  />
                </div>

                {/* Due Date */}
                <div className="space-y-2 md:col-span-1">
                  <label className="text-sm font-semibold text-gray-700 ml-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    ครบกำหนด
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-2xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-[#232729] focus:ring-2 focus:ring-[#232729]/20 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Quadrant Matrix Selector */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 ml-1 flex items-center justify-between">
                <span>จัดลำดับความสำคัญ (Eisenhower Matrix)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["q1", "q2", "q3", "q4"] as DebtQuadrant[]).map((qKey) => {
                  const info = DEBT_QUADRANTS[qKey];
                  const isSelected = quadrant === qKey;
                  return (
                     <button
                      key={qKey}
                      type="button"
                      onClick={() => setQuadrant(qKey)}
                      className={`relative flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? `${QuadrantColors[qKey]} shadow-sm`
                          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 text-current opacity-80">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                      <div
                        className={`mt-0.5 p-2 rounded-xl bg-white shadow-sm ${isSelected ? "" : "opacity-70"}`}
                      >
                        {QuadrantIcons[qKey]}
                      </div>
                      <div className="flex-1 pr-6">
                        <div
                          className={`font-bold text-sm ${isSelected ? "text-current" : "text-[#181A1C]"}`}
                        >
                          {info.name}
                        </div>
                        <div
                          className={`text-xs mt-1 ${isSelected ? "opacity-80" : "text-gray-500"}`}
                        >
                          {info.subName}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Reason Textarea */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                เหตุผลความสำคัญ / หมายเหตุเพิ่มเติม
              </label>
              <textarea
                rows={2}
                placeholder="เช่น ชำระช้าส่งผลให้โรงคั่วตัดสิทธิ์ส่งกาแฟสดรอบใหม่..."
                value={priorityReason}
                onChange={(e) => setPriorityReason(e.target.value)}
                className="w-full rounded-2xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-[#232729] focus:ring-2 focus:ring-[#232729]/20 outline-none transition resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl bg-[#F1F3F5] hover:bg-gray-200 text-[#181A1C] font-bold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-2xl bg-[#232729] hover:bg-[#181A1C] text-white font-bold shadow-md transition-all hover:-translate-y-0.5"
              >
                บันทึกหนี้สิน
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
