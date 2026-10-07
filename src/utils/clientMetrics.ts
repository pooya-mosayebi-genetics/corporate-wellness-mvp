import type { ClientRecord } from '../types/clients';
import type { MetricRange, MetricResult } from '../types/bodyAnalysis';
import type { WellnessGoal } from '../types/wellness';
import { getStatus } from './bodyAnalysis';
import {
  BMI_RANGE,
  BODY_FAT_RANGES,
  BODY_WATER_PERCENT_RANGES,
} from '../constants/bodyRanges';
import {
  calculateAdjustedCalories,
  calculateBmr,
  calculateTdee,
} from './bmr';
import { assessClientRisk } from './clientRisk';
import { round } from './numbers';

// بازهٔ سالم چربی احشایی (سطح VFL)
export const CLIENT_VFL_RANGE: MetricRange = { min: 1, max: 9, unit: '' };

export interface ClientMetrics {
  healthyWeightMin: number;
  healthyWeightMax: number;
  weight: MetricResult;
  bmi: MetricResult;
  bodyFat: MetricResult;
  visceral: MetricResult;
  bodyWaterPercent: MetricResult;
  bioAge: MetricResult;
  smi: number;
  bmr: number;
  tdee: number;
  targetCalories: number;
  goal: WellnessGoal;
}

export function buildClientMetrics(client: ClientRecord): ClientMetrics {
  const heightM2 = (client.heightCm / 100) * (client.heightCm / 100);

  const healthyWeightMin = round(18.5 * heightM2, 1);
  const healthyWeightMax = round(25 * heightM2, 1);
  const weightRange: MetricRange = {
    min: healthyWeightMin,
    max: healthyWeightMax,
    unit: 'kg',
  };

  // سن بیولوژیک: بازهٔ مطلوب = سن واقعی ± ۵
  const bioAgeRange: MetricRange = {
    min: client.age - 5,
    max: client.age + 5,
    unit: '',
  };

  // هدف پیشنهادی بر اساس ریسک
  const risk = assessClientRisk(client);
  const goal: WellnessGoal = risk.level === 'low' ? 'maintain' : 'lose_fat';

  const profileInput = {
    age: client.age,
    gender: client.sex,
    weightKg: client.weightKg,
    heightCm: client.heightCm,
    activityLevel: 'moderate' as const,
    goal,
  };

  const bmr = calculateBmr(profileInput);
  const tdee = calculateTdee(bmr, 'moderate');
  const targetCalories = calculateAdjustedCalories(tdee, goal, client.sex);

  return {
    healthyWeightMin,
    healthyWeightMax,
    weight: {
      value: client.weightKg,
      range: weightRange,
      status: getStatus(client.weightKg, weightRange),
    },
    bmi: {
      value: round(client.bmi, 1),
      range: BMI_RANGE,
      status: getStatus(client.bmi, BMI_RANGE),
    },
    bodyFat: {
      value: client.pbfPercent,
      range: BODY_FAT_RANGES[client.sex],
      status: getStatus(client.pbfPercent, BODY_FAT_RANGES[client.sex]),
    },
    visceral: {
      value: client.vfl,
      range: CLIENT_VFL_RANGE,
      status: getStatus(client.vfl, CLIENT_VFL_RANGE),
    },
    bodyWaterPercent: {
      value: client.tbwPercent,
      range: BODY_WATER_PERCENT_RANGES[client.sex],
      status: getStatus(client.tbwPercent, BODY_WATER_PERCENT_RANGES[client.sex]),
    },
    bioAge: {
      value: client.bioAge,
      range: bioAgeRange,
      status: getStatus(client.bioAge, bioAgeRange),
    },
    smi: round(client.smmKg / heightM2, 1),
    bmr,
    tdee,
    targetCalories,
    goal,
  };
}