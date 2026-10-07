/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · ماتریس دسترسی چندسطحی (نقش × Permission × Scope × بخش پرونده)
 *  منطق: denied کاربر > override کاربر > Grant پیش‌فرض نقش
 * ─────────────────────────────────────────────────────────────
 */

import { APP_ROLES, normalizeRole, type AppRole } from './roles';

export type Scope = 'self' | 'assigned' | 'org' | 'event' | 'aggregate' | 'global';

export const PERMISSION_KEYS = [
  // گزارش‌ها و داشبوردها
  'reports.view',
  'reports.export_pdf',
  'dashboard.coach.view',
  'dashboard.hr.view',
  'summary.weekly.view',

  // مراجعین و پرونده
  'clients.list.view',
  'client.record.view',
  'client.record.edit_identity',
  'analysis.view',
  'analysis.upload',
  'approvals.grant',

  // بخش‌های پرونده (مشاهده)
  'section.nutrition.view',
  'section.diet_plan.view',
  'section.exercise.view',
  'section.medical_internal.view',
  'section.sports_medicine.view',
  'section.radiology.view',
  'section.cardiology.view',
  'section.nursing.view',
  'section.labs.view',
  'section.body_composition.view',
  'section.imaging_3d.view',

  // بخش‌های پرونده (ویرایش)
  'section.nutrition.edit',
  'section.diet_plan.edit',
  'section.exercise.edit',
  'section.medical_internal.edit',
  'section.sports_medicine.edit',
  'section.radiology.edit',
  'section.cardiology.edit',
  'section.nursing.edit',
  'section.labs.edit',
  'section.body_composition.edit',

  // Finalize / ثبت تخصصی
  'radiology.finalize',
  'cardiology.finalize',
  'cardiology.ecg.register',

  // دادهٔ ورودی
  'meal.self.log',
  'meal.self.edit',
  'meal.others.log',
  'meal.others.view',
  'diet.self.view',
  'diet.self.edit',
  'diet.design',
  'diet.change_request',

  // سازمان
  'personnel.view',
  'personnel.scores.view',
  'personnel.manage',
  'personnel.import',
  'org.manage',
  'users.manage',

  // سیستم
  'audit.view',
  'backup.export',
  'backup.restore',
  'access.manage',
  'data.export',
  'food.import',
  'content.manage',
  'challenge.manage',
  'system.tests.view',
] as const;

export type Permission = (typeof PERMISSION_KEYS)[number];

export interface PermissionDef {
  key: Permission;
  fa: string;
  en: string;
  group: string;
  groupFa: string;
  dangerous?: boolean;
}

const D = (
  key: Permission,
  fa: string,
  en: string,
  group: string,
  groupFa: string,
  dangerous?: boolean,
): PermissionDef => ({ key, fa, en, group, groupFa, dangerous });

