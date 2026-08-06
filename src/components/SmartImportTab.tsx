import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  RefreshCw,
  Trash2,
  Database,
  Camera,
  ScanLine,
  Key,
  Sparkles,
  Plus
} from 'lucide-react';
import type { Transaction, CategoryId, ExcelImportRow } from '../types/finance';
import { parseReceiptImage } from '../utils/ocrParser';
import { parseExcelFile, mapRowsToTransactions, parseGoogleSheetURL } from '../utils/excelParser';
import { isCustomExpenseFormat, parseCustomExpenseFile } from '../utils/expenseSheetParser';
import * as XLSX from 'xlsx';
import type { ColumnMapping } from '../utils/excelParser';
import { CATEGORIES } from '../data/categories';
import { getGeminiApiKey, saveGeminiApiKey } from '../utils/storage';

interface SmartImportTabProps {
  onAddTransaction: (newTx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onBatchAddTransactions: (newTxs: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
  onImportSales?: (file: File) => void;
  onImportCashFlow?: (file: File) => void;
  gposUrl?: string;
  onSaveGPOSUrl?: (url: string) => void;
  onSyncGPOS?: (url: string) => Promise<void>;
}

export const SmartImportTab: React.FC<SmartImportTabProps> = ({
  onAddTransaction,
  onBatchAddTransactions,
  onImportSales,
  onImportCashFlow,
  gposUrl: initialGposUrl = '',
  onSaveGPOSUrl,
  onSyncGPOS,
}) => {
  const [activeImportMode, setActiveImportMode] = useState<'gpos' | 'receipt' | 'excel'>('receipt');
  const [inputGposUrl, setInputGposUrl] = useState<string>(initialGposUrl);
  const [isGposSyncing, setIsGposSyncing] = useState<boolean>(false);
  const [lastSyncSuccess, setLastSyncSuccess] = useState<boolean>(false);

  // --- Receipt OCR State ---
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanResult, setScanResult] = useState<{
    storeName: string;
    date: string;
    totalAmount: number;
    category: CategoryId;
    description: string;
    paymentMethod: 'cash' | 'transfer' | 'credit_card' | 'qr';
    items: { name: string; price: number }[];
  } | null>(null);
  const [receiptSaved, setReceiptSaved] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string>('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  // --- Gemini API Key State ---
  const [geminiApiKey, setGeminiApiKey] = useState<string>(getGeminiApiKey());
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const isGeminiMode = geminiApiKey.length > 0;

  useEffect(() => {
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(touch);
  }, []);

  useEffect(() => {
    if (activeImportMode === 'receipt' && !receiptImage && isTouchDevice) {
      const t = setTimeout(() => cameraInputRef.current?.click(), 200);
      return () => clearTimeout(t);
    }
  }, [activeImportMode, receiptImage, isTouchDevice]);

  // --- Excel Importer State ---
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [rawExcelRows, setRawExcelRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    dateCol: '',
    descriptionCol: '',
    typeCol: '',
    amountCol: '',
    categoryCol: '',
    paymentMethodCol: '',
  });
  const [mappedRows, setMappedRows] = useState<ExcelImportRow[]>([]);
  const [excelSavedCount, setExcelSavedCount] = useState<number | null>(null);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setReceiptImage(imageUrl);
    setIsScanning(true);
    setReceiptSaved(false);
    setScanError('');
    setScanStatus(isGeminiMode ? 'กำลังส่งรูปให้ Gemini AI...' : 'กำลังโหลดโมเดล OCR...');
    setScanProgress(0);

    try {
      const result = await parseReceiptImage(file, (status, progress) => {
        setScanProgress(Math.round(progress * 100));
        // Use Gemini-style labels if they come from Gemini, otherwise translate Tesseract labels
        let label = status;
        if (status.includes('loading tesseract core') || status.includes('initializing tesseract')) {
          label = 'กำลังโหลดโมเดล OCR...';
        } else if (status.includes('loading language')) {
          label = 'กำลังโหลดภาษา (ไทย/อังกฤษ)...';
        } else if (status.includes('initializing api')) {
          label = 'กำลังเริ่มระบบสแกน...';
        } else if (status.includes('recognizing text')) {
          label = 'กำลังอ่านข้อความจากใบเสร็จ...';
        }
        setScanStatus(label);
      });

      // Detect paymentMethod from Gemini rawText or default
      let paymentMethod: 'cash' | 'transfer' | 'credit_card' | 'qr' = 'cash';
      if (result.rawText?.includes('paymentMethod: transfer')) {
        paymentMethod = 'transfer';
      }

      setScanResult({
        storeName: result.storeName,
        date: result.date,
        totalAmount: result.totalAmount,
        category: result.category,
        description: `ซื้อวัตถุดิบ/ค่าใช้จ่ายจาก ${result.storeName}`,
        paymentMethod,
        items: result.items,
      });
    } catch (err) {
      console.error('OCR Error', err);
      const message = err instanceof Error ? err.message : String(err);
      setScanError(
        message.includes('Network error')
          ? 'ไม่สามารถดาวน์โหลดโมเดล OCR ได้ กรุณาเชื่อมต่ออินเทอร์เน็ตครั้งแรก แล้วลองใหม่'
          : `สแกนไม่สำเร็จ: ${message}`,
      );
      setScanStatus('');
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      setScanStatus('');
    }
  };

