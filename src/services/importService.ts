import * as XLSX from 'xlsx';
import type { ClientRecord, ClientSex, ImportResult, ImportRowIssue } from '../types/clients';

// --- نرمال‌سازی ---

function normalizeDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
}

function cleanText(value: unknown): string {
  if (value == null) return '';
  return normalizeDigits(String(value))
    .replace(/[\u200c\u200e\u200f]/g, '')
    .replace(/[%\s,]/g, '');
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && isFinite(value)) return value;
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
}

function toId(value: unknown): string | null {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    const k = normalizeDigits(key).replace(/[\u200c\u200e\u200f]/g, '').trim();
    out[k] = row[key];
  }
  return out;
}

function getField(row: Record<string, unknown>, names: string[]): unknown {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name];
    }
  }
  return null;
}

// --- اعتبارسنجی و نگاشت یک ردیف ---

interface RowOutcome {
  record: ClientRecord | null;
  errors: string[];
  warnings: string[];
}

function mapRow(row: Record<string, unknown>): RowOutcome {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nationalId = toId(getField(row, ['کدملی', 'كدملی', 'NationalID', 'ID']));
  if (!nationalId || !/^\d{6,}$/.test(nationalId)) {
    return { record: null, errors: ['کد ملی نامعتبر'], warnings: [] };
  }

  const sexRaw = cleanText(getField(row, ['Sex', 'sex', 'جنسیت'])).toUpperCase();
  const sex: ClientSex | null = sexRaw === 'M' ? 'male' : sexRaw === 'F' ? 'female' : null;
  if (!sex) errors.push('جنسیت نامشخص');

  const ageRaw = toNumber(getField(row, ['Age', 'سن']));
  if (ageRaw == null || ageRaw < 10 || ageRaw > 100) {
    errors.push('سن نامعتبر');
  } else if (!Number.isInteger(ageRaw)) {
    warnings.push('سن اعشاری گرد شد');
  }

  const heightCm = toNumber(getField(row, ['Height', 'قد']));
  if (heightCm == null || heightCm < 100 || heightCm > 250) errors.push('قد نامعتبر');

  const weightKg = toNumber(getField(row, ['Weight', 'وزن']));
  if (weightKg == null || weightKg < 20 || weightKg > 350) errors.push('وزن نامعتبر');

  const pbfPercent = toNumber(getField(row, ['PBF%', 'PBF %', 'PBF', 'درصد چربی']));
  if (pbfPercent == null || pbfPercent < 1 || pbfPercent > 75) errors.push('درصد چربی نامعتبر');

  if (errors.length > 0 || !sex || ageRaw == null || heightCm == null || weightKg == null || pbfPercent == null) {
    return { record: null, errors: errors.length ? errors : ['داده ناقص'], warnings };
  }

  const age = Math.round(ageRaw);

  // BMI: تطبیق با قد/وزن
  const bmiRaw = toNumber(getField(row, ['BMI']));
  const computedBmi = weightKg / ((heightCm / 100) * (heightCm / 100));
  const bmi = bmiRaw != null ? Math.round(bmiRaw * 100) / 100 : Math.round(computedBmi * 100) / 100;
  if (bmiRaw != null && Math.abs(bmiRaw - computedBmi) > 1.5) {
    warnings.push('عدم تطابق BMI با قد/وزن');
  }

  // BFM: مقادیر معیوب دستگاه
  const bfmRaw = toNumber(getField(row, ['BFM']));
  let bfmKg: number | null = bfmRaw;
  if (bfmRaw == null || bfmRaw <= 0.5 || bfmRaw > weightKg * 0.75) {
    bfmKg = null;
    warnings.push('BFM غیرعادی → حذف شد');
  }

  // SMM
  const smmKg = toNumber(getField(row, ['SMM', 'عضله'])) ?? 0;

  // VFL
  const vflRaw = toNumber(getField(row, ['VFL', 'چربی احشایی']));
  const vfl = vflRaw ?? 0;
  if (vflRaw == null || vflRaw < 1 || vflRaw > 60) warnings.push('VFL خارج از بازه');

  // TBW
  const tbwLiters = toNumber(getField(row, ['TBW'])) ?? 0;
  if (tbwLiters < 10 || tbwLiters > 80) warnings.push('TBW خارج از بازه');

  const tbwPercent = toNumber(getField(row, ['TBW (&)', 'TBW(%)', 'TBW %'])) ?? 0;
  if (tbwPercent < 20 || tbwPercent > 75) warnings.push('درصد TBW خارج از بازه');

  // BIO Age
  const bioAgeRaw = toNumber(getField(row, ['BIO Age', 'BIOAge'])) ?? age;
  const bioAge = Math.round(bioAgeRaw);
  if (Math.abs(bioAge - age) > 25) warnings.push('اختلاف زیاد سن بیولوژیک با سن واقعی');

  return {
    record: {
      nationalId,
      sex,
      age,
      heightCm: Math.round(heightCm),
      weightKg: Math.round(weightKg * 10) / 10,
      bmi,
      smmKg: Math.round(smmKg * 10) / 10,
      pbfPercent: Math.round(pbfPercent * 10) / 10,
      bfmKg: bfmKg != null ? Math.round(bfmKg * 100) / 100 : null,
      vfl: Math.round(vfl),
      tbwLiters: Math.round(tbwLiters * 10) / 10,
      tbwPercent: Math.round(tbwPercent * 10) / 10,
      bioAge,
      warnings,
      importedAt: new Date().toISOString(),
    },
    errors: [],
    warnings,
  };
}

// --- پارس کل فایل ---

export function parseAnalyzerWorkbook(buffer: ArrayBuffer, fileName: string): ImportResult {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

  const imported: ClientRecord[] = [];
  const errors: ImportRowIssue[] = [];
  const warnings: ImportRowIssue[] = [];
  const seen = new Set<string>();

  let totalRows = 0;
  let skipped = 0;
  let duplicates = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    rawRows.forEach((raw, index) => {
      const row = normalizeRow(raw);
      const idValue = cleanText(row['کدملی'] ?? row['NationalID'] ?? row['ID']);

      // ردیف‌های ساختاری (هدر تکراری / خالی)
      if (!idValue || !/^\d+$/.test(idValue)) {
        skipped += 1;
        return;
      }

      totalRows += 1;
      const outcome = mapRow(row);

      if (!outcome.record) {
        errors.push({
          sheet: sheetName,
          rowIndex: index + 2,
          nationalId: idValue,
          reason: outcome.errors.join('، '),
        });
        return;
      }

      if (seen.has(outcome.record.nationalId)) {
        duplicates += 1;
        return;
      }
      seen.add(outcome.record.nationalId);

      for (const reason of outcome.warnings) {
        warnings.push({
          sheet: sheetName,
          rowIndex: index + 2,
          nationalId: outcome.record?.nationalId ?? null,
          reason,
        });
      }

      imported.push(outcome.record);
    });
  }

  return { fileName, totalRows, skipped, duplicates, imported, errors, warnings };
}