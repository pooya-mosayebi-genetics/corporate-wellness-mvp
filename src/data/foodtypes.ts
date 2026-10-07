export interface FoodEntry {
  id: string;
  kind: 'food' | 'dish' | 'custom';
  nameFa: string;
  group: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  sugarPer100g: number;
  unitFa: string;
  gramsPerUnit: number;
  kcalPerUnit: number;
  proteinPerUnit: number;
  carbPerUnit: number;
  fatPerUnit: number;
}