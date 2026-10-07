import { eq, ne, ilike, or, and, count } from 'drizzle-orm';
import { db } from '../config/db';
import { users } from '../db/schema';
import { AppError } from '../lib/errors';
import { logAudit } from '../lib/audit';
import { getPersonnelByNationalId } from './personnel.service';
import { APP_ROLES, ROLE_META } from '@shared/roles';
import { PERMISSIONS, ROLE_DEFAULTS } from '@shared/permissions';

export interface ActorMeta {
  ip?: string | null;
  ua?: string | null;
}

type UserRow = typeof users.$inferSelect;

function sanitize(u: UserRow) {
  const { passwordHash, passwordSalt, pinHash, pinSalt, ...rest } = u;
  return rest;
}

async function findUser(nationalId: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.nationalId, nationalId)).limit(1);
  return rows[0] ?? null;
}

async function countOtherActiveSuperAdmins(excludeNationalId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(users)
    .where(
      and(
        eq(users.role, 'super_admin'),
        eq(users.isActive, true),
        ne(users.nationalId, excludeNationalId)
      )
    );
  return row?.total ?? 0;
}

/* ─────────── لیست کاربران ─────────── */
export async function listUsers(search: string | undefined, limit: number, offset: number) {
  const where = search
    ? or(ilike(users.nationalId, `%${search}%`), ilike(users.fullName, `%${search}%`))
    : undefined;

  const [totalRow] = await db.select({ total: count() }).from(users).where(where);
  const items = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(users.createdAt)
    .limit(limit)
    .offset(offset);

  return { total: totalRow?.total ?? 0, items: items.map(sanitize) };
}

/* ─────────── ساخت کاربر ─────────── */
export async function createUser(nationalId: string, role: string, actorId: string, meta: ActorMeta) {
  const existing = await findUser(nationalId);
  if (existing) throw new AppError('USER_EXISTS', 409);

  const person = await getPersonnelByNationalId(nationalId);
  const fullName = person?.fullNamePrefixed || person?.fullName || nationalId;

  await db.insert(users).values({ nationalId, fullName, role });
  await logAudit({ type: 'user.created', actorId, targetId: nationalId, meta: `role=${role}`, ...meta });

  const created = await findUser(nationalId);
  return sanitize(created!);
}

/* ─────────── تغییر نقش ─────────── */
export async function setRole(targetId: string, role: string, actorId: string, meta: ActorMeta) {
  const u = await findUser(targetId);
  if (!u) throw new AppError('USER_NOT_FOUND', 404);
  if (targetId === actorId) throw new AppError('SELF_MODIFICATION', 403);

  if (u.role === 'super_admin' && role !== 'super_admin') {
    const others = await countOtherActiveSuperAdmins(targetId);
    if (others < 1) throw new AppError('LAST_SUPER_ADMIN', 409);
  }

  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.nationalId, targetId));
  await logAudit({ type: 'user.role_changed', actorId, targetId, meta: `${u.role} -> ${role}`, ...meta });

  return sanitize((await findUser(targetId))!);
}

/* ─────────── فعال/غیرفعال ─────────── */
export async function setActive(targetId: string, isActive: boolean, actorId: string, meta: ActorMeta) {
  const u = await findUser(targetId);
  if (!u) throw new AppError('USER_NOT_FOUND', 404);
  if (targetId === actorId) throw new AppError('SELF_MODIFICATION', 403);

  if (!isActive && u.role === 'super_admin') {
    const others = await countOtherActiveSuperAdmins(targetId);
    if (others < 1) throw new AppError('LAST_SUPER_ADMIN', 409);
  }

  await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.nationalId, targetId));
  await logAudit({ type: 'user.active_changed', actorId, targetId, meta: `isActive=${isActive}`, ...meta });

  return sanitize((await findUser(targetId))!);
}

/* ─────────── بازنشانی رمز توسط ادمین ─────────── */
export async function resetPassword(targetId: string, actorId: string, meta: ActorMeta) {
  const u = await findUser(targetId);
  if (!u) throw new AppError('USER_NOT_FOUND', 404);

  await db
    .update(users)
    .set({ passwordHash: null, passwordSalt: null, loginFailures: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(users.nationalId, targetId));

  await logAudit({ type: 'user.password_reset_by_admin', actorId, targetId, ...meta });
  return { ok: true };
}

/* ─────────── مدیریت دسترسی‌های ریزدانه ─────────── */
export async function setPermissions(
  targetId: string,
  permissions: string[],
  deniedPermissions: string[],
  actorId: string,
  meta: ActorMeta
) {
  const u = await findUser(targetId);
  if (!u) throw new AppError('USER_NOT_FOUND', 404);
  if (targetId === actorId) throw new AppError('SELF_MODIFICATION', 403);

  await db
    .update(users)
    .set({ permissions, deniedPermissions, updatedAt: new Date() })
    .where(eq(users.nationalId, targetId));

  await logAudit({
    type: 'user.permissions_changed',
    actorId,
    targetId,
    meta: `grants=${permissions.length} denied=${deniedPermissions.length}`,
    ...meta,
  });

  return sanitize((await findUser(targetId))!);
}

/* ─────────── کاتالوگ نقش‌ها و دسترسی‌ها (از منبع مشترک) ─────────── */
export function rolesCatalog() {
  return APP_ROLES.map((key) => ({
    key,
    ...ROLE_META[key],
    defaultPermissions: ROLE_DEFAULTS[key] ?? [],
  }));
}

export function permissionsCatalog() {
  return PERMISSIONS;
}