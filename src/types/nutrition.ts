export type MealSlot = 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner' | 'snack3';

export const mealSlotOrder: MealSlot[] = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3'];

/** ✅ نام وعده‌ها طبق نظر مدیران: snack2 → عصرانه ، snack3 → میان‌وعده قبل خواب */
export const mealSlotLabelsFa: Record<MealSlot, string> = {
  breakfast: 'صبحانه',
  snack1: 'میان وعده ۱',
  lunch: 'ناهار',
  snack2: 'عصرانه',
  dinner: 'شام',
  snack3: 'میان وعده قبل خواب',
};

export const mealSlotLabelsEn: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  snack1: 'Snack 1',
  lunch: 'Lunch',
  snack2: 'Afternoon Snack',
  dinner: 'Dinner',
  snack3: 'Bedtime Snack',
};

export interface MealItem {
  id: string;
  foodId: string;
  nameFa: string;
  nameEn: string;
  portionFa: string;
  portionEn: string;
  qty: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: string;
  type: MealSlot;
  date: string;
  time: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: MealItem[];
  loggedAt: string;
}