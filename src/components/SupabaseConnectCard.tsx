import React, { useState } from 'react';
import { Database, CheckCircle2, Server, Key, Copy, Check, RefreshCw } from 'lucide-react';
import { isSupabaseConfigured, saveSupabaseCredentials, getSupabaseCredentials, getSupabaseClient } from '../utils/supabaseClient';

export const SupabaseConnectCard: React.FC = () => {
  const [credentials, setCredentials] = useState(getSupabaseCredentials());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const isConnected = isSupabaseConfigured();

  const handleSave = () => {
    saveSupabaseCredentials(credentials.url, credentials.key);
    window.location.reload();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const client = getSupabaseClient();
      if (!client) {
        setTestResult({ success: false, message: 'กรุณากรอก Supabase URL และ Anon Key ให้ครบถ้วน' });
        setIsTesting(false);
        return;
      }

      // Try selecting from transactions or debts
      const { error } = await client.from('transactions').select('id').limit(1);

      if (error) {
        if (error.code === 'PGRST301' || error.message.includes('relation "public.transactions" does not exist')) {
          setTestResult({
            success: true,
            message: 'เชื่อมต่อ Supabase สำเร็จ! (แนะนำให้กดคัดลอก SQL สร้างตารางด้านล่างไปรันใน Supabase SQL Editor)',
          });
        } else {
          setTestResult({ success: false, message: `ข้อผิดพลาด: ${error.message}` });
        }
      } else {
        setTestResult({ success: true, message: 'เชื่อมต่อคลาวด์ฐานข้อมูล Supabase สำเร็จ 100%! พร้อมใช้งาน' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `ไม่สามารถเชื่อมต่อได้: ${err.message || err}` });
    } finally {
      setIsTesting(false);
    }
  };

  const sqlCode = `-- SQL สร้างตารางสำหรับ Baanmai Financial Dashboard
-- คัดลอกโค้ดนี้ไปรันใน Supabase SQL Editor

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  receipt_url TEXT,
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  creditor TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  remaining_amount NUMERIC NOT NULL,
  interest_rate NUMERIC,
  due_date DATE NOT NULL,
  quadrant TEXT NOT NULL,
  priority_reason TEXT NOT NULL,
  status TEXT NOT NULL,
  repayment_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- เปิดสิทธิ์เข้าถึง (Row Level Security Disable สำหรับ Demo)
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE debts DISABLE ROW LEVEL SECURITY;
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="triton-main-card border border-gray-100 p-6 !shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900">
          <Database className="w-5 h-5 text-[#145A38]" />
          การเชื่อมต่อคลาวด์ฐานข้อมูล Supabase (Cloud DB)
        </h3>

        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
          isConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
          {isConnected ? 'เชื่อมต่อ Supabase Cloud แล้ว' : 'ใช้งาน Local Storage (ในเครื่อง)'}
        </span>
      </div>

      <p className="text-sm text-gray-500">
        เชื่อมต่อ Supabase เพื่อซิงค์ข้อมูลรายรับ-รายจ่ายและหนี้สินแบบ Real-time ข้ามหลายอุปกรณ์ (คอมพิวเตอร์/มือถือ)
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-gray-400" />
            Supabase Project URL
          </label>
          <input
            type="text"
            placeholder="https://xyzcompany.supabase.co"
            value={credentials.url}
            onChange={(e) => setCredentials({ ...credentials, url: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-[#145A38] outline-none font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
            <Key className="w-3.5 h-3.5 text-gray-400" />
            Supabase Anon Public Key
          </label>
          <input
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={credentials.key}
            onChange={(e) => setCredentials({ ...credentials, key: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-[#145A38] outline-none font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#232729] hover:bg-black text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            บันทึกการตั้งค่า Supabase
          </button>

          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5"
          >
            {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            ทดสอบการเชื่อมต่อ
          </button>

          <button
            onClick={handleCopySql}
            className="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 ml-auto"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSql ? 'คัดลอก SQL เรียบร้อย!' : 'คัดลอก SQL สร้างตาราง DB'}
          </button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-xl text-xs font-medium ${
            testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
};
