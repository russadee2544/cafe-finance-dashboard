import React, { useState } from 'react';
import { LayoutDashboard, TrendingUp } from 'lucide-react';
import { OverviewTab } from './OverviewTab';
import { POSSalesAnalyticsTab } from './POSSalesAnalyticsTab';
import type { Transaction, DebtItem, DailySalesRecord, CashFlowRecord } from '../types/finance';

interface DashboardTabProps {
  transactions: Transaction[];
  debts: DebtItem[];
  dailySales: DailySalesRecord[];
  cashFlow: CashFlowRecord[];
  onNavigateToDebtMatrix: () => void;
  onNavigateToTransactions?: () => void;
  onNavigateToSmartImport?: () => void;
  onOpenAddTransaction?: () => void;
  onImportSales: (file: File) => void;
  onImportCashFlow: (file: File) => void;
  onAddCashFlowRecord?: (record: Omit<CashFlowRecord, 'id'>) => void;
}

type DashboardView = 'overview' | 'pos';

export const DashboardTab: React.FC<DashboardTabProps> = ({
  transactions,
  debts,
  dailySales,
  cashFlow,
  onNavigateToDebtMatrix,
  onNavigateToTransactions,
  onNavigateToSmartImport,
  onOpenAddTransaction,
  onImportSales,
  onImportCashFlow,
  onAddCashFlowRecord,
}) => {
  const [activeView, setActiveView] = useState<DashboardView>('overview');

  return (
    <div className="space-y-6">
      {/* Sub-Tab Switcher */}
      <div className="flex items-center bg-[#F1F3F5] dark:bg-white/10 p-1 rounded-full w-full md:w-auto gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveView('overview')}
          className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 ${
            activeView === 'overview'
              ? 'bg-[#D2E875] text-[#181A1C] shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>ภาพรวมการเงิน</span>
        </button>

        <button
          onClick={() => setActiveView('pos')}
          className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 ${
            activeView === 'pos'
              ? 'bg-[#D2E875] text-[#181A1C] shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>วิเคราะห์ POS</span>
        </button>
      </div>

      {activeView === 'overview' ? (
        <OverviewTab
          transactions={transactions}
          debts={debts}
          dailySales={dailySales}
          cashFlow={cashFlow}
          onNavigateToDebtMatrix={onNavigateToDebtMatrix}
          onNavigateToTransactions={onNavigateToTransactions}
          onNavigateToSmartImport={onNavigateToSmartImport}
          onOpenAddTransaction={onOpenAddTransaction}
        />
      ) : (
        <POSSalesAnalyticsTab
          dailySales={dailySales}
          cashFlow={cashFlow}
          transactions={transactions}
          onImportSales={onImportSales}
          onImportCashFlow={onImportCashFlow}
          onAddCashFlowRecord={onAddCashFlowRecord}
        />
      )}
    </div>
  );
};

export default DashboardTab;
