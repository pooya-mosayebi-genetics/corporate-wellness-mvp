/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · لایهٔ اعتبارسنجی و نرمال‌سازی (L-05)
 *  همهٔ ورودی‌ها قبل از ذخیره/صف از اینجا رد می‌شوند.
 * ─────────────────────────────────────────────────────────────
 */

/* ── نرمال‌سازی ارقام ── */
export const toEnDigits = (v: any): string =>
  String(v ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export const toNumber = (v: any, fallback = 0): number => {
  const s = toEnDigits(v).replace(/[^\d.\-]/g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : fallback;
};

/* ── بازه‌های منطقی (واحدهای پایه) ── */
export const RANGES = {
  weightKg: { min: 2, max: 400 },
  heightCm: { min: 30, max: 260 },
  ageYears: { min: 0, max: 120 },
  bodyFatPct: { min: 1, max: 75 },
  muscleKg: { min: 1, max: 120 },
  waterL: { min: 0.5, max: 80 },
  visceral: { min: 0, max: 300 },
  bmrKcal: { min: 300, max: 6000 },
  calories: { min: 0, max: 10000 },
  ml: { min: 0, max: 10000 },
} as const;

export type RangeKey = keyof typeof RANGES;
export const inRange = (v: number, key: RangeKey): boolean =>
  v >= RANGES[key].min && v <= RANGES[key].max;
export const clampRange = (v: number, key: RangeKey): number =>
  Math.min(Math.max(v, RANGES[key].min), RANGES[key].max);

/* ── شناسه‌ها ── */
export const isValidNationalId = (v: any): boolean =>
  /^\d{10}$/.test(toEnDigits(v).replace(/\D/g, ''));
export const isValidMobile = (v: any): boolean =>
  /^(\+?98|0)?9\d{9}$/.test(toEnDigits(v).replace(/[\s\-]/g, ''));

/* ── تاریخ/زمان ── */
export const toISO = (v: any): string | null => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};
export const toDateOnly = (v: any): string | null => {
  const iso = toISO(v);
  return iso ? iso.slice(0, 10) : null;
};
export const isValidTime = (v: any): boolean => /^\d{1,2}:\d{2}$/.test(String(v || '').trim());

/* ── نتیجهٔ اعتبارسنجی ── */
export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}
const res = (errors: string[], warnings: string[]): ValidationResult => ({
  ok: errors.length === 0,
  errors,
  warnings,
});

/* ── اعتبارسنجی آنالیز بدن ── */
export function validateBodyAnalysis(r: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const w = toNumber(r?.weight);
  const h = toNumber(r?.height);
  if (!inRange(w, 'weightKg')) errors.push('weight out of range');
  if (!inRange(h, 'heightCm')) errors.push('height out of range');
  if (r?.age != null && !inRange(toNumber(r.age), 'ageYears')) warnings.push('age unusual');
  const bf = toNumber(r?.bfm);
  const sm = toNumber(r?.smm);
  const tb = toNumber(r?.tbw);
  if (bf < 0 || sm < 0 || tb < 0) errors.push('negative mass component');
  if (w > 0 && bf + sm + tb > w * 1.05) warnings.push('components exceed total weight');
  if (!toISO(r?.analyzeTime)) errors.push('invalid analyzeTime');
  if (!isValidNationalId(r?.nationalId)) warnings.push('nationalId not 10 digits');
  return res(errors, warnings);
}

/* ── اعتبارسنجی وعدهٔ غذایی ── */
export function validateMeal(m: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!m || !Array.isArray(m.items) || m.items.length === 0) errors.push('meal has no items');
  if (!toDateOnly(m?.date)) errors.push('invalid meal date');
  if (!isValidTime(m?.time)) warnings.push('invalid meal time');
  if (!inRange(toNumber(m?.calories), 'calories')) errors.push('calories out of range');
  (m?.items || []).forEach((it: any) => {
    if (toNumber(it?.qty) <= 0) warnings.push('item qty <= 0');
  });
  return res(errors, warnings);
}

/* ── اعتبارسنجی FoodLog (صف) ── */
export function validateFoodLog(l: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!l?.nationalId) errors.push('missing nationalId');
  if (toNumber(l?.amount) <= 0) warnings.push('amount <= 0');
  if (!inRange(toNumber(l?.calories), 'calories')) errors.push('calories out of range');
  if (!toISO(l?.dateISO)) errors.push('invalid dateISO');
  return res(errors, warnings);
}

/* ── اعتبارسنجی آب ── */
export function validateWater(ml: number): ValidationResult {
  const errors: string[] = [];
  if (!inRange(toNumber(ml), 'ml')) errors.push('ml out of range');
  return res(errors, []);
}