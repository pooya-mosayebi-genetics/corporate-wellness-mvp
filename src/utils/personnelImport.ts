/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · نگاشت ایمپورت پرسنل (M-03a) + تنها پارسر Excel/CSV
 *  - ستون org اختیاری: خالی → بانک سامان؛ مقدار جدید → سازمان خودکار.
 *  - ردیف‌های با کد ملی نامعتبر skip می‌شوند (با دلیل).
 *  - parsePersonnelFile: مقاوم به سطر عنوان، هدر تکراری، چند شیت،
 *    و سلول‌های عددی با صفر اولِ پریده.
 * ─────────────────────────────────────────────────────────────
 */
import type { Organization, Person, Gender } from '../data/schema';
import { toEnDigits, isValidNationalId } from './validate';
import { DEFAULT_ORG } from './org';
import * as XLSX from 'xlsx';

export interface RawPersonnelRow {
  nationalId: string;
  fullName: string;
  fullNamePrefixed?: string;
  gender?: string;
  birthDate?: string;
  mobile?: string;
  role?: string;
  org?: string;
}

const normGender = (g?: string): Gender | undefined => {
  const s = String(g || '').trim().toLowerCase();
  if (!s) return undefined;
  if (['male', 'man', 'مرد', 'پسر', 'آقا'].includes(s)) return 'Man';
  if (['female', 'woman', 'زن', 'دختر', 'خانم'].includes(s)) return 'Woman';
  return undefined;
};
const normRole = (r?: string): Person['role'] | undefined => {
  const s = String(r || '').trim().toLowerCase();
  if (!s) return undefined;
  if (['admin', 'ادمین'].includes(s)) return 'admin';
  if (['coach', 'کوچ', 'مربی'].includes(s)) return 'coach';
  if (['hr', 'منابع', 'منابع انسانی'].includes(s)) return 'hr';
  if (['user', 'کاربر', 'کارمند'].includes(s)) return 'user';
  return undefined;
};
const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'org';

/** پیدا کردن سازمان بر اساس id/code/name/nameFa */
export function findOrg(orgs: Organization[], key?: string): Organization | undefined {
  if (!key || !String(key).trim()) return undefined;
  const k = String(key).trim().toLowerCase();
  return orgs.find(
    (o) =>
      o.id.toLowerCase() === k ||
      (o.code || '').toLowerCase() === k ||
      o.name.toLowerCase() === k ||
      (o.nameFa || '').toLowerCase() === k,
  );
}

/** ساخت خودکار سازمان جدید در صورت عدم وجود */
export function ensureOrg(
  orgs: Organization[],
  nameOrId?: string,
): { orgs: Organization[]; org: Organization; created: boolean } {
  if (!nameOrId || !String(nameOrId).trim()) return { orgs, org: DEFAULT_ORG, created: false };
  const existing = findOrg(orgs, nameOrId);
  if (existing) return { orgs, org: existing, created: false };
  const name = String(nameOrId).trim();
  const org: Organization = {
    id: `org-${slug(name)}-${Date.now().toString(36)}`,
    name,
    nameFa: name,
    code: slug(name).slice(0, 8).toUpperCase(),
    active: true,
    createdAt: new Date().toISOString(),
  };
  return { orgs: [...orgs, org], org, created: true };
}

export interface PersonnelImportResult {
  persons: Person[];
  orgs: Organization[];
  createdOrgNames: string[];
  skipped: { row: RawPersonnelRow; reason: string }[];
}

/** نگاشت ردیف‌های خام پرسنل → Person + Organization (با ادغام با دادهٔ فعلی) */
export function importPersonnelRows(
  rows: RawPersonnelRow[],
  existingOrgs: Organization[],
  existingPersons: Person[],
): PersonnelImportResult {
  let orgs = [...existingOrgs];
  const createdOrgNames: string[] = [];
  const skipped: PersonnelImportResult['skipped'] = [];
  const personMap = new Map(existingPersons.map((p) => [p.nationalId, p]));

  for (const row of rows) {
    const nid = toEnDigits(row.nationalId).replace(/\D/g, '');
    if (!isValidNationalId(nid)) {
      skipped.push({ row, reason: 'invalid nationalId' });
      continue;
    }

    let org = findOrg(orgs, row.org);
    if (!org) {
      if (row.org && String(row.org).trim()) {
        const r = ensureOrg(orgs, row.org);
        orgs = r.orgs;
        org = r.org;
        createdOrgNames.push(r.org.name);
      } else {
        org = DEFAULT_ORG;
      }
    }

    const prev = personMap.get(nid);
    const person: Person = {
      nationalId: nid,
      fullName: String(row.fullName || '').trim() || prev?.fullName || '',
      fullNamePrefixed: row.fullNamePrefixed || prev?.fullNamePrefixed,
      gender: normGender(row.gender) || prev?.gender || 'Man',
      birthDate: row.birthDate || prev?.birthDate,
      age: prev?.age,
      mobile: toEnDigits(row.mobile || '').replace(/[\s\-]/g, '') || prev?.mobile,
      role: normRole(row.role) || prev?.role || 'user',
      orgId: org.id,
      createdAt: prev?.createdAt || new Date().toISOString(),
    };
    personMap.set(nid, person);
  }

  return { persons: Array.from(personMap.values()), orgs, createdOrgNames, skipped };
}

