import { Request, Response, NextFunction } from 'express';
import { hasScopedPermission, type Permission, type Scope } from '@shared/permissions';
import { AppError } from '../lib/errors';

/**
 * بررسی دسترسی ریزدانه (permission-based) با منطق:
 * denied کاربر > override کاربر > Grant پیش‌فرض نقش
 *
 * @param permission کلید دسترسی (مثلاً 'personnel.import')
 * @param scopes لیست scopeهای مجاز (اختیاری — اگر null، هر scope قبول است)
 */
export function requirePermission(permission: Permission, scopes?: Scope[] | null) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      next(new AppError('NO_TOKEN', 401));
      return;
    }

    const ok = hasScopedPermission(user.role, permission, scopes ?? null, {
      permissions: user.permissions ?? null,
      deniedPermissions: user.deniedPermissions ?? null,
    });

    if (!ok) {
      next(new AppError('FORBIDDEN_PERMISSION', 403));
      return;
    }

    next();
  };
}

/**
 * محدودسازی ساده بر اساس نقش (برای مسیرهای قدیمی).
 * برای مسیرهای جدید از requirePermission استفاده کنید.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      next(new AppError('NO_TOKEN', 401));
      return;
    }
    if (!roles.includes(user.role)) {
      next(new AppError('FORBIDDEN_ROLE', 403));
      return;
    }
    next();
  };
}