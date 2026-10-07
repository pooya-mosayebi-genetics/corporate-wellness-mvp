import { z } from 'zod';

const MEAL_SLOTS = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3'] as const;

export const mealItemSchema = z.object({
  id: z.string(),
  foodId: z.string(),
  nameFa: z.string().default(''),
  nameEn: z.string().default(''),
  portionFa: z.string().default(''),
  portionEn: z.string().default(''),
  qty: z.number().min(0).max(1000),
  kcal: z.number().min(0).max(100000),
  protein: z.number().min(0).max(100000),
  carbs: z.number().min(0).max(100000),
  fat: z.number().min(0).max(100000),
});

export const createMealSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  meal: z.object({
    id: z.string().min(1).max(120),
    type: z.enum(MEAL_SLOTS),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{1,2}:\d{2}$/),
    name: z.string().max(200).default(''),
    calories: z.number().int().min(0).max(100000),
    protein: z.number().min(0).max(100000),
    carbs: z.number().min(0).max(100000),
    fat: z.number().min(0).max(100000),
    items: z.array(mealItemSchema).default([]),
    loggedAt: z.string(),
  }),
});

export const createAnalysisSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  record: z.object({
    id: z.string().min(1).max(120),
    nationalId: z.string().regex(/^\d{10}$/),
    fullName: z.string().max(200).nullish(),
    mobile: z.string().max(20).nullish(),
    gender: z.string().max(10).nullish(),
    age: z.number().int().min(0).max(120).nullish(),
    weight: z.string().max(20).nullish(),
    height: z.string().max(20).nullish(),
    bmi: z.string().max(20).nullish(),
    bodyFatPercentage: z.string().max(20).nullish(),
    skeletalMuscleMass: z.string().max(20).nullish(),
    visceralFatLevel: z.string().max(20).nullish(),
    basalMetabolicRate: z.string().max(20).nullish(),
    bodyWater: z.string().max(20).nullish(),
    proteinMass: z.string().max(20).nullish(),
    mineralMass: z.string().max(20).nullish(),
    rawData: z.any().nullish(),
    analyzedAt: z.string().nullish(),
  }),
});

export type CreateMealInput = z.infer<typeof createMealSchema>;
export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;