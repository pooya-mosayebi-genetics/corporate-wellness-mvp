export type ClientSex = 'male' | 'female';

export interface ClientRecord {
  nationalId: string;
  sex: ClientSex;
  age: number;
  heightCm: number;
  weightKg: number;
  bmi: number;
  smmKg: number;
  pbfPercent: number;
  bfmKg: number | null;
  vfl: number;
  tbwLiters: number;
  tbwPercent: number;
  bioAge: number;
  warnings: string[];
  importedAt: string;
}

/** یک نسخهٔ زمانی از آنالیز یک مرجع (برای تاریخچه و مقایسه) */
export interface ClientAnalysisSnapshot {
  nationalId: string;
  date: string; // YYYY-MM-DD
  sex: ClientSex;
  age: number;
  heightCm: number;
  weightKg: number;
  bmi: number;
  smmKg: number;
  pbfPercent: number;
  bfmKg: number | null;
  vfl: number;
  tbwLiters: number;
  tbwPercent: number;
  bioAge: number;
}