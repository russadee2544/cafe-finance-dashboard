import { useCallback, useEffect, useState } from "react";
import liff from "@line/liff";
import QRCode from "qrcode";

// หน้า LIFF ของระบบสมาชิก: /member (ลูกค้า) และ /staff (พนักงานสแกนตัดยอด)
// ต้องตั้ง VITE_LIFF_ID_MEMBER และ VITE_LIFF_ID_STAFF ใน Vercel

const OLIVE = "#4d5536";
const BROWN = "#67462b";
const CREAM = "#efd6a6";

type Voucher = { id: string; code: string; rights_total: number; rights_used: number; right_value: number; expires_on: string };
type MemberView = {
  member: { id: string; displayName: string; fullName?: string; phone?: string };
  vouchers: Voucher[];
  uses: { voucher_id: string; rights: number; amount: number; bill_amount: number; created_at: string }[];
};

const ERRORS: Record<string, string> = {
  BAD_PIN: "PIN ไม่ถูกต้อง",
  STAFF_LINE_MISMATCH: "PIN นี้ผูกกับ LINE ของพนักงานคนอื่นแล้ว",
  BAD_QR: "QR ไม่ถูกต้อง",
  QR_EXPIRED: "QR หมดเวลา ให้ลูกค้ากดรีเฟรชแล้วสแกนใหม่",
  VOUCHER_CODE_WRONG: "เลขบัตรหรือรหัส 4 หลักไม่ถูกต้อง",
  VOUCHER_ALREADY_CLAIMED: "บัตรนี้ถูกผูกกับสมาชิกคนอื่นแล้ว",
  VOUCHER_EXPIRED: "บัตรหมดอายุแล้ว",
  NOT_ENOUGH_RIGHTS: "สิทธิ์ในบัตรไม่พอ",
  BILL_TOO_SMALL: "ยอดบิลต้องถึง 500 บาทต่อ 1 สิทธิ์",
};

async function call<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch("/api/line", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, idToken: liff.getIDToken(), ...body }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(ERRORS[j.error] || j.error || "เกิดข้อผิดพลาด");
  return j as T;
}

const left = (v: Voucher) => (v.rights_total - v.rights_used) * v.right_value;
const thaiDate = (d: string) => new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f7efe0", color: "#2e3021", fontFamily: "Prompt, sans-serif" }}>
      <header style={{ background: OLIVE, color: CREAM, padding: "16px 16px 14px" }}>
        <div style={{ fontSize: 13, opacity: 0.8 }}>ณ บ้านใหม่ ไออุ่น · คาเฟ่ฮาลาลในสวน</div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>{title}</div>
      </header>
      <main style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>{children}</main>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,.08)" };
const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d8cdb8", fontSize: 16, marginBottom: 8, boxSizing: "border-box" };
const btn = (bg = OLIVE): React.CSSProperties => ({ width: "100%", padding: "12px", borderRadius: 10, border: 0, background: bg, color: "#fff", fontSize: 16, fontWeight: 600, fontFamily: "inherit" });

