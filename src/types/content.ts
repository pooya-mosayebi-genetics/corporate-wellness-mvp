import type { TipCategory } from '../data/nutritionTips';

/** یک قلم رسپی با ماکروهای هر واحد */
export interface RecipeItem {
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

/** پست محتوایی: نکته یا رسپی */
export interface ContentPost {
  id: string;
  kind: 'tip' | 'recipe';
  category: TipCategory;
  titleFa: string;
  titleEn: string;
  bodyFa: string;
  bodyEn: string;
  recipe?: RecipeItem[];
  author: string; // nationalId یا 'system'
  publishedAt: string; // YYYY-MM-DD
  source: 'system' | 'admin';
}

export type Reaction = 'like' | 'dislike';