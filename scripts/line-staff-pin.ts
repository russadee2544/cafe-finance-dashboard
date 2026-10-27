// สร้าง SQL เพิ่มพนักงานสำหรับหน้า /staff
// ใช้: QR_SECRET=<ค่าเดียวกับใน Vercel> node scripts/line-staff-pin.ts "ชื่อพนักงาน" 4821
import { createHash } from 'node:crypto';

const [name, pin] = process.argv.slice(2);
const secret = process.env.QR_SECRET;
if (!name || !pin || !secret) {
  console.error('usage: QR_SECRET=... node scripts/line-staff-pin.ts "<name>" <pin>');
  process.exit(1);
}
const hash = createHash('sha256').update(`${secret}:${pin}`).digest('hex');
console.log(`insert into line_staff (name, pin_hash) values ('${name.replace(/'/g, "''")}', '${hash}');`);
