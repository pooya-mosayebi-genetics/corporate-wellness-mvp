import { eq, ilike, or, count, sql, inArray } from 'drizzle-orm';
import { db } from '../config/db';
import { personnel, organizations } from '../db/schema';
import { logAudit } from '../lib/audit';
import type { PersonnelRowInput } from '../validators/personnel.validator';
import { normalizeRole } from '@shared/roles';

const DEFAULT_ORG_ID = 'org-saman';

export interface ImportSummary {
  inserted: number;
  updated: number;
  failed: number;
  errors: { index: number; nationalId: string; message: string }[];
  orgsCreated: number;
}

/**
 * واردسازی دسته‌ای پرسنل با upsert تک‌statementی (مقیاس‌پذیر برای ۲۰۰۰ رکورد).
 */
export async function importPersonnel(
  rows: PersonnelRowInput[],
  actorId: string,
  meta: { ip?: string | null; ua?: string | null },
  defaultOrgId: string = DEFAULT_ORG_ID
): Promise<ImportSummary> {
  let orgsCreated = 0;

  await db.transaction(async (tx) => {
    // ۱) مطمئن شو سازمان پیش‌فرض وجود دارد
    const defaultOrgExists = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, defaultOrgId))
      .limit(1);

    if (!defaultOrgExists.length) {
      await tx.insert(organizations).values({
        id: defaultOrgId,
        name: defaultOrgId === DEFAULT_ORG_ID ? 'Saman Bank' : defaultOrgId,
        nameFa: defaultOrgId === DEFAULT_ORG_ID ? 'بانک سامان' : defaultOrgId,
        isActive: true,
      });
      orgsCreated++;
    }

    // ۲) چک وجود org های غیر پیش‌فرض و ساخت آن‌ها در صورت نیاز
    const uniqueOrgIds = Array.from(
      new Set(
        rows.map((r) => r.orgId ?? defaultOrgId).filter((id): id is string => !!id)
      )
    );

    if (uniqueOrgIds.length > 0) {
      const existingOrgs = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(inArray(organizations.id, uniqueOrgIds));

      const existingSet = new Set(existingOrgs.map((o) => o.id));
      const missingOrgs = uniqueOrgIds.filter((id) => !existingSet.has(id));

      if (missingOrgs.length > 0) {
        await tx.insert(organizations).values(
          missingOrgs.map((id) => ({
            id,
            name: id,
            nameFa: id,
            isActive: true,
          }))
        );
        orgsCreated += missingOrgs.length;
      }
    }
  });

  // ۳) شمارش رکوردهای موجود قبل از upsert
  const allNationalIds = rows.map((r) => r.nationalId);
  const existingRows = await db
    .select({ nationalId: personnel.nationalId })
    .from(personnel)
    .where(inArray(personnel.nationalId, allNationalIds));
  const existingSet = new Set(existingRows.map((r) => r.nationalId));

  // ۴) Upsert تک‌statementی
  const now = new Date();
  const values = rows.map((r) => ({
    nationalId: r.nationalId,
    fullName: r.fullName,
    fullNamePrefixed: r.fullNamePrefixed ?? null,
    mobile: r.mobile ?? null,
    birthDate: r.birthDate ?? null,
    gender: r.gender ?? null,
    position: r.position ?? null,
    department: r.department ?? null,
    organizationId: r.orgId ?? defaultOrgId,
    updatedAt: now,
  }));

  await db
    .insert(personnel)
    .values(values)
    .onConflictDoUpdate({
      target: personnel.nationalId,
      set: {
        fullName: sql`excluded.full_name`,
        fullNamePrefixed: sql`excluded.full_name_prefixed`,
        mobile: sql`excluded.mobile`,
        birthDate: sql`excluded.birth_date`,
        gender: sql`excluded.gender`,
        position: sql`excluded.position`,
        department: sql`excluded.department`,
        organizationId: sql`excluded.organization_id`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  const inserted = rows.filter((r) => !existingSet.has(r.nationalId)).length;
  const updated = rows.filter((r) => existingSet.has(r.nationalId)).length;

  await logAudit({
    type: 'personnel.import',
    actorId,
    meta: `inserted=${inserted} updated=${updated} orgs_created=${orgsCreated}`,
    ip: meta.ip ?? null,
    ua: meta.ua ?? null,
  });

  return {
    inserted,
    updated,
    failed: 0,
    errors: [],
    orgsCreated,
  };
}

/**
 * لیست پرسنل با pagination و جستجو.
 */
export async function listPersonnel(
  search: string | undefined,
  limit: number,
  offset: number,
  orgId?: string
) {
  const where = [];

  if (search) {
    where.push(
      or(
        ilike(personnel.fullName, `%${search}%`),
        ilike(personnel.nationalId, `%${search}%`),
        ilike(personnel.mobile, `%${search}%`)
      )
    );
  }

  if (orgId) {
    where.push(eq(personnel.organizationId, orgId));
  }

  const combinedWhere = where.length > 0 ? where.reduce((a, b) => ({ ...a, ...b })) : undefined;

  const [totalRow] = await db.select({ total: count() }).from(personnel).where(combinedWhere as any);

  const items = await db
    .select()
    .from(personnel)
    .where(combinedWhere as any)
    .orderBy(personnel.fullName)
    .limit(limit)
    .offset(offset);

  return { total: totalRow?.total ?? 0, items };
}

/**
 * دریافت یک پرسنل با کد ملی (برای self-provisioning و پروفایل).
 */
export async function getPersonnelByNationalId(nationalId: string) {
  const rows = await db
    .select()
    .from(personnel)
    .where(eq(personnel.nationalId, nationalId))
    .limit(1);
  return rows[0] ?? null;
}