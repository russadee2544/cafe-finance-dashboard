import * as XLSX from 'xlsx';
import type { Transaction, CategoryId } from '../types/finance';

// Define expected categories for the custom parsing mapping
const CATEGORY_MAP: Record<string, CategoryId> = {
  'ค่าของ': 'coffee_beans',
  'ซื้อของ': 'coffee_beans',
  'น้ำแข็ง': 'coffee_beans',
  'วี': 'wages',
  'ค่าแรง': 'wages',
  'ค่าพนักงาน': 'wages',
  'ค่าคนงาน': 'wages',
  'เดะ': 'wages',
  'ค่าไฟ': 'utilities',
  'ค่าเน็ต': 'utilities',
  'ค่าอุปกรณ์': 'other_expense',
  'ขาย': 'pos_sales',
};

const THAI_MONTHS: Record<string, number> = {
  'มกราคม': 1,
  'กุมภาพันธ์': 2,
  'มีนาคม': 3,
  'เมษายน': 4,
  'พฤษภาคม': 5,
  'มิถุนายน': 6,
  'กรกฎาคม': 7,
  'สิงหาคม': 8,
  'กันยายน': 9,
  'ตุลาคม': 10,
  'พฤศจิกายน': 11,
  'ธันวาคม': 12,
};

export interface DailyExpenseRow {
  day: number;
  date: string;
  sales: number;
  expenses: { category: string; amount: number; categoryId: CategoryId }[];
  totalExpense: number;
  profit: number;
  note: string;
}

export interface ParsedExpenseSheet {
  sheetName: string;
  month: number;
  year: number;
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  dailyRows: DailyExpenseRow[];
  transactions: Omit<Transaction, 'id' | 'createdAt'>[];
}

export function isCustomExpenseFormat(workbook: XLSX.WorkBook): boolean {
  // Check if sheet names contain month names or if the first cell starts with "ค่าใช้จ่าย" or "สรุปภาพรวม"
  for (const sheetName of workbook.SheetNames) {
    if (sheetName.includes('สรุปภาพรวม') || THAI_MONTHS[sheetName.trim()]) {
      return true;
    }
    const sheet = workbook.Sheets[sheetName];
    const firstCell = sheet['A1'];
    if (firstCell && typeof firstCell.v === 'string' && firstCell.v.startsWith('ค่าใช้จ่าย')) {
      return true;
    }
  }
  return false;
}

export async function parseCustomExpenseFile(file: File): Promise<ParsedExpenseSheet[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        if (!data) throw new Error('Failed to read file data');
        
        const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
        const results: ParsedExpenseSheet[] = [];

        for (const sheetName of workbook.SheetNames) {
          if (sheetName.includes('สรุปภาพรวม')) continue;
          
          const monthName = sheetName.trim();
          const month = THAI_MONTHS[monthName];
          if (!month) continue; // Skip unknown sheets

          const year = 2026; // Default to 2026 as per requirements
          const sheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null });
          
          if (rawData.length < 4) continue; // Not enough rows

          // Row 3 (0-indexed) has headers
          const headers = rawData[3].map(h => (h ? String(h).trim() : ''));
          
          const dailyRows: DailyExpenseRow[] = [];
          const transactions: Omit<Transaction, 'id' | 'createdAt'>[] = [];
          let monthTotalSales = 0;
          let monthTotalExpenses = 0;

          // Parse data rows starting from row 4
          let hasDailySalesColumn = false;
          for (let i = 4; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row) continue;
            
            // Check for monthly total sales (e.g. in July format).
            // Only use it when the sheet has no daily sales column (ขาย), otherwise
            // it would double-count the daily sales already parsed below.
            if (row[0] === 'ยอดขายทั้งเดือน') {
              if (hasDailySalesColumn) continue;
              const amount = parseFloat(String(row[3])) || 0;
              if (amount > 0) {
                monthTotalSales += amount;
                
                // Construct end of month date for the monthly sale
                const lastDay = new Date(year, month, 0).getDate();
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                
                transactions.push({
                  date: dateStr,
                  type: 'income',
                  amount: amount,
                  category: 'pos_sales',
                  description: 'ยอดขายทั้งเดือน (สรุป)',
                  paymentMethod: 'cash',
                  source: 'excel_import'
                });
              }
              continue;
            }

            const dayVal = row[0];
            if (dayVal === 'รวม' || dayVal === null || dayVal === undefined) continue;
            
            const dayNum = parseInt(String(dayVal), 10);
            if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            
            let dailySales = 0;
            let dailyTotalExpense = 0;
            const expenses: { category: string; amount: number; categoryId: CategoryId }[] = [];
            const noteIndex = headers.indexOf('หมายเหตุ');
            const note = noteIndex !== -1 && row[noteIndex] ? String(row[noteIndex]) : '';

            let hasValidData = false;

            // Process each column
            for (let col = 1; col < headers.length; col++) {
              const header = headers[col];
              if (!header || header === 'รวมรายจ่าย/วัน' || header === 'กำไร(ขาดทุน)/วัน' || header === 'หมายเหตุ') {
                continue;
              }

              const val = row[col];
              if (val === null || val === undefined || String(val).trim() === 'ครบ') continue;

              const amount = parseFloat(String(val));
              if (isNaN(amount) || amount === 0) continue;

              hasValidData = true;

              const categoryId = CATEGORY_MAP[header] || 'other_expense';
              
              if (categoryId === 'pos_sales') {
                hasDailySalesColumn = true;
                dailySales += amount;
                monthTotalSales += amount;
                transactions.push({
                  date: dateStr,
                  type: 'income',
                  amount: amount,
                  category: categoryId,
                  description: `${header}${note ? ` (${note})` : ''}`,
                  paymentMethod: 'cash',
                  source: 'excel_import'
                });
              } else {
                dailyTotalExpense += amount;
                monthTotalExpenses += amount;
                expenses.push({ category: header, amount, categoryId });
                transactions.push({
                  date: dateStr,
                  type: 'expense',
                  amount: amount,
                  category: categoryId,
                  description: `${header}${note ? ` (${note})` : ''}`,
                  paymentMethod: 'cash',
                  source: 'excel_import'
                });
              }
            }

            if (hasValidData) {
              dailyRows.push({
                day: dayNum,
                date: dateStr,
                sales: dailySales,
                expenses,
                totalExpense: dailyTotalExpense,
                profit: dailySales - dailyTotalExpense,
                note
              });
            }
          }

          results.push({
            sheetName,
            month,
            year,
            totalSales: monthTotalSales,
            totalExpenses: monthTotalExpenses,
            netProfit: monthTotalSales - monthTotalExpenses,
            dailyRows,
            transactions
          });
        }

        resolve(results);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('File reading failed'));
    };

    reader.readAsArrayBuffer(file);
  });
}
