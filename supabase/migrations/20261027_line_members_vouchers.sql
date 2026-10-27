-- ระบบสมาชิก LINE + บัตรกำนัล (บัตร 1,000 = 2 สิทธิ์ สิทธิ์ละ 500)
-- ทุกตารางเปิด RLS และไม่มี policy ให้ anon: เข้าถึงได้ผ่าน api/line.ts (service role) เท่านั้น

create table if not exists line_members (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique not null,
  display_name text,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists line_staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  line_user_id text unique,           -- ผูกตอนพนักงานเข้าหน้า /staff ครั้งแรกด้วย PIN
  pin_hash text not null,             -- sha256(QR_SECRET + ':' + pin)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists gift_vouchers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- เลขบนบัตร เช่น GV-001
  claim_code text not null,           -- รหัส 4 หลักที่เขียนบนบัตร ใช้ตอนลูกค้าผูกบัตร
  member_id uuid references line_members(id),
  rights_total int not null default 2,
  rights_used int not null default 0,
  right_value numeric not null default 500,
  sold_price numeric not null default 799,
  expires_on date not null default '2026-12-31',
  issued_by uuid references line_staff(id),
  note text,
  created_at timestamptz not null default now(),
  constraint rights_ok check (rights_used between 0 and rights_total)
);

create table if not exists gift_voucher_uses (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references gift_vouchers(id),
  member_id uuid not null references line_members(id),
  staff_id uuid not null references line_staff(id),
  rights int not null check (rights in (1, 2)),
  amount numeric not null,            -- ยอดที่ตัดจากบัตร = rights * right_value
  bill_amount numeric not null,       -- ยอดบิลจริงใน GPOS
  pos_bill_no text,
  created_at timestamptz not null default now()
);

alter table line_members enable row level security;
alter table line_staff enable row level security;
alter table gift_vouchers enable row level security;
alter table gift_voucher_uses enable row level security;

-- ตัดสิทธิ์แบบล็อกแถว กันสแกนซ้ำพร้อมกัน
create or replace function redeem_gift_voucher(
  p_voucher uuid, p_member uuid, p_staff uuid, p_rights int, p_bill numeric, p_pos text
) returns gift_vouchers language plpgsql security definer set search_path = public as $$
declare v gift_vouchers;
begin
  select * into v from gift_vouchers where id = p_voucher for update;
  if not found or v.member_id is distinct from p_member then raise exception 'VOUCHER_NOT_FOUND'; end if;
  if v.expires_on < (now() at time zone 'Asia/Bangkok')::date then raise exception 'VOUCHER_EXPIRED'; end if;
  if p_rights not in (1, 2) or v.rights_used + p_rights > v.rights_total then raise exception 'NOT_ENOUGH_RIGHTS'; end if;
  if p_bill < p_rights * v.right_value then raise exception 'BILL_TOO_SMALL'; end if;

  update gift_vouchers set rights_used = rights_used + p_rights where id = p_voucher returning * into v;
  insert into gift_voucher_uses (voucher_id, member_id, staff_id, rights, amount, bill_amount, pos_bill_no)
  values (p_voucher, p_member, p_staff, p_rights, p_rights * v.right_value, p_bill, p_pos);
  return v;
end $$;

revoke all on function redeem_gift_voucher from public, anon, authenticated;
