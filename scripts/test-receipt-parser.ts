import { parseReceiptText } from '../src/utils/receiptParser.ts';

let failures = 0;
let passed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
  } else {
    failures++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

function assertNear(actual: number, expected: number, msg: string) {
  assert(actual === expected, `${msg} (expected ${expected}, got ${actual})`);
}

// 1) Thai receipt with total keyword and Buddhist year
{
  const text = `
ใบกำกับภาษี / RECEIPT
ร้านกาแฟ ณ บ้านใหม่ ไออุ่น
123 ถนนสุขุมวิท กรุงเทพฯ
วันที่ 04/08/2569 13:45
--------------------------------
เมล็ดกาแฟอาราบิก้า 1kg .... 450.00
นมสด 2L .................... 345.00
วิปครีม 1L .................. 220.00
--------------------------------
รวมทั้งสิ้น ................ 1,015.00
เงินสดรับ ................. 1,015.00
`;
  const r = parseReceiptText(text);
  assertNear(r.totalAmount, 1015, 'total 1,015.00');
  assert(r.date === '2026-08-04', `buddhist date 04/08/2569 -> ${r.date}`);
  assert(r.storeName.includes('ณ บ้านใหม่'), `store name -> ${r.storeName}`);
  assert(r.items.length >= 3, `items >= 3 (got ${r.items.length})`);
  assert(r.category === 'coffee_beans', `category -> ${r.category}`);
}

// 2) English receipt, ISO date, TOTAL keyword
{
  const text = `
CAFE EXPRESS
221B Baker Street
Date: 2026-07-30 18:20
--------------------------------
Cappuccino             120.00
Blueberry Cheesecake   180.00
--------------------------------
TOTAL                  300.00
VISA ************1234
`;
  const r = parseReceiptText(text);
  assertNear(r.totalAmount, 300, 'TOTAL 300.00');
  assert(r.date === '2026-07-30', `iso date -> ${r.date}`);
  assert(r.storeName.includes('CAFE EXPRESS'), `store name -> ${r.storeName}`);
  assert(r.items.length >= 2, `items >= 2 (got ${r.items.length})`);
  assert(r.category === 'coffee_beans', `category -> ${r.category}`);
}

// 3) Single-line total without keyword (fallback)
{
  const text = `
MINI MART
ขนมปัง 30
นมจืด 15
45
`;
  const r = parseReceiptText(text);
  assertNear(r.totalAmount, 45, 'fallback total 45');
  assert(r.items.length === 2, `items 2 (got ${r.items.length})`);
  assert(r.category === 'dairy_syrup', `category -> ${r.category}`);
}

// 4) Electricity bill
{
  const text = `
การไฟฟ้านครหลวง
ใบแจ้งค่าไฟฟ้า
เลขที่ 0000123456
รอบบิล 01/08/2569
ค่าไฟฟ้าประจำเดือน ....... 5,840.00
รวมชำระ ................. 5,840.00
`;
  const r = parseReceiptText(text);
  assertNear(r.totalAmount, 5840, 'electric bill 5,840');
  assert(r.category === 'utilities', `category -> ${r.category}`);
  assert(r.items.length === 1, `1 item (got ${r.items.length})`);
}

// 5) Packaging receipt
{
  const text = `
PKG SUPPLY CO.,LTD.
แก้วแคปซูล 16oz 1000ใบ ..... 1,450.00
หลอดกระดาษ 1000 เล่ม ........ 550.00
ยอดสุทธิ ................... 2,000.00
`;
  const r = parseReceiptText(text);
  assertNear(r.totalAmount, 2000, 'packaging total');
  assert(r.category === 'packaging', `category -> ${r.category}`);
}

// 6) Empty / garbage text -> safe defaults
{
  const r = parseReceiptText('!@#$%^&*()');
  assert(r.totalAmount === 0, 'garbage total 0');
  assert(r.date.length === 10, 'garbage date is today YYYY-MM-DD');
  assert(r.category === 'other_expense', 'garbage category other_expense');
}

// 7) Month-name date (English) with two-digit year
{
  const text = `
SUNRISE ROASTERS
Invoice
Feb 15 26
Espresso Beans ......... 800.00
TOTAL ................... 800.00
`;
  const r = parseReceiptText(text);
  assertNear(r.totalAmount, 800, 'english total');
  assert(r.date === '2026-02-15', `eng month date -> ${r.date}`);
  assert(r.category === 'coffee_beans', `category -> ${r.category}`);
}

// 8) Thais with ฿ symbol and separated decimal thousands
{
  const text = `
ร้านวัตถุดิบเพื่อสุขภาพ
นมอัลมอนด์ .............. ฿120.00
ยอดรวม .................. ฿120.00
`;
  const r = parseReceiptText(text);
  assertNear(r.totalAmount, 120, 'baht symbol total');
  assert(r.category === 'dairy_syrup', `category -> ${r.category}`);
}

// 9) Quantity line should not break items
{
  const text = `
ซัพพลายเออร์ อุปกรณ์
3 x 45.00 = 135.00
ค่าแรงติดตั้ง .......... 500.00
รวม .................... 635.00
`;
  const r = parseReceiptText(text);
  assertNear(r.totalAmount, 635, 'qty line total 635');
  const names = r.items.map((i) => i.name);
  assert(!names.some((nm) => /^[\d\s.x×*/]+$/.test(nm)), `no pure-qty item (got ${names.join(', ')})`);
}

console.log(`\n✓ passed: ${passed}  ✗ failed: ${failures}`);
if (failures > 0) process.exit(1);
