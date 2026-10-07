/** تایپ‌های بادی آنالیز - مطابق دقیق فرمت CSV */

export interface AnalysisAmendment {
  id: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  actorId: string;
  actorRole?: string;
  createdAt: string;
}

export interface BodyAnalysisRecord {
  id: string;
  nationalId: string;
  mobileNumber: string;
  fullName: string;
  gender: 'male' | 'female';
  age: number;
  analyzeTag: string;
  analyzeTime: string; // ISO string

  // اندازه‌گیری‌های اصلی
  weight: number;
  height: number;
  targetWeight: number;
  weightControl: number;

  // ترکیب بدنی
  smm: number;    // Skeletal Muscle Mass
  tbw: number;    // Total Body Water
  bfm: number;    // Body Fat Mass
  ffm: number;    // Fat Free Mass
  bmr: number;    // Basal Metabolic Rate
  ecw: number;    // Extracellular Water
  icw: number;    // Intracellular Water
  pro: number;    // Protein
  vfa: number;    // Visceral Fat Area

  // آنالیز سگمنتال - عضله
  torsoLean: number;
  leftLegLean: number;
  rightLegLean: number;
  leftArmLean: number;
  rightArmLean: number;

  // آنالیز سگمنتال - چربی
  torsoFat: number;
  leftLegFat: number;
  rightLegFat: number;
  leftArmFat: number;
  rightArmFat: number;

  // حدود بالا
  ffmUpper: number;
  tbwUpper: number;
  ecwUpper: number;
  icwUpper: number;
  smmUpper: number;
  proUpper: number;
  bfmUpper: number;

  // حدود پایین
  ffmLower: number;
  tbwLower: number;
  ecwLower: number;
  icwLower: number;
  smmLower: number;
  proLower: number;
  bfmLower: number;

  // مواد معدنی
  minerals: number;
  mineralsLower: number;
  mineralsUpper: number;

  // توده بدون چربی نرم
  softLeanMass: number;
  softLeanMassLower: number;
  softLeanMassUpper: number;

  // نمرات
  aneaScore: number;
  biologicalAge: number;

  // 🆕 L-08: Finalize / Amendment
  finalized?: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  finalizeReason?: string;
  amendments?: AnalysisAmendment[];
}

export interface BodyAnalysisState {
  records: BodyAnalysisRecord[];
  lastImportedAt: string | null;
  totalRecords: number;
}

/** بررسی اینکه آیا یک مقدار عددی معتبر است */
export function isValidNumber(val: string | number): boolean {
  const num = Number(val);
  return !isNaN(num) && isFinite(num);
}

/** تبدیل مقدار به عدد - اگر خالی بود صفر */
export function toNum(val: string): number {
  const cleaned = String(val || '').trim();
  if (!cleaned) return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}