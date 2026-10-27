import { createClient } from '@supabase/supabase-js';
import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';

// ระบบสมาชิก LINE + บัตรกำนัล (ดู supabase/migrations/20261027_line_members_vouchers.sql)
// env ที่ต้องตั้งใน Vercel:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (service role ใช้ฝั่ง server เท่านั้น)
//   LINE_LOGIN_CHANNEL_ID                     (ช่อง LINE Login ที่มี LIFF)
//   LINE_CHANNEL_ACCESS_TOKEN                 (Messaging API ของ LINE OA ใช้ส่งแจ้งเตือน)
//   QR_SECRET                                 (สตริงสุ่มยาว ๆ ใช้เซ็น QR และ hash PIN)

const env = (k: string) => process.env[k] || '';
const db = () => createClient(env('SUPABASE_URL') || env('VITE_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

const QR_WINDOW_SEC = 60;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function verifyIdToken(idToken: string): Promise<{ userId: string; name: string }> {
  if (!idToken) throw new HttpError(401, 'NO_ID_TOKEN');
  const r = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: env('LINE_LOGIN_CHANNEL_ID') }),
  });
  if (!r.ok) throw new HttpError(401, 'INVALID_ID_TOKEN');
  const p = await r.json();
  return { userId: p.sub, name: p.name || '' };
}

const sign = (data: string) => createHmac('sha256', env('QR_SECRET')).update(data).digest('base64url').slice(0, 22);
const pinHash = (pin: string) => createHash('sha256').update(`${env('QR_SECRET')}:${pin}`).digest('hex');

// QR สมาชิกเปลี่ยนทุก 60 วินาที แคปหน้าจอส่งต่อแล้วใช้ไม่ได้
function makeQr(memberId: string) {
  const w = Math.floor(Date.now() / 1000 / QR_WINDOW_SEC);
  return { qr: `BM1.${memberId}.${w}.${sign(`${memberId}.${w}`)}`, expiresInSec: (w + 1) * QR_WINDOW_SEC - Date.now() / 1000 };
}

function readQr(qr: string): string {
  const [ver, memberId, w, sig] = String(qr || '').split('.');
  if (ver !== 'BM1' || !memberId || !sig) throw new HttpError(400, 'BAD_QR');
  const now = Math.floor(Date.now() / 1000 / QR_WINDOW_SEC);
  if (Number(w) < now - 1 || Number(w) > now) throw new HttpError(400, 'QR_EXPIRED');
  const a = Buffer.from(sig), b = Buffer.from(sign(`${memberId}.${w}`));
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(400, 'BAD_QR');
  return memberId;
}

