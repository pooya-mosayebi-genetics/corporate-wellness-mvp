/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · گارد لایهٔ داده (L-04)
 *  بررسی permission قبل از هر mutation در Contextها.
 *  اگر دسترسی نباشد، Error throw می‌شود + audit log بحرانی.
 * ─────────────────────────────────────────────────────────────
 */
import { hasPermission, type Permission } from './permissions';
import type { UserAccount, Session } from '../types/auth';
import type { BreakGlassGrant } from '../types/breakGlass';
/** خطای سفارشی برای رد دسترسی در لایهٔ داده */
export class PermissionDeniedError extends Error {
  constructor(
    public permission: Permission,
    public messageFa: string,
    public messageEn?: string,
  ) {
    super(messageFa);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * چک permission قبل از mutation.
 * اگر دسترسی نباشد، PermissionDeniedError throw می‌شود.
 */
export function requirePermission(
  session: Session | null | undefined,
  account: UserAccount | null | undefined,
  permission: Permission,
  messageFa: string,
  messageEn?: string,
): void {
  if (!session) {
    throw new PermissionDeniedError(
      permission,
      'نشست فعال نیست. لطفاً دوباره وارد شوید.',
      'No active session. Please log in again.',
    );
  }

  const has = hasPermission(
    (account?.permissions ?? []) as Permission[],
    (account?.deniedPermissions ?? []) as Permission[],
    session.role,
    permission,
  );

  if (!has) {
    throw new PermissionDeniedError(permission, messageFa, messageEn);
  }
}

/**
 * چک سریع بدون throw — فقط boolean برمی‌گرداند.
 */
export function checkPermission(
  session: Session | null | undefined,
  account: UserAccount | null | undefined,
  permission: Permission,
): boolean {
  if (!session) return false;
  return hasPermission(
    (account?.permissions ?? []) as Permission[],
    (account?.deniedPermissions ?? []) as Permission[],
    session.role,
    permission,
  );
}

/**
 * 🆕 L-08: چک کند کاربر حداقل یکی از permissionهای داده‌شده را داشته باشد.
 * اگر نداشت، PermissionDeniedError throw می‌کند.
 */
export function requireAnyPermission(
  session: Session | null | undefined,
  account: UserAccount | null | undefined,
  permissions: Permission[],
  messageFa: string,
  messageEn?: string,
): void {
  if (!session) {
    throw new PermissionDeniedError(
      permissions[0],
      'نشست فعال نیست. لطفاً دوباره وارد شوید.',
      'No active session. Please log in again.',
    );
  }

  const allowed = permissions.some((p) =>
    hasPermission(
      (account?.permissions ?? []) as Permission[],
      (account?.deniedPermissions ?? []) as Permission[],
      session.role,
      p,
    ),
  );

  if (!allowed) {
    throw new PermissionDeniedError(permissions[0], messageFa, messageEn);
  }
}
/**
 * 🆕 L-10: بررسی گیت بالینی با پشتیبانی break-glass.
 *
 * منطق:
 *  - اگر کاربر به‌طور عادی permission بالینی دارد → allow
 *  - اگر ندارد ولی grant break-glass معتبر برای این target دارد → allow (و callback onUse)
 *  - در غیر این صورت → deny (PermissionDeniedError)
 */
export function requireClinicalAccessWithBreakGlass(
  session: Session | null | undefined,
  account: UserAccount | null | undefined,
  permission: Permission,
  targetId: string,
  activeGrant: BreakGlassGrant | null,
  messageFa: string,
  messageEn?: string,
  onUse?: (grant: BreakGlassGrant) => void,
): void {
  if (!session) {
    throw new PermissionDeniedError(permission, 'نشست فعال نیست. لطفاً دوباره وارد شوید.', 'No active session.');
  }

  const normal = hasPermission(
    (account?.permissions ?? []) as Permission[],
    (account?.deniedPermissions ?? []) as Permission[],
    session.role,
    permission,
  );
  if (normal) return;

  // بررسی break-glass
  if (activeGrant && !activeGrant.revoked && activeGrant.expiresAt > Date.now()) {
    if (activeGrant.actorId === session.nationalId && activeGrant.targetId === targetId) {
      // فقط اگر permission داخل scope grant باشد
      if ((activeGrant.scope as string[]).includes(permission)) {
        onUse?.(activeGrant);
        return;
      }
    }
  }

  throw new PermissionDeniedError(permission, messageFa, messageEn);
}