export const PERMISSIONS: PermissionDef[] = [
  D('reports.view', 'دیدن گزارش‌ها', 'View reports', 'reports', 'گزارش‌ها'),
  D('reports.export_pdf', 'خروجی/PDF گزارش', 'Export PDF', 'reports', 'گزارش‌ها'),
  D('dashboard.coach.view', 'دیدن داشبورد کوچ', 'Coach dashboard', 'dashboards', 'داشبوردها'),
  D('dashboard.hr.view', 'دیدن داشبورد HR', 'HR dashboard', 'dashboards', 'داشبوردها'),
  D('summary.weekly.view', 'دیدن خلاصهٔ هفتگی', 'Weekly summary', 'reports', 'گزارش‌ها'),

  D('clients.list.view', 'دیدن لیست مراجعین', 'Clients list', 'clients', 'مراجعین'),
  D('client.record.view', 'دیدن پروندهٔ مراجع', 'View client record', 'clients', 'مراجعین'),
  D('client.record.edit_identity', 'ویرایش اطلاعات هویتی/اداری', 'Edit identity info', 'clients', 'مراجعین'),
  D('analysis.view', 'دیدن آنالیز بدن', 'View body analysis', 'clients', 'مراجعین'),
  D('analysis.upload', 'آپلود آنالیز/تصاویر', 'Upload analysis', 'clients', 'مراجعین'),
  D('approvals.grant', 'امتیازات تأیید', 'Grant approvals', 'ops', 'عملیات'),

  D('section.nutrition.view', 'مشاهدهٔ بخش تغذیه', 'View nutrition section', 'sections', 'بخش‌های پرونده'),
  D('section.diet_plan.view', 'مشاهدهٔ رژیم', 'View diet plan', 'sections', 'بخش‌های پرونده'),
  D('section.exercise.view', 'مشاهدهٔ بخش ورزش', 'View exercise section', 'sections', 'بخش‌های پرونده'),
  D('section.medical_internal.view', 'مشاهدهٔ بخش داخلی', 'View internal section', 'sections', 'بخش‌های پرونده'),
  D('section.sports_medicine.view', 'مشاهدهٔ پزشکی ورزشی', 'View sports medicine', 'sections', 'بخش‌های پرونده'),
  D('section.radiology.view', 'مشاهدهٔ رادیولوژی', 'View radiology', 'sections', 'بخش‌های پرونده'),
  D('section.cardiology.view', 'مشاهدهٔ قلب/ECG', 'View cardiology', 'sections', 'بخش‌های پرونده'),
  D('section.nursing.view', 'مشاهدهٔ پرستاری', 'View nursing', 'sections', 'بخش‌های پرونده'),
  D('section.labs.view', 'مشاهدهٔ آزمایش‌ها', 'View labs', 'sections', 'بخش‌های پرونده'),
  D('section.body_composition.view', 'مشاهدهٔ ترکیب بدن', 'View body composition', 'sections', 'بخش‌های پرونده'),
  D('section.imaging_3d.view', 'مشاهدهٔ اسکن سه‌بعدی', 'View 3D scan', 'sections', 'بخش‌های پرونده'),

  D('section.nutrition.edit', 'ویرایش بخش تغذیه', 'Edit nutrition section', 'sections', 'بخش‌های پرونده'),
  D('section.diet_plan.edit', 'ویرایش/طراحی رژیم', 'Edit diet plan', 'sections', 'بخش‌های پرونده'),
  D('section.exercise.edit', 'ویرایش بخش ورزش', 'Edit exercise section', 'sections', 'بخش‌های پرونده'),
  D('section.medical_internal.edit', 'ویرایش بخش داخلی', 'Edit internal section', 'sections', 'بخش‌های پرونده'),
  D('section.sports_medicine.edit', 'ویرایش پزشکی ورزشی', 'Edit sports medicine', 'sections', 'بخش‌های پرونده'),
  D('section.radiology.edit', 'ویرایش رادیولوژی', 'Edit radiology', 'sections', 'بخش‌های پرونده'),
  D('section.cardiology.edit', 'ویرایش قلب/ECG', 'Edit cardiology', 'sections', 'بخش‌های پرونده'),
  D('section.nursing.edit', 'ثبت دادهٔ پرستاری', 'Edit nursing data', 'sections', 'بخش‌های پرونده'),
  D('section.labs.edit', 'ویرایش آزمایش‌ها', 'Edit labs', 'sections', 'بخش‌های پرونده'),
  D('section.body_composition.edit', 'ویرایش ترکیب بدن', 'Edit body composition', 'sections', 'بخش‌های پرونده'),

  D('radiology.finalize', 'Finalize گزارش رادیولوژی', 'Finalize radiology report', 'sections', 'بخش‌های پرونده', true),
  D('cardiology.finalize', 'Finalize گزارش قلب', 'Finalize cardiology report', 'sections', 'بخش‌های پرونده', true),
  D('cardiology.ecg.register', 'ثبت ECG', 'Register ECG', 'sections', 'بخش‌های پرونده'),

  D('meal.self.log', 'ثبت وعدهٔ خود', 'Log own meals', 'intake', 'داده‌های ورودی'),
  D('meal.self.edit', 'ویرایش وعدهٔ خود', 'Edit own meals', 'intake', 'داده‌های ورودی'),
  D('meal.others.log', 'ثبت/ویرایش وعدهٔ دیگران', 'Log meals for others', 'intake', 'داده‌های ورودی'),
  D('meal.others.view', 'مشاهدهٔ وعده دیگران', 'View others meals', 'intake', 'داده‌های ورودی'),
  D('diet.self.view', 'دیدن رژیم خود', 'View own diet', 'intake', 'داده‌های ورودی'),
  D('diet.self.edit', 'ویرایش رژیم خود', 'Edit own diet', 'intake', 'داده‌های ورودی'),
  D('diet.design', 'طراحی رژیم برای دیگران', 'Design diet for others', 'intake', 'داده‌های ورودی'),
  D('diet.change_request', 'درخواست اصلاح رژیم', 'Request diet change', 'intake', 'داده‌های ورودی'),

  D('personnel.view', 'دیدن پرسنل', 'View personnel', 'org', 'سازمان'),
  D('personnel.scores.view', 'دیدن امتیازات پرسنل', 'View personnel scores', 'org', 'سازمان'),
  D('personnel.manage', 'مدیریت پرسنل', 'Manage personnel', 'org', 'سازمان'),
  D('personnel.import', 'ایمپورت پرسنل', 'Import personnel', 'org', 'سازمان'),
  D('org.manage', 'مدیریت سازمان', 'Manage organization', 'org', 'سازمان', true),
  D('users.manage', 'مدیریت کاربران', 'Manage users', 'org', 'سازمان'),

  D('audit.view', 'دیدن لاگ ممیزی', 'View audit log', 'system', 'سیستم'),
  D('backup.export', 'خروجی پشتیبان', 'Export backup', 'system', 'سیستم'),
  D('backup.restore', 'بازیابی پشتیبان', 'Restore backup', 'system', 'سیستم', true),
  D('access.manage', 'مدیریت دسترسی‌ها', 'Access management', 'system', 'سیستم', true),
  D('data.export', 'خروجی دادهٔ تحلیل', 'Export analysis data', 'system', 'سیستم'),
  D('food.import', 'ایمپورت دیتابیس غذا', 'Import food DB', 'system', 'سیستم'),
  D('content.manage', 'مدیریت محتوا', 'Content management', 'system', 'سیستم'),
  D('challenge.manage', 'مدیریت چالش‌ها', 'Challenge management', 'system', 'سیستم'),
  D('system.tests.view', 'صفحهٔ تست‌ها', 'Tests page', 'system', 'سیستم', true),
];

