const FA = '۰۱۲۳۴۵۶۷۸۹';

/** تبدیل ارقام لاتین به فارسی */
export const toFaDigits = (v: string | number): string =>
  String(v).replace(/\d/g, (d) => FA[+d]);

/**
 * عدد/متن → فارسیِ خوانا:
 * - رشته‌های ۴ رقمی+ جداکنندهٔ هزارگان می‌گیرند (۱٬۷۴۳)
 * - علامت % به ٪ تبدیل می‌شود
 * - بقیه ارقام ساده تبدیل می‌شوند
 */
export const faNum = (v: string | number, isFa: boolean): string => {
  if (!isFa) return String(v);
  return String(v)
    .replace(/\d+/g, (m) => (m.length >= 4 ? toFaDigits(Number(m).toLocaleString('en-US')) : toFaDigits(m)))
    .replace(/%/g, '٪');
};

/** عدد صحیح با جداکنندهٔ هزارگان */
export const faInt = (v: number, isFa: boolean): string =>
  isFa ? toFaDigits(Math.round(v).toLocaleString('en-US')) : String(Math.round(v));

/** عدد اعشاری */
export const faDec = (v: number, isFa: boolean, dec = 1): string =>
  isFa ? toFaDigits(v.toFixed(dec)) : v.toFixed(dec);

/** بازهٔ تاریخ فارسی مثل «۱۶ شهریور – ۲۱ شهریور» */
export const faDateRange = (a: Date, b: Date): string =>
  `${a.toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' })} – ${b.toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' })}`;
/**
 * ژرفا (ZDL): تبدیل رقم‌به‌رقم به اعداد فارسی بدون جداکنندهٔ هزارگان.
 * برای کد ملی، موبایل و هر شناسه‌ای که نباید گروه‌بندی شود.
 */
export function faDigits(value: string | number, useFa = true): string {
  const s = String(value ?? '');
  if (!useFa) return s;
  return s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}