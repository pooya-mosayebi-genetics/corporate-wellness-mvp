import type { BodyAnalysisRecord } from '../data/bodyAnalysisTypes';
import { toNum } from '../data/bodyAnalysisTypes';
import type { PersonnelRecord } from '../store/PersonnelContext';

/** تشخیص اینکه آیا یک مقدار شبیه کد ملی است */
function looksLikeNationalId(name: string): boolean {
  const cleaned = name.trim();
  return /^\d{10}$/.test(cleaned) || /^\d{8,10}$/.test(cleaned);
}

/** جستجوی کد ملی با نام در دیتابیس پرسنل */
function findNationalIdByName(
  name: string,
  personnelRecords: PersonnelRecord[],
): string | null {
  const normalizedName = name.trim().toLowerCase();
  const match = personnelRecords.find((p) => {
    const pName = (p.fullName || '').trim().toLowerCase();
    const pFullName = (p.fullNamePrefixed || '').trim().toLowerCase();
    return pName === normalizedName || pFullName === normalizedName;
  });
  return match ? match.nationalId : null;
}

/** پارس یک خط CSV */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/** پارس کل فایل CSV بادی آنالیز */
export function parseBodyAnalysisCSV(
  csvContent: string,
  personnelRecords: PersonnelRecord[],
): { records: BodyAnalysisRecord[]; errors: string[]; unmatched: string[] } {
  const lines = csvContent.split('\n').filter((l) => l.trim());
  const records: BodyAnalysisRecord[] = [];
  const errors: string[] = [];
  const unmatched: string[] = [];

  // رد کردن هدر
  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 50) continue;

      const fullName = (cols[2] || '').trim();
      const mobileNumber = (cols[1] || '').replace('+98', '0').trim();

      // تعیین کد ملی
      let nationalId = '';
      if (looksLikeNationalId(fullName)) {
        nationalId = fullName;
      } else {
        // جستجو با نام
        const found = findNationalIdByName(fullName, personnelRecords);
        if (found) {
          nationalId = found;
        } else {
          // اگر پیدا نشد، با موبایل جستجو کن
          const mobileMatch = personnelRecords.find((p) => p.mobile === mobileNumber);
          if (mobileMatch) {
            nationalId = mobileMatch.nationalId;
          } else {
            nationalId = fullName; // فعلاً با نام ذخیره کن
            unmatched.push(fullName);
          }
        }
      }

      const record: BodyAnalysisRecord = {
        id: `${nationalId}-${cols[0]}`,
        nationalId,
        mobileNumber,
        fullName,
        gender: (cols[3] || '').trim().toLowerCase() === 'woman' ? 'female' : 'male',
        age: toNum(cols[4]),
        analyzeTag: (cols[5] || '').trim(),
        analyzeTime: cols[0] || '',

        weight: toNum(cols[6]),
        height: toNum(cols[7]),
        targetWeight: toNum(cols[8]),
        weightControl: toNum(cols[9]),

        smm: toNum(cols[10]),
        tbw: toNum(cols[11]),
        bfm: toNum(cols[12]),
        ffm: toNum(cols[13]),
        bmr: toNum(cols[14]),
        ecw: toNum(cols[15]),
        icw: toNum(cols[16]),
        pro: toNum(cols[17]),
        vfa: toNum(cols[18]),

        torsoLean: toNum(cols[19]),
        leftLegLean: toNum(cols[20]),
        rightLegLean: toNum(cols[21]),
        leftArmLean: toNum(cols[22]),
        rightArmLean: toNum(cols[23]),

        torsoFat: toNum(cols[24]),
        leftLegFat: toNum(cols[25]),
        rightLegFat: toNum(cols[26]),
        leftArmFat: toNum(cols[27]),
        rightArmFat: toNum(cols[28]),

        ffmUpper: toNum(cols[29]),
        tbwUpper: toNum(cols[30]),
        ecwUpper: toNum(cols[31]),
        icwUpper: toNum(cols[32]),
        smmUpper: toNum(cols[33]),
        proUpper: toNum(cols[34]),
        bfmUpper: toNum(cols[35]),

        ffmLower: toNum(cols[36]),
        tbwLower: toNum(cols[37]),
        ecwLower: toNum(cols[38]),
        icwLower: toNum(cols[39]),
        smmLower: toNum(cols[40]),
        proLower: toNum(cols[41]),
        bfmLower: toNum(cols[42]),

        minerals: toNum(cols[43]),
        mineralsLower: toNum(cols[44]),
        mineralsUpper: toNum(cols[45]),

        softLeanMass: toNum(cols[46]),
        softLeanMassLower: toNum(cols[47]),
        softLeanMassUpper: toNum(cols[48]),

        aneaScore: toNum(cols[49]),
        biologicalAge: toNum(cols[50]),
      };

      records.push(record);
    } catch (e) {
      errors.push(`خط ${i + 1}: ${(e as Error).message}`);
    }
  }

  return { records, errors, unmatched };
}