export interface Grant {
  p: Permission;
  s: Scope;
}

const g = (p: Permission, s: Scope = 'org'): Grant => ({ p, s });

const ALL_GLOBAL: Grant[] = PERMISSION_KEYS.map((p) => ({ p, s: 'global' as Scope }));

/** ماتریس اصلی: نقش → Grantها */
export const ROLE_GRANTS: Record<AppRole, Grant[]> = {
  super_admin: ALL_GLOBAL,

  it_admin: [
    // ⛔ L-10: دسترسی بالینی حذف شد؛ فقط break-glass مجاز است
    g('meal.self.log', 'self'),
    g('meal.self.edit', 'self'),
    g('diet.self.view', 'self'),

    g('users.manage', 'global'),
    g('audit.view', 'global'),
    g('backup.export', 'global'),
    g('backup.restore', 'global'),
    g('access.manage', 'global'),
    g('system.tests.view', 'global'),
  ],

  org_owner: [
    g('reports.view'),
    g('reports.export_pdf'),
    g('dashboard.coach.view'),
    g('dashboard.hr.view'),
    g('summary.weekly.view'),

    g('clients.list.view'),
    g('client.record.view'),
    g('client.record.edit_identity'),
    g('analysis.view'),

    g('approvals.grant', 'event'),
    g('meal.others.log'),
    g('meal.self.log', 'self'),
    g('meal.self.edit', 'self'),
    g('diet.self.view', 'self'),

    g('section.nutrition.view'),
    g('section.diet_plan.view'),
    g('section.exercise.view'),
    g('section.body_composition.view'),
    g('section.labs.view'),
    g('section.imaging_3d.view'),
    g('section.medical_internal.view'),
    g('section.sports_medicine.view'),
    g('section.radiology.view'),
    g('section.cardiology.view'),
    g('section.nursing.view'),

    g('personnel.view'),
    g('personnel.scores.view'),
    g('personnel.manage'),
    g('personnel.import'),
    g('org.manage'),
    g('users.manage'),
    g('audit.view'),
    g('backup.export'),
    g('access.manage'),

    g('food.import'),
    g('content.manage'),
    g('challenge.manage'),
  ],

  org_admin: [
    g('reports.view'),
    g('reports.export_pdf'),
    g('dashboard.coach.view'),
    g('dashboard.hr.view'),
    g('summary.weekly.view'),

    g('clients.list.view'),
    g('client.record.view'),
    g('client.record.edit_identity'),
    g('analysis.view'),

    g('approvals.grant', 'event'),
    g('meal.self.log', 'self'),
    g('meal.self.edit', 'self'),
    g('diet.self.view', 'self'),

    g('section.nutrition.view'),
    g('section.diet_plan.view'),
    g('section.exercise.view'),
    g('section.body_composition.view'),
    g('section.labs.view'),
    g('section.imaging_3d.view'),
    g('section.nursing.view'),

    g('personnel.view'),
    g('personnel.scores.view'),
    g('personnel.manage'),
    g('personnel.import'),
    g('org.manage'),
    g('users.manage'),
    g('audit.view'),
    g('access.manage'),
  ],

  nutritionist: [
    g('reports.view', 'assigned'),
    g('reports.export_pdf', 'assigned'),
    g('summary.weekly.view', 'assigned'),

    g('clients.list.view', 'assigned'),
    g('client.record.view', 'assigned'),
    g('analysis.view', 'assigned'),

    g('meal.self.log', 'self'),
    g('meal.self.edit', 'self'),
    g('meal.others.log', 'assigned'),

    g('diet.self.view', 'self'),
    g('diet.self.edit', 'self'),
    g('diet.design', 'assigned'),

    g('section.nutrition.view', 'assigned'),
    g('section.nutrition.edit', 'assigned'),
    g('section.diet_plan.view', 'assigned'),
    g('section.diet_plan.edit', 'assigned'),
    g('section.body_composition.view', 'assigned'),
    g('section.imaging_3d.view', 'assigned'),
    g('section.labs.view', 'assigned'),
    g('section.exercise.view', 'assigned'),
  ],

  coach: [
    g('dashboard.coach.view', 'assigned'),
    g('reports.view', 'assigned'),
    g('reports.export_pdf', 'assigned'),
    g('summary.weekly.view', 'assigned'),
    g('clients.list.view', 'assigned'),
    g('client.record.view', 'assigned'),
    g('analysis.view', 'assigned'),

    g('meal.self.log', 'self'),
    g('meal.self.edit', 'self'),
    g('diet.self.view', 'self'),

    g('section.exercise.view', 'assigned'),
    g('section.exercise.edit', 'assigned'),
    g('section.body_composition.view', 'assigned'),
  ],

  doctor_internal: [
    g('reports.view', 'assigned'),
    g('reports.export_pdf', 'assigned'),
    g('summary.weekly.view', 'assigned'),

    g('clients.list.view', 'assigned'),
    g('client.record.view', 'assigned'),
    g('analysis.view', 'assigned'),

    g('meal.others.view', 'assigned'),
    g('diet.self.view', 'self'),

    g('section.medical_internal.view', 'assigned'),
    g('section.medical_internal.edit', 'assigned'),
    g('section.labs.view', 'assigned'),
    g('section.body_composition.view', 'assigned'),
    g('section.nutrition.view', 'assigned'),
    g('section.diet_plan.view', 'assigned'),
  ],

  doctor_sports: [
    g('reports.view', 'assigned'),
    g('reports.export_pdf', 'assigned'),
    g('dashboard.coach.view', 'assigned'),
    g('summary.weekly.view', 'assigned'),

    g('clients.list.view', 'assigned'),
    g('client.record.view', 'assigned'),
    g('analysis.view', 'assigned'),
    g('meal.others.view', 'assigned'),
    g('diet.self.view', 'self'),

    g('section.sports_medicine.view', 'assigned'),
    g('section.sports_medicine.edit', 'assigned'),
    g('section.exercise.view', 'assigned'),
    g('section.body_composition.view', 'assigned'),
    g('section.labs.view', 'assigned'),
  ],

  doctor_radiology: [
    g('reports.view', 'assigned'),
    g('reports.export_pdf', 'assigned'),

    g('clients.list.view', 'assigned'),
    g('client.record.view', 'assigned'),
    g('analysis.view', 'assigned'),

    g('section.radiology.view', 'assigned'),
    g('section.radiology.edit', 'assigned'),
    g('radiology.finalize', 'assigned'),
    g('section.labs.view', 'assigned'),
    g('section.body_composition.view', 'assigned'),
  ],

  doctor_cardiology: [
    g('reports.view', 'assigned'),
    g('reports.export_pdf', 'assigned'),
    g('summary.weekly.view', 'assigned'),

    g('clients.list.view', 'assigned'),
    g('client.record.view', 'assigned'),
    g('analysis.view', 'assigned'),

    g('section.cardiology.view', 'assigned'),
    g('section.cardiology.edit', 'assigned'),
    g('cardiology.finalize', 'assigned'),
    g('section.labs.view', 'assigned'),
    g('section.body_composition.view', 'assigned'),
  ],

  nurse: [
    g('clients.list.view', 'assigned'),
    g('client.record.view', 'assigned'),
    g('analysis.view', 'assigned'),
    g('summary.weekly.view', 'assigned'),
    g('diet.self.view', 'self'),

    g('section.nursing.view', 'assigned'),
    g('section.nursing.edit', 'assigned'),
    g('section.labs.view', 'assigned'),
    g('section.diet_plan.view', 'assigned'),
    g('section.body_composition.view', 'assigned'),
  ],

  rad_assistant: [
    g('clients.list.view', 'assigned'),
    g('client.record.view', 'assigned'),
    g('analysis.view', 'assigned'),
    g('analysis.upload', 'assigned'),

    g('section.radiology.view', 'assigned'),
    g('section.radiology.edit', 'assigned'),
  ],

  cardio_assistant: [
    g('clients.list.view', 'assigned'),
    g('client.record.view', 'assigned'),
    g('analysis.view', 'assigned'),
    g('analysis.upload', 'assigned'),
    g('cardiology.ecg.register', 'assigned'),

    g('section.cardiology.view', 'assigned'),
    g('section.nursing.edit', 'assigned'),
  ],

  hr_admin: [
    g('dashboard.hr.view', 'aggregate'),
    g('reports.view', 'aggregate'),
    g('reports.export_pdf', 'aggregate'),
    g('summary.weekly.view', 'aggregate'),
    g('analysis.view', 'aggregate'),

    g('personnel.view'),
    g('personnel.scores.view'),
    g('personnel.manage'),
    g('personnel.import'),
    g('org.manage'),
    g('users.manage'),

    g('meal.self.log', 'self'),
    g('meal.self.edit', 'self'),
    g('diet.self.view', 'self'),
  ],

  hr_viewer: [
    g('dashboard.hr.view', 'aggregate'),
    g('reports.view', 'aggregate'),
    g('summary.weekly.view', 'aggregate'),
    g('analysis.view', 'aggregate'),

    g('personnel.view'),
    g('personnel.scores.view'),

    g('meal.self.log', 'self'),
    g('meal.self.edit', 'self'),
    g('diet.self.view', 'self'),
  ],

  reception: [
    g('clients.list.view'),
    g('client.record.view'),
    g('client.record.edit_identity'),

    g('personnel.view'),
    g('personnel.manage'),

    g('meal.self.log', 'self'),
    g('meal.self.edit', 'self'),
    g('diet.self.view', 'self'),
  ],

  event_manager: [
    g('reports.view', 'event'),
    g('reports.export_pdf', 'event'),
    g('dashboard.coach.view', 'event'),
    g('dashboard.hr.view', 'event'),
    g('summary.weekly.view', 'event'),

    g('clients.list.view', 'event'),
    g('client.record.view', 'event'),
    g('client.record.edit_identity', 'event'),
    g('analysis.view', 'event'),
    g('approvals.grant', 'event'),

    g('personnel.view', 'event'),
    g('personnel.scores.view', 'event'),
    g('personnel.manage', 'event'),
    g('challenge.manage', 'event'),

    g('meal.self.log', 'self'),
    g('meal.self.edit', 'self'),
    g('diet.self.view', 'self'),
  ],

  data_analyst: [
    g('reports.view'),
    g('reports.export_pdf'),
    g('dashboard.coach.view'),
    g('dashboard.hr.view'),
    g('summary.weekly.view'),

    g('clients.list.view'),
    g('client.record.view'),
    g('analysis.view'),

    g('data.export'),

    g('meal.self.log', 'self'),
    g('meal.self.edit', 'self'),
    g('diet.self.view', 'self'),
  ],

  user: [
    g('reports.view', 'self'),
    g('reports.export_pdf', 'self'),
    g('summary.weekly.view', 'self'),

    g('client.record.view', 'self'),
    g('client.record.edit_identity', 'self'),
    g('analysis.view', 'self'),
    g('analysis.upload', 'self'), // 🆕 کاربر عادی بتواند آنالیز خودش را ثبت کند

    g('meal.self.log', 'self'),
    g('meal.self.edit', 'self'),

    g('diet.self.view', 'self'),
    g('diet.change_request', 'self'),

    g('section.body_composition.view', 'self'),
    g('section.nutrition.view', 'self'),
    g('section.diet_plan.view', 'self'),
    g('section.exercise.view', 'self'),
  ],
};

