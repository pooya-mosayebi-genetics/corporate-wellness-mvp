/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · Break-glass (L-10)
 *  انواع و ثابت‌های دسترسی اضطراری برای نقش‌های غیربالینی (IT).
 * ─────────────────────────────────────────────────────────────
 */
import type { Permission } from './permissions';

export interface BreakGlassGrant {
  id: string;
  actorId: string;      // nationalId کاربر IT
  targetId: string;     // nationalId مراجع هدف
  reason: string;       // دلیل (الزامی، ≥۲۰ کاراکتر)
  scope: Permission[];  // فقط client.record.view + analysis.view + section.*.view
  createdAt: number;    // ms epoch
  expiresAt: number;    // ms epoch
  revoked?: boolean;
  revokedAt?: number;
  usedAt?: number;      // اولین استفاده (برای audit)
}

/** پیش‌فرض مدت grant (دقیقه) */
export const BG_DEFAULT_MINUTES = 60;

/** حداکثر مدت مجاز (دقیقه) */
export const BG_MAX_MINUTES = 24 * 60; // ۲۴ ساعت

/** حداقل طول دلیل */
export const BG_MIN_REASON_LEN = 20;

/** سقف grant فعال همزمان برای یک کاربر */
export const BG_MAX_ACTIVE_PER_USER = 3;

/** permissionهایی که break-glass هرگز نمی‌دهد (حتی اگر درخواست شود) */
export const BG_FORBIDDEN: Permission[] = [
  'access.manage',
  'backup.restore',
  'users.manage',
  'personnel.import',
  'org.manage',
];

/** scope مجاز break-glass: فقط مشاهدهٔ بالینی */
export function bgAllowedScope(): Permission[] {
  return [
    'client.record.view',
    'analysis.view',
    'section.body_composition.view',
    'section.nutrition.view',
    'section.diet_plan.view',
    'section.exercise.view',
    'section.medical_internal.view',
    'section.sports_medicine.view',
    'section.radiology.view',
    'section.cardiology.view',
    'section.nursing.view',
    'section.labs.view',
    'section.imaging_3d.view',
  ];
}