/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · Transport واقعی صف sync به API
 *  - meal → POST /api/meals
 *  - mealDelete → DELETE /api/meals/by-key/:key
 *  - bodyAnalysis → POST /api/body-analyses
 *  - خطای شبکه → TransientSyncError (pending می‌ماند)
 *  - 404 در حذف → موفق حساب می‌شود (چون ممکن است هرگز sync نشده باشد)
 * ─────────────────────────────────────────────────────────────
 */
import { api, ApiError } from '../lib/api';
import type { Transport } from '../data/writeQueue';

export class TransientSyncError extends Error {
  transient = true;
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'TransientSyncError';
    this.status = status;
  }
}

function statusOf(err: any): number {
  return Number(err?.status ?? err?.apiError?.status ?? 0);
}

function errorCodeOf(err: any): string {
  return String(err?.error ?? err?.apiError?.error ?? '');
}

function isNotFound(err: any): boolean {
  return statusOf(err) === 404 || errorCodeOf(err) === 'NOT_FOUND';
}

function normalizeError(err: any): Error {
  if (err instanceof TransientSyncError) return err;

  const status = statusOf(err);
  if ([0, 408, 425, 429, 500, 502, 503, 504].includes(status)) {
    return new TransientSyncError(
      err?.message || err?.apiError?.fa || err?.apiError?.en || 'Network error',
      status,
    );
  }

  if (err instanceof ApiError) return err;
  if (err instanceof Error) return err;
  return new Error(String(err));
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function int(v: any): number | null {
  if (v == null || v === '') return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
}

function str(v: any): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function mapMeal(m: any) {
  return {
    id: String(m?.id || ''),
    type: m?.type,
    date: m?.date,
    time: m?.time,
    name: String(m?.name || ''),
    calories: Math.round(num(m?.calories)),
    protein: num(m?.protein),
    carbs: num(m?.carbs),
    fat: num(m?.fat),
    items: Array.isArray(m?.items) ? m.items : [],
    loggedAt: m?.loggedAt || new Date().toISOString(),
  };
}

function mapAnalysis(r: any) {
  const nationalId = String(r?.nationalId || '')
    .replace(/\D/g, '')
    .padStart(10, '0');

  // عدد → string (ستون‌های بک‌اند text هستند)؛ null اگر نامعتبر
  const num = (v: any): string | null => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? String(n) : null;
  };

  return {
    id: String(r?.id || `ana-${Date.now()}`),
    nationalId,
    fullName: str(r?.fullName ?? r?.fullNamePrefixed),
    mobile: str(r?.mobile ?? r?.mobileNumber),
    gender: str(r?.gender),
    age: int(r?.age),

    weight: num(r?.weight),
    height: num(r?.height),
    bmi: num(r?.bmi),
    // 🆕 نگاشت فیلدهای واقعی BodyAnalysisRecord:
    bodyFatPercentage: num(r?.bfm ?? r?.bodyFatPercentage ?? r?.bodyFatPercent),
    skeletalMuscleMass: num(r?.smm ?? r?.skeletalMuscleMass),
    visceralFatLevel: num(r?.vfa ?? r?.visceralFatLevel ?? r?.visceralFat),
    basalMetabolicRate: num(r?.basalMetabolismKcal ?? r?.bmrKcal ?? r?.basalMetabolicRate),
    bodyWater: num(r?.tbw ?? r?.bodyWater),
    proteinMass: num(r?.proteinMass),
    mineralMass: num(r?.mineralMass),

    // 🆕 aneaScore ستون ندارد؛ داخل __syncRecord می‌ماند و هنگام pull برمی‌گردد
    rawData: {
      ...(typeof r?.rawData === 'object' && r.rawData ? r.rawData : {}),
      __syncRecord: r,
    },

    analyzedAt: r?.analyzedAt || r?.analyzeTime || new Date().toISOString(),
  };
}

export function createApiTransport(): Transport {
  return async (entry) => {
    try {
      switch (entry.entity) {
        case 'meal':
          await api.upsertMeal(entry.idempotencyKey, mapMeal(entry.payload));
          break;

        case 'mealDelete':
          try {
            await api.deleteMyMealByIdempotencyKey(entry.idempotencyKey);
          } catch (err) {
            // اگر رکورد هرگز به سرور نرفته بود، حذف محلی هم موفق است
            if (!isNotFound(err)) throw normalizeError(err);
          }
          break;

        case 'bodyAnalysis':
          await api.upsertAnalysis(entry.idempotencyKey, mapAnalysis(entry.payload));
          break;

        case 'foodLog':
          // فعلاً endpoint FoodLog ساخته نشده؛ permanent failed تا صف مسدود نشود
          throw new Error('UNSUPPORTED_ENTITY:foodLog');

        default:
          throw new Error(`UNSUPPORTED_ENTITY:${String(entry.entity)}`);
      }
    } catch (err) {
      throw normalizeError(err);
    }
  };
}