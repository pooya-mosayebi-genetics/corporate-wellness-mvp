import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { users, personnel, type User } from '../db/schema';
import { AppError } from '../lib/errors';
import { hashPassword, verifyPassword } from '../lib/security';
import { signAccess, signRefresh, signFlow, verifyFlow, verifyRefresh } from '../lib/jwt';
import { isSelfProvisionEnabled } from './settings.service';
import { logAudit } from '../lib/audit';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

export interface ClientMeta {
  ip?: string | null;
  ua?: string | null;
}

export interface SessionResult {
  user: {
    nationalId: string;
    role: string;
    fullName: string;
    permissions: string[];
    deniedPermissions: string[];
  };
  tokens: { accessToken: string; refreshToken: string };
}

function issueSession(u: User): SessionResult {
  return {
    user: {
      nationalId: u.nationalId,
      role: u.role,
      fullName: u.fullName,
      permissions: u.permissions ?? [],
      deniedPermissions: u.deniedPermissions ?? [],
    },
    tokens: { accessToken: signAccess(u.nationalId, u.role), refreshToken: signRefresh(u.nationalId) },
  };
}

function lockedMinutes(u: User): number | null {
  if (!u.lockedUntil) return null;
  const ms = u.lockedUntil.getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60000) : null;
}

/* 🆕 همگام‌سازی نام از پرسنل هنگام لاگین (بستن gap کاربر bootstrap) */
async function syncFullNameFromPersonnel(nationalId: string, currentFullName: string): Promise<string> {
  try {
    const person = await db
      .select({ fullName: personnel.fullName, fullNamePrefixed: personnel.fullNamePrefixed })
      .from(personnel)
      .where(eq(personnel.nationalId, nationalId))
      .limit(1);
    if (!person.length) return currentFullName;
    const best = person[0].fullNamePrefixed || person[0].fullName;
    if (best && best !== currentFullName) {
      await db.update(users).set({ fullName: best, updatedAt: new Date() }).where(eq(users.nationalId, nationalId));
      return best;
    }
    return currentFullName;
  } catch {
    return currentFullName; // هرگز لاگین را به خاطر نام خراب نکن
  }
}

/* ─────────── مرحله ۱: بررسی کد ملی ─────────── */
export async function submitCode(nationalId: string, meta: ClientMeta) {
  const existing = await db.select().from(users).where(eq(users.nationalId, nationalId)).limit(1);
  const anyUser = await db.select({ id: users.id }).from(users).limit(1);
  const bootstrap = anyUser.length === 0;

  if (existing.length) {
    const u = existing[0];
    if (!u.isActive) {
      await logAudit({ type: 'login.disabled', actorId: nationalId, ...meta });
      throw new AppError('ACCOUNT_DISABLED', 403);
    }
    const mins = lockedMinutes(u);
    if (mins !== null) throw new AppError(`ACCOUNT_LOCKED:${mins}`, 423);

    const step: 'password' | 'setup' = u.passwordHash ? 'password' : 'setup';
    return { status: step, bootstrap: false, ticket: signFlow(nationalId, step, false) };
  }

  // Bootstrap: اولین کاربر سامانه
  if (bootstrap) {
    return { status: 'setup', bootstrap: true, ticket: signFlow(nationalId, 'setup', true) };
  }

  // Self-Provisioning
  const selfProvision = await isSelfProvisionEnabled();
  if (!selfProvision) throw new AppError('REGISTRATION_DISABLED', 403);

  const person = await db.select().from(personnel).where(eq(personnel.nationalId, nationalId)).limit(1);
  if (!person.length) {
    await logAudit({ type: 'login.unknown_id', actorId: nationalId, ...meta });
    throw new AppError('NOT_REGISTERED', 404);
  }

  return { status: 'setup', bootstrap: false, ticket: signFlow(nationalId, 'setup', false) };
}

/* ─────────── مرحله ۲: ورود با رمز ─────────── */
export async function submitPassword(ticket: string, password: string, meta: ClientMeta): Promise<SessionResult> {
  const payload = verifyFlow(ticket);
  if (!payload || payload.step !== 'password') throw new AppError('INVALID_TICKET', 400);

  const rows = await db.select().from(users).where(eq(users.nationalId, payload.sub)).limit(1);
  if (!rows.length) throw new AppError('INVALID_TICKET', 400);
  const u = rows[0];

  if (!u.isActive) throw new AppError('ACCOUNT_DISABLED', 403);
  const mins = lockedMinutes(u);
  if (mins !== null) throw new AppError(`ACCOUNT_LOCKED:${mins}`, 423);

  const ok = u.passwordHash ? await verifyPassword(password, u.passwordHash) : false;

  if (!ok) {
    const failures = (u.loginFailures ?? 0) + 1;
    const lock = failures >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MS) : null;
    await db
      .update(users)
      .set({ loginFailures: failures, lockedUntil: lock, updatedAt: new Date() })
      .where(eq(users.nationalId, u.nationalId));
    await logAudit({ type: 'login.failed', actorId: u.nationalId, meta: `failures=${failures}`, ...meta });
    if (lock) throw new AppError('ACCOUNT_LOCKED:15', 423);
    throw new AppError(`BAD_CREDENTIALS:${MAX_ATTEMPTS - failures}`, 401);
  }

  await db
    .update(users)
    .set({ loginFailures: 0, lockedUntil: null, lastLoginAt: new Date(), lastActivityAt: new Date(), updatedAt: new Date() })
    .where(eq(users.nationalId, u.nationalId));
  await logAudit({ type: 'login.success', actorId: u.nationalId, ...meta });

  // 🆕 همگام‌سازی نام از پرسنل
  const fullName = await syncFullNameFromPersonnel(u.nationalId, u.fullName);
  return issueSession({ ...u, fullName });
}

