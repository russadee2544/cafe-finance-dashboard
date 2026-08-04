import type { CategoryId } from '../types/finance';

export interface ReceiptParseResult {
  storeName: string;
  date: string; // YYYY-MM-DD
  totalAmount: number;
  category: CategoryId;
  items: { name: string; price: number }[];
}

const TOTAL_KEYWORDS = [
  'รวมทั้งสิ้น',
  'รวมทั้งหมด',
  'ยอดรวม',
  'ยอดสุทธิ',
  'รวม',
  'ทั้งสิ้น',
  'สุทธิ',
  'total',
  'grand total',
  'amount due',
  'amount',
  'balance',
  'net',
  'cash',
  'payable',
  'charge',
];

const META_KEYWORDS = [
  'ใบเสร็จ',
  'ใบกำกับ',
  'receipt',
  'invoice',
  'tax',
  'vat',
  'ภาษี',
  'tel',
  'โทร',
  'ที่อยู่',
  'address',
  'สาขา',
  'branch',
  'counter',
  'cashier',
  'พนักงานขาย',
  'operator',
  'หมายเลข',
  'เลขที่',
  'member',
  'รหัส',
  'date',
  'วันที่',
  'time',
  'เวลา',
  'www.',
  'http',
  'หน้า',
  'page',
  'copy',
  'customer',
  'ลูกค้า',
];

const MONTHS_FULL = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const MONTH_PATTERN = MONTHS_FULL.map((m) => m.slice(0, 3)).join('|');

const DATE_LINE_PATTERNS = [
  /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/,
  /(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/,
  new RegExp(
    `(${MONTH_PATTERN})[a-z]*[\\.]?\\s*(\\d{1,2})[\\.]?\\s*,?\\s*(\\d{2,4})`,
    'i',
  ),
];

const PAYMENT_KEYWORDS = [
  'เงินสดรับ',
  'เงินสด',
  'รับเงิน',
  'จ่ายเงิน',
  'เงินทอน',
  'tendered',
  'change due',
  'change',
  'payment',
  'ชำระเงิน',
  'บัตร',
  'visa',
  'mastercard',
];

function cleanLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function toNumber(raw: string): number {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;
  const noCommas = cleaned.replace(/,/g, '');
  if (noCommas.includes('.')) {
    const parts = noCommas.split('.');
    const last = parts.pop() || '';
    const intPart = parts.join('');
    return parseFloat(`${intPart}.${last}`) || 0;
  }
  return parseFloat(noCommas) || 0;
}

function extractNumbers(line: string): number[] {
  const matches = line.match(/(?:[0-9][0-9,]*\.?[0-9]*)/g) || [];
  return matches.map(toNumber).filter((n) => n > 0);
}

function isDateLine(line: string): boolean {
  return DATE_LINE_PATTERNS.some((re) => re.test(line));
}

function monthIndex(mon: string): number {
  const lower = mon.toLowerCase().slice(0, 3);
  return MONTHS_FULL.findIndex((m) => m.startsWith(lower));
}

function toIsoDate(year: number, month: number, day: number): string {
  let y = year;
  if (y > 2500) y -= 543;
  else if (y < 100) y += 2000;
  const dt = new Date(y, month - 1, day);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    return '';
  }
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function extractDate(lines: string[]): string {
  for (const line of lines) {
    if (!isDateLine(line)) continue;

    const iso = line.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (iso) {
      const [, y, m, d] = iso;
      const out = toIsoDate(Number(y), Number(m), Number(d));
      if (out) return out;
    }

    const thai = line.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (thai) {
      const [, d, m, y] = thai;
      const out = toIsoDate(Number(y), Number(m), Number(d));
      if (out) return out;
    }

    const eng = line.match(
      new RegExp(
        `(${MONTH_PATTERN})[a-z]*[\\.]?\\s*(\\d{1,2})[\\.]?\\s*,?\\s*(\\d{2,4})`,
        'i',
      ),
    );
    if (eng) {
      const month = monthIndex(eng[1]);
      const out = toIsoDate(Number(eng[3]), month + 1, Number(eng[2]));
      if (month >= 0 && out) return out;
    }
  }
  return new Date().toISOString().split('T')[0];
}

function extractStoreName(lines: string[]): string {
  for (const line of lines) {
    const t = cleanLine(line);
    if (!t) continue;
    if (isDateLine(t)) continue;
    if (/^[\d\s฿.,+\-*/=:]+$/.test(t)) continue;
    if (/\d/.test(t) && t.length < 6) continue;
    const lower = t.toLowerCase();
    if (META_KEYWORDS.some((k) => lower.includes(k))) continue;
    if (TOTAL_KEYWORDS.some((k) => lower.includes(k))) continue;
    if (t.length > 80) continue;
    return t;
  }
  return '';
}

function extractTotal(lines: string[]): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    const lower = lines[i].toLowerCase();
    if (TOTAL_KEYWORDS.some((k) => lower.includes(k))) {
      const nums = extractNumbers(lines[i]);
      if (nums.length > 0) return nums[nums.length - 1];
    }
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    const nums = extractNumbers(lines[i]);
    if (nums.length === 1 && nums[0] > 0 && nums[0] <= 1000000) {
      return nums[0];
    }
  }
  return 0;
}

