import type {
  BodyAnalysisDerived,
  BodyAnalysisRecord,
  MetricRange,
  MetricResult,
  MetricStatus,
  SegmentalAnalysis,
  SegmentalValues,
  SymmetryStatus,
  WeightRecommendation,
} from '../types/bodyAnalysis';
import type { Gender } from '../types/wellness';
import {
  BMI_RANGE,
  BODY_FAT_RANGES,
  BODY_WATER_PERCENT_RANGES,
  HEALTHY_BMI_MAX,
  HEALTHY_BMI_MIN,
  SMI_RANGES,
  SYMMETRY_TOLERANCE_PERCENT,
  VISCERAL_FAT_RANGE,
} from '../constants/bodyRanges';
import { round } from './numbers';

// هر کیلوگرم چربی معادل تقریبی ۷۷۰۰ کیلوکالری
const KCAL_PER_KG_FAT = 7700;

export function getStatus(value: number, range: MetricRange): MetricStatus {
  if (value < range.min) return 'low';
  if (value > range.max) return 'high';
  return 'normal';
}

function buildResult(value: number, range: MetricRange): MetricResult {
  return {
    value: round(value, 1),
    range,
    status: getStatus(value, range),
  };
}

function isSymmetric(segment: SegmentalValues): boolean {
  const armDiff =
    (Math.abs(segment.rightArm - segment.leftArm) /
      Math.max(segment.rightArm, segment.leftArm)) *
    100;
  const legDiff =
    (Math.abs(segment.rightLeg - segment.leftLeg) /
      Math.max(segment.rightLeg, segment.leftLeg)) *
    100;

  return (
    armDiff <= SYMMETRY_TOLERANCE_PERCENT && legDiff <= SYMMETRY_TOLERANCE_PERCENT
  );
}

export function analyzeSegmental(
  record: BodyAnalysisRecord,
  gender: Gender,
  heightCm: number,
): SegmentalAnalysis | null {
  if (!record.segmentalFFM || !record.segmentalFat) return null;

  const heightM2 = (heightCm / 100) * (heightCm / 100);
  const f = record.segmentalFFM;

  const appendicular = f.rightArm + f.leftArm + f.rightLeg + f.leftLeg;
  const smi = appendicular / heightM2;

  return {
    appendicularMass: round(appendicular, 1),
    smi: round(smi, 1),
    smiStatus: getStatus(smi, SMI_RANGES[gender]),
    ffmSymmetry: isSymmetric(f) ? 'balanced' : 'imbalanced',
    fatSymmetry: isSymmetric(record.segmentalFat) ? 'balanced' : 'imbalanced',
  };
}

export function buildRecommendation(params: {
  fatMassKg: number;
  fatFreeMassKg: number;
  healthyWeightMax: number;
  appendicularMass: number | null;
  smi: number | null;
  gender: Gender;
  heightCm: number;
  dailyDeficitKcal: number;
}): WeightRecommendation {
  // چربی که باید کم شود تا به سقف وزن سالم برسیم (با حفظ توده بدون چربی)
  const fatAtHealthyMax = Math.max(
    params.healthyWeightMax - params.fatFreeMassKg,
    0,
  );
  const fatToLoseKg = round(Math.max(params.fatMassKg - fatAtHealthyMax, 0), 1);

  // عضله لازم برای رسیدن به حداقل SMI سالم
  let muscleToGainKg = 0;
  if (params.smi !== null && params.appendicularMass !== null) {
    const heightM2 = (params.heightCm / 100) * (params.heightCm / 100);
    const minAppendicular = SMI_RANGES[params.gender].min * heightM2;
    muscleToGainKg = round(
      Math.max(minAppendicular - params.appendicularMass, 0),
      1,
    );
  }

  const focus: WeightRecommendation['focus'] =
    fatToLoseKg > 0 && muscleToGainKg > 0
      ? 'balanced'
      : fatToLoseKg > 0
      ? 'fat'
      : muscleToGainKg > 0
      ? 'muscle'
      : 'balanced';

  // برآورد هفته‌ها بر اساس کسری کالری روزانه
  let weeksEstimate: number | null = null;
  if (fatToLoseKg > 0 && params.dailyDeficitKcal > 0) {
    weeksEstimate = Math.round(
      (fatToLoseKg * KCAL_PER_KG_FAT) / params.dailyDeficitKcal / 7,
    );
  }

  return {
    fatToLoseKg,
    muscleToGainKg,
    focus,
    weeksEstimate,
    dailyDeficitKcal:
      params.dailyDeficitKcal > 0 ? params.dailyDeficitKcal : null,
  };
}

export function analyzeBodyComposition(
  record: BodyAnalysisRecord,
  gender: Gender,
  heightCm: number,
  dailyDeficitKcal = 0,
): BodyAnalysisDerived {
  const heightM = heightCm / 100;
  const heightM2 = heightM * heightM;

  const bmi = record.weightKg / heightM2;
  const fatMassKg = record.weightKg * (record.bodyFatPercent / 100);
  const fatFreeMassKg = record.weightKg - fatMassKg;

  const healthyWeightMin = HEALTHY_BMI_MIN * heightM2;
  const healthyWeightMax = HEALTHY_BMI_MAX * heightM2;
  const targetWeight = (healthyWeightMin + healthyWeightMax) / 2;

  const waterPercentRange = BODY_WATER_PERCENT_RANGES[gender];
  const waterRange: MetricRange = {
    min: (waterPercentRange.min / 100) * record.weightKg,
    max: (waterPercentRange.max / 100) * record.weightKg,
    unit: 'L',
  };

  const segmental = analyzeSegmental(record, gender, heightCm);

  const recommendation = buildRecommendation({
    fatMassKg,
    fatFreeMassKg,
    healthyWeightMax,
    appendicularMass: segmental ? segmental.appendicularMass : null,
    smi: segmental ? segmental.smi : null,
    gender,
    heightCm,
    dailyDeficitKcal,
  });

  return {
    fatMassKg: round(fatMassKg, 1),
    fatFreeMassKg: round(fatFreeMassKg, 1),
    healthyWeightMin: round(healthyWeightMin, 1),
    healthyWeightMax: round(healthyWeightMax, 1),
    targetWeight: round(targetWeight, 1),
    metrics: {
      bmi: buildResult(bmi, BMI_RANGE),
      bodyFat: buildResult(record.bodyFatPercent, BODY_FAT_RANGES[gender]),
      visceralFat: buildResult(record.visceralFatAreaCm2, VISCERAL_FAT_RANGE),
      bodyWater: buildResult(record.bodyWaterLiters, waterRange),
    },
    segmental,
    recommendation,
  };
}