  const handleSaveReceipt = () => {
    if (!scanResult) return;
    onAddTransaction({
      date: scanResult.date,
      type: 'expense',
      amount: scanResult.totalAmount,
      category: scanResult.category,
      description: scanResult.description.trim() || `ซื้อวัตถุดิบ/ค่าใช้จ่ายจาก ${scanResult.storeName}`,
      paymentMethod: scanResult.paymentMethod,
      receiptUrl: receiptImage || undefined,
      source: 'receipt_ocr',
    });
    setReceiptSaved(true);
  };

  const handleItemChange = (idx: number, field: 'name' | 'price', value: string) => {
    if (!scanResult) return;
    const items = scanResult.items.map((item, i) =>
      i === idx ? { ...item, [field]: field === 'price' ? (parseFloat(value) || 0) : value } : item,
    );
    setScanResult({ ...scanResult, items });
  };

  const handleRemoveItem = (idx: number) => {
    if (!scanResult) return;
    const items = scanResult.items.filter((_, i) => i !== idx);
    setScanResult({ ...scanResult, items });
  };

  const handleAddItem = () => {
    if (!scanResult) return;
    setScanResult({ ...scanResult, items: [...scanResult.items, { name: '', price: 0 }] });
  };

  const handleRecalcTotalFromItems = () => {
    if (!scanResult) return;
    const total = scanResult.items.reduce((sum, item) => sum + (item.price || 0), 0);
    setScanResult({ ...scanResult, totalAmount: total });
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setExcelSavedCount(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      
      if (isCustomExpenseFormat(wb)) {
        const sheets = await parseCustomExpenseFile(file);
        const allTx = sheets.flatMap((s) => s.transactions);
        
        const customMapped: ExcelImportRow[] = allTx.map((tx) => ({
          date: tx.date,
          type: tx.type,
          amount: tx.amount,
          category: tx.category,
          description: tx.description,
          paymentMethod: tx.paymentMethod,
          isValid: true,
        }));

        setExcelHeaders(['วันที่', 'ประเภท', 'รายการ', 'หมวดหมู่', 'จำนวนเงิน']);
        setRawExcelRows([]);
        setColumnMapping({
          dateCol: 'วันที่',
          typeCol: 'ประเภท',
          descriptionCol: 'รายการ',
          categoryCol: 'หมวดหมู่',
          amountCol: 'จำนวนเงิน',
          paymentMethodCol: '',
        });
        setMappedRows(customMapped);
        return;
      }

      const { headers, rawRows, suggestedMapping } = await parseExcelFile(file);
      setExcelHeaders(headers);
      setRawExcelRows(rawRows);
      setColumnMapping(suggestedMapping);

      const rows = mapRowsToTransactions(rawRows, suggestedMapping);
      setMappedRows(rows);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: ' + (err as Error).message);
    }
  };

