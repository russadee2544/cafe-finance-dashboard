import React from "react";
import {
  Coffee,
  LayoutDashboard,
  Target,
  UploadCloud,
  Receipt,
  Trash2,
  PlusCircle,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import type { DebtItem } from "../types/finance";

interface HeaderProps {
  activeTab: "overview" | "debt_matrix" | "smart_import" | "transactions";
  setActiveTab: (
    tab: "overview" | "debt_matrix" | "smart_import" | "transactions",
  ) => void;
  debts: DebtItem[];
  onResetData: () => void;
  onOpenAddTransaction: () => void;
  onOpenAddDebt: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  debts,
  onResetData,
  onOpenAddTransaction,
  onOpenAddDebt,
}) => {
  const q1UrgentDebts = debts.filter(
    (d) => d.quadrant === "q1" && d.status !== "paid",
  );
  const q1UrgentAmount = q1UrgentDebts.reduce(
    (sum, d) => sum + d.remainingAmount,
    0,
  );

  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shadow-lg">
      {q1UrgentDebts.length > 0 && (
        <div className="bg-gradient-to-r from-red-900/90 via-red-800/80 to-amber-900/90 text-red-100 text-xs sm:text-sm px-4 py-2 flex items-center justify-between border-b border-red-700/50">
          <div className="flex items-center space-x-2 container mx-auto">
            <AlertTriangle className="w-4 h-4 text-red-300 animate-pulse shrink-0" />
            <span>
              <strong>การแจ้งเตือนหนี้เร่งด่วน (Q1):</strong>{" "}
              คุณมีหนี้สินสำคัญและด่วนที่ต้องชำระจำนวน{" "}
              <span className="font-bold underline">
                {q1UrgentDebts.length} รายการ
              </span>{" "}
              รวมเป็นเงิน{" "}
              <span className="font-bold text-amber-300">
                ฿{q1UrgentAmount.toLocaleString("th-TH")}
              </span>
            </span>
          </div>
          <button
            onClick={() => setActiveTab("debt_matrix")}
            className="hidden sm:inline-flex items-center px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-medium transition ml-4 shrink-0"
          >
            ดูเมทริกซ์หนี้สิน &rarr;
          </button>
        </div>
      )}

      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/30 text-slate-950 font-bold">
                <Coffee className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  Cafe Finance Pro
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-medium">
                    ณ บ้านใหม่ ไออุ่น
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  ระบบบริหารการเงิน & จัดลำดับความสำคัญหนี้สินคาเฟ่
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={onResetData}
                title="ล้างข้อมูลทั้งหมด"
                className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <nav className="flex items-center space-x-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeTab === "overview"
                  ? "bg-amber-500 text-slate-950 font-semibold shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>ภาพรวมการเงิน</span>
            </button>

            <button
              onClick={() => setActiveTab("debt_matrix")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap relative ${
                activeTab === "debt_matrix"
                  ? "bg-amber-500 text-slate-950 font-semibold shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Target className="w-4 h-4" />
              <span>ลำดับความสำคัญหนี้ (4 Quadrants)</span>
              {q1UrgentDebts.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute top-2 right-2" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("smart_import")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeTab === "smart_import"
                  ? "bg-amber-500 text-slate-950 shadow-md font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>นำเข้าใบเสร็จ / Excel</span>
            </button>

            <button
              onClick={() => setActiveTab("transactions")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeTab === "transactions"
                  ? "bg-amber-500 text-slate-950 shadow-md font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>ประวัติรายรับ-รายจ่าย</span>
            </button>
          </nav>

          <div className="hidden lg:flex items-center space-x-3">
            <button
              onClick={onOpenAddTransaction}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-emerald-950/40"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ บันทึกรายรับ/จ่าย</span>
            </button>

            <button
              onClick={onOpenAddDebt}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-amber-950/40"
            >
              <Wallet className="w-4 h-4" />
              <span>+ เพิ่มหนี้สิน/สินเชื่อ</span>
            </button>

            <button
              onClick={onResetData}
              title="ล้างข้อมูลทั้งหมด"
              className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
