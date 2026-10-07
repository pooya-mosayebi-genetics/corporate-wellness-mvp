import { useMemo } from 'react';
import { useWellness } from '../store/WellnessContext';
import { useFoodDb } from '../store/FoodDbContext';
import { FOOD_DB } from '../data/foodDatabase';
import { DISH_DB } from '../data/iranianDishes';
import type { FoodEntry } from '../data/foodTypes';

const r1 = (x: number) => Math.round(x * 10) / 10;

export type FoodWithCats = FoodEntry & { categories?: string[] };

/** 🍽 منبع واحد غذا: Foods + Iranian_Dishes + سفارشی‌ها + اعمال ویرایش‌های متخصص تغذیه */
export function useFoods() {
  const { state } = useWellness();
  const { overrides } = useFoodDb();

  const foods: FoodEntry[] = useMemo(() => {
    const custom: FoodEntry[] = ((state.customFoods as any[]) || []).map((c, i) => {
      const grams = c.gramsPerUnit ?? 100;
      const g = grams / 100;
      const k = c.kcalPer100g ?? c.kcal ?? 0;
      const p = c.proteinPer100g ?? c.protein ?? 0;
      const cc = c.carbPer100g ?? c.carbs ?? 0;
      const f = c.fatPer100g ?? c.fat ?? 0;
      return {
        id: c.id ?? `c${i}`, kind: 'custom', nameFa: c.nameFa ?? c.name ?? '', group: c.group ?? 'سفارشی',
        kcalPer100g: k, proteinPer100g: p, carbPer100g: cc, fatPer100g: f,
        fiberPer100g: c.fiberPer100g ?? 0, sugarPer100g: c.sugarPer100g ?? 0,
        unitFa: c.unitFa ?? 'پرس', gramsPerUnit: grams,
        kcalPerUnit: r1(k * g), proteinPerUnit: r1(p * g), carbPerUnit: r1(cc * g), fatPerUnit: r1(f * g),
      };
    });
    const base = [...FOOD_DB, ...DISH_DB, ...custom];
    return base.map((f) => {
      const ov = overrides[f.id];
      if (!ov) return f;
      const m: FoodEntry = { ...f, ...ov };
      const g = (m.gramsPerUnit || 0) / 100;
      m.kcalPerUnit = r1(m.kcalPer100g * g);
      m.proteinPerUnit = r1(m.proteinPer100g * g);
      m.carbPerUnit = r1(m.carbPer100g * g);
      m.fatPerUnit = r1(m.fatPer100g * g);
      return m;
    });
  }, [state.customFoods, overrides]);

  const byId = useMemo(() => { const m: Record<string, FoodEntry> = {}; foods.forEach((f) => (m[f.id] = f)); return m; }, [foods]);

  const groups = useMemo(() => Array.from(new Set(foods.map((f) => f.group))).sort((a, b) => a.localeCompare(b, 'fa')), [foods]);

  const search = useMemo(() => (q: string, group?: string) => {
    const s = q.trim().toLowerCase();
    return foods
      .filter((f) => (group && group !== 'all' ? f.group === group : true))
      .filter((f) => (s ? f.nameFa.toLowerCase().includes(s) : true));
  }, [foods]);

  return { foods, byId, search, groups };
}

/** ➕ محاسبهٔ ماکرو برای تعداد واحد */
export function macrosForUnits(f: FoodEntry, qty: number) {
  return { kcal: r1(f.kcalPerUnit * qty), protein: r1(f.proteinPerUnit * qty), carbs: r1(f.carbPerUnit * qty), fat: r1(f.fatPerUnit * qty), grams: r1(f.gramsPerUnit * qty) };
}