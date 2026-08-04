import type { Category, CategoryId } from '../types/finance';

export const CATEGORIES: Record<CategoryId, Category> = {
  pos_sales: {
    id: 'pos_sales',
    name: 'ยอดขายหน้าร้าน POS',
    type: 'income',
    iconName: 'Coffee',
    color: '#10b981', // Emerald green
  },
  delivery_sales: {
    id: 'delivery_sales',
    name: 'ยอดขาย Delivery (Grab/Lineman/Shopee)',
    type: 'income',
    iconName: 'ShoppingBag',
    color: '#06b6d4', // Cyan
  },
  other_income: {
    id: 'other_income',
    name: 'รายรับอื่นๆ (จัดเบรค/เช่าสถานที่)',
    type: 'income',
    iconName: 'TrendingUp',
    color: '#8b5cf6', // Purple
  },
  coffee_beans: {
    id: 'coffee_beans',
    name: 'วัตถุดิบ (เมล็ดกาแฟ/ผงชา)',
    type: 'expense',
    iconName: 'Bean',
    color: '#d97706', // Amber/Coffee
  },
  dairy_syrup: {
    id: 'dairy_syrup',
    name: 'วัตถุดิบ (นมสด/ไซรัป/ซอส)',
    type: 'expense',
    iconName: 'Milk',
    color: '#f59e0b', // Yellow
  },
  bakery_food: {
    id: 'bakery_food',
    name: 'เบเกอรี่ / อาหารส่งขาย',
    type: 'expense',
    iconName: 'Cake',
    color: '#ec4899', // Pink
  },
  packaging: {
    id: 'packaging',
    name: 'บรรจุภัณฑ์ (แก้ว/หลอด/ฝา/ถุง)',
    type: 'expense',
    iconName: 'Box',
    color: '#a855f7', // Purple
  },
  rent: {
    id: 'rent',
    name: 'ค่าเช่าสถานที่ / ค่าที่ร้าน',
    type: 'expense',
    iconName: 'Home',
    color: '#ef4444', // Red
  },
  utilities: {
    id: 'utilities',
    name: 'ค่าน้ำ / ค่าไฟ / อินเทอร์เน็ต',
    type: 'expense',
    iconName: 'Zap',
    color: '#3b82f6', // Blue
  },
  wages: {
    id: 'wages',
    name: 'ค่าแรงพนักงาน / บาริสต้า',
    type: 'expense',
    iconName: 'Users',
    color: '#6366f1', // Indigo
  },
  debt_repayment: {
    id: 'debt_repayment',
    name: 'ชำระหนี้สิน / ผ่อนสินเชื่อ',
    type: 'expense',
    iconName: 'CreditCard',
    color: '#dc2626', // Deep Red
  },
  other_expense: {
    id: 'other_expense',
    name: 'ค่าใช้จ่ายเบ็ดเตล็ด',
    type: 'expense',
    iconName: 'FileText',
    color: '#64748b', // Slate
  },
};
