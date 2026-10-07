import type { FoodEntry } from './foodTypes';
import { FOOD_DB } from './foodDatabase';
import { DISH_DB } from './iranianDishes';

export type FoodCategory = string;
export interface IranianFood {
  id: string; nameFa: string; nameEn: string; category: FoodCategory;
  portionFa: string; portionEn: string; kcal: number; protein: number; carbs: number; fat: number;
}

const toOld = (f: FoodEntry): IranianFood => ({
  id: f.id, nameFa: f.nameFa, nameEn: f.nameFa, category: f.group,
  portionFa: f.unitFa, portionEn: f.unitFa,
  kcal: f.kcalPerUnit, protein: f.proteinPerUnit, carbs: f.carbPerUnit, fat: f.fatPerUnit,
});

// ✅ گارد: اگر به هر دلیلی ماژول‌ها undefined بودند، crash نکنیم
const foods = Array.isArray(FOOD_DB) ? FOOD_DB : [];
const dishes = Array.isArray(DISH_DB) ? DISH_DB : [];

export const iranianFoods: IranianFood[] = [...foods, ...dishes].map(toOld);
export const foodCategories: FoodCategory[] = Array.from(new Set(iranianFoods.map((f) => f.category)));