export function grantsOf(role: string | null | undefined): Grant[] {
  const r = normalizeRole(role);

  // ✅ Safety: super_admin همیشه کامل است، حتی اگر کسی ROLE_GRANTS را دستکاری کند.
  if (r === 'super_admin') return ALL_GLOBAL;

  return ROLE_GRANTS[r] ?? [];
}

/** سازگاری عقب‌رو: لیست تخت Permissionها per نقش (برای UIهای قدیمی) */
export const ROLE_DEFAULTS: Record<string, Permission[]> = Object.fromEntries(
  APP_ROLES.map((r) => [
    r,
    Array.from(new Set(grantsOf(r).map((x) => x.p))),
  ]),
);

export interface UserPermissionOverride {
  permissions?: Permission[] | null;
  deniedPermissions?: Permission[] | null;
}

export function scopeFor(role: string | null | undefined, p: Permission): Scope | null {
  const hit = grantsOf(role).find((x) => x.p === p);
  return hit ? hit.s : null;
}

/** منطق نهایی: denied > override کاربر > Grant نقش */
export function hasPermission(
  userPermissions?: Permission[] | null,
  userDenied?: Permission[] | null,
  role?: string | null,
  permission?: Permission,
): boolean {
  if (!permission) return false;
  if (userDenied?.includes(permission)) return false;
  if (userPermissions?.includes(permission)) return true;
  return grantsOf(role).some((x) => x.p === permission);
}

/**
 * نسخه scope-aware برای Route Guard و Sidebar.
 * اگر scopes داده شود، فقط grantهایی قبول‌اند که scopeشان در لیست باشد.
 * override کاربری بدون scope، به‌عنوان grant معتبر پذیرفته می‌شود.
 */
export function hasScopedPermission(
  role: string | null | undefined,
  permission: Permission,
  scopes?: Scope[] | null,
  user?: UserPermissionOverride | null,
): boolean {
  if (!permission) return false;

  if (user?.deniedPermissions?.includes(permission)) return false;
  if (user?.permissions?.includes(permission)) return true;

  const grants = grantsOf(role);

  if (!scopes || scopes.length === 0) {
    return grants.some((x) => x.p === permission);
  }

  return grants.some(
    (x) => x.p === permission && (x.s === 'global' || scopes.includes(x.s)),
  );
}

export function groupPermissions(): Map<string, { fa: string; items: PermissionDef[] }> {
  const map = new Map<string, { fa: string; items: PermissionDef[] }>();

  PERMISSIONS.forEach((p) => {
    if (!map.has(p.group)) map.set(p.group, { fa: p.groupFa, items: [] });
    map.get(p.group)!.items.push(p);
  });

  return map;
}