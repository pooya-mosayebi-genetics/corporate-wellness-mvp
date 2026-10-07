/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · منطق دسترسی org-aware (M-04)
 *  جلوگیری از IDOR بین سازمان‌ها.
 *  هر کوئری که nationalId می‌گیرد باید از اینجا رد شود.
 * ─────────────────────────────────────────────────────────────
 */
import type { PersonnelRecord } from '../store/PersonnelContext';
import { sameOrg, resolveOrgId } from './org';

export type OrgRole = 'user' | 'employee' | 'coach' | 'hr' | 'admin';

export interface OrgAccessResult {
  allowed: boolean;
  reason?: 'same-org' | 'self' | 'admin' | 'cross-org' | 'unknown-target' | 'no-session';
  targetOrgId: string;
  sessionOrgId: string;
}

/**
 * بررسی دسترسی یک کاربر به دادهٔ یک فرد دیگر.
 * - admin: همه را می‌بیند
 * - user/employee: فقط خودش
 * - coach/hr: فقط هم‌سازمانی‌ها
 */
export function checkOrgAccess(params: {
  sessionNationalId: string | null | undefined;
  sessionRole: OrgRole | null | undefined;
  targetNationalId: string;
  persons: PersonnelRecord[];
}): OrgAccessResult {
  const { sessionNationalId, sessionRole, targetNationalId, persons } = params;

  if (!sessionNationalId || !sessionRole) {
    return { allowed: false, reason: 'no-session', targetOrgId: '', sessionOrgId: '' };
  }

  const sessionPerson = persons.find((p) => p.nationalId === sessionNationalId);
  const targetPerson = persons.find((p) => p.nationalId === targetNationalId);
  const sessionOrgId = resolveOrgId(sessionPerson);
  const targetOrgId = resolveOrgId(targetPerson);

  // ✅ دسترسی به خود: همیشه مجاز
  if (sessionNationalId === targetNationalId) {
    return { allowed: true, reason: 'self', targetOrgId, sessionOrgId };
  }

  // ✅ admin: دسترسی کامل
  if (sessionRole === 'admin') {
    return { allowed: true, reason: 'admin', targetOrgId, sessionOrgId };
  }

  // ❌ فرد هدف در پرسنل نیست → اجازه نده (دفاع در برابر دستکاری URL)
  if (!targetPerson) {
    return { allowed: false, reason: 'unknown-target', targetOrgId, sessionOrgId };
  }

  // ✅ بررسی هم‌سازمانی بودن
  if (sameOrg(sessionOrgId, targetOrgId)) {
    return { allowed: true, reason: 'same-org', targetOrgId, sessionOrgId };
  }

  return { allowed: false, reason: 'cross-org', targetOrgId, sessionOrgId };
}

/**
 * آیا کاربر می‌تواند لیستی از افراد را ببیند؟ (برای صفحات فهرستی)
 */
export function canSeeList(sessionRole: OrgRole | null | undefined): boolean {
  if (!sessionRole) return false;
  return ['admin', 'coach', 'hr'].includes(sessionRole);
}