function VoucherCard({ v, children }: { v: Voucher; children?: React.ReactNode }) {
  const expired = new Date(v.expires_on + "T23:59:59+07:00") < new Date();
  return (
    <div style={{ ...card, background: OLIVE, color: CREAM }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span>บัตรกำนัล {v.code}</span>
        <span>{expired ? "หมดอายุ" : `ใช้ได้ถึง ${thaiDate(v.expires_on)}`}</span>
      </div>
      <div style={{ fontSize: 34, fontWeight: 600, margin: "6px 0" }}>{left(v).toLocaleString()} บาท</div>
      <div style={{ fontSize: 13 }}>เหลือ {v.rights_total - v.rights_used} จาก {v.rights_total} สิทธิ์ · สิทธิ์ละ {v.right_value} บาท</div>
      {children}
    </div>
  );
}

function MemberPage() {
  const [data, setData] = useState<(MemberView & { qr: string; expiresInSec: number }) | null>(null);
  const [qrImg, setQrImg] = useState("");
  const [err, setErr] = useState("");
  const [code, setCode] = useState("");
  const [claimCode, setClaimCode] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await call<MemberView & { qr: string; expiresInSec: number }>("member.me");
      setData(d);
      setQrImg(await QRCode.toDataURL(d.qr, { width: 260, margin: 1, color: { dark: "#2e3021", light: "#ffffff" } }));
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 50_000); // QR เปลี่ยนทุก 60 วินาที
    return () => clearInterval(t);
  }, [load]);

  const claim = async () => {
    try {
      await call("member.claim", { code, claimCode });
      setCode("");
      setClaimCode("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <Shell title="บัตรของฉัน">
      {err && <div style={{ ...card, color: "#b3261e" }}>{err}</div>}
      {data && (
        <>
          <div style={{ ...card, textAlign: "center" }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>สวัสดีค่ะ คุณ{data.member.displayName}</div>
            {qrImg && <img src={qrImg} alt="QR สมาชิก" style={{ width: 220, height: 220 }} />}
            <div style={{ fontSize: 13, color: BROWN }}>ให้พนักงานสแกนตอนชำระเงิน · QR เปลี่ยนทุก 1 นาที</div>
          </div>
          {data.vouchers.map((v) => <VoucherCard key={v.id} v={v} />)}
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>เพิ่มบัตรกำนัล</div>
            <input style={input} placeholder="เลขบัตร เช่น GV-001" value={code} onChange={(e) => setCode(e.target.value)} />
            <input style={input} placeholder="รหัส 4 หลักบนบัตร" inputMode="numeric" value={claimCode} onChange={(e) => setClaimCode(e.target.value)} />
            <button style={btn()} onClick={claim}>ผูกบัตรกับ LINE ของฉัน</button>
          </div>
          {data.uses.length > 0 && (
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>ประวัติการใช้</div>
              {data.uses.map((u, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "4px 0" }}>
                  <span>{thaiDate(u.created_at)}</span>
                  <span>ใช้ {u.amount} บาท (บิล {u.bill_amount})</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function StaffPage() {
  const [pin, setPin] = useState(() => sessionStorage.getItem("bm_staff_pin") || "");
  const [qr, setQr] = useState("");
  const [view, setView] = useState<MemberView | null>(null);
  const [bill, setBill] = useState("");
  const [posNo, setPosNo] = useState("");
  const [msg, setMsg] = useState("");
  const [issueNote, setIssueNote] = useState("");

  const run = async (fn: () => Promise<void>) => {
    try {
      setMsg("");
      sessionStorage.setItem("bm_staff_pin", pin);
      await fn();
    } catch (e) {
      setMsg("❌ " + (e as Error).message);
    }
  };

  const scan = () => run(async () => {
    const r = await liff.scanCodeV2();
    if (!r.value) return;
    setQr(r.value);
    setView(await call<MemberView>("staff.lookup", { pin, qr: r.value }));
  });

  const redeem = (v: Voucher, rights: number) => run(async () => {
    const r = await call<{ left: number }>("staff.redeem", { pin, qr, voucherId: v.id, rights, billAmount: Number(bill), posBillNo: posNo });
    setMsg(`✅ ตัด ${rights * v.right_value} บาทแล้ว บัตรเหลือ ${r.left} บาท ลูกค้าได้ข้อความใน LINE แล้ว`);
    setView(await call<MemberView>("staff.lookup", { pin, qr }));
    setBill("");
    setPosNo("");
  });

  const issue = () => run(async () => {
    const r = await call<{ code: string; claimCode: string }>("staff.issue", { pin, note: issueNote });
    setMsg(`✅ ออกบัตรใหม่ เขียนบนบัตร: เลขบัตร ${r.code} · รหัส ${r.claimCode}`);
    setIssueNote("");
  });

  const billNum = Number(bill) || 0;
  return (
    <Shell title="พนักงาน · สแกนบัตรสมาชิก">
      <div style={card}>
        <input style={input} type="password" inputMode="numeric" placeholder="PIN พนักงาน" value={pin} onChange={(e) => setPin(e.target.value)} />
        <button style={btn()} onClick={scan}>สแกน QR ลูกค้า</button>
      </div>
      {msg && <div style={card}>{msg}</div>}
      {view && (
        <>
          <div style={card}>
            <div style={{ fontWeight: 600 }}>{view.member.fullName || view.member.displayName}</div>
            <div style={{ fontSize: 13, color: BROWN }}>{view.member.phone || "ยังไม่ได้กรอกเบอร์"}</div>
            <input style={{ ...input, marginTop: 10 }} inputMode="decimal" placeholder="ยอดบิลใน GPOS (บาท)" value={bill} onChange={(e) => setBill(e.target.value)} />
            <input style={input} placeholder="เลขบิล GPOS" value={posNo} onChange={(e) => setPosNo(e.target.value)} />
          </div>
          {view.vouchers.length === 0 && <div style={card}>สมาชิกนี้ยังไม่มีบัตรกำนัล</div>}
          {view.vouchers.map((v) => {
            const r = v.rights_total - v.rights_used;
            return (
              <VoucherCard key={v.id} v={v}>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {[1, 2].filter((n) => n <= r).map((n) => (
                    <button key={n} style={{ ...btn(BROWN), opacity: billNum >= n * v.right_value ? 1 : 0.4 }}
                      disabled={billNum < n * v.right_value} onClick={() => redeem(v, n)}>
                      ใช้ {n} สิทธิ์ ({n * v.right_value})
                    </button>
                  ))}
                </div>
              </VoucherCard>
            );
          })}
        </>
      )}
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>ออกบัตรใหม่ (ตอนขายบัตร 799)</div>
        <input style={input} placeholder="หมายเหตุ เช่น ชื่อผู้ซื้อ / ขายโดยหุ้นส่วน" value={issueNote} onChange={(e) => setIssueNote(e.target.value)} />
        <button style={btn(BROWN)} onClick={issue}>สร้างเลขบัตร + รหัส 4 หลัก</button>
      </div>
    </Shell>
  );
}

export default function LineApp({ mode }: { mode: "member" | "staff" }) {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const liffId = mode === "member" ? import.meta.env.VITE_LIFF_ID_MEMBER : import.meta.env.VITE_LIFF_ID_STAFF;
    if (!liffId) {
      setErr("ยังไม่ได้ตั้งค่า LIFF ID");
      return;
    }
    liff.init({ liffId })
      .then(() => {
        if (!liff.isLoggedIn()) liff.login();
        else setReady(true);
      })
      .catch((e) => setErr(String(e)));
  }, [mode]);

  if (err) return <Shell title="เปิดไม่ได้"><div style={card}>{err}</div></Shell>;
  if (!ready) return <Shell title="กำลังโหลด…"><div /></Shell>;
  return mode === "member" ? <MemberPage /> : <StaffPage />;
}
