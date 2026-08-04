import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share, PlusSquare, X } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);

  useEffect(() => {
    // Detect standalone mode (already installed as PWA)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphoneOrIpad = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIphoneOrIpad);

    // Listen for beforeinstallprompt on Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // If already installed or dismissed, don't show
  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 animate-in slide-in-from-bottom-6 duration-500">
      <div className="bg-[#181A1C] text-white p-4.5 rounded-2xl border-2 border-[#D2E875] shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#D2E875] text-[#181A1C] flex items-center justify-center shrink-0 font-black shadow-md">
              <Smartphone className="w-6 h-6 text-[#181A1C]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#D2E875] flex items-center gap-1.5">
                <span>📲 ติดตั้งแอปบนโทรศัพท์ (PWA App)</span>
              </h4>
              <p className="text-xs text-gray-300 mt-0.5 leading-relaxed font-medium">
                เข้าใช้งานคาเฟ่แดชบอร์ดได้เร็วขึ้น ไร้แถบเว็บบราวเซอร์ เหมือนแอปจริงบนมือถือ
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowPrompt(false)}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button for Android/Chrome */}
        {deferredPrompt && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <button
              onClick={handleInstallClick}
              className="w-full py-2.5 bg-[#D2E875] text-[#181A1C] font-extrabold text-xs rounded-xl hover:brightness-95 transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>กดติดตั้งแอปพลิเคชันลงบนมือถือทันที</span>
            </button>
          </div>
        )}

        {/* Action Guide for iOS Safari */}
        {isIOS && !deferredPrompt && (
          <div className="mt-3 pt-3 border-t border-gray-800 space-y-1.5 text-[11px] text-gray-300">
            <p className="font-bold text-[#D2E875]">วิธีติดตั้งบน iPhone / iPad (Safari):</p>
            <div className="flex items-center gap-1.5">
              <span className="bg-white/10 px-1.5 py-0.5 rounded font-mono">1</span>
              <span>กดปุ่มแชร์ <Share className="w-3.5 h-3.5 inline text-sky-400" /> ที่แถบเมนูด้านล่าง Safari</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="bg-white/10 px-1.5 py-0.5 rounded font-mono">2</span>
              <span>เลื่อนลงมาเลือก <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" /> <strong className="text-white">"เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)"</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
