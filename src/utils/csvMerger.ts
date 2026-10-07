/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · Smart CSV Merger (L-10 Phase 5.2)
 *  تجمیع ایمن داده‌های بادی آنالیز از فایل‌های متعدد
 * ─────────────────────────────────────────────────────────────
 */
import { parse } from 'xlsx'; // فرض بر استفاده از کتابخانه xlsx یا papaparse
// اگر از papaparse استفاده می‌کنید: import Papa from 'papaparse';
import type { BodyAnalysisRecord } from '../data/bodyAnalysisTypes';
import { normalizeNationalId } from './nationalId';

export interface MergeResult {
  totalRows: number;
  added: number;
  updated: number;
  skippedDuplicates: number;
  errors: { row: number; reason: string }[];
  finalRecords: BodyAnalysisRecord[];
}

/**
 * تبدیل رشته تاریخ فارسی/میلادی به ISO String قابل مقایسه
 */
function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  try {
    // تلاش برای پارس کردن تاریخ میلادی استاندارد
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
    
    // اگر فرمت خاص ایرانی بود (مثلا 1403/01/01)، اینجا منطق تبدیل جلالی به میلادی قرار می‌گیرد
    // فعلاً فرض می‌کنیم خروجی دستگاه میلادی یا Unix Timestamp است
    return null; 
  } catch {
    return null;
  }
}

/**
 * استخراج عدد از رشته (پشتیبانی از کاراکترهای فارسی و جداکننده‌ها)
 */
function extractNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  const str = String(val).replace(/[۰-۹]/g, d => String('۰۱۳۴۵۶۷۸۹'.indexOf(d)));
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * تابع اصلی ادغام
 * @param incomingCsvData آرایه‌ای از آبجکت‌های خام خوانده شده از CSV
 * @param existingRecords لیست رکوردهای فعلی در حافظه
 */
export function mergeBodyAnalysisData(
  incomingCsvData: any[], 
  existingRecords: BodyAnalysisRecord[]
): MergeResult {
  const result: MergeResult = {
    totalRows: incomingCsvData.length,
    added: 0,
    updated: 0,
    skippedDuplicates: 0,
    errors: [],
    finalRecords: [...existingRecords], // کپی اولیه
  };

  // ساخت Map برای دسترسی سریع به رکوردهای موجود بر اساس ID+Date
  // کلید: `${nationalId}_${analyzeTime}`
  const existingMap = new Map<string, number>(); // value is index in array
  result.finalRecords.forEach((rec, idx) => {
    const key = `${normalizeNationalId(rec.nationalId)}_${rec.analyzeTime}`;
    existingMap.set(key, idx);
  });

  incomingCsvData.forEach((row, rowIndex) => {
    try {
      // ۱. استخراج و اعتبارسنجی کد ملی
      const rawNid = row['کد ملی'] || row['NationalID'] || row['nid'] || '';
      const nid = normalizeNationalId(String(rawNid));
      
      if (!nid || nid.length !== 10) {
        result.errors.push({ row: rowIndex + 2, reason: 'کد ملی نامعتبر یا خالی' });
        return;
      }

      // ۲. استخراج تاریخ
      const rawDate = row['تاریخ آنالیز'] || row['AnalyzeTime'] || row['time'];
      const isoDate = normalizeDate(String(rawDate));
      
      if (!isoDate) {
         // اگر تاریخ نداشت، از تاریخ امروز استفاده کن (یا خطا بده)
         // اینجا فرض می‌کنیم تاریخ الزامی است
         result.errors.push({ row: rowIndex + 2, reason: 'تاریخ نامعتبر' });
         return;
      }

      // ۳. بررسی تکراری بودن دقیق (Same Person, Same Time)
      const uniqueKey = `${nid}_${isoDate}`;
      if (existingMap.has(uniqueKey)) {
        result.skippedDuplicates++;
        return; // ردیف تکراری نادیده گرفته می‌شود
      }

      // ۴. ساخت رکورد جدید
      const newRecord: BodyAnalysisRecord = {
        nationalId: nid,
        gender: (row['جنسیت'] || row['Gender'] || '').toString().toLowerCase() === 'female' ? 'female' : 'male',
        age: extractNumber(row['سن'] || row['Age']),
        weight: extractNumber(row['وزن'] || row['Weight']),
        height: extractNumber(row['قد'] || row['Height']),
        bfm: extractNumber(row['چربی بدن'] || row['BFM']),
        smm: extractNumber(row['عضله اسکلتی'] || row['SMM']),
        vfa: extractNumber(row['چربی احشایی'] || row['VFA']),
        tbw: extractNumber(row['آب بدن'] || row['TBW']),
        biologicalAge: extractNumber(row['سن بیولوژیک'] || row['BioAge']),
        analyzeTime: isoDate,
        sourceFile: 'csv-import', // علامت‌گذاری منبع
        importedAt: new Date().toISOString(),
      };

      // ۵. افزودن به لیست نهایی
      result.finalRecords.push(newRecord);
      result.added++;
      
      // به‌روزرسانی مپ برای جلوگیری از تکرار در همان فایل
      existingMap.set(uniqueKey, result.finalRecords.length - 1);

    } catch (e: any) {
      result.errors.push({ row: rowIndex + 2, reason: e.message || 'خطای ناشناخته در پردازش ردیف' });
    }
  });

  return result;
}