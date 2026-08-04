import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  CreditCard,
  Zap,
  Home,
  Shield,
  Repeat,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Settings,
  X,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import type {
  FixedCostItem,
  FixedCostFrequency,
  FixedCostCategory,
  CafeSettings
} from '../types/finance';
import {
  getStoredFixedCosts,
  saveFixedCosts,
  getStoredCafeSettings,
  saveCafeSettings
} from '../utils/storage';

interface FixedCostEngineProps {}

const CATEGORY_ICONS: Record<FixedCostCategory, React.ReactNode> = {
  wages: <Users size={20} />,
  loan: <CreditCard size={20} />,
  utilities: <Zap size={20} />,
  rent: <Home size={20} />,
  insurance: <Shield size={20} />,
  subscription: <Repeat size={20} />,
  other: <FileText size={20} />
};

const CATEGORY_COLORS: Record<FixedCostCategory, string> = {
  wages: '#6366f1',
  loan: '#dc2626',
  utilities: '#3b82f6',
  rent: '#ef4444',
  insurance: '#10b981',
  subscription: '#8b5cf6',
  other: '#64748b'
};

const CATEGORY_LABELS_TH: Record<FixedCostCategory, string> = {
  wages: 'ค่าจ้างพนักงาน',
  loan: 'ชำระหนี้/สินเชื่อ',
  utilities: 'ค่าน้ำค่าไฟ/จิปาถะ',
  rent: 'ค่าเช่าที่',
  insurance: 'ประกันภัย',
  subscription: 'ค่าบริการรายเดือน',
  other: 'อื่นๆ'
};

