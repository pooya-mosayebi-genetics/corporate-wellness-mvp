import type { ActivityLevel, Gender, WellnessGoal } from '../types/wellness';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const GOAL_CALORIE_MULTIPLIERS: Record<WellnessGoal, number> = {
  lose_fat: 0.85,
  maintain: 1.0,
  gain_muscle: 1.1,
};

export const MIN_SAFE_DAILY_CALORIES: Record<Gender, number> = {
  male: 1500,
  female: 1200,
  prefer_not_to_say: 1200,
};

export const MACRO_SPLIT: Record<
  WellnessGoal,
  { protein: number; fat: number; carbs: number }
> = {
  lose_fat: { protein: 0.35, fat: 0.3, carbs: 0.35 },
  maintain: { protein: 0.25, fat: 0.3, carbs: 0.45 },
  gain_muscle: { protein: 0.3, fat: 0.25, carbs: 0.45 },
};

export const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;