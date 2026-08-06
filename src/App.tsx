import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { DebtMatrixTab } from "./components/DebtMatrixTab";
import { SmartImportTab } from "./components/SmartImportTab";
import { TransactionsTab } from "./components/TransactionsTab";
import { AddDebtModal } from "./components/AddDebtModal";
import { AddTransactionModal } from "./components/AddTransactionModal";
import { DailyClosingWizard } from "./components/DailyClosingWizard";
import { FixedCostEngine } from "./components/FixedCostEngine";
import { DashboardTab } from "./components/DashboardTab";
import type { Transaction, DebtItem, DailySalesRecord, CashFlowRecord } from "./types/finance";
import {
  saveTransactions,
  saveDebts,
  clearAllData,
  populateDemoData,
  getStoredGPOSUrl,
  saveGPOSUrl,
} from "./utils/storage";
import {
  getStoredDailySales,
  getStoredCashFlow,
  mergeDailySales,
  mergeCashFlow,
  resetToRealDataset,
} from "./utils/posStorage";
import {
  parseDailySalesExcel,
  parseCashFlowExcel,
  parseGoogleSheetURL,
  convertDailySalesToTransactions,
  convertCashFlowToTransactions,
} from "./utils/excelParser";
import {
  loadTransactionsDB,
  addTransactionDB,
  batchAddTransactionsDB,
  deleteTransactionDB,
  loadDebtsDB,
  addDebtDB,
  updateDebtDB,
  deleteDebtDB,
  clearAllDatabaseData,
} from "./utils/database";
import { SupabaseConnectCard } from "./components/SupabaseConnectCard";
import {
  BarChart2,
  FileText,
  Compass,
  ScanLine,
  Sliders,
  Menu,
  PlusCircle,
  AlertCircle,
  Database,
  Info,
  Search,
  Activity,
  User,
  Sun,
  Moon,
  UploadCloud,
  CalendarCheck,
} from "lucide-react";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "debt_matrix" | "smart_import" | "transactions" | "settings" | "daily_closing"
  >("overview");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [dailySales, setDailySales] = useState<DailySalesRecord[]>(() => getStoredDailySales());
  const [cashFlow, setCashFlow] = useState<CashFlowRecord[]>(() => getStoredCashFlow());
  const [gposUrl, setGposUrl] = useState<string>(() => getStoredGPOSUrl());
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);

  const handleSaveGPOSUrl = (url: string) => {
    setGposUrl(url);
    saveGPOSUrl(url);
  };

  const handleSyncGPOS = async (url: string) => {
    if (!url) return;
    try {
      const result = await parseGoogleSheetURL(url);
      if (result.sales.length > 0) {
        const merged = mergeDailySales(result.sales);
        setDailySales(merged);
      }
      if (result.cashFlow.length > 0) {
        const merged = mergeCashFlow(result.cashFlow);
        setCashFlow(merged);
      }
    } catch (err) {
      console.error("Auto GPOS Sync failed", err);
    }
  };

  useEffect(() => {
    if (gposUrl) {
      handleSyncGPOS(gposUrl);
    }
  }, [gposUrl]);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("baanmai_theme") as "dark" | "light") || "dark";
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const mainContentRef = useRef<HTMLDivElement>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    const el = mainContentRef.current;
    if (!el) return;

    let lastScroll = 0;
    const handleScroll = () => {
      const currentScroll = el.scrollTop;
      if (currentScroll > 30) {
        if (currentScroll > lastScroll + 6) {
          setIsHeaderVisible(false);
        } else if (lastScroll - currentScroll > 6) {
          setIsHeaderVisible(true);
        }
      } else {
        setIsHeaderVisible(true);
      }
      lastScroll = currentScroll;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const res = resetToRealDataset();
      setDailySales(res.sales);
      setCashFlow(res.cashFlow);
      const txs = await loadTransactionsDB();
      const debtList = await loadDebtsDB();
      setTransactions(txs);
      setDebts(debtList);
    };
    fetchData();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("baanmai_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // DB Synced Handlers
  const handleAddTransaction = (
    newTx: Omit<Transaction, "id" | "createdAt">,
  ) => {
    const created: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [created, ...transactions];
    setTransactions(updated);
    saveTransactions(updated);
    addTransactionDB(created);
  };
  const handleBatchAddTransactions = (
    newTxs: Omit<Transaction, "id" | "createdAt">[],
  ) => {
    const createdList: Transaction[] = newTxs.map((tx, idx) => ({
      ...tx,
      id: `tx-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    }));
    const updated = [...createdList, ...transactions];
    setTransactions(updated);
    saveTransactions(updated);
    batchAddTransactionsDB(createdList);
  };
  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    saveTransactions(updated);
    deleteTransactionDB(id);
  };
  const handleAddDebt = (
    debtData: Omit<
      DebtItem,
      "id" | "createdAt" | "status" | "repaymentHistory"
    >,
  ) => {
    const created: DebtItem = {
      ...debtData,
      id: `debt-${Date.now()}`,
      status: "pending",
      createdAt: new Date().toISOString(),
      repaymentHistory: [],
    };
    const updated = [created, ...debts];
    setDebts(updated);
    saveDebts(updated);
    addDebtDB(created);
  };
  const handleUpdateDebt = (updatedDebt: DebtItem) => {
    const updated = debts.map((d) =>
      d.id === updatedDebt.id ? updatedDebt : d,
    );
    setDebts(updated);
    saveDebts(updated);
    updateDebtDB(updatedDebt);
  };
  const handleDeleteDebt = (debtId: string) => {
    const updated = debts.filter((d) => d.id !== debtId);
    setDebts(updated);
    saveDebts(updated);
    deleteDebtDB(debtId);
  };
  const handleResetData = () => {
    const code = window.prompt("⚠️ ยืนยันการล้างข้อมูลในระบบ\nกรุณากรอกรหัสยืนยัน (Confirmation Code):");
    if (code === null) return;
    if (code.trim() === "baanmai101") {
      const cleared = clearAllData();
      clearAllDatabaseData();
      setTransactions(cleared.transactions);
      setDebts(cleared.debts);
      alert("✅ ล้างข้อมูลทั้งหมดในระบบเรียบร้อยแล้ว!");
    } else {
      alert("❌ รหัสยืนยันไม่ถูกต้อง! ไม่สามารถล้างข้อมูลได้");
    }
  };

  const handleLoadDemoData = () => {
    const demo = populateDemoData();
    setTransactions(demo.transactions);
    setDebts(demo.debts);
    alert("🎉 โหลดข้อมูลสาธิตตัวอย่าง (Demo Data) ร้าน ณ บ้านใหม่ ไออุ่น เรียบร้อยแล้ว!");
  };

  const handleImportDailySales = async (file: File) => {
    try {
      const parsed = await parseDailySalesExcel(file);
      if (parsed.length > 0) {
        const merged = mergeDailySales(parsed);
        setDailySales(merged);

        // Auto-sync into Master Transactions
        const txConverted = convertDailySalesToTransactions(parsed);
        const newTxs: Transaction[] = txConverted.map(t => ({
          ...t,
          id: `tx-pos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: new Date().toISOString(),
        }));

        setTransactions(prev => {
          const datesToReplace = new Set(parsed.map(p => p.date));
          const filtered = prev.filter(t => t.category !== 'pos_sales' || !datesToReplace.has(t.date));
          const updated = [...newTxs, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
          saveTransactions(updated);
          batchAddTransactionsDB(newTxs);
          return updated;
        });

        alert(`✅ นำเข้าข้อมูลยอดขายรายวันสำเร็จ ${parsed.length} รายการ (ซิงค์เข้าบัญชีรวมเรียบร้อย)!`);
      } else {
        alert("⚠️ ไม่พบข้อมูลยอดขายในไฟล์ Excel ที่เลือก");
      }
    } catch (err) {
      console.error("Failed to parse daily sales excel", err);
      alert("❌ เกิดข้อผิดพลาดในการอ่านไฟล์ Excel ยอดขายรายวัน");
    }
  };

  const handleImportCashFlow = async (file: File) => {
    try {
      const parsed = await parseCashFlowExcel(file);
      if (parsed.length > 0) {
        const merged = mergeCashFlow(parsed);
        setCashFlow(merged);

        // Auto-sync into Master Transactions
        const txConverted = convertCashFlowToTransactions(parsed);
        const newTxs: Transaction[] = txConverted.map(t => ({
          ...t,
          id: `tx-cf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: new Date().toISOString(),
        }));

        setTransactions(prev => {
          const existingNotes = new Set(prev.map(t => `${t.date}-${t.amount}-${t.description}`));
          const uniqueNew = newTxs.filter(t => !existingNotes.has(`${t.date}-${t.amount}-${t.description}`));
          const updated = [...uniqueNew, ...prev].sort((a, b) => b.date.localeCompare(a.date));
          saveTransactions(updated);
          batchAddTransactionsDB(uniqueNew);
          return updated;
        });

        alert(`✅ นำเข้าข้อมูลเงินเข้า-ออกสำเร็จ ${parsed.length} รายการ (ซิงค์เข้าบัญชีรวมเรียบร้อย)!`);
      } else {
        alert("⚠️ ไม่พบข้อมูลเงินเข้า-ออกในไฟล์ Excel ที่เลือก");
      }
    } catch (err) {
      console.error("Failed to parse cash flow excel", err);
      alert("❌ เกิดข้อผิดพลาดในการอ่านไฟล์ Excel เงินเข้า-ออก");
    }
  };

  // Calculate urgent debts
  const upcomingDebts = debts.filter((d) => d.status === "pending");
  const hasUrgentDebts = upcomingDebts.length > 0;

  const tabs = [
    { id: "overview", label: "ภาพรวมการเงิน", icon: BarChart2 },
    { id: "transactions", label: "รายรับ-รายจ่าย", icon: FileText },
    { id: "daily_closing", label: "ปิดยอดประจำวัน", icon: CalendarCheck },
    { id: "debt_matrix", label: "จัดการหนี้ 4 ช่อง", icon: Compass },
    { id: "smart_import", label: "นำเข้าข้อมูล", icon: ScanLine },
  ] as const;

  const generalTabs = [
    { id: "settings", label: "ตั้งค่าระบบ", icon: Sliders },
  ] as const;

  const currentTabName =
    [...tabs, ...generalTabs].find((t) => t.id === activeTab)?.label || "ภาพรวมการเงิน";

  const handleAddCashFlowRecord = (record: Omit<CashFlowRecord, 'id'>) => {
    const created: CashFlowRecord = {
      ...record,
      id: `cf-${Date.now()}`
    };
    const merged = mergeCashFlow([created]);
    setCashFlow(merged);

    // Auto-sync single bank transfer into Master Transactions
    const converted = convertCashFlowToTransactions([created])[0];
    const newTx: Transaction = {
      ...converted,
      id: `tx-tf-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setTransactions(prev => {
      const updated = [newTx, ...prev];
      saveTransactions(updated);
      addTransactionDB(newTx);
      return updated;
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <DashboardTab
            transactions={transactions}
            debts={debts}
            dailySales={dailySales}
            cashFlow={cashFlow}
            onNavigateToDebtMatrix={() => setActiveTab('debt_matrix')}
            onNavigateToTransactions={() => setActiveTab('transactions')}
            onNavigateToSmartImport={() => setActiveTab('smart_import')}
            onOpenAddTransaction={() => setIsAddTxOpen(true)}
            onImportSales={handleImportDailySales}
            onImportCashFlow={handleImportCashFlow}
            onAddCashFlowRecord={handleAddCashFlowRecord}
          />
        );
      case "transactions":
        return (
          <TransactionsTab
            transactions={transactions}
            dailySales={dailySales}
            cashFlow={cashFlow}
            onAddTransaction={() => setIsAddTxOpen(true)}
            onDeleteTransaction={handleDeleteTransaction}
          />
        );
      case "debt_matrix":
        return (
          <DebtMatrixTab
            debts={debts}
            onAddDebt={() => setIsAddDebtOpen(true)}
            onUpdateDebt={handleUpdateDebt}
            onDeleteDebt={handleDeleteDebt}
          />
        );
      case "smart_import":
        return (
          <SmartImportTab
            onAddTransaction={handleAddTransaction}
            onBatchAddTransactions={handleBatchAddTransactions}
            onImportSales={handleImportDailySales}
            onImportCashFlow={handleImportCashFlow}
            gposUrl={gposUrl}
            onSaveGPOSUrl={handleSaveGPOSUrl}
            onSyncGPOS={handleSyncGPOS}
          />
        );
      case "daily_closing":
        return (
          <DailyClosingWizard
            transactions={transactions}
            debts={debts}
            dailySales={dailySales}
            cashFlow={cashFlow}
            onAddTransaction={handleAddTransaction}
            onUpdateDebt={handleUpdateDebt}
          />
        );

      case "settings":
        return (
          <div className="space-y-6 max-w-3xl mx-auto animate-fade-in p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">ตั้งค่าระบบ</h2>

            <SupabaseConnectCard />

            <div className="triton-main-card border border-gray-100 p-6 !shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-gray-900">
                {theme === "dark" ? <Moon className="w-5 h-5 text-indigo-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
                โหมดการแสดงผล (Theme Mode)
              </h3>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">ธีมหน้าจอ (มืด / สว่าง)</p>
                  <p className="text-xs text-gray-500 mt-0.5">ปัจจุบันกำลังใช้งาน: {theme === "dark" ? "โหมดมืด (Dark Charcoal)" : "โหมดสว่าง (Light Theme)"}</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-5 py-2.5 rounded-full bg-[#181A1C] text-white hover:bg-black font-semibold text-xs transition-all flex items-center gap-2"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4 text-[#D2E875]" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                  {theme === "dark" ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
                </button>
              </div>
            </div>

            <div className="triton-main-card border border-gray-100 p-6 !shadow-sm">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-emerald-600 dark:text-[#D2E875]">
                <Database className="w-5 h-5" />
                จัดการข้อมูลระบบ (Data Management)
              </h3>
              
              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="text-sm">
                  <p className="font-semibold text-gray-900 dark:text-white">โหลดข้อมูลสาธิตตัวอย่าง (Demo Data)</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    จำลองข้อมูลรายรับ-รายจ่าย หนี้สิน 4 ช่อง และประวัติปิดยอด สำหรับทดลองใช้งานระบบ
                  </p>
                </div>
                <button
                  onClick={handleLoadDemoData}
                  className="px-5 py-2.5 rounded-full bg-[#D2E875] text-[#181A1C] hover:bg-[#c4dc62] font-bold text-xs transition-all shadow-sm shrink-0"
                >
                  ⚡ โหลดข้อมูลสาธิต
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">ล้างข้อมูลทั้งหมด</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ลบข้อมูลรายการและหนี้สินทั้งหมดในระบบ (ต้องระบุรหัสยืนยัน `baanmai101` เพื่อดำเนินการ)
                  </p>
                </div>
                <button
                  onClick={handleResetData}
                  className="px-5 py-2.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 font-medium text-xs transition-all shrink-0"
                >
                  ล้างข้อมูล
                </button>
              </div>
            </div>

            <FixedCostEngine />

            <div className="triton-main-card border border-gray-100 p-6 text-center text-gray-500 !shadow-sm">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-50 text-[#181A1C]" />
              <p className="text-sm font-medium text-gray-800">Baanmai Financial Dashboard</p>
              <p className="text-xs mt-1">ณ บ้านใหม่ ไออุ่น v4.0 (5-Module Engine)</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="app-container font-sans text-white">

      {/* Desktop Sidebar (Only visible on Desktop lg: >= 1024px) */}
      <aside className={`sidebar triton-sidebar hidden lg:flex ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className="p-6 flex items-center justify-between">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pastel-lime flex items-center justify-center animate-pulse">
                <Activity className="w-5 h-5 text-[#181A1C]" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">Baanmai Financial</span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 hover:bg-[#2E3338] rounded-lg transition-colors text-gray-400"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="mb-6">
            {!isSidebarCollapsed && <div className="text-xs font-semibold text-gray-500 mb-3 px-2">MENU</div>}
            <nav className="flex flex-col gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isActive 
                        ? "nav-item-active bg-[#D2E875] text-[#181A1C] font-bold shadow-md" 
                        : "text-gray-400 hover:bg-[#2E3338] hover:text-white"
                    } ${isSidebarCollapsed ? "justify-center" : "justify-start"}`}
                    title={tab.label}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-[#181A1C]" : ""}`} />
                    {!isSidebarCollapsed && (
                      <span className={`font-bold text-sm ${isActive ? "text-[#181A1C]" : ""}`}>
                        {tab.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mb-6">
            {!isSidebarCollapsed && <div className="text-xs font-semibold text-gray-500 mb-3 px-2">GENERAL</div>}
            <nav className="flex flex-col gap-1">
              {generalTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isActive 
                        ? "nav-item-active bg-[#D2E875] text-[#181A1C] font-bold shadow-md" 
                        : "text-gray-400 hover:bg-[#2E3338] hover:text-white"
                    } ${isSidebarCollapsed ? "justify-center" : "justify-start"}`}
                    title={tab.label}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-[#181A1C]" : ""}`} />
                    {!isSidebarCollapsed && (
                      <span className={`font-bold text-sm ${isActive ? "text-[#181A1C]" : ""}`}>
                        {tab.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Bottom Profile */}
        <div className="p-4 border-t border-[#2E3338]">

          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-[#C8B6EE] text-[#181A1C] flex items-center justify-center font-bold text-sm shrink-0">
              <User className="w-5 h-5" />
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">ณ บ้านใหม่ ไออุ่น</p>
                <p className="text-xs text-gray-400 truncate">baanmai@cafefinance.com</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main ref={mainContentRef} className="main-content flex flex-col">
        {/* Floating Curved Box Top Header with Auto-Hide on Scroll */}
        <header className={`sticky top-2 z-40 triton-header mx-3 sm:mx-6 my-2 sm:my-3 p-3 sm:px-6 sm:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-4 shadow-lg rounded-[24px] transition-all duration-300 transform ${
          isHeaderVisible ? "translate-y-0 opacity-100" : "-translate-y-28 opacity-0 pointer-events-none"
        }`}>
          
          {/* Mobile/Tablet Compact Header Bar (Single Row) */}
          <div className="flex items-center justify-between lg:hidden w-full">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#D2E875] flex items-center justify-center text-[#181A1C] shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs sm:text-sm tracking-tight truncate max-w-[130px]">ณ บ้านใหม่ ไออุ่น</span>
              <div className="badge-outline text-[#D2E875] border-[#D2E875]/30 bg-[#D2E875]/10 text-[10px] sm:text-xs font-bold py-0.5 px-2">
                ฿{netProfit.toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-[#2E3338] text-gray-700 dark:text-white flex items-center justify-center transition-colors shadow-sm"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 text-[#D2E875]" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              </button>
            </div>
          </div>

          {/* Desktop Left Badges */}
          <div className="hidden lg:flex items-center justify-between sm:justify-start gap-2.5 order-2 lg:order-1">
            <div className="badge-outline text-xs">1 ฿ = 1 ฿</div>
            <div className="badge-outline text-[#D2E875] border-[#D2E875]/30 bg-[#D2E875]/10 text-xs font-bold">
              ยอดคงเหลือ: ฿{netProfit.toLocaleString()}
            </div>
          </div>

          {/* Desktop Center Search Pill */}
          <div className="hidden lg:block flex-1 max-w-md relative order-1 lg:order-2 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="ค้นหารายการ..." 
              className="search-pill" 
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setActiveTab("transactions");
                }
              }}
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-200 dark:bg-[#2E3338] px-1.5 py-0.5 rounded">↵</span>
            </div>
          </div>

          {/* Desktop Right Action Buttons */}
          <div className="hidden lg:flex items-center gap-3 order-3">
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#2E3338] text-gray-700 dark:text-white flex items-center justify-center hover:opacity-80 transition-all shadow-sm"
            >
              {theme === "dark" ? <Sun className="w-5 h-5 text-[#D2E875]" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </button>
            <button 
              onClick={() => setActiveTab("settings")}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#2E3338] text-gray-700 dark:text-white flex items-center justify-center hover:opacity-80 transition-all shadow-sm"
            >
              <Sliders className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic Content wrapper */}
        <div className="flex-1 p-3 sm:p-6 sm:pt-2 page-transition relative z-10 flex flex-col max-w-[1600px] mx-auto w-full pb-28 lg:pb-6">
          
          {/* Main Area Top Section */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{currentTabName}</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Plan, prioritize, and manage cafe finances with ease.</p>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setActiveTab("smart_import")}
                className="flex-1 sm:flex-none px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-gray-100 dark:bg-[#2E3338] text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#3F474F] transition-all text-xs sm:text-sm font-bold shadow-sm flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-700"
              >
                <UploadCloud className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                <span className="text-gray-900 dark:text-white font-bold">นำเข้าข้อมูล</span>
              </button>
              <button
                onClick={() => setIsAddTxOpen(true)}
                className="flex-1 sm:flex-none px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-[#181A1C] dark:bg-[#D2E875] text-white dark:text-[#181A1C] hover:opacity-90 transition-all text-xs sm:text-sm font-bold shadow-sm flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-[#D2E875] dark:text-[#181A1C]" />
                <span className="text-white dark:text-[#181A1C] font-bold">บันทึกรายรับ/จ่าย</span>
              </button>
            </div>
          </div>

          {/* Urgent Debt Alert Banner */}
          {hasUrgentDebts && (
            <div className="mb-4 sm:mb-6 p-3.5 sm:p-4 rounded-2xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 flex items-start sm:items-center gap-3 animate-slide-in">
              <AlertCircle className="w-5 h-5 text-[#FF6B6B] shrink-0 mt-0.5 sm:mt-0" />
              <div className="text-xs sm:text-sm flex-1">
                <span className="font-semibold text-[#FF6B6B]">แจ้งเตือนหนี้สิน: </span>
                <span className="text-gray-900 dark:text-white">คุณมีหนี้สินที่ยังค้างชำระ {upcomingDebts.length} รายการ</span>
              </div>
              <button
                onClick={() => setActiveTab("debt_matrix")}
                className="text-[11px] sm:text-xs px-3.5 py-1.5 sm:px-4 sm:py-2 bg-[#FF6B6B] text-white rounded-full hover:bg-[#ff5252] transition-all shrink-0 font-medium shadow-sm"
              >
                ดูรายละเอียด
              </button>
            </div>
          )}

          <div className="flex-1 w-full">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (5 Touch Tabs with Smart Import in CENTER) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 dark:bg-[#181A1C]/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 h-16 flex items-center justify-around px-2 shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { id: "overview", label: "ภาพรวม", icon: BarChart2 },
          { id: "transactions", label: "รับ-จ่าย", icon: FileText },
          { id: "smart_import", label: "สแกนนำเข้า", icon: ScanLine, isCenter: true },
          { id: "daily_closing", label: "ปิดยอด", icon: CalendarCheck },
          { id: "debt_matrix", label: "หนี้ 4 ช่อง", icon: Compass },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          if (tab.isCenter) {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex flex-col items-center justify-center flex-1 h-full relative -mt-4 group"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                  isActive 
                    ? "bg-[#D2E875] text-[#181A1C] ring-4 ring-[#D2E875]/30 scale-110" 
                    : "bg-[#181A1C] dark:bg-[#D2E875] text-[#D2E875] dark:text-[#181A1C] hover:scale-105"
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] tracking-tight font-bold mt-0.5 ${
                  isActive ? "text-[#181A1C] dark:text-[#D2E875]" : "text-gray-700 dark:text-gray-300"
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          }
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200
                ${isActive ? "text-gray-900 dark:text-[#D2E875] font-bold" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-gray-100 dark:bg-[#D2E875]/15 scale-110" : ""}`}>
                <Icon className={`w-5 h-5 ${isActive ? "text-gray-900 dark:text-[#D2E875]" : "text-gray-600 dark:text-gray-400"}`} />
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      {isAddTxOpen && (
        <AddTransactionModal
          isOpen={isAddTxOpen}
          onClose={() => setIsAddTxOpen(false)}
          onSave={handleAddTransaction}
        />
      )}
      {isAddDebtOpen && (
        <AddDebtModal
          isOpen={isAddDebtOpen}
          onClose={() => setIsAddDebtOpen(false)}
          onSave={handleAddDebt}
        />
      )}
    </div>
  );
};

export default App;
