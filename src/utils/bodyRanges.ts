/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · محدوده‌های شخصی هر متریک (بر اساس Upper/Lower دستگاه)
 *  منبع محدوده: device = ستون‌های CSV دستگاه · derived = محاسبه از قد
 *  standard = استاندارد جهانی (BMI / VFA)
 * ─────────────────────────────────────────────────────────────
 */

export interface MetricRange {
  key: string;
  labelFa: string;
  labelEn: string;
  unit: string;
  decimals: number;
  value: number;
  lower: number;
  upper: number;
  zeroBased?: boolean;
  source: 'device' | 'standard' | 'derived';
}

function num(rec: any, keys: string[]): number | undefined {
  if (!rec) return undefined;
  for (const k of keys) {
    const v = rec[k];
    if (v === null || v === undefined || v === '') continue;
    const x = typeof v === 'number' ? v : parseFloat(String(v));
    if (Number.isFinite(x)) return x;
  }
  return undefined;
}
function posNum(rec: any, keys: string[]): number | undefined {
  const x = num(rec, keys);
  return x !== undefined && x > 0 ? x : undefined;
}

export function statusOf(value: number, lower: number, upper: number): 'low' | 'normal' | 'high' {
  if (value < lower) return 'low';
  if (value > upper) return 'high';
  return 'normal';
}

