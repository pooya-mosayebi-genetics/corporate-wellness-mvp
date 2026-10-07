/** 🏢 تنظیمات سازمان و پلن فعلی — بعداً per-tenant می‌شود (بدون تغییر UI) */
export type PlanId = 'free' | 'pro' | 'org';

export interface OrgConfig {
  id: string;
  nameFa: string;
  nameEn: string;
  plan: PlanId;
}

/** سازمان فعلی (پیش‌فرض؛ بعداً از سرور/تنظیمات خوانده می‌شود) */
export const CURRENT_ORG: OrgConfig = {
  id: 'samanbank',
  nameFa: 'بانک سامان',
  nameEn: 'Saman Bank',
  plan: 'org',
};

export const PLAN_LABELS: Record<PlanId, { fa: string; en: string }> = {
  free: { fa: 'رایگان', en: 'Free' },
  pro: { fa: 'حرفه‌ای', en: 'Pro' },
  org: { fa: 'سازمانی', en: 'Organization' },
};

/** 🚩 پرچم‌های ویژگی per-plan — هر ویژگی جدید فقط یک کلید اینجا می‌گیرد */
export const FEATURE_FLAGS: Record<PlanId, Record<string, boolean>> = {
  free: { aiChat: true, reports: false, exportCSV: false, personnel: false, whiteLabel: false, multiOrg: false, bodyAnalysis: false },
  pro:  { aiChat: true, reports: true,  exportCSV: true,  personnel: false, whiteLabel: false, multiOrg: false, bodyAnalysis: true },
  org:  { aiChat: true, reports: true,  exportCSV: true,  personnel: true,  whiteLabel: true,  multiOrg: true,  bodyAnalysis: true },
};

export function isFeatureEnabled(feature: string, plan: PlanId = CURRENT_ORG.plan): boolean {
  return !!FEATURE_FLAGS[plan]?.[feature];
}