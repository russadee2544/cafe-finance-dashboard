import type { CategoryId } from '../types/finance';

export interface GeminiReceiptResult {
  storeName: string;
  date: string; // YYYY-MM-DD
  totalAmount: number;
  category: CategoryId;
  items: { name: string; price: number }[];
  paymentMethod: 'cash' | 'transfer';
  confidence: number;
}

const RECEIPT_PROMPT = `คุณเป็นผู้เชี่ยวชาญด้านการอ่านใบเสร็จรับเงิน (Receipt OCR Expert)
วิเคราะห์รูปใบเสร็จนี้และส่งข้อมูลกลับเป็น JSON เท่านั้น ห้ามใส่ข้อความอื่น

ให้ส่ง JSON ในรูปแบบนี้:
{
  "storeName": "ชื่อร้านค้า (ถ้าไม่มีให้ใส่ 'ใบเสร็จรับเงิน')",
  "date": "YYYY-MM-DD (ถ้าไม่มีวันที่ให้ใส่วันนี้)",
  "totalAmount": 0,
  "items": [
    { "name": "ชื่อสินค้า/รายการ", "price": 0 }
  ],
  "paymentMethod": "cash หรือ transfer (ดูจากใบเสร็จว่าจ่ายเงินสดหรือโอน/QR/บัตร ถ้าไม่ระบุให้ใส่ cash)"
}

กฎสำคัญ:
- totalAmount คือยอดรวมสุทธิที่ต้องจ่ายจริง (ไม่ใช่ยอดก่อน VAT หรือก่อนส่วนลด)
- items คือรายการสินค้าทุกชิ้นที่ซื้อ พร้อมราคาต่อชิ้น
- ถ้ามี x2, x3 ให้แยกเป็นรายการเดียวแต่ใส่ราคารวมของจำนวนนั้น
- ราคาเป็นตัวเลขบวกเสมอ ไม่ต้องใส่สัญลักษณ์สกุลเงิน
- ตอบเป็น JSON เท่านั้น ห้ามมี markdown code block หรือข้อความอื่น`;

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g. "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  if (has('แม็คโคร', 'makro', 'โลตัส', 'lotus', 'bigc', 'บิ๊กซี', 'ตลาด', 'ซุปเปอร์')) {
    return 'other_expense';
  }
  return 'other_expense';
}

export async function parseReceiptWithGemini(
  file: File,
  apiKey: string,
  onProgress?: (status: string, progress: number) => void,
): Promise<GeminiReceiptResult> {
  onProgress?.('กำลังเตรียมรูปภาพ...', 0.1);

  const base64Data = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  onProgress?.('กำลังส่งรูปให้ Gemini AI วิเคราะห์...', 0.3);

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: RECEIPT_PROMPT },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
    },
  };

  onProgress?.('Gemini AI กำลังอ่านใบเสร็จ...', 0.5);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = (errorData as any)?.error?.message || response.statusText;
    if (response.status === 400 && msg.includes('API key')) {
      throw new Error('API Key ไม่ถูกต้อง กรุณาตรวจสอบ Gemini API Key ของคุณ');
    }
    if (response.status === 429) {
      throw new Error('เกินจำนวนครั้งที่ใช้ได้ (Rate Limit) กรุณารอสักครู่แล้วลองใหม่');
    }
    throw new Error(`Gemini API Error: ${msg}`);
  }

  onProgress?.('กำลังวิเคราะห์ผลลัพธ์...', 0.8);

  const data = await response.json();
  const textContent =
    data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Extract JSON from response (handle possible markdown code blocks)
  let jsonStr = textContent.trim();
  // Remove ```json ... ``` wrappers if present
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('ไม่สามารถอ่านข้อมูลจาก AI ได้ กรุณาลองถ่ายรูปใหม่ให้ชัดขึ้น');
  }

  onProgress?.('สแกนเสร็จสมบูรณ์!', 1.0);

  // Build full text from items for category detection
  const allText = [
    parsed.storeName || '',
    ...(parsed.items || []).map((i: any) => i.name || ''),
  ].join(' ');

  const items = (parsed.items || [])
    .filter((i: any) => i && i.name && typeof i.price === 'number' && i.price > 0)
    .map((i: any) => ({
      name: String(i.name).slice(0, 80),
      price: Math.abs(Number(i.price)),
    }))
    .slice(0, 50);

  const totalAmount = typeof parsed.totalAmount === 'number' && parsed.totalAmount > 0
    ? parsed.totalAmount
    : items.reduce((sum: number, i: { price: number }) => sum + i.price, 0);

  const paymentMethod =
    parsed.paymentMethod === 'transfer' ? 'transfer' : 'cash';

  // Format date
  let date = parsed.date || '';
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    date = new Date().toISOString().split('T')[0];
  }

  return {
    storeName: parsed.storeName || 'ใบเสร็จรับเงิน',
    date,
    totalAmount,
    category: detectCategory(allText),
    items,
    paymentMethod,
    confidence: 95,
  };
}
