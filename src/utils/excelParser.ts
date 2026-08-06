import * as XLSX from 'xlsx';
import type { DailySalesRecord, CashFlowRecord, CashFlowCategory, CashFlowType, Transaction, CategoryId } from '../types/finance';

export const CASH_FLOW_CATEGORY_META: Record<CashFlowCategory, { label: string; emoji: string; color: string }> = {
  raw_ice: { label: 'น้ำแข็ง', emoji: '🧊', color: '#38BDF8' },
  raw_food: { label: 'วัตถุดิบอาหาร', emoji: '🥚', color: '#F97316' },
  raw_beverage: { label: 'วัตถุดิบเครื่องดื่ม', emoji: '☕', color: '#8B5CF6' },
  raw_bakery: { label: 'เบเกอรี่/ขนม', emoji: '🍰', color: '#EC4899' },
  packaging: { label: 'บรรจุภัณฑ์', emoji: '📦', color: '#6366F1' },
  staff_wages: { label: 'ค่าแรงพนักงาน', emoji: '👨‍🍳', color: '#10B981' },
  staff_meals: { label: 'อาหารพนักงาน', emoji: '🍱', color: '#14B8A6' },
  utilities: { label: 'สาธารณูปโภค', emoji: '💧', color: '#3B82F6' },
  wholesale: { label: 'ซื้อของรวม/ตลาด', emoji: '🛒', color: '#EAB308' },
  equipment: { label: 'อุปกรณ์อื่นๆ', emoji: '🪰', color: '#64748B' },
  cash_in: { label: 'เงินเข้า', emoji: '💰', color: '#22C55E' },
  other: { label: 'อื่นๆ', emoji: '📋', color: '#94A3B8' }
};

export function mapCashFlowCategoryToCategoryId(cat: CashFlowCategory): CategoryId {
  switch (cat) {
    case 'raw_ice':
    case 'raw_beverage':
      return 'coffee_beans';
    case 'raw_food':
    case 'raw_bakery':
      return 'bakery_food';
    case 'packaging':
      return 'packaging';
    case 'staff_wages':
    case 'staff_meals':
      return 'wages';
    case 'utilities':
      return 'utilities';
    case 'wholesale':
    case 'equipment':
      return 'other_expense';
    case 'cash_in':
      return 'other_income';
    default:
      return 'other_expense';
  }
}

export function convertDailySalesToTransactions(records: DailySalesRecord[]): Omit<Transaction, 'id' | 'createdAt'>[] {
  return records
    .filter(r => r.netSales > 0)
    .map(r => ({
      date: r.date,
      type: 'income' as const,
      amount: r.netSales,
      category: 'pos_sales' as const,
      description: `ยอดขาย POS (${r.orderCount} ออเดอร์)`,
      paymentMethod: 'cash' as const,
      source: 'excel_import' as const,
    }));
}

export function convertCashFlowToTransactions(records: CashFlowRecord[]): Omit<Transaction, 'id' | 'createdAt'>[] {
  return records.map(r => ({
    date: r.paymentTime.split(' ')[0],
    type: r.type === 'CashIn' ? ('income' as const) : ('expense' as const),
    amount: Math.abs(r.amount),
    category: mapCashFlowCategoryToCategoryId(r.category),
    description: r.note || (r.type === 'CashIn' ? 'รับเงินสด' : 'จ่ายเงินสด'),
    paymentMethod: r.paymentMethod === 'transfer' ? ('transfer' as const) : ('cash' as const),
    source: 'excel_import' as const,
  }));
}

// Helper to parse GPOS Google Sheets URL or Live Export
export async function parseGoogleSheetURL(url: string): Promise<{ sales: DailySalesRecord[], cashFlow: CashFlowRecord[] }> {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('รูปแบบ URL ของ Google Sheets ไม่ถูกต้อง');
  const sheetId = match[1];
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error('ไม่สามารถเข้าถึง Google Sheets ได้ กรุณาเปิดสิทธิ์เป็น "ทุกคนที่มีลิงก์อ่านได้" (Anyone with the link can view)');
  const arrayBuffer = await res.arrayBuffer();
  
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const isSales = rows.some(r => Array.isArray(r) && r.some(cell => String(cell).includes('ยอดขายสุทธิ') || String(cell).includes('จำนวนออเดอร์')));
  
  const blob = new Blob([arrayBuffer]);
  const file = new File([blob], 'gpos_data.xlsx');

  if (isSales) {
    const sales = await parseDailySalesExcel(file);
    return { sales, cashFlow: [] };
  } else {
    const cashFlow = await parseCashFlowExcel(file);
    return { sales: [], cashFlow };
  }
}