  const handleMappingChange = (key: keyof ColumnMapping, val: string) => {
    const newMapping = { ...columnMapping, [key]: val };
    setColumnMapping(newMapping);
    if (rawExcelRows.length > 0) {
      const updatedRows = mapRowsToTransactions(rawExcelRows, newMapping);
      setMappedRows(updatedRows);
    }
  };

  const handleSaveExcelBatch = () => {
    const validRows = mappedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    const newTxs: Omit<Transaction, 'id' | 'createdAt'>[] = validRows.map((r) => ({
      date: r.date,
      type: r.type,
      amount: r.amount,
      category: r.category,
      description: r.description,
      paymentMethod: (r.paymentMethod as 'cash' | 'transfer' | 'credit_card' | 'qr') || 'cash',
      source: 'excel_import',
    }));

    onBatchAddTransactions(newTxs);
    setExcelSavedCount(validRows.length);
  };

  const handleLoadBaanMaiExpense = async () => {
    try {
      const res = await fetch('/ค่าใช้จ่าย-ณ-บ้านใหม่-ไออุ่น.xlsx');
      if (!res.ok) throw new Error('ไม่พบไฟล์ในระบบ');
      const blob = await res.blob();
      const file = new File([blob], 'ค่าใช้จ่าย-ณ-บ้านใหม่-ไออุ่น (จัดระเบียบแล้ว).xlsx');
      setExcelFile(file);
      setExcelSavedCount(null);

      const sheets = await parseCustomExpenseFile(file);
      const allTx = sheets.flatMap((s) => s.transactions);

      const customMapped: ExcelImportRow[] = allTx.map((tx) => ({
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        description: tx.description,
        paymentMethod: tx.paymentMethod,
        isValid: true,
      }));

      setExcelHeaders(['วันที่', 'ประเภท', 'รายการ', 'หมวดหมู่', 'จำนวนเงิน']);
      setRawExcelRows([]);
      setColumnMapping({
        dateCol: 'วันที่',
        typeCol: 'ประเภท',
        descriptionCol: 'รายการ',
        categoryCol: 'หมวดหมู่',
        amountCol: 'จำนวนเงิน',
        paymentMethodCol: '',
      });
      setMappedRows(customMapped);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการโหลดไฟล์: ' + (err.message || String(err)));
    }
  };

  const getExcelStep = () => {
    if (excelSavedCount !== null) return 4;
    if (mappedRows.length > 0) return 3;
    if (excelHeaders.length > 0) return 2;
    return 1;
  };

  const excelStep = getExcelStep();

  return (
    <div className="triton-main-card rounded-[28px] p-4 sm:p-6 lg:p-8 space-y-6 shadow-sm">
      
      {/* Header and Tab Switcher */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
          <ScanLine className="w-6 h-6 text-[#181A1C] dark:text-[#D2E875] shrink-0" />
          ระบบสแกนนำเข้าข้อมูลอัตโนมัติ (Smart Import)
        </h2>

        <div className="flex items-center bg-[#F1F3F5] dark:bg-white/10 p-1 rounded-full w-full md:w-auto gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveImportMode('receipt')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 ${
              activeImportMode === 'receipt'
                ? 'bg-[#D2E875] text-[#181A1C] shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
            }`}
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>สแกนใบเสร็จ OCR</span>
          </button>

          <button
            onClick={() => setActiveImportMode('gpos')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 ${
              activeImportMode === 'gpos'
                ? 'bg-[#D2E875] text-[#181A1C] shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
            }`}
          >
            <ScanLine className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>GPOS Sunmi</span>
          </button>

