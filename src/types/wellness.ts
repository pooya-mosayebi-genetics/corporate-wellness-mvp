export type Gender = 'male' | 'female' | 'prefer_not_to_say';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type WellnessGoal = 'lose_fat' | 'maintain' | 'gain_muscle';

export type BmrSource = 'formula' | 'device';

export interface UserProfileInput {
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: WellnessGoal;
}

export interface MacroTargets {
  calories: number;
  proteinGrams: number;
  fatGrams: number;
  carbGrams: number;
}

export interface DailyTargets {
  bmr: number;
  tdee: number;
  calories: number;
  macros: MacroTargets;
  bmrSource: BmrSource;
}