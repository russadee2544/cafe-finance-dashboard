import type { DebtQuadrant, QuadrantInfo } from '../types/finance';

export const DEBT_QUADRANTS: Record<DebtQuadrant, QuadrantInfo> = {
  q1: {
    id: 'q1',
    name: 'สำคัญ และ ด่วนที่สุด',
    subName: 'DO FIRST - ต้องชำระทันที',
    description: 'หนี้ที่หากชำระล่าช้าจะส่งผลต่อการดำเนินงานของร้านทันที เช่น ค่างวดเกินกำหนด, ซัพพลายเออร์เมล็ดกาแฟขู่หยุดส่งของ, ตัดไฟ/ค่าน้ำ',
    colorTheme: {
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.4)',
      text: '#f87171',
      badge: 'bg-red-500/20 text-red-300 border-red-500/40',
      lightBg: 'bg-red-950/40',
    },
  },
  q2: {
    id: 'q2',
    name: 'สำคัญ แต่ ไม่ด่วน',
    subName: 'SCHEDULE - วางแผนชำระตรงเวลา',
    description: 'หนี้ระยะยาว ค่างวดสินเชื่อพัฒนาคาเฟ่ หรือเงินสำรองค่าเช่าร้านงวดถัดไป มีความสำคัญสูงแต่ยังมีเวลาวางแผนจัดสรรเงิน',
    colorTheme: {
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.4)',
      text: '#fbbf24',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      lightBg: 'bg-amber-950/40',
    },
  },
  q3: {
    id: 'q3',
    name: 'ไม่สำคัญ แต่ ด่วน',
    subName: 'DELEGATE / QUICK - เคลียร์บิลด่วนย่อย',
    description: 'บิลค่าบริการรายเดือนย่อยๆ ค่าซอฟต์แวร์ POS หรือค่าใช้จ่ายจิปาถะที่ถึงกำหนดแต่จำนวนเงินน้อย ยืดหยุ่นได้นิดหน่อย',
    colorTheme: {
      bg: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.4)',
      text: '#60a5fa',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      lightBg: 'bg-blue-950/40',
    },
  },
  q4: {
    id: 'q4',
    name: 'ไม่สำคัญ และ ไม่ด่วน',
    subName: 'LOW PRIORITY - ไว้ชำระเมื่อสภาพคล่องพร้อม',
    description: 'ยอดยืมย่อยจากบุคคลใกล้ชิด ยอดค้างชำระที่ไม่มีดอกเบี้ยและยืดหยุ่นวันชำระได้ ชำระเมื่อมีกำไรส่วนเกิน',
    colorTheme: {
      bg: 'rgba(148, 163, 184, 0.1)',
      border: 'rgba(148, 163, 184, 0.3)',
      text: '#94a3b8',
      badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
      lightBg: 'bg-slate-900/60',
    },
  },
};
