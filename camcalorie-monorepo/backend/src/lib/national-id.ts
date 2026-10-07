/** نرمال‌سازی ارقام فارسی/عربی و حذف نویز */
export function normalizeNationalId(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\D/g, '')
    .slice(0, 10);
}

/** اعتبارسنجی کامل کد ملی با الگوریتم checksum رسمی */
export function isValidNationalId(code: string): boolean {
  if (!/^\d{10}$/.test(code)) return false;
  if (/^(\d)\1{9}$/.test(code)) return false; // همه ارقام یکسان

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(code[i], 10) * (10 - i);
  }
  const mod = sum % 11;
  const check = mod < 2 ? mod : 11 - mod;
  return check === parseInt(code[9], 10);
}

/** ماسک‌کردن برای نمایش امن: 001***72 */
export function maskNationalId(id: string): string {
  if (id.length < 6) return '***';
  return `${id.slice(0, 3)}***${id.slice(-2)}`;
}