function cleanItemName(raw: string): string {
  const name = raw.trim();
  if (/^[\d\s.x×*/]+$/.test(name)) return '';
  if (name.length < 2) return '';
  return name.slice(0, 80);
}

function extractItems(lines: string[]): { name: string; price: number }[] {
  const items: { name: string; price: number }[] = [];
  const qtyLine = /^\d+\s*[x×*]\s*[\d.,]+\s*(?:=\s*[\d.,]+)?$/;
  for (const line of lines) {
    const t = cleanLine(line);
    if (!t) continue;
    if (isDateLine(t)) continue;
    if (qtyLine.test(t)) continue;
    const lower = t.toLowerCase();
    if (TOTAL_KEYWORDS.some((k) => lower.includes(k))) continue;
    if (META_KEYWORDS.some((k) => lower.includes(k))) continue;

    const match = t.match(
      /^(.*?)[\s.\-•|:]+([0-9][0-9,]*\.?[0-9]*)\s*(?:฿|บาท)?\s*$/,
    );
    if (!match) continue;

    const namePart = match[1].toLowerCase();
    if (PAYMENT_KEYWORDS.some((k) => namePart.includes(k))) continue;

    const name = cleanItemName(match[1]);
    const price = toNumber(match[2]);
    if (name && price > 0 && price <= 1000000) {
      items.push({ name, price });
    }
  }
  return items.slice(0, 30);
}

function detectCategory(text: string): CategoryId {
  const n = text.toLowerCase();
  const has = (...words: string[]) => words.some((w) => n.includes(w));

  if (has('ค่าไฟ', 'ไฟฟ้า', 'การไฟฟ้า', 'ประปา', 'ค่าน้ำ', 'electric', 'water bill')) {
    return 'utilities';
  }
  if (has('แก้ว', 'หลอด', 'ฝา', 'ถุง', 'บรรจุ', 'cup', 'straw', 'packaging')) {
    return 'packaging';
  }
  if (has('เช่า', 'rent')) {
    return 'rent';
  }
  if (has('เมล็ด', 'กาแฟ', 'coffee', 'ชาไทย', 'ผงชา', 'tea', 'cappuccino', 'latte', 'espresso', 'americano', 'beans', 'roast', 'ชาเขียว')) {
    return 'coffee_beans';
  }
  if (has('นม', 'ไซรัป', 'วิป', 'ครีม', 'syrup', 'milk', 'ซอส', 'caramel', 'น้ำเชื่อม')) {
    return 'dairy_syrup';
  }
  if (has('เค้ก', 'ขนม', 'เบเกอ', 'ครัวซอง', 'คุกกี้', 'cake', 'bakery', 'bread', 'croissant', 'brownie')) {
    return 'bakery_food';
  }
  return 'other_expense';
}

export function parseReceiptText(text: string): ReceiptParseResult {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const storeName = extractStoreName(lines) || 'ใบเสร็จรับเงิน';
  const date = extractDate(lines);
  const totalAmount = extractTotal(lines);
  const category = detectCategory(text);
  const items = extractItems(lines);

  return { storeName, date, totalAmount, category, items };
}
