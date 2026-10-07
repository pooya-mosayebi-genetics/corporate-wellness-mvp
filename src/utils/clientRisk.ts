import type { ClientRecord } from '../types/clients';

export type ClientRiskLevel = 'low' | 'medium' | 'high';

export interface ClientRisk {
  level: ClientRiskLevel;
  flags: string[];
}

/**
 * ارزیابی ریسک هر مرجع بر اساس BMI، درصد چربی و چربی احشایی
 */
export function assessClientRisk(client: ClientRecord): ClientRisk {
  let score = 0;
  const flags: string[] = [];

  // BMI
  if (client.bmi >= 30) {
    score += 2;
    flags.push('BMI');
  } else if (client.bmi >= 25) {
    score += 1;
    flags.push('BMI');
  }

  // درصد چربی بر اساس جنسیت
  const pbfHigh = client.sex === 'female' ? 32 : 25;
  const pbfMid = client.sex === 'female' ? 28 : 20;
  if (client.pbfPercent >= pbfHigh) {
    score += 2;
    flags.push('PBF');
  } else if (client.pbfPercent >= pbfMid) {
    score += 1;
    flags.push('PBF');
  }

  // چربی احشایی
  if (client.vfl >= 15) {
    score += 2;
    flags.push('VFL');
  } else if (client.vfl >= 10) {
    score += 1;
    flags.push('VFL');
  }

  const level: ClientRiskLevel = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';

  return { level, flags: Array.from(new Set(flags)) };
}