async function pushLine(to: string, text: string) {
  if (!env('LINE_CHANNEL_ACCESS_TOKEN')) return;
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env('LINE_CHANNEL_ACCESS_TOKEN')}` },
    body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
  }).catch(() => undefined);
}

async function getOrCreateMember(userId: string, name: string) {
  const sb = db();
  const { data } = await sb.from('line_members').select('*').eq('line_user_id', userId).maybeSingle();
  if (data) return data;
  const { data: created, error } = await sb.from('line_members').insert({ line_user_id: userId, display_name: name }).select().single();
  if (error) throw new HttpError(500, error.message);
  return created;
}

async function memberView(member: any) {
  const sb = db();
  const { data: vouchers } = await sb.from('gift_vouchers')
    .select('id, code, rights_total, rights_used, right_value, expires_on').eq('member_id', member.id).order('created_at');
  const { data: uses } = await sb.from('gift_voucher_uses')
    .select('voucher_id, rights, amount, bill_amount, created_at').eq('member_id', member.id).order('created_at', { ascending: false }).limit(20);
  return {
    member: { id: member.id, displayName: member.display_name, fullName: member.full_name, phone: member.phone },
    vouchers: vouchers || [],
    uses: uses || [],
  };
}

// พนักงาน: ครั้งแรกใส่ PIN เพื่อผูก LINE กับชื่อพนักงาน ครั้งต่อไปต้องใช้ทั้ง LINE เดิมและ PIN
async function requireStaff(userId: string, pin: string) {
  const sb = db();
  const hash = pinHash(String(pin || ''));
  const { data: staff } = await sb.from('line_staff').select('*').eq('pin_hash', hash).eq('active', true).maybeSingle();
  if (!staff) throw new HttpError(403, 'BAD_PIN');
  if (!staff.line_user_id) {
    await sb.from('line_staff').update({ line_user_id: userId }).eq('id', staff.id);
  } else if (staff.line_user_id !== userId) {
    throw new HttpError(403, 'STAFF_LINE_MISMATCH');
  }
  return staff;
}

const actions: Record<string, (body: any, user: { userId: string; name: string }) => Promise<any>> = {
  async 'member.me'(_b, user) {
    const member = await getOrCreateMember(user.userId, user.name);
    return { ...(await memberView(member)), ...makeQr(member.id) };
  },

  async 'member.profile'(b, user) {
    const member = await getOrCreateMember(user.userId, user.name);
    await db().from('line_members').update({ full_name: String(b.fullName || '').slice(0, 80), phone: String(b.phone || '').slice(0, 20) }).eq('id', member.id);
    return { ok: true };
  },

  async 'member.claim'(b, user) {
    const member = await getOrCreateMember(user.userId, user.name);
    const sb = db();
    const code = String(b.code || '').trim().toUpperCase();
    const { data: v } = await sb.from('gift_vouchers').select('*').eq('code', code).maybeSingle();
    if (!v || v.claim_code !== String(b.claimCode || '').trim()) throw new HttpError(400, 'VOUCHER_CODE_WRONG');
    if (v.member_id && v.member_id !== member.id) throw new HttpError(400, 'VOUCHER_ALREADY_CLAIMED');
    await sb.from('gift_vouchers').update({ member_id: member.id }).eq('id', v.id).is('member_id', null);
    return memberView(member);
  },

  async 'staff.lookup'(b, user) {
    await requireStaff(user.userId, b.pin);
    const memberId = readQr(b.qr);
    const { data: member } = await db().from('line_members').select('*').eq('id', memberId).maybeSingle();
    if (!member) throw new HttpError(404, 'MEMBER_NOT_FOUND');
    return memberView(member);
  },

  async 'staff.redeem'(b, user) {
    const staff = await requireStaff(user.userId, b.pin);
    const memberId = readQr(b.qr);
    const sb = db();
    const { data: v, error } = await sb.rpc('redeem_gift_voucher', {
      p_voucher: b.voucherId, p_member: memberId, p_staff: staff.id,
      p_rights: Number(b.rights), p_bill: Number(b.billAmount), p_pos: String(b.posBillNo || '').slice(0, 40),
    });
    if (error) throw new HttpError(400, error.message.match(/[A-Z_]{6,}/)?.[0] || error.message);
    const { data: member } = await sb.from('line_members').select('line_user_id').eq('id', memberId).single();
    const left = (v.rights_total - v.rights_used) * v.right_value;
    await pushLine(member!.line_user_id,
      `ใช้บัตรกำนัล ${v.code} แล้ว ${Number(b.rights) * v.right_value} บาท\nคงเหลือ ${left} บาท (ใช้ได้ถึง 31 ธ.ค. 2569)\nขอบคุณที่แวะมาค่ะ ณ บ้านใหม่ ไออุ่น`);
    return { voucher: v, left };
  },

  async 'staff.issue'(b, user) {
    const staff = await requireStaff(user.userId, b.pin);
    const sb = db();
    const { count } = await sb.from('gift_vouchers').select('id', { count: 'exact', head: true });
    const code = `GV-${String((count || 0) + 1).padStart(3, '0')}`;
    const claimCode = String(randomInt(0, 10000)).padStart(4, '0');
    const { data, error } = await sb.from('gift_vouchers')
      .insert({ code, claim_code: claimCode, issued_by: staff.id, note: String(b.note || '').slice(0, 120) }).select().single();
    if (error) throw new HttpError(500, error.message);
    return { code: data.code, claimCode: data.claim_code };
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const fn = actions[body.action];
    if (!fn) throw new HttpError(400, 'UNKNOWN_ACTION');
    const user = await verifyIdToken(body.idToken);
    return res.status(200).json(await fn(body, user));
  } catch (e: any) {
    return res.status(e instanceof HttpError ? e.status : 500).json({ error: e.message || 'ERROR' });
  }
}
