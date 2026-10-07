export type Gender = 'Man' | 'Woman';
export type SyncStatus = 'pending' | 'synced' | 'failed' | 'needsReview';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** 🆕 سازمان (برای حالت چندسازمانه) */
export interface Organization {
  id: string;
  name: string;
  nameFa?: string;
  code?: string;
  active: boolean;
  createdAt: string;
}

export interface Person {
  nationalId: string;
  fullName: string;
  fullNamePrefixed?: string;
  gender: Gender;
  birthDate?: string;
  age?: number;
  mobile?: string;
  role?: string; // 🆕 نقش بر اساس کاتالوگ ۱۹تایی (src/config/roles.ts)؛ مقدارهای قدیمی در مهاجرت نگاشته می‌شوند
  orgId?: string; // 🆕 سازمان متعلق (خالی = سازمان پیش‌فرض)
  createdAt: string;
}

export interface FoodItem {
  id: string;
  name: string;
  nameFa?: string;
  unit: string;
  caloriesPerUnit: number;
  proteinPerUnit: number;
  carbPerUnit: number;
  fatPerUnit: number;
  source?: string;
}

export interface FoodLog {
  id: string;
  nationalId: string;
  itemId?: string;
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  mealType: MealType;
  dateISO: string;
  clientCreatedAt: string;
  idempotencyKey: string;
  syncStatus: SyncStatus;
}

export interface SyncQueueEntry {
  id: string;
  entity: 'foodLog' | 'bodyAnalysis' | 'person' | 'foodOverride' | 'meal' | 'mealDelete';
  payload: unknown;
  idempotencyKey: string;
  createdAt: string;
  attempts: number;
  status: SyncStatus;
  lastError?: string;
}

export interface UserGoal {
  nationalId: string;
  goal: 'lose' | 'maintain' | 'gain';
  activityLevel: number;
  targetWeight?: number;
  updatedAt: string;
}

export const makeIdemKey = (
  nationalId: string,
  clientCreatedAt: string,
  mealType: string,
  ref: string,
) => `${nationalId}|${clientCreatedAt}|${mealType}|${ref}`;