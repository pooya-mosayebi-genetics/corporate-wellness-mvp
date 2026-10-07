export class AppError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export const AUTH_MESSAGES: Record<string, { fa: string; en: string; status: number }> = {
  // ─── Auth Flow ───────────────────────────────────────────
  ACCOUNT_DISABLED: {
    fa: 'حساب شما غیرفعال است؛ با مدیر سامانه تماس بگیرید.',
    en: 'Account disabled; contact administrator.',
    status: 403,
  },
  ACCOUNT_LOCKED: {
    fa: 'حساب موقتاً قفل است؛ {n} دقیقه دیگر تلاش کنید.',
    en: 'Account locked; try again in {n} minutes.',
    status: 423,
  },
  REGISTRATION_DISABLED: {
    fa: 'ثبت‌نام خودکار غیرفعال است؛ با مدیر تماس بگیرید.',
    en: 'Self-registration is disabled; contact administrator.',
    status: 403,
  },
  NOT_REGISTERED: {
    fa: 'این کد ملی در سامانه ثبت نشده است.',
    en: 'This national ID is not registered.',
    status: 404,
  },
  INVALID_TICKET: {
    fa: 'جلسه منقضی شده است؛ از مرحله اول شروع کنید.',
    en: 'Session expired; start over.',
    status: 400,
  },
  BAD_CREDENTIALS: {
    fa: 'رمز عبور اشتباه است؛ {n} تلاش باقی‌مانده.',
    en: 'Incorrect password; {n} attempts left.',
    status: 401,
  },
  WEAK_PASSWORD: {
    fa: 'رمز عبور شرایط پیچیدگی را ندارد.',
    en: 'Password does not meet complexity rules.',
    status: 400,
  },
  PASSWORD_EXISTS: {
    fa: 'رمز عبور قبلاً تنظیم شده است.',
    en: 'Password already set.',
    status: 409,
  },

  // ─── Tokens ─────────────────────────────────────────────
  NO_TOKEN: { fa: 'ورود لازم است.', en: 'Authentication required.', status: 401 },
  INVALID_TOKEN: { fa: 'توکن نامعتبر یا منقضی است.', en: 'Invalid or expired token.', status: 401 },
  INVALID_REFRESH: { fa: 'لطفاً دوباره وارد شوید.', en: 'Please sign in again.', status: 401 },

  // ─── Change Password ─────────────────────────────────────
  BAD_CURRENT_PASSWORD: {
    fa: 'رمز فعلی اشتباه است.',
    en: 'Current password is incorrect.',
    status: 401,
  },
  PASSWORD_SAME_AS_OLD: {
    fa: 'رمز جدید نباید با رمز فعلی یکسان باشد.',
    en: 'New password must differ from the current one.',
    status: 400,
  },
  NO_PASSWORD_SET: {
    fa: 'برای این حساب رمزی تنظیم نشده است.',
    en: 'No password set for this account.',
    status: 409,
  },

  // ─── Permissions & Roles ─────────────────────────────────
  FORBIDDEN_ROLE: {
    fa: 'شما دسترسی لازم برای این عملیات را ندارید.',
    en: 'You do not have permission for this operation.',
    status: 403,
  },
  FORBIDDEN_PERMISSION: {
    fa: 'دسترسی لازم برای این عملیات را ندارید.',
    en: 'You do not have the required permission for this operation.',
    status: 403,
  },

  // ─── User Management ─────────────────────────────────────
  USER_NOT_FOUND: {
    fa: 'کاربر یافت نشد.',
    en: 'User not found.',
    status: 404,
  },
  USER_EXISTS: {
    fa: 'این کد ملی قبلاً حساب کاربری دارد.',
    en: 'This national ID already has an account.',
    status: 409,
  },
  SELF_MODIFICATION: {
    fa: 'امکان تغییر حساب خودتان وجود ندارد.',
    en: 'You cannot modify your own account.',
    status: 403,
  },
  LAST_SUPER_ADMIN: {
    fa: 'حداقل یک مدیر ارشد فعال باید باقی بماند.',
    en: 'At least one active super admin must remain.',
    status: 409,
  },
  INVALID_ROLE: {
    fa: 'نقش نامعتبر است.',
    en: 'Invalid role.',
    status: 400,
  },
  INVALID_PERMISSION: {
    fa: 'کلید دسترسی نامعتبر است.',
    en: 'Invalid permission key.',
    status: 400,
  },
};