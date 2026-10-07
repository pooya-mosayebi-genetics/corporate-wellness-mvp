/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · resolver سازمان (M-02)
 *  سازمان فعلی/پیش‌فرض = بانک سامان؛ سازمان‌های جدید خودکار ساخته می‌شوند.
 * ─────────────────────────────────────────────────────────────
 */
import type { Organization, Person } from '../data/schema';

export const DEFAULT_ORG_ID = 'org-saman';

export const DEFAULT_ORG: Organization = {
  id: DEFAULT_ORG_ID,
  name: 'Saman Bank',
  nameFa: 'بانک سامان',
  code: 'SAMAN',
  active: true,
  createdAt: new Date().toISOString(),
};

/** سازمان یک فرد (خالی → بانک سامان) */
export function resolveOrgId(person?: Person | null): string {
  return person?.orgId || DEFAULT_ORG_ID;
}

/** آیا دو سازمان یکی‌اند؟ */
export function sameOrg(a?: string | null, b?: string | null): boolean {
  return (a || DEFAULT_ORG_ID) === (b || DEFAULT_ORG_ID);
}

/** سازمان یک فرد بر اساس کد ملی از لیست پرسنل */
export function orgOfNationalId(nationalId: string, persons: Person[]): string {
  const p = persons.find((x) => x.nationalId === nationalId);
  return resolveOrgId(p);
}

/** فیلتر لیست بر اساس سازمان */
export function filterByOrg<T extends { nationalId?: string }>(
  items: T[],
  orgId: string,
  persons: Person[],
): T[] {
  return items.filter((it) => sameOrg(orgOfNationalId(String(it.nationalId || ''), persons), orgId));
}