/* ─────────── ساخت رمز جدید (Bootstrap / Reset) ─────────── */
export async function completeSetup(ticket: string, password: string, meta: ClientMeta): Promise<SessionResult> {
  const payload = verifyFlow(ticket);
  if (!payload || payload.step !== 'setup') throw new AppError('INVALID_TICKET', 400);

  const nationalId = payload.sub;
  const hash = await hashPassword(password);
  const now = new Date();

  const existing = await db.select().from(users).where(eq(users.nationalId, nationalId)).limit(1);

  if (existing.length) {
    const u = existing[0];
    if (u.passwordHash) throw new AppError('PASSWORD_EXISTS', 409);
    await db
      .update(users)
      .set({
        passwordHash: hash,
        passwordSalt: null,
        lastLoginAt: now,
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(eq(users.nationalId, nationalId));
  } else {
    const person = await db.select().from(personnel).where(eq(personnel.nationalId, nationalId)).limit(1);
    const role = payload.bootstrap ? 'super_admin' : 'user';
    const fullName = person[0]?.fullNamePrefixed || person[0]?.fullName || nationalId;
    await db.insert(users).values({
      nationalId,
      fullName,
      role,
      passwordHash: hash,
      lastLoginAt: now,
      lastActivityAt: now,
    });
  }

  const created = await db.select().from(users).where(eq(users.nationalId, nationalId)).limit(1);
  await logAudit({ type: 'auth.setup', actorId: nationalId, meta: `role=${created[0].role}`, ...meta });

  // 🆕 همگام‌سازی نام از پرسنل (برای حالت reset توسط ادمین)
  const fullName = await syncFullNameFromPersonnel(nationalId, created[0].fullName);
  return issueSession({ ...created[0], fullName });
}

/* ─────────── تغییر رمز عبور (کاربر لاگین‌کرده) ─────────── */
export async function changePassword(
  nationalId: string,
  currentPassword: string,
  newPassword: string,
  meta: ClientMeta
) {
  const rows = await db.select().from(users).where(eq(users.nationalId, nationalId)).limit(1);
  if (!rows.length) throw new AppError('INVALID_TOKEN', 401);
  const u = rows[0];

  if (!u.passwordHash) throw new AppError('NO_PASSWORD_SET', 409);

  const ok = await verifyPassword(currentPassword, u.passwordHash);
  if (!ok) {
    await logAudit({ type: 'auth.password_change_failed', actorId: nationalId, meta: 'wrong_current', ...meta });
    throw new AppError('BAD_CURRENT_PASSWORD', 401);
  }

  const same = await verifyPassword(newPassword, u.passwordHash);
  if (same) throw new AppError('PASSWORD_SAME_AS_OLD', 400);

  const hash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash: hash, passwordSalt: null, updatedAt: new Date() })
    .where(eq(users.nationalId, nationalId));

  await logAudit({ type: 'auth.password_changed', actorId: nationalId, ...meta });
  return { ok: true };
}

/* ─────────── تمدید توکن ─────────── */
export async function refresh(refreshToken: string) {
  const payload = verifyRefresh(refreshToken);
  if (!payload) throw new AppError('INVALID_REFRESH', 401);

  const rows = await db.select().from(users).where(eq(users.nationalId, payload.sub)).limit(1);
  if (!rows.length || !rows[0].isActive) throw new AppError('INVALID_REFRESH', 401);

  const u = rows[0];
  return { tokens: { accessToken: signAccess(u.nationalId, u.role), refreshToken: signRefresh(u.nationalId) } };
}

/* ─────────── اطلاعات کاربر فعلی ─────────── */
export async function me(nationalId: string) {
  const rows = await db.select().from(users).where(eq(users.nationalId, nationalId)).limit(1);
  if (!rows.length) throw new AppError('INVALID_TOKEN', 401);
  const u = rows[0];
  return {
    nationalId: u.nationalId,
    role: u.role,
    fullName: u.fullName,
    isActive: u.isActive,
    permissions: u.permissions ?? [],
    deniedPermissions: u.deniedPermissions ?? [],
    lastLoginAt: u.lastLoginAt,
  };
}