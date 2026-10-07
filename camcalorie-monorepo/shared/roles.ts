/**
 * ژرفا · کاتالوگ نقش‌ها (۱۹ نقش) — منبع واحد نقش‌ها برای کل سیستم
 */

export const APP_ROLES = [
  'super_admin', 'it_admin', 'org_owner', 'org_admin',
  'nutritionist', 'coach',
  'doctor_internal', 'doctor_sports', 'doctor_radiology', 'doctor_cardiology',
  'nurse', 'rad_assistant', 'cardio_assistant',
  'hr_admin', 'hr_viewer', 'reception', 'event_manager', 'data_analyst',
  'user',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type RoleCategory = 'platform' | 'org' | 'clinical' | 'ops' | 'participant';

export interface RoleMeta {
  fa: string;
  en: string;
  category: RoleCategory;
  categoryFa: string;
  desc: string;
}

export const ROLE_CATEGORY_ORDER: RoleCategory[] = [
  'platform',
  'org',
  'clinical',
  'ops',
  'participant',
];

export const ROLE_META: Record<AppRole, RoleMeta> = {
  super_admin: {
    fa: 'مدیر ارشد سیستم',
    en: 'Super Admin',
    category: 'platform',
    categoryFa: 'پلتفرم',
    desc: 'دسترسی کامل مدیریتی؛ استفادهٔ بسیار محدود',
  },
  it_admin: {
    fa: 'مدیر فنی / IT',
    en: 'IT Admin',
    category: 'platform',
    categoryFa: 'پلتفرم',
    desc: 'تمرکز بر سیستم، کاربران، پشتیبان و لاگ — نه دادهٔ سلامت',
  },
  org_owner: {
    fa: 'مالک سازمان',
    en: 'Organization Owner',
    category: 'org',
    categoryFa: 'سازمان',
    desc: 'مالک حساب سازمانی مشتری',
  },
  org_admin: {
    fa: 'مدیر سازمان',
    en: 'Organization Admin',
    category: 'org',
    categoryFa: 'سازمان',
    desc: 'مدیریت عملیاتی سازمان، محدودتر از مالک',
  },
  nutritionist: {
    fa: 'متخصص تغذیه',
    en: 'Nutritionist',
    category: 'clinical',
    categoryFa: 'درمانی',
    desc: 'مهم‌ترین نقش تخصصی؛ ویرایش فقط بخش تغذیه و رژیم',
  },
  coach: {
    fa: 'مربی',
    en: 'Coach',
    category: 'clinical',
    categoryFa: 'درمانی',
    desc: 'داشبورد کوچ و بخش ورزشی مراجعین خودش',
  },
  doctor_internal: {
    fa: 'پزشک داخلی',
    en: 'Internal Doctor',
    category: 'clinical',
    categoryFa: 'درمانی',
    desc: 'ویرایش فقط بخش پزشکی داخلی',
  },
  doctor_sports: {
    fa: 'پزشک ورزشی',
    en: 'Sports Medicine Doctor',
    category: 'clinical',
    categoryFa: 'درمانی',
    desc: 'ارزیابی آمادگی و محدودیت فعالیت',
  },
  doctor_radiology: {
    fa: 'متخصص رادیولوژی',
    en: 'Radiologist',
    category: 'clinical',
    categoryFa: 'درمانی',
    desc: 'Finalize گزارش رادیولوژی؛ تغییر بعدی فقط Amendment',
  },
  doctor_cardiology: {
    fa: 'متخصص قلب',
    en: 'Cardiologist',
    category: 'clinical',
    categoryFa: 'درمانی',
    desc: 'Finalize ECG/گزارش قلب؛ تغییر بعدی فقط Amendment',
  },
  nurse: {
    fa: 'پرستار',
    en: 'Nurse',
    category: 'clinical',
    categoryFa: 'درمانی',
    desc: 'علائم حیاتی و اقدامات پرستاری؛ بدون تشخیص',
  },
  rad_assistant: {
    fa: 'دستیار رادیولوژی',
    en: 'Radiology Assistant',
    category: 'clinical',
    categoryFa: 'درمانی',
    desc: 'آپلود تصویر و دادهٔ اجرایی؛ بدون تفسیر',
  },
  cardio_assistant: {
    fa: 'دستیار قلب',
    en: 'Cardiology Assistant',
    category: 'clinical',
    categoryFa: 'درمانی',
    desc: 'ثبت/آپلود ECG و وایتال؛ بدون تفسیر نهایی',
  },
  hr_admin: {
    fa: 'مدیر منابع انسانی',
    en: 'HR Admin',
    category: 'ops',
    categoryFa: 'عملیاتی',
    desc: 'فقط دادهٔ تجمیعی؛ بدون پروندهٔ فردی',
  },
  hr_viewer: {
    fa: 'بیننده HR',
    en: 'HR Viewer',
    category: 'ops',
    categoryFa: 'عملیاتی',
    desc: 'مشاهدهٔ داشبورد/گزارش تجمیعی بدون مدیریت',
  },
  reception: {
    fa: 'پذیرش / هماهنگ‌کننده',
    en: 'Reception',
    category: 'ops',
    categoryFa: 'عملیاتی',
    desc: 'اطلاعات پایه و نوبت؛ بدون دادهٔ پزشکی',
  },
  event_manager: {
    fa: 'مدیر رویداد',
    en: 'Event Manager',
    category: 'ops',
    categoryFa: 'عملیاتی',
    desc: 'مدیریت اجرای رویداد و امتیازات تأیید رویداد',
  },
  data_analyst: {
    fa: 'تحلیل‌گر داده',
    en: 'Data Analyst',
    category: 'ops',
    categoryFa: 'عملیاتی',
    desc: 'خروجی تحلیل با حداقل اطلاعات هویتی',
  },
  user: {
    fa: 'کاربر / مراجع',
    en: 'User',
    category: 'participant',
    categoryFa: 'مراجعین',
    desc: 'فقط دادهٔ خودش؛ درخواست اصلاح رژیم',
  },
};

/** مپ مهاجرت نقش‌های قدیمی → جدید */
export const LEGACY_ROLE_MAP: Record<string, AppRole> = {
  admin: 'super_admin',
  superadmin: 'super_admin',
  system_admin: 'super_admin',
  coach: 'coach',
  hr: 'hr_admin',
  human_resources: 'hr_admin',
  employee: 'user',
  staff: 'user',
  client: 'user',
  patient: 'user',
};

export function normalizeRole(v: any): AppRole {
  const s = String(v ?? '').trim().toLowerCase();

  if ((APP_ROLES as readonly string[]).includes(s)) {
    return s as AppRole;
  }

  return LEGACY_ROLE_MAP[s] ?? 'user';
}

export const CLINICAL_ROLES: AppRole[] = [
  'nutritionist',
  'coach',
  'doctor_internal',
  'doctor_sports',
  'doctor_radiology',
  'doctor_cardiology',
  'nurse',
  'rad_assistant',
  'cardio_assistant',
];

export function isClinicalRole(role: string | null | undefined): boolean {
  return CLINICAL_ROLES.includes(normalizeRole(role));
}

export function rolesByCategory(category: RoleCategory): AppRole[] {
  return APP_ROLES.filter((r) => ROLE_META[r].category === category);
}