export function autoCategorize(note: string): CashFlowCategory {
  if (!note) return 'other';
  const n = note.toLowerCase();
  
  if (n.includes('น้ำแข็ง')) return 'raw_ice';
  if (['ไข่', 'กุ้ง', 'ไก่', 'ปลา', 'เนื้อ', 'ผัก', 'มะพร้าว', 'ข้าว', 'กะปิ', 'น้ำตาล'].some(k => n.includes(k))) return 'raw_food';
  if (['กาแฟ', 'เมล็ด', 'ชาเขียว', 'ชาตรา', 'วิปครีม', 'น้ำเชื่อม', 'ไซรัป', 'นม'].some(k => n.includes(k))) return 'raw_beverage';
  if (['บานอฟฟี่', 'เค้ก', 'ขนม'].some(k => n.includes(k))) return 'raw_bakery';
  if (['ถุง', 'แก้ว', 'หลอด', 'บรรจุ'].some(k => n.includes(k))) return 'packaging';
  if (['ค่าแรง', 'เงินค่าพนักงาน', 'เบิก', 'วี', 'บังวี', 'เดะ'].some(k => n.includes(k))) return 'staff_wages';
  if (['กับข้าวพนักงาน', 'อาหารพนักงาน'].some(k => n.includes(k))) return 'staff_meals';
  if (['ค่าน้ำ', 'ค่าไฟ', 'เปลี่ยนน้ำ'].some(k => n.includes(k))) return 'utilities';
  if (['makro', 'ซื้อของ', 'ซื้อของล่วงหน้า', 'แม่ขรี', 'เชียด', 'เหมือง'].some(k => n.includes(k))) return 'wholesale';
  if (['ดัก', 'แผ่นไล่'].some(k => n.includes(k))) return 'equipment';
  
  return 'other';
}

function parseNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const num = parseFloat(val.replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // Try parsing DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

export async function parseDailySalesExcel(file: File): Promise<DailySalesRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        const records: DailySalesRecord[] = [];
        
        // Skip header (row 1)
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          // Skip summary row
          if (row[0] && String(row[0]).includes('รวม')) continue;
          
          const date = String(row[0] || '');
          if (!date) continue;
          
          records.push({
            date: formatDate(date),
            channel: String(row[1] || 'ALL'),
            salesChannel: String(row[2] || 'ALL'),
            totalSales: parseNumber(row[3]),
            orderCount: parseNumber(row[4]),
            netSales: parseNumber(row[5]),
            serviceFee: parseNumber(row[6]),
            discount: parseNumber(row[7]),
            tax: parseNumber(row[8]),
            tip: parseNumber(row[9]),
            rounding: parseNumber(row[10]),
            deliveryFee: parseNumber(row[11])
          });
        }
        
        resolve(records);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function parseCashFlowExcel(file: File): Promise<CashFlowRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        const records: CashFlowRecord[] = [];
        
        // Skip header (row 1)
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          // Skip summary row
          if (row[0] && String(row[0]).includes('รวม')) continue;
          
          const paymentTime = String(row[0] || '');
          if (!paymentTime) continue;
          
          const typeStr = String(row[1] || '');
          const type: CashFlowType = typeStr === 'CashIn' ? 'CashIn' : 'CashOut';
          
          const recipient = String(row[2] || '');
          const note = String(row[3] || '');
          const amount = parseNumber(row[4]);
          const methodCol = String(row[5] || row[6] || '');
          
          let category = autoCategorize(note);
          if (type === 'CashIn') {
            category = 'cash_in';
          }

          // Auto-detect paymentMethod (Bank Transfer vs Cash) from keywords or columns
          const fullText = `${typeStr} ${recipient} ${note} ${methodCol}`.toLowerCase();
          const isBankTransfer = 
            fullText.includes('โอน') ||
            fullText.includes('เงินโอน') ||
            fullText.includes('ธนาคาร') ||
            fullText.includes('transfer') ||
            fullText.includes('พร้อมเพย์') ||
            fullText.includes('promptpay') ||
            fullText.includes('kbank') ||
            fullText.includes('scb') ||
            fullText.includes('bbl') ||
            fullText.includes('ktb') ||
            fullText.includes('ttb') ||
            fullText.includes('qr') ||
            fullText.includes('สแกน');

          const paymentMethod: 'cash' | 'transfer' = isBankTransfer ? 'transfer' : 'cash';
          
          records.push({
            id: crypto.randomUUID(),
            paymentTime,
            type,
            recipient,
            note,
            amount: type === 'CashOut' && amount > 0 ? -amount : amount,
            category,
            paymentMethod
          });
        }
        
        resolve(records);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ===== Generic Excel Importer (SmartImportTab) =====

import type { ExcelImportRow } from '../types/finance';

export interface ColumnMapping {
  dateCol: string;
  typeCol: string;
  amountCol: string;
  categoryCol: string;
  descriptionCol: string;
  paymentMethodCol: string;
}

