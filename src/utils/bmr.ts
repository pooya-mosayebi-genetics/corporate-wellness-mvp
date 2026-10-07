import type {
  ActivityLevel,
  DailyTargets,
  Gender,
  UserProfileInput,
  WellnessGoal,
} from '../types/wellness';

import {
  ACTIVITY_MULTIPLIERS,
  CALORIES_PER_GRAM,
  GOAL_CALORIE_MULTIPLIERS,
  MACRO_SPLIT,
  MIN_SAFE_DAILY_CALORIES,
} from '../constants/nutrition';

import { round } from './numbers';

function calculateBmrByGender(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  // Mifflin-St Jeor Equation
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;

  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78; // میانگین برای prefer_not_to_say
}

export function calculateBmr(input: UserProfileInput): number {
  return round(
    calculateBmrByGender(input.gender, input.weightKg, input.heightCm, input.age),
  );
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function calculateAdjustedCalories(
  tdee: number,
  goal: WellnessGoal,
  gender: Gender,
): number {
  const adjusted = tdee * GOAL_CALORIE_MULTIPLIERS[goal];
  const minimumSafeCalories = MIN_SAFE_DAILY_CALORIES[gender];
  return round(Math.max(adjusted, minimumSafeCalories));
}

function buildMacros(calories: number, goal: WellnessGoal): DailyTargets['macros'] {
  const macroSplit = MACRO_SPLIT[goal];
  return {
    calories,
    proteinGrams: round((calories * macroSplit.protein) / CALORIES_PER_GRAM.protein),
    fatGrams: round((calories * macroSplit.fat) / CALORIES_PER_GRAM.fat),
    carbGrams: round((calories * macroSplit.carbs) / CALORIES_PER_GRAM.carbs),
  };
}

export function calculateDailyTargets(input: UserProfileInput): DailyTargets {
  const bmr = calculateBmr(input);
  const tdee = calculateTdee(bmr, input.activityLevel);
  const calories = calculateAdjustedCalories(tdee, input.goal, input.gender);

  return {
    bmr,
    tdee,
    calories,
    macros: buildMacros(calories, input.goal),
    bmrSource: 'formula',
  };
}

/**
 * محاسبه اهداف بر اساس BMR اندازه‌گیری‌شده با دستگاه آنالیز
 */
export function calculateTargetsFromDeviceBmr(params: {
  deviceBmr: number;
  activityLevel: ActivityLevel;
  goal: WellnessGoal;
  gender: Gender;
}): DailyTargets {
  const { deviceBmr, activityLevel, goal, gender } = params;

  const bmr = round(deviceBmr);
  const tdee = calculateTdee(bmr, activityLevel);
  const calories = calculateAdjustedCalories(tdee, goal, gender);

  return {
    bmr,
    tdee,
    calories,
    macros: buildMacros(calories, goal),
    bmrSource: 'device',
  };
}

/**
 * انتخاب منبع BMR: دستگاه (اگر آنالیز معتبر وجود دارد) وگرنه فرمول
 */
export function computeTargets(
  profile: UserProfileInput,
  latestDeviceBmr: number | null,
): DailyTargets {
  if (latestDeviceBmr && latestDeviceBmr > 0) {
    return calculateTargetsFromDeviceBmr({
      deviceBmr: latestDeviceBmr,
      activityLevel: profile.activityLevel,
      goal: profile.goal,
      gender: profile.gender,
    });
  }
  return calculateDailyTargets(profile);
}