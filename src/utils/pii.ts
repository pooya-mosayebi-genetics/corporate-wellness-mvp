/** 🛡 بهداشت PII — ماسک‌سازی و پاک‌سازی خروجی‌ها */

/** کد ملی: سه رقم اول + ستاره + دو رقم آخر */
export function maskNationalId(nid: string): string {
  const s = String(nid || '').trim();
  if (!s || s === '-') return '—';
  if (s.length < 5) return '***';
  return `${s.slice(0, 3)}***${s.slice(-2)}`;
}

/** موبایل: چهار رقم اول + ستاره + چهار رقم آخر */
export function maskMobile(m: string): string {
  const s = String(m || '').trim();
  if (!s || s === '-') return '—';
  if (s.length < 8) return '***';
  return `${s.slice(0, 4)}***${s.slice(-4)}`;
}

/** تاریخ تولد: فقط سال نمایش داده می‌شود؛ ماه و روز ماسک می‌شوند */
export function maskBirth(b: string): string {
  const s = String(b || '').trim();
  if (!s || s === '-') return '—';
  const y = s.slice(0, 4);
  return y + '/**/**';
}

/** نام: نام کوچک کامل + حرف اول نام خانوادگی */
export function maskName(full: string): string {
  const s = String(full || '').trim();
  if (!s) return '—';
  const parts = s.split(/\s+/);
  if (parts.length < 2) return s;
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

/** نام خانوادگی: حرف اول + نقاط */
export function maskFamily(family: string): string {
  const s = String(family || '').trim();
  if (!s) return '—';
  return s.charAt(0) + '…';
}

export interface PersonnelLike {
  nationalId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  mobile: string;
}

/** ساخت رکورد برای خروجی؛ full=false یعنی نسخهٔ ماسک‌شده */
export function sanitizePersonnelRec(r: PersonnelLike, full: boolean): Record<string, string> {
  if (full) {
    return {
      nationalId: r.nationalId,
      name: r.firstName,
      family: r.lastName,
      birth: r.birthDate,
      gender: r.gender,
      mobile: r.mobile,
    };
  }
  return {
    nationalId: maskNationalId(r.nationalId),
    name: r.firstName,
    family: maskFamily(r.lastName),
    birth: maskBirth(r.birthDate),
    gender: r.gender,
    mobile: maskMobile(r.mobile),
  };
}