export async function parseExcelFile(file: File): Promise<{ headers: string[]; rawRows: Record<string, any>[]; suggestedMapping: ColumnMapping }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
        if (jsonData.length === 0) {
          resolve({ 
            headers: [], 
            rawRows: [], 
            suggestedMapping: { dateCol: '', typeCol: '', amountCol: '', categoryCol: '', descriptionCol: '', paymentMethodCol: '' } 
          });
          return;
        }
        
        const headers = Object.keys(jsonData[0]);
        
        // Auto-guess column mappings
        const findCol = (keywords: string[]) => headers.find(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))) || '';

        const suggestedMapping: ColumnMapping = {
          dateCol: findCol(['วัน', 'date', 'time', 'เวลา']),
          typeCol: findCol(['ประเภท', 'type', 'kind']),
          amountCol: findCol(['จำนวน', 'ยอด', 'ราคา', 'amount', 'price', 'total', 'รายรับ', 'รายจ่าย', '(฿)']),
          categoryCol: findCol(['หมวด', 'cat']),
          descriptionCol: findCol(['รายละเอียด', 'โน้ต', 'รายการ', 'desc', 'note']),
          paymentMethodCol: findCol(['ชำระ', 'วิธี', 'method', 'pay'])
        };

        resolve({ headers, rawRows: jsonData, suggestedMapping });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function detectPaymentMethod(raw: string): 'cash' | 'transfer' | 'credit_card' | 'qr' {
  const t = raw.toLowerCase();
  if (/บัตร|credit\s*card|card/.test(t)) return 'credit_card';
  if (/qr\s*cod|qrcode|qr\s*code/.test(t)) return 'qr';
  if (/โอน|transfer|ธนาคาร|พร้อมเพย์|promptpay|bank|kbank|scb|bbl|ktb|ttb/.test(t)) return 'transfer';
  return 'cash';
}

export function mapRowsToTransactions(
  rows: Record<string, any>[],
  mapping: ColumnMapping
): ExcelImportRow[] {
  return rows.map((row) => {
    let dateRaw = String(row[mapping.dateCol] || '').trim();
    const typeRaw = String(row[mapping.typeCol] || '').toLowerCase();
    const amountRaw = row[mapping.amountCol];
    const categoryRaw = String(row[mapping.categoryCol] || '').trim();
    const description = String(row[mapping.descriptionCol] || '').trim();
    const methodRaw = String(row[mapping.paymentMethodCol] || '').trim();
    const paymentMethod = detectPaymentMethod(`${methodRaw} ${description}`);

    // Strip time portion from datetime strings like "2026-07-30 17:48:18"
    if (dateRaw.match(/^\d{4}-\d{2}-\d{2}\s/)) {
      dateRaw = dateRaw.split(' ')[0];
    }
    // Convert DD/MM/YYYY to YYYY-MM-DD
    const dateParts = dateRaw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dateParts) {
      dateRaw = `${dateParts[3]}-${dateParts[2].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
    }

    // Detect type: support CashIn/CashOut, รับ/จ่าย, income/expense
    const isCashIn = typeRaw.includes('cashin') || typeRaw.includes('cash_in');
    const isIncome = typeRaw.includes('รับ') || typeRaw.includes('income') || isCashIn;
    const type = isIncome ? 'income' : 'expense';

    // Parse amount: handle negative strings like "-200.00" and take absolute value
    let parsedAmount = typeof amountRaw === 'number' ? amountRaw : parseFloat(String(amountRaw).replace(/,/g, '')) || 0;
    const absAmount = Math.abs(parsedAmount);

    // Auto-detect type from negative amount if type column is empty/missing
    const finalType = (!mapping.typeCol && parsedAmount > 0) ? 'income' : 
                      (!mapping.typeCol && parsedAmount < 0) ? 'expense' : type;

    // Auto-categorize from description if no category column mapped
    let finalCategory: CategoryId = (categoryRaw as CategoryId) || 'other_expense';
    if (!categoryRaw && description) {
      const autoCat = autoCategorize(description);
      finalCategory = mapCashFlowCategoryToCategoryId(autoCat);
      if (finalType === 'income') finalCategory = 'other_income';
    } else if (finalType === 'income' && finalCategory === 'other_expense') {
      finalCategory = 'other_income';
    }
    
    let isValid = true;
    let error = '';

    if (!dateRaw) {
      isValid = false;
      error = 'ไม่มีวันที่';
    } else if (absAmount <= 0) {
      isValid = false;
      error = 'จำนวนเงินต้องมากกว่า 0';
    }

    return {
      date: dateRaw,
      type: finalType,
      amount: absAmount,
      category: finalCategory,
      description,
      paymentMethod,
      isValid,
      error: error || undefined,
    };
  });
}
