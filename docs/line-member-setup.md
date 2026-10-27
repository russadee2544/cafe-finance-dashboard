# ตั้งค่าระบบสมาชิก LINE + บัตรกำนัล

เงื่อนไขบัตร: มูลค่า 1,000 = 2 สิทธิ์ สิทธิ์ละ 500 บาท ใช้ได้มากสุด 2 ครั้ง บิลต้องถึง 500 ต่อ 1 สิทธิ์ ไม่ทอน ใช้ได้ถึง 31 ธ.ค. 2569

## หน้าในระบบ
- `/member` ลูกค้า: QR สมาชิก (เปลี่ยนทุก 1 นาที) บัตรที่มี ยอดเหลือ ประวัติ และช่องผูกบัตร (เลขบัตร + รหัส 4 หลัก)
- `/staff` พนักงาน: ใส่ PIN → สแกน QR ลูกค้า → ใส่ยอดบิล + เลขบิล GPOS → กด "ใช้ 1/2 สิทธิ์" → ลูกค้าได้ข้อความใน LINE
- `/staff` มีปุ่ม "ออกบัตรใหม่" ใช้ตอนขายบัตร ได้เลขบัตร + รหัส 4 หลักไว้เขียนบนบัตร

## เจ้าของร้านทำ (ฝั่ง LINE)
1. สร้าง LINE Official Account ที่ manager.line.biz
2. developers.line.biz → สร้าง Provider ชื่อร้าน
3. LINE OA → ตั้งค่า → Messaging API → เปิดใช้ เลือก Provider ข้อ 2 → ใน Developers console ออก Channel access token (long-lived)
4. Provider เดียวกัน → สร้างช่อง LINE Login → แท็บ LIFF → Add 2 อัน
   - member: Endpoint `https://<โดเมน vercel>/member` · Size Full · Scope `openid profile`
   - staff: Endpoint `https://<โดเมน vercel>/staff` · Size Full · Scope `openid profile` · เปิด Scan QR
5. ตั้ง Rich menu ใน LINE OA ปุ่ม "บัตรของฉัน" ลิงก์ไป `https://liff.line.me/<LIFF ID member>`

## ตั้งค่าใน Vercel (Settings → Environment Variables) — อย่าส่งค่าเหล่านี้ในแชท
| ชื่อ | ค่า |
|---|---|
| `SUPABASE_URL` | URL โปรเจกต์ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `LINE_LOGIN_CHANNEL_ID` | Channel ID ของช่อง LINE Login |
| `LINE_CHANNEL_ACCESS_TOKEN` | token จากข้อ 3 |
| `QR_SECRET` | ข้อความสุ่มยาว 32 ตัวขึ้นไป |
| `VITE_LIFF_ID_MEMBER` / `VITE_LIFF_ID_STAFF` | LIFF ID จากข้อ 4 |

## ฐานข้อมูล
1. Supabase → SQL Editor → รันไฟล์ `supabase/migrations/20261027_line_members_vouchers.sql`
2. เพิ่มพนักงาน: `QR_SECRET=<ค่าเดียวกับ Vercel> node scripts/line-staff-pin.ts "ชื่อ" 4821` แล้วเอา SQL ที่ได้ไปรัน
3. บัตรที่ขายไปก่อนมีระบบ: กด "ออกบัตรใหม่" ทีละใบ แล้วเขียนรหัส 4 หลักให้ลูกค้า หรือ insert ลง `gift_vouchers` ตรง ๆ

## ความปลอดภัย
- ตารางทั้งหมดเปิด RLS ไม่มี policy ให้ anon เข้าถึงได้ผ่าน `api/line.ts` เท่านั้น
- ทุกคำขอตรวจ LINE ID token กับ LINE ก่อน
- PIN พนักงานผูกกับ LINE ของพนักงานคนแรกที่ใช้ PIN นั้น
- การตัดสิทธิ์ทำใน Postgres function แบบล็อกแถว กันกดซ้ำ
