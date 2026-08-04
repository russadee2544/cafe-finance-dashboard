import React, { useState } from 'react';
import { Printer, CheckCircle2, Image, Receipt } from 'lucide-react';

export type PrintModeId = 'dual_2x6' | 'single_2x6' | 'thermal_58' | 'thermal_80' | 'thermal_100' | 'photo_5x7';

interface PrintModeOption {
  id: PrintModeId;
  title: string;
  badge?: string;
  badgeType?: 'recommend' | 'cafe';
  icon: 'photo' | 'receipt';
  description: string;
}

const PRINT_MODES: PrintModeOption[] = [
  {
    id: 'dual_2x6',
    title: '4×6" Dual 2×6 Strip',
    badge: 'แนะนำ',
    badgeType: 'recommend',
    icon: 'photo',
    description: 'รูปภาพ 4x6 นิ้ว HD พิมพ์ 2 แถบคู่เหมือนกันสำหรับตัดแบ่งครึ่ง'
  },
  {
    id: 'single_2x6',
    title: '2×6" Single Strip',
    icon: 'photo',
    description: 'รูปภาพริบบิ้นเดียว 2x6 นิ้วสไตล์คลาสสิก'
  },
  {
    id: 'thermal_58',
    title: 'Thermal 58mm',
    badge: 'คาเฟ่',
    badgeType: 'cafe',
    icon: 'receipt',
    description: 'ใบเสร็จความร้อนขนาดเล็ก 58mm เหมาะสำหรับตู้คาเฟ่'
  },
  {
    id: 'thermal_80',
    title: 'Thermal 80mm',
    icon: 'receipt',
    description: 'ใบเสร็จความร้อนม้วนขนาด 80mm (ปรับขยายพื้นที่รูปสูงสุด)'
  },
  {
    id: 'thermal_100',
    title: 'Thermal 100mm',
    icon: 'receipt',
    description: 'ใบเสร็จความร้อนม้วนขนาดใหญ่ 100mm'
  },
  {
    id: 'photo_5x7',
    title: '5×7" Photo Card',
    icon: 'photo',
    description: 'การ์ดรูปถ่ายโฟโต้บูธขนาดใหญ่พิเศษ 5x7 นิ้ว'
  }
];

export const PrintModeSelector: React.FC = () => {
  const [activeMode, setActiveMode] = useState<PrintModeId>(() => {
    return (localStorage.getItem('baanmai_print_mode') as PrintModeId) || 'dual_2x6';
  });

  const [notification, setNotification] = useState<string | null>(null);

  const handleSelectMode = (modeId: PrintModeId, modeTitle: string) => {
    setActiveMode(modeId);
    localStorage.setItem('baanmai_print_mode', modeId);
    
    setNotification(`สลับเป็น ${modeTitle} เรียบร้อย`);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  return (
    <div className="triton-main-card border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <Printer className="w-5 h-5 text-[#D2E875] dark:text-[#D2E875]" />
            โหมดการพิมพ์ & ขนาดกระดาษ (Print Mode & Paper Size)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            เลือกขนาดกระดาษและรูปแบบการพิมพ์หลักของตู้โฟโต้บูธ / คาเฟ่
          </p>
        </div>

        {notification && (
          <div className="px-3 py-1.5 bg-[#D2E875]/20 text-[#181A1C] dark:text-[#D2E875] border border-[#D2E875]/40 rounded-full text-xs font-bold flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {notification}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {PRINT_MODES.map((mode) => {
          const isSelected = activeMode === mode.id;
          return (
            <div
              key={mode.id}
              onClick={() => handleSelectMode(mode.id, mode.title)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative flex flex-col justify-between group ${
                isSelected
                  ? 'border-[#D2E875] bg-gray-900 dark:bg-[#181A1C] shadow-md ring-2 ring-[#D2E875]/40'
                  : 'border-gray-800/80 bg-gray-950/80 hover:border-gray-600 dark:bg-[#141618]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {mode.icon === 'photo' ? (
                      <Image className={`w-4 h-4 ${isSelected ? 'text-[#D2E875]' : 'text-gray-400'}`} />
                    ) : (
                      <Receipt className={`w-4 h-4 ${isSelected ? 'text-[#D2E875]' : 'text-gray-400'}`} />
                    )}
                    <h4 className="font-bold text-sm text-white tracking-tight">
                      {mode.title}
                    </h4>
                  </div>

                  {mode.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      mode.badgeType === 'recommend'
                        ? 'bg-[#D2E875] text-[#181A1C]'
                        : 'bg-rose-900/80 text-rose-200 border border-rose-700/50'
                    }`}>
                      {mode.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  {mode.description}
                </p>
              </div>

              {isSelected && (
                <div className="mt-3 pt-2 border-t border-gray-800 flex items-center justify-end">
                  <span className="text-[11px] font-bold text-[#D2E875] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> เลือกใช้งานอยู่
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
