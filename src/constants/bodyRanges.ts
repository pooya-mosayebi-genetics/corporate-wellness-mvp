import type { Gender } from '../types/wellness';
import type { MetricRange } from '../types/bodyAnalysis';

// شاخص توده بدنی
export const BMI_RANGE: MetricRange = { min: 18.5, max: 25, unit: 'kg/m²' };

// چربی احشایی
export const VISCERAL_FAT_RANGE: MetricRange = { min: 1, max: 100, unit: 'cm²' };

// درصد چربی بدن بر اساس جنسیت
export const BODY_FAT_RANGES: Record<Gender, MetricRange> = {
  male: { min: 10, max: 20, unit: '%' },
  female: { min: 18, max: 28, unit: '%' },
  prefer_not_to_say: { min: 14, max: 24, unit: '%' },
};

// آب بدن به صورت درصدی از وزن
export const BODY_WATER_PERCENT_RANGES: Record<Gender, MetricRange> = {
  male: { min: 50, max: 65, unit: '%' },
  female: { min: 45, max: 60, unit: '%' },
  prefer_not_to_say: { min: 47, max: 62, unit: '%' },
};

// شاخص عضله اسکلتی (SMI)
export const SMI_RANGES: Record<Gender, MetricRange> = {
  male: { min: 7.0, max: 12, unit: 'kg/m²' },
  female: { min: 5.7, max: 10, unit: 'kg/m²' },
  prefer_not_to_say: { min: 6.3, max: 11, unit: 'kg/m²' },
};

// حداکثر اختلاف مجاز بین دست/پای راست و چپ (درصد)
export const SYMMETRY_TOLERANCE_PERCENT = 10;

// BMI سالم برای محاسبه محدوده وزن سالم
export const HEALTHY_BMI_MIN = 18.5;
export const HEALTHY_BMI_MAX = 25;