          <button
            onClick={() => setActiveImportMode('excel')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 ${
              activeImportMode === 'excel'
                ? 'bg-[#D2E875] text-[#181A1C] shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>ไฟล์ Excel ทั่วไป</span>
          </button>
        </div>
      </div>

      {/* GPOS SUNMI CONNECTOR TAB */}
      {activeImportMode === 'gpos' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-gradient-to-r from-emerald-900/30 via-[#181A1C] to-emerald-900/10 p-6 rounded-3xl border border-emerald-500/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
                  <span>GPOS Sunmi Automated Connector</span>
                  <span className="text-[10px] sm:text-xs bg-[#D2E875] text-[#181A1C] px-2.5 py-0.5 rounded-full font-black whitespace-nowrap">LIVE SYNC</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ไม่ต้องกดดาวน์โหลดไฟล์เอง! เชื่อมต่อ Google Sheets Auto-Sync หรืออัปโหลดไฟล์ตรงจากเครื่อง Sunmi
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option A: Google Sheets Auto Sync */}
              <div className="bg-white dark:bg-[#181A1C] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <span>วิธีที่ 1: ซิงค์อัตโนมัติผ่าน Google Sheets URL</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  นำ URL ของ Google Sheets ที่ GPOS Sunmi สรุปยอดขายประจำวันมาวาง เพื่อให้ระบบดึงข้อมูลรายรับ-รายจ่ายให้อัตโนมัติทุกครั้ง
                </p>
                <div className="space-y-2">
                  <input 
                    type="url"
                    value={inputGposUrl}
                    onChange={(e) => setInputGposUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1iTZH_..."
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-[#232729] border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-[#D2E875] dark:text-white font-mono"
                  />
                  <button
                    disabled={!inputGposUrl || isGposSyncing}
                    onClick={async () => {
                      try {
                        setIsGposSyncing(true);
                        setLastSyncSuccess(false);
                        if (onSaveGPOSUrl) onSaveGPOSUrl(inputGposUrl);
                        if (onSyncGPOS) {
                          await onSyncGPOS(inputGposUrl);
                        } else {
                          const result = await parseGoogleSheetURL(inputGposUrl);
                          if (result.sales.length > 0) alert(`✅ ซิงค์ยอดขายสำเร็จ ${result.sales.length} วัน!`);
                          if (result.cashFlow.length > 0) alert(`✅ ซิงค์เงินเข้า-ออกสำเร็จ ${result.cashFlow.length} รายการ!`);
                        }
                        setLastSyncSuccess(true);
                      } catch (err: any) {
                        alert(`❌ ${err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets'}`);
                      } finally {
                        setIsGposSyncing(false);
                      }
                    }}
                    className="w-full py-2.5 bg-[#D2E875] text-[#181A1C] font-bold text-xs rounded-xl hover:brightness-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGposSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>{isGposSyncing ? 'กำลังดึงข้อมูลจาก GPOS...' : '⚡ บันทึกลิงก์ & ซิงค์ข้อมูล GPOS ทันที'}</span>
                  </button>

                  {lastSyncSuccess && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>เชื่อมต่อและดึงข้อมูลจาก GPOS ล่าสุดเรียบร้อยแล้ว</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Option B: Direct Sunmi File Dropzone */}
              <div className="bg-white dark:bg-[#181A1C] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                  <span>วิธีที่ 2: นำเข้าไฟล์ Excel ตรงจากเครื่อง Sunmi</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  หากดาวน์โหลดไฟล์ Excel ออกจาก GPOS Sunmi สามารถเลือกอัปโหลดตรงนี้ได้ทันที ระบบจะแยกยอดขายและเงินเข้า-ให้อัตโนมัติ
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 dark:border-gray-700 hover:border-[#D2E875] bg-gray-50 dark:bg-[#232729] rounded-xl cursor-pointer transition-all text-center">
                    <FileSpreadsheet className="w-6 h-6 text-[#D2E875] mb-2" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">ยอดขายรายวัน</span>
                    <span className="text-[10px] text-gray-500 mt-1">.xlsx (.xls)</span>
                    <input 
                      type="file" 
                      accept=".xlsx,.xls" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && onImportSales) onImportSales(file);
                      }}
                    />
                  </label>

                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 bg-gray-50 dark:bg-[#232729] rounded-xl cursor-pointer transition-all text-center">
                    <UploadCloud className="w-6 h-6 text-emerald-500 mb-2" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">เงินเข้า-ออก</span>
                    <span className="text-[10px] text-gray-500 mt-1">.xlsx (.xls)</span>
                    <input 
                      type="file" 
                      accept=".xlsx,.xls" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && onImportCashFlow) onImportCashFlow(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeImportMode === 'receipt' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Gemini API Key Configuration */}
          <div className="bg-white dark:bg-[#1F2327] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isGeminiMode ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {isGeminiMode ? <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" /> : <ScanLine className="w-5 h-5 text-gray-500" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      {isGeminiMode ? '🤖 Gemini Vision AI' : '📝 Tesseract OCR (Offline)'}
                    </h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isGeminiMode ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                      {isGeminiMode ? 'แม่นยำ 95%+' : 'พื้นฐาน'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {isGeminiMode ? 'AI อ่านใบเสร็จแม่นยำสูง รองรับภาษาไทย' : 'ใส่ Gemini API Key เพื่ออัปเกรดความแม่นยำ'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setApiKeyInput(val);
                      setGeminiApiKey(val);
                      saveGeminiApiKey(val);
                    }}
                    placeholder={geminiApiKey ? '•••••••• (บันทึกแล้ว)' : 'Gemini API Key (จาก aistudio.google.com)'}
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-gray-50 dark:bg-[#141618] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-purple-400 transition-colors font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Upload Area */}
          <div className="bg-white dark:bg-[#1F2327] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">อัพโหลดใบเสร็จ</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">รองรับ JPG, PNG, WEBP</p>
            </div>

            <label className="relative flex-1 min-h-[300px] border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#D2E875] bg-slate-50 dark:bg-[#141618] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleReceiptUpload}
                className="hidden"
              />
              
              {receiptImage ? (
                <div className="relative w-full h-full flex justify-center items-center rounded-xl overflow-hidden">
                  <img src={receiptImage} alt="Receipt preview" className="max-h-64 object-contain rounded-xl shadow-sm z-10" />
                  
                  {isScanning && (
                    <>
                      <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-[#D2E875]">
                        <RefreshCw className="w-10 h-10 mb-3 animate-spin" />
                        <span className="text-sm font-bold animate-pulse">{scanStatus || 'กำลังสแกนข้อมูล...'}</span>
                        {scanProgress > 0 && (
                          <div className="w-40 h-1.5 bg-white/20 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-[#D2E875] rounded-full transition-all" style={{ width: `${Math.min(100, scanProgress)}%` }} />
                          </div>
                        )}
                      </div>
                      {/* Scanning line animation */}
                      <div className="absolute left-0 right-0 h-1 bg-[#D2E875] shadow-[0_0_15px_rgba(210,232,117,0.8)] z-30 animate-scan-line"></div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center z-10 relative">
                  <div className="w-16 h-16 mb-4 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-800 dark:text-[#D2E875]">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    ลากไฟล์มาวาง หรือ คลิกเพื่ออัพโหลด
                  </span>
                </div>
              )}
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleReceiptUpload}
              className="hidden"
              id="receipt-file-gallery"
            />
            <button
              type="button"
              onClick={() => document.getElementById('receipt-file-gallery')?.click()}
              className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <UploadCloud className="w-4 h-4" /> เลือกจากอัลบั้ม
            </button>

            {receiptImage && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setReceiptImage(null);
                    setScanResult(null);
                    setReceiptSaved(false);
                    setScanError('');
                  }}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-rose-500 flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> อัพโหลดใหม่
                </button>
              </div>
            )}
          </div>

          {/* Results Area */}
          <div className="bg-white dark:bg-[#1F2327] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
              ผลการสแกนข้อมูล
            </h3>

            {isScanning ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
                <div className="w-12 h-12 border-4 border-gray-100 border-t-[#D2E875] rounded-full animate-spin"></div>
                <p className="text-sm font-bold animate-pulse text-gray-800 dark:text-[#D2E875]">
                  {scanStatus || 'กำลังประมวลผล...'}
                </p>
                {scanProgress > 0 && (
                  <div className="w-40 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#D2E875] rounded-full transition-all" style={{ width: `${Math.min(100, scanProgress)}%` }} />
                  </div>
                )}
              </div>
            ) : scanError ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 text-rose-500">
                <AlertTriangle className="w-10 h-10" />
                <p className="text-sm font-bold">{scanError}</p>
                <button
                  onClick={() => {
                    setScanError('');
                    setReceiptImage(null);
                  }}
                  className="text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-full transition-colors"
                >
                  ลองใหม่
                </button>
              </div>
            ) : scanResult ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                
                {receiptSaved && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-2xl text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    บันทึกข้อมูลสำเร็จ!
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">ชื่อร้าน</label>
                    <input
                      type="text"
                      value={scanResult.storeName}
                      onChange={(e) => setScanResult({ ...scanResult, storeName: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-[#141618] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#D2E875]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">รายละเอียด</label>
                    <input
                      type="text"
                      value={scanResult.description}
                      onChange={(e) => setScanResult({ ...scanResult, description: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-[#141618] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#D2E875]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">ยอดเงินรวม (บาท)</label>
                      <input
                        type="number"
                        value={scanResult.totalAmount}
                        onChange={(e) => setScanResult({ ...scanResult, totalAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">วันที่</label>
                      <input
                        type="date"
                        value={scanResult.date}
                        onChange={(e) => setScanResult({ ...scanResult, date: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-[#141618] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">หมวดหมู่</label>
                    <select
                      value={scanResult.category}
                      onChange={(e) => setScanResult({ ...scanResult, category: e.target.value as CategoryId })}
                      className="w-full bg-gray-50 dark:bg-[#141618] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none"
                    >
                      {Object.values(CATEGORIES)
                        .filter((c) => c.type === 'expense')
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">วิธีชำระเงิน</label>
                    <select
                      value={scanResult.paymentMethod}
                      onChange={(e) => setScanResult({ ...scanResult, paymentMethod: e.target.value as 'cash' | 'transfer' | 'credit_card' | 'qr' })}
                      className="w-full bg-gray-50 dark:bg-[#141618] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none"
                    >
                      <option value="cash">เงินสด</option>
                      <option value="transfer">โอนเงิน</option>
                      <option value="credit_card">บัตรเครดิต</option>
                      <option value="qr">QR พร้อมเพย์</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-[#141618] rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                      รายการที่พบ ({scanResult.items.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRecalcTotalFromItems}
                        className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap"
                      >
                        คำนวณยอดรวมจากรายการ
                      </button>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="flex items-center gap-1 text-[10px] font-bold text-[#181A1C] dark:text-[#D2E875] bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-full hover:opacity-80 whitespace-nowrap"
                      >
                        <Plus className="w-3 h-3" /> เพิ่ม
                      </button>
                    </div>
                  </div>

                  {scanResult.items.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">ยังไม่มีรายการ กด "เพิ่ม" เพื่อเพิ่มรายการ</p>
                  ) : (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {scanResult.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            placeholder="ชื่อรายการ"
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            className="flex-1 min-w-0 bg-white dark:bg-[#1F2327] border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#D2E875]"
                          />
                          <input
                            type="number"
                            value={item.price || ''}
                            placeholder="0"
                            onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                            className="w-24 bg-white dark:bg-[#1F2327] border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white text-right focus:outline-none focus:border-[#D2E875]"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-gray-400 hover:text-rose-500 p-1 shrink-0"
                            aria-label={`ลบรายการ ${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSaveReceipt}
                  disabled={receiptSaved}
                  className={`w-full py-3.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                    receiptSaved
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      : 'bg-[#181A1C] dark:bg-[#D2E875] text-white dark:text-[#181A1C] shadow-sm hover:opacity-90'
                  }`}
                >
                  {receiptSaved ? (
                    <><CheckCircle2 className="w-4 h-4" /> บันทึกแล้ว</>
                  ) : (
                    <><Database className="w-4 h-4" /> บันทึกลงตารางรายจ่าย</>
                  )}
                </button>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-600 dark:text-gray-400 min-h-[250px]">
                <div className="w-16 h-16 bg-slate-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-700 dark:text-[#D2E875]">
                  <Receipt className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">สแกนใบเสร็จเพื่อดูข้อมูล</p>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {activeImportMode === 'excel' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Step Indicator */}
          <div className="bg-white dark:bg-[#1F2327] p-3 sm:p-4 rounded-2xl sm:rounded-full border border-gray-200 dark:border-gray-800 flex justify-between items-center relative shadow-sm">
             <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gray-200 dark:bg-gray-800 -translate-y-1/2 z-0 hidden md:block"></div>
             
             {[
               { step: 1, label: '1. อัพโหลด' },
               { step: 2, label: '2. จับคู่คอลัมน์' },
               { step: 3, label: '3. ตรวจสอบ' },
               { step: 4, label: '4. นำเข้า' }
             ].map((s) => {
               const isActive = excelStep === s.step;
               const isPast = excelStep > s.step;
               
               return (
                 <div key={s.step} className="relative z-10 flex flex-col items-center gap-1 flex-1 bg-white dark:bg-[#1F2327] px-1 sm:px-2 min-w-0">
                   <span className={`text-[10px] sm:text-sm font-bold px-2 sm:px-3 py-1 rounded-full border-2 whitespace-nowrap ${
                     isActive ? 'border-[#D2E875] bg-[#D2E875] text-[#181A1C]' :
                     isPast ? 'border-[#D2E875] text-emerald-600 dark:text-[#D2E875] bg-white dark:bg-[#141618]' :
                     'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-[#141618]'
                   }`}>
                     {s.label}
                   </span>
                 </div>
               );
             })}
          </div>

          {/* Step 1: Upload */}
          <div className="bg-white dark:bg-[#1F2327] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                1. เลือกไฟล์ Excel
              </h3>
              <button
                type="button"
                onClick={handleLoadBaanMaiExpense}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 text-xs font-bold rounded-xl hover:bg-amber-100 transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>⚡ โหลดไฟล์ "ค่าใช้จ่าย-ณ-บ้านใหม่-ไออุ่น.xlsx" ทันที</span>
              </button>
            </div>
            
            <label className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#D2E875] bg-slate-50 dark:bg-[#141618] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center mb-4 shadow-sm text-gray-700 dark:text-[#D2E875]">
                {excelFile ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <FileSpreadsheet className="w-6 h-6" />}
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {excelFile ? `ไฟล์: ${excelFile.name}` : 'คลิกหรือลากไฟล์ .xlsx / .csv มาวาง'}
              </span>
            </label>
          </div>

          {/* Step 2: Mapping */}
          {excelHeaders.length > 0 && (
            <div className="bg-white dark:bg-[#1F2327] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">2. จับคู่ข้อมูล</h3>
                <span className="text-xs font-bold px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
                  พบ {mappedRows.length} แถว
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[
                  { key: 'dateCol', label: 'วันที่ (Date)' },
                  { key: 'typeCol', label: 'ประเภท (รับ/จ่าย)' },
                  { key: 'descriptionCol', label: 'รายการ (Description)' },
                  { key: 'amountCol', label: 'จำนวนเงิน (Amount)' },
                  { key: 'categoryCol', label: 'หมวดหมู่ (Category)' },
                  { key: 'paymentMethodCol', label: 'ช่องทางชำระเงิน' }
                ].map((col) => (
                  <div key={col.key}>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{col.label}</label>
                    <select
                      value={columnMapping[col.key as keyof ColumnMapping] as string}
                      onChange={(e) => handleMappingChange(col.key as keyof ColumnMapping, e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#141618] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#D2E875]"
                    >
                      {col.key === 'typeCol' && <option value="">-- ตรวจจับจากยอดเงิน (บวก/ลบ) --</option>}
                      {col.key === 'categoryCol' && <option value="">-- วิเคราะห์อัตโนมัติ --</option>}
                      {col.key === 'paymentMethodCol' && <option value="">-- ตรวจจับจากรายการ/โอน --</option>}
                      {excelHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 & 4: Preview & Import */}
          {mappedRows.length > 0 && (
            <div className="bg-white dark:bg-[#1F2327] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {excelStep === 3 ? '3. ตรวจสอบข้อมูล' : '4. นำเข้าสำเร็จ'}
                  </h3>
                </div>

                {excelStep === 3 && (
                  <button
                    onClick={handleSaveExcelBatch}
                    className="px-5 sm:px-6 py-2.5 bg-[#232729] hover:bg-[#181A1C] text-white font-bold rounded-full text-xs sm:text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <Database className="w-4 h-4" />
                    นำเข้า {mappedRows.filter((r) => r.isValid).length} รายการ
                  </button>
                )}
              </div>

              {excelSavedCount !== null && (
                <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  นำเข้าข้อมูลทั้งหมด {excelSavedCount} รายการเรียบร้อยแล้ว
                </div>
              )}

              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-[#141618]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50 dark:bg-[#1A1D20] text-gray-500 dark:text-gray-400 font-medium">
                      <tr>
                        <th className="p-3 pl-4">สถานะ</th>
                        <th className="p-3">วันที่</th>
                        <th className="p-3">ประเภท</th>
                        <th className="p-3">รายการ</th>
                        <th className="p-3">หมวดหมู่</th>
                        <th className="p-3">ช่องทาง</th>
                        <th className="p-3 pr-4 text-right">จำนวนเงิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {mappedRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx}>
                          <td className="p-3 pl-4">
                            {row.isValid ? (
                              <span className="text-emerald-600 flex items-center gap-1 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full w-fit">
                                <CheckCircle2 className="w-3 h-3" /> พร้อม
                              </span>
                            ) : (
                              <span className="text-rose-600 flex items-center gap-1 text-xs font-bold bg-rose-50 px-2 py-1 rounded-full w-fit">
                                <AlertCircle className="w-3 h-3" /> ตรวจสอบ
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-xs">{row.date}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full font-bold text-[10px] ${
                              row.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {row.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{row.description}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                              {CATEGORIES[row.category]?.name || row.category || '-'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                              row.paymentMethod === 'transfer'
                                ? 'bg-blue-50 text-blue-600'
                                : row.paymentMethod === 'credit_card'
                                  ? 'bg-purple-50 text-purple-600'
                                  : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {row.paymentMethod === 'transfer' ? '🏦 เงินโอน' : row.paymentMethod === 'credit_card' ? '💳 บัตร' : '💵 เงินสด'}
                            </span>
                          </td>
                          <td className={`p-3 pr-4 text-right font-bold ${
                            row.type === 'income' ? 'text-emerald-600' : 'text-gray-900'
                          }`}>
                            ฿{row.amount.toLocaleString('th-TH')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {mappedRows.length > 10 && (
                  <div className="p-3 bg-gray-50 dark:bg-[#1A1D20] border-t border-gray-100 dark:border-gray-800 text-center">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      แสดง 10 รายการแรก จากทั้งหมด {mappedRows.length} รายการ
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