/* ─────────────────────────────────────────────────────────────
   پارسر Excel/CSV — تنها نسخهٔ معتبر در کل سیستم
   ───────────────────────────────────────────────────────────── */

const HEADER_KEYS: Record<string, string[]> = {
  nationalId: ['کد ملي', 'کد ملی', 'کدملی', 'nationalid', 'national_id', 'nid'],
  firstName: ['نام', 'first name', 'firstname'],
  lastName: ['نام خانوادگي', 'نام خانوادگی', 'last name', 'lastname', 'فامیل'],
  fullName: ['نام و نام خانوادگی', 'نام و نام خانوادگي', 'fullname', 'full name'],
  prefixed: [
    'نام و نام خانوادگی با پیشوند',
    'نام و نام خانوادگي با پيشوند',
    'fullnameprefixed',
    'prefixed',
  ],
  mobile: ['شماره موبايل', 'شماره موبایل', 'شماره همراه', 'mobile', 'phone'],
  birthDate: ['تاريخ تولد', 'تاریخ تولد', 'birthdate', 'birth'],
  gender: ['جنسيت', 'جنسیت', 'gender'],
  role: ['نقش', 'سمت', 'role'],
  org: ['سازمان', 'شرکت', 'org', 'organization'],
};

const normHeader = (v: any): string =>
  String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const cell = (cols: any[], i: number): string =>
  i < 0 || !cols || cols[i] == null ? '' : String(cols[i]);

/** پیدا کردن ردیف هدر در ۲۵ ردیف اول (سطر عنوان را رد می‌کند) */
function detectHeader(rows: any[][]): { index: number; map: Record<string, number> } | null {
  const scan = Math.min(rows.length, 25);
  for (let i = 0; i < scan; i++) {
    const cols = (rows[i] || []).map(normHeader);
    const nationalId = cols.findIndex((c) => HEADER_KEYS.nationalId.includes(c));
    if (nationalId === -1) continue;
    const map: Record<string, number> = { nationalId };
    for (const key of Object.keys(HEADER_KEYS)) {
      if (key === 'nationalId') continue;
      map[key] = cols.findIndex((c) => HEADER_KEYS[key].includes(c));
    }
    return { index: i, map };
  }
  return null;
}

/**
 * پارس فایل Excel/CSV پرسنل و تبدیل به RawPersonnelRow[].
 * همه شیت‌های پرسنلی جمع می‌شوند؛ شیت‌های غیرپرسنلی (کد پرسنلي/شعب/…) نادیده.
 */
export async function parsePersonnelFile(blob: Blob): Promise<RawPersonnelRow[]> {
  // ⚠️ SheetJS با Uint8Array و نام‌های SheetNames/Sheets (حرف بزرگ) کار می‌کند
  const data = new Uint8Array(await blob.arrayBuffer());
  const workbook = XLSX.read(data, { type: 'array' });

  const out: RawPersonnelRow[] = [];
  const seen = new Set<string>();

  for (const sheetName of workbook.SheetNames ?? []) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows || rows.length < 2) continue;

    const header = detectHeader(rows);
    if (!header) continue; // شیت پرسنلی نیست (کد پرسنلي / شعب / …)
    const m = header.map;
    // شیت اصلی پرسنل باید دست‌کم موبایل یا تاریخ تولد داشته باشد
    if (m.mobile < 0 && m.birthDate < 0) continue;

    for (let i = header.index + 1; i < rows.length; i++) {
      const cols = rows[i];
      if (!cols) continue;

      // 🆕 skip صریح ردیف‌های هدر تکراری وسط شیت
      const nidHeader = normHeader(cell(cols, m.nationalId));
      if (HEADER_KEYS.nationalId.includes(nidHeader)) continue;

      // کد ملی: جبران صفر اولِ پریده + رد کردن '-' و ارقام نامعتبر
      const rawNid = toEnDigits(cell(cols, m.nationalId)).replace(/\D/g, '');
      if (!rawNid || rawNid.length > 10) continue;
      const nid = rawNid.padStart(10, '0');
      if (/^(\d)\1{9}$/.test(nid)) continue; // همه ارقام یکسان = نامعتبر
      if (seen.has(nid)) continue;

      // نام: ستون «نام و نام خانوادگی» یا چسباندن نام + نام خانوادگی
      const fullName =
        cell(cols, m.fullName).trim() ||
        [cell(cols, m.firstName).trim(), cell(cols, m.lastName).trim()]
          .filter(Boolean)
          .join(' ');
      if (!fullName) continue;

      // موبایل: جبران صفر اولِ پریده در سلول عددی
      let mobile = toEnDigits(cell(cols, m.mobile)).replace(/[\s\-]/g, '');
      if (/^9\d{9}$/.test(mobile)) mobile = '0' + mobile;

      seen.add(nid);
      out.push({
        nationalId: nid,
        fullName,
        fullNamePrefixed: cell(cols, m.prefixed).trim() || undefined,
        mobile: mobile || undefined,
        birthDate: cell(cols, m.birthDate).trim() || undefined,
        gender: cell(cols, m.gender).trim() || undefined,
        role: cell(cols, m.role).trim() || undefined,
        org: cell(cols, m.org).trim() || undefined,
      });
    }
    // ⚠️ بدون break: همه شیت‌های پرسنلی جمع می‌شوند (seen جلوی تکرار را می‌گیرد)
  }

  return out;
}