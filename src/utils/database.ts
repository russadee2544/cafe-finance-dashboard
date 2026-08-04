import type { Transaction, DebtItem } from '../types/finance';
import { getStoredTransactions, saveTransactions, getStoredDebts, saveDebts } from './storage';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

// --- Transactions DB Handlers ---

export const loadTransactionsDB = async (): Promise<Transaction[]> => {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data) {
        const formatted: Transaction[] = data.map((t: any) => ({
          id: t.id,
          date: t.date,
          type: t.type,
          amount: Number(t.amount),
          category: t.category,
          description: t.description,
          paymentMethod: t.payment_method || t.paymentMethod || 'transfer',
          receiptUrl: t.receipt_url || t.receiptUrl || undefined,
          source: t.source || 'manual',
          createdAt: t.created_at || t.createdAt,
        }));
        saveTransactions(formatted); // Sync to local storage backup
        return formatted;
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to localStorage:', err);
    }
  }
  return getStoredTransactions();
};

export const addTransactionDB = async (newTx: Transaction): Promise<void> => {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('transactions').insert([
        {
          id: newTx.id,
          date: newTx.date,
          type: newTx.type,
          amount: newTx.amount,
          category: newTx.category,
          description: newTx.description,
          payment_method: newTx.paymentMethod,
          receipt_url: newTx.receiptUrl || null,
          source: newTx.source,
          created_at: newTx.createdAt,
        },
      ]);
    } catch (err) {
      console.warn('Supabase insert failed:', err);
    }
  }
};

export const batchAddTransactionsDB = async (newTxs: Transaction[]): Promise<void> => {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const records = newTxs.map((tx) => ({
        id: tx.id,
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        description: tx.description,
        payment_method: tx.paymentMethod,
        receipt_url: tx.receiptUrl || null,
        source: tx.source,
        created_at: tx.createdAt,
      }));
      await supabase.from('transactions').insert(records);
    } catch (err) {
      console.warn('Supabase batch insert failed:', err);
    }
  }
};

export const deleteTransactionDB = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('transactions').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete failed:', err);
    }
  }
};

// --- Debts DB Handlers ---

export const loadDebtsDB = async (): Promise<DebtItem[]> => {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted: DebtItem[] = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          creditor: d.creditor,
          totalAmount: Number(d.total_amount || d.totalAmount),
          remainingAmount: Number(d.remaining_amount || d.remainingAmount),
          interestRate: d.interest_rate ? Number(d.interest_rate) : undefined,
          dueDate: d.due_date || d.dueDate,
          quadrant: d.quadrant,
          priorityReason: d.priority_reason || d.priorityReason,
          status: d.status,
          createdAt: d.created_at || d.createdAt,
          repaymentHistory: d.repayment_history || d.repaymentHistory || [],
        }));
        saveDebts(formatted); // Sync to local storage backup
        return formatted;
      }
    } catch (err) {
      console.warn('Supabase fetch debts failed, falling back to localStorage:', err);
    }
  }
  return getStoredDebts();
};

export const addDebtDB = async (newDebt: DebtItem): Promise<void> => {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('debts').insert([
        {
          id: newDebt.id,
          title: newDebt.title,
          creditor: newDebt.creditor,
          total_amount: newDebt.totalAmount,
          remaining_amount: newDebt.remainingAmount,
          interest_rate: newDebt.interestRate || null,
          due_date: newDebt.dueDate,
          quadrant: newDebt.quadrant,
          priority_reason: newDebt.priorityReason,
          status: newDebt.status,
          repayment_history: newDebt.repaymentHistory,
          created_at: newDebt.createdAt,
        },
      ]);
    } catch (err) {
      console.warn('Supabase insert debt failed:', err);
    }
  }
};

export const updateDebtDB = async (updatedDebt: DebtItem): Promise<void> => {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase
        .from('debts')
        .update({
          title: updatedDebt.title,
          creditor: updatedDebt.creditor,
          total_amount: updatedDebt.totalAmount,
          remaining_amount: updatedDebt.remainingAmount,
          interest_rate: updatedDebt.interestRate || null,
          due_date: updatedDebt.dueDate,
          quadrant: updatedDebt.quadrant,
          priority_reason: updatedDebt.priorityReason,
          status: updatedDebt.status,
          repayment_history: updatedDebt.repaymentHistory,
        })
        .eq('id', updatedDebt.id);
    } catch (err) {
      console.warn('Supabase update debt failed:', err);
    }
  }
};

export const deleteDebtDB = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('debts').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete debt failed:', err);
    }
  }
};

export const clearAllDatabaseData = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('transactions').delete().neq('id', '');
      await supabase.from('debts').delete().neq('id', '');
    } catch (err) {
      console.warn('Supabase clear failed:', err);
    }
  }
};