const FREQUENCY_LABELS_TH: Record<FixedCostFrequency, string> = {
  monthly: 'รายเดือน',
  weekly: 'รายสัปดาห์',
  daily: 'รายวัน'
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export const FixedCostEngine: React.FC<FixedCostEngineProps> = () => {
  const [fixedCosts, setFixedCosts] = useState<FixedCostItem[]>([]);
  const [settings, setSettings] = useState<CafeSettings>({
    cogsPercent: 40,
    workingDaysPerMonth: 26,
    monthlyFixedCostTarget: 0,
    currency: 'THB'
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FixedCostItem | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FixedCostCategory>('wages');
  const [amount, setAmount] = useState<number | ''>('');
  const [frequency, setFrequency] = useState<FixedCostFrequency>('monthly');
  const [dueDay, setDueDay] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Load Data
  useEffect(() => {
    setFixedCosts(getStoredFixedCosts() || []);
    const storedSettings = getStoredCafeSettings();
    if (storedSettings) {
      setSettings(storedSettings);
    }
  }, []);

  // Save Data
  useEffect(() => {
    saveFixedCosts(fixedCosts);
  }, [fixedCosts]);

  useEffect(() => {
    saveCafeSettings(settings);
  }, [settings]);

  // Calculations
  const calculations = useMemo(() => {
    let totalMonthlyCost = 0;
    const categoryTotals: Record<FixedCostCategory, number> = {
      wages: 0, loan: 0, utilities: 0, rent: 0, insurance: 0, subscription: 0, other: 0
    };

    fixedCosts.filter(fc => fc.isActive).forEach(cost => {
      let monthlyEquivalent = 0;
      if (cost.frequency === 'monthly') {
        monthlyEquivalent = cost.amount;
      } else if (cost.frequency === 'weekly') {
        monthlyEquivalent = cost.amount * 4.33;
      } else if (cost.frequency === 'daily') {
        monthlyEquivalent = cost.amount * settings.workingDaysPerMonth;
      }

      totalMonthlyCost += monthlyEquivalent;
      categoryTotals[cost.category] += monthlyEquivalent;
    });

    const dailyBurden = settings.workingDaysPerMonth > 0 ? totalMonthlyCost / settings.workingDaysPerMonth : 0;

    const pieData = Object.entries(categoryTotals)
      .filter(([_, val]) => val > 0)
      .map(([cat, val]) => ({
        name: CATEGORY_LABELS_TH[cat as FixedCostCategory],
        value: val,
        color: CATEGORY_COLORS[cat as FixedCostCategory]
      }));

    return { totalMonthlyCost, dailyBurden, pieData };
  }, [fixedCosts, settings.workingDaysPerMonth]);

  const openModal = (item?: FixedCostItem) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setCategory(item.category);
      setAmount(item.amount);
      setFrequency(item.frequency);
      setDueDay(item.dueDay || '');
      setNote(item.note || '');
      setIsActive(item.isActive);
    } else {
      setEditingItem(null);
      setName('');
      setCategory('wages');
      setAmount('');
      setFrequency('monthly');
      setDueDay('');
      setNote('');
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    if (!name || amount === '') return;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const newItem: FixedCostItem = {
      id: editingItem ? editingItem.id : generateId(),
      name,
      category,
      amount: numAmount,
      frequency,
      dueDay: dueDay !== '' ? Number(dueDay) : undefined,
      isActive,
      note,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString()
    };

    if (editingItem) {
      setFixedCosts(prev => prev.map(item => item.id === editingItem.id ? newItem : item));
    } else {
      setFixedCosts(prev => [...prev, newItem]);
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบรายการนี้?')) {
      setFixedCosts(prev => prev.filter(item => item.id !== id));
    }
  };

  const toggleActive = (id: string) => {
    setFixedCosts(prev => prev.map(item => item.id === id ? { ...item, isActive: !item.isActive } : item));
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Summary */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">จัดการต้นทุนคงที่</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
        >
          <Settings size={20} />
        </button>
      </div>

      {showSettings && (
        <div className="triton-main-card rounded-[20px] p-6 bg-white dark:bg-[#181A1C] shadow-sm border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">ตั้งค่าร้าน</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                ต้นทุนสินค้าขาย (COGS %) : {settings.cogsPercent}%
              </label>
              <input
                type="range"
                min="10"
                max="80"
                value={settings.cogsPercent}
                onChange={e => setSettings({ ...settings, cogsPercent: Number(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-[#D2E875]"
              />
              <p className="text-xs text-gray-500 mt-2">
                สัดส่วนต้นทุนวัตถุดิบต่อยอดขาย (ค่ามาตรฐานมักอยู่ประมาณ 30-40%)
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                จำนวนวันทำการต่อเดือน
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={settings.workingDaysPerMonth}
                onChange={e => setSettings({ ...settings, workingDaysPerMonth: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141618] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D2E875]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="triton-main-card rounded-[28px] p-6 bg-gradient-to-b from-[#181A1C] to-[#232729] dark:from-[#141618] dark:to-[#181A1C] text-white flex flex-col justify-between shadow-lg">
          <div>
            <p className="text-sm text-gray-400 font-medium">รวมต้นทุนคงที่ (รายเดือน)</p>
            <h3 className="text-3xl font-black mt-2 text-[#D2E875]">{formatCurrency(calculations.totalMonthlyCost)}</h3>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <p className="text-sm text-gray-400 font-medium">ภาระต้นทุนต่อวันทำการ</p>
            <p className="text-xl font-bold mt-1 text-white">{formatCurrency(calculations.dailyBurden)}</p>
            <p className="text-xs text-gray-500 mt-1">อ้างอิง {settings.workingDaysPerMonth} วันทำการ</p>
          </div>
        </div>

        <div className="triton-main-card rounded-[28px] p-6 bg-white dark:bg-[#181A1C] shadow-sm border border-gray-100 dark:border-gray-800 md:col-span-2 flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-1/2 h-[200px]">
             {calculations.pieData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={calculations.pieData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {calculations.pieData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                    <RechartsTooltip
                      formatter={(value: unknown) => formatCurrency(Number(value))}
                     contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#181A1C', color: '#fff' }}
                     itemStyle={{ color: '#fff' }}
                   />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                 ไม่มีข้อมูล
               </div>
             )}
          </div>
          <div className="w-full md:w-1/2 flex flex-col justify-center">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">สัดส่วนต้นทุนคงที่</h3>
            <div className="space-y-2">
              {calculations.pieData.slice(0, 4).map((data, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></div>
                    <span className="text-gray-600 dark:text-gray-300">{data.name}</span>
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-white">{formatCurrency(data.value)}</span>
                </div>
              ))}
              {calculations.pieData.length > 4 && (
                <div className="text-xs text-gray-400 mt-2 text-right">และอื่นๆ...</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* List Header */}
      <div className="flex justify-between items-center mt-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">รายการค่าใช้จ่ายคงที่</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-[#D2E875] text-[#141618] px-4 py-2 rounded-full font-bold hover:bg-[#c2d765] transition-all duration-300 shadow-sm"
        >
          <Plus size={18} />
          เพิ่มรายการ
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fixedCosts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 dark:bg-[#181A1C]/50 rounded-[20px] border border-dashed border-gray-200 dark:border-gray-800">
            <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>ยังไม่มีรายการค่าใช้จ่ายคงที่</p>
            <p className="text-sm mt-1">คลิกปุ่ม "เพิ่มรายการ" เพื่อเริ่มต้นจัดการต้นทุน</p>
          </div>
        ) : (
          fixedCosts.map(item => (
            <div
              key={item.id}
              className={`triton-main-card rounded-[20px] p-5 border transition-all duration-300 ${
                item.isActive
                  ? 'bg-white dark:bg-[#181A1C] border-gray-100 dark:border-gray-800 hover:shadow-md'
                  : 'bg-gray-50 dark:bg-[#141618] border-gray-200 dark:border-gray-800/50 opacity-70'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-full text-white"
                    style={{ backgroundColor: item.isActive ? CATEGORY_COLORS[item.category] : '#9ca3af' }}
                  >
                    {CATEGORY_ICONS[item.category]}
                  </div>
                  <div>
                    <h3 className={`font-bold ${item.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-500">{CATEGORY_LABELS_TH[item.category]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(item.id)}
                    className="p-1.5 text-gray-400 hover:text-[#D2E875] transition-colors"
                    title={item.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                  >
                    {item.isActive ? <CheckCircle2 size={18} className="text-[#D2E875]" /> : <X size={18} />}
                  </button>
                  <button onClick={() => openModal(item)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-1">
                <div className="flex justify-between items-end">
                  <span className="text-xl font-black text-gray-800 dark:text-white">
                    {formatCurrency(item.amount)}
                  </span>
                  <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {FREQUENCY_LABELS_TH[item.frequency]}
                  </span>
                </div>
                {(item.dueDay || item.note) && (
                  <div className="mt-2 text-xs text-gray-500 flex justify-between">
                    {item.dueDay && <span>จ่ายทุกวันที่ {item.dueDay}</span>}
                    {item.note && <span className="truncate max-w-[120px]">{item.note}</span>}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#181A1C] rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingItem ? 'แก้ไขรายการ' : 'เพิ่มรายการต้นทุนคงที่'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">ชื่อรายการ <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="เช่น ค่าเช่าร้าน, เงินเดือนพนักงาน A"
                  className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141618] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D2E875]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">หมวดหมู่</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as FixedCostCategory)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141618] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D2E875]"
                  >
                    {Object.entries(CATEGORY_LABELS_TH).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">จำนวนเงิน <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141618] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D2E875]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">ความถี่</label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as FixedCostFrequency)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141618] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D2E875]"
                  >
                    {Object.entries(FREQUENCY_LABELS_TH).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">วันครบกำหนด (ถ้ามี)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={e => setDueDay(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="วันที่ (1-31)"
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141618] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D2E875]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">หมายเหตุ</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141618] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D2E875] resize-none"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#D2E875] bg-gray-100 border-gray-300 rounded focus:ring-[#D2E875] dark:focus:ring-[#D2E875] dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  เปิดใช้งานรายการนี้
                </label>
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-[#141618] border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 rounded-full font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={!name || amount === ''}
                className="flex items-center gap-2 bg-[#D2E875] text-[#141618] px-6 py-2.5 rounded-full font-bold hover:bg-[#c2d765] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Save size={18} />
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
