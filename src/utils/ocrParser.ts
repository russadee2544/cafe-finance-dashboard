import type { ReceiptScanResult, CategoryId } from '../types/finance';

// Helper function to extract receipt data using pattern recognition or simulated intelligent scanner
export const parseReceiptImage = async (file: File): Promise<ReceiptScanResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const fileName = file.name.toLowerCase();
      let totalAmount = Math.floor(Math.random() * 2500) + 350;
      let storeName = 'ร้านวัตถุดิบกาแฟ & อุปกรณ์คาเฟ่';
      let category: CategoryId = 'coffee_beans';
      let items = [
        { name: 'เมล็ดกาแฟ อราบิก้า 100% (1kg)', price: 450 },
        { name: 'ผงชาไทยพรีเมียม (500g)', price: 280 },
      ];

      if (fileName.includes('milk') || fileName.includes('dairy') || fileName.includes('นม')) {
        storeName = 'แม็คโคร / ซูเปอร์มาร์เก็ตวัตถุดิบ';
        category = 'dairy_syrup';
        totalAmount = 1420;
        items = [
          { name: 'นมสดเมจิ 2L (3 ขวด)', price: 345 },
          { name: 'วิปปิ้งครีม แองเคอร์ 1L', price: 220 },
          { name: 'ไซรัปคาราเมล 750ml', price: 385 },
          { name: 'น้ำแข็งยูนิต 5 ถุง', price: 100 },
        ];
      } else if (fileName.includes('power') || fileName.includes('elec') || fileName.includes('ไฟ') || fileName.includes('น้ำ')) {
        storeName = 'การไฟฟ้าส่วนภูมิภาค / การประปา';
        category = 'utilities';
        totalAmount = 5840;
        items = [
          { name: 'ค่าไฟฟ้าร้านคาเฟ่ประจำเดือน', price: 5840 },
        ];
      } else if (fileName.includes('cup') || fileName.includes('pack') || fileName.includes('แก้ว')) {
        storeName = 'บรรจุภัณฑ์คาเฟ่ พลาสติก พริ้นท์';
        category = 'packaging';
        totalAmount = 2650;
        items = [
          { name: 'แก้วแคปซูล 16oz (1,000 ใบ)', price: 1450 },
          { name: 'ฝายกฮด (1,000 ชิ้น)', price: 650 },
          { name: 'หลอดกระดาษรักษ์โลก (1,000 เล่ม)', price: 550 },
        ];
      } else if (fileName.includes('bakery') || fileName.includes('cake') || fileName.includes('เค้ก')) {
        storeName = 'Bake & Sweet Supply';
        category = 'bakery_food';
        totalAmount = 3200;
        items = [
          { name: 'ครัวซองต์เนยสด (20 ชิ้น)', price: 1400 },
          { name: 'ชีสเค้กหน้าไหม้ (2 ปอนด์)', price: 1200 },
          { name: 'คุกกี้ช็อกโกแลตชิพ (15 ชิ้น)', price: 600 },
        ];
      }

      const today = new Date().toISOString().split('T')[0];

      resolve({
        storeName,
        date: today,
        totalAmount,
        category,
        confidence: 0.94,
        rawText: `TAX INVOICE / RECEIPT\n${storeName}\nDATE: ${today}\nTOTAL: ฿${totalAmount.toLocaleString('th-TH')}\nTHANK YOU`,
        items,
      });
    }, 1200);
  });
};