export function computeMetricRanges(rec: any): MetricRange[] {
  const out: MetricRange[] = [];
  if (!rec) return out;

  const weight = posNum(rec, ['weight']);
  const height = posNum(rec, ['height']);
  const hM = height ? height / 100 : undefined;
  const genderRaw = String(rec?.gender ?? '').toLowerCase();
  const isFemale = genderRaw.includes('female') || genderRaw.includes('woman');

  // وزن و BMI (محدودهٔ شخصی از قد)
  if (weight && hM) {
    out.push({
      key: 'weight', labelFa: 'وزن', labelEn: 'Weight', unit: 'kg', decimals: 1,
      value: weight,
      lower: +(18.5 * hM * hM).toFixed(1),
      upper: +(25 * hM * hM).toFixed(1),
      source: 'derived',
    });
    out.push({
      key: 'bmi', labelFa: 'شاخص تودهٔ بدنی', labelEn: 'BMI', unit: 'kg/m²', decimals: 1,
      value: +(weight / (hM * hM)).toFixed(1),
      lower: 18.5, upper: 25,
      source: 'standard',
    });
  }

  // تودهٔ عضلانی اسکلتی (SMM) — مستقیم از ستون‌های دستگاه
  const smm = num(rec, ['smm', 'skeletalMuscleMass']);
  const smmL = num(rec, ['smmLower', 'smmLowerLimit', 'smmLow']);
  const smmU = num(rec, ['smmUpper', 'smmUpperLimit', 'smmHigh']);
  if (smm !== undefined && smmL !== undefined && smmU !== undefined && smmU > smmL) {
    out.push({ key: 'smm', labelFa: 'تودهٔ عضلانی اسکلتی', labelEn: 'SMM', unit: 'kg', decimals: 1, value: smm, lower: smmL, upper: smmU, source: 'device' });
  }

  // درصد چربی بدن — از BFM و limits آن نسبت به وزن
  const bfm = num(rec, ['bfm', 'bodyFatMass']);
  if (bfm !== undefined && weight) {
    const pbf = +((bfm / weight) * 100).toFixed(1);
    const bL = num(rec, ['bfmLower', 'bfmLowerLimit']);
    const bU = num(rec, ['bfmUpper', 'bfmUpperLimit']);
    if (bL !== undefined && bU !== undefined && bU > bL) {
      out.push({ key: 'pbf', labelFa: 'درصد چربی بدن', labelEn: 'Body fat', unit: '%', decimals: 1, value: pbf, lower: +((bL / weight) * 100).toFixed(1), upper: +((bU / weight) * 100).toFixed(1), source: 'device' });
    } else {
      out.push({ key: 'pbf', labelFa: 'درصد چربی بدن', labelEn: 'Body fat', unit: '%', decimals: 1, value: pbf, lower: isFemale ? 18 : 10, upper: isFemale ? 28 : 20, source: 'standard' });
    }
  }

  // چربی احشایی (استاندارد: زیر ۱۰۰)
  const vfa = num(rec, ['vfa', 'visceralFatArea']);
  if (vfa !== undefined) {
    out.push({ key: 'vfa', labelFa: 'چربی احشایی', labelEn: 'Visceral fat', unit: 'cm²', decimals: 0, value: vfa, lower: 0, upper: 100, zeroBased: true, source: 'standard' });
  }

  // آب بدن
  const tbw = num(rec, ['tbw']);
  const tbwL = num(rec, ['tbwLower', 'tbwLowerLimit']);
  const tbwU = num(rec, ['tbwUpper', 'tbwUpperLimit']);
  if (tbw !== undefined && tbwL !== undefined && tbwU !== undefined && tbwU > tbwL) {
    out.push({ key: 'tbw', labelFa: 'آب بدن', labelEn: 'TBW', unit: 'L', decimals: 1, value: tbw, lower: tbwL, upper: tbwU, source: 'device' });
  }

  // تودهٔ بدون چربی
  const ffm = num(rec, ['ffm']);
  const ffmL = num(rec, ['ffmLower', 'ffmLowerLimit']);
  const ffmU = num(rec, ['ffmUpper', 'ffmUpperLimit']);
  if (ffm !== undefined && ffmL !== undefined && ffmU !== undefined && ffmU > ffmL) {
    out.push({ key: 'ffm', labelFa: 'تودهٔ بدون چربی', labelEn: 'FFM', unit: 'kg', decimals: 1, value: ffm, lower: ffmL, upper: ffmU, source: 'device' });
  }

  // پروتئین
  const pro = num(rec, ['pro', 'protein']);
  const proL = num(rec, ['proLower', 'proLowerLimit', 'proteinLower']);
  const proU = num(rec, ['proUpper', 'proUpperLimit', 'proteinUpper']);
  if (pro !== undefined && proL !== undefined && proU !== undefined && proU > proL) {
    out.push({ key: 'pro', labelFa: 'پروتئین', labelEn: 'Protein', unit: 'kg', decimals: 1, value: pro, lower: proL, upper: proU, source: 'device' });
  }

  // آب خارج سلولی
  const ecw = num(rec, ['ecw']);
  const ecwL = num(rec, ['ecwLower', 'ecwLowerLimit']);
  const ecwU = num(rec, ['ecwUpper', 'ecwUpperLimit']);
  if (ecw !== undefined && ecwL !== undefined && ecwU !== undefined && ecwU > ecwL) {
    out.push({ key: 'ecw', labelFa: 'آب خارج سلولی', labelEn: 'ECW', unit: 'L', decimals: 1, value: ecw, lower: ecwL, upper: ecwU, source: 'device' });
  }

  // مواد معدنی
  const minerals = num(rec, ['minerals']);
  const minL = num(rec, ['mineralsLower', 'mineralsLowerLimit']);
  const minU = num(rec, ['mineralsUpper', 'mineralsUpperLimit']);
  if (minerals !== undefined && minL !== undefined && minU !== undefined && minU > minL) {
    out.push({ key: 'minerals', labelFa: 'مواد معدنی', labelEn: 'Minerals', unit: 'kg', decimals: 1, value: minerals, lower: minL, upper: minU, source: 'device' });
  }

  // تودهٔ نرم بدون چربی
  const slm = num(rec, ['softLeanMass', 'slm']);
  const slmL = num(rec, ['softLeanMassLower', 'softLeanMassLowerLimit', 'slmLower']);
  const slmU = num(rec, ['softLeanMassUpper', 'softLeanMassUpperLimit', 'slmUpper']);
  if (slm !== undefined && slmL !== undefined && slmU !== undefined && slmU > slmL) {
    out.push({ key: 'slm', labelFa: 'تودهٔ نرم بدون چربی', labelEn: 'Soft lean mass', unit: 'kg', decimals: 1, value: slm, lower: slmL, upper: slmU, source: 'device' });
  }

  return out;
}