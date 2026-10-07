import type { RiskLevel } from '../types/coach';

/**
 * محاسبه ریسک لول کاربر بر اساس:
 * - سطح استرس (بالاتر = ریسک بیشتر)
 * - کیفیت خواب (پایین‌تر = ریسک بیشتر)
 * - ثبات ردیابی (پایین‌تر = ریسک بیشتر)
 * - روزهای غیرفعال (بیشتر = ریسک بیشتر)
 */
export function calculateRiskLevel(params: {
  stressLevel: number;
  sleepQuality: number;
  trackingConsistency: number;
  daysInactive: number;
}): RiskLevel {
  const { stressLevel, sleepQuality, trackingConsistency, daysInactive } = params;

  let riskScore = 0;

  // استرس بالا (7 به بالا) امتیاز ریسک می‌دهد
  if (stressLevel >= 8) riskScore += 3;
  else if (stressLevel >= 6) riskScore += 2;
  else if (stressLevel >= 4) riskScore += 1;

  // کیفیت خواب پایین (5 به پایین) امتیاز ریسک می‌دهد
  if (sleepQuality <= 3) riskScore += 3;
  else if (sleepQuality <= 5) riskScore += 2;
  else if (sleepQuality <= 7) riskScore += 1;

  // ثبات ردیابی پایین امتیاز ریسک می‌دهد
  if (trackingConsistency < 30) riskScore += 3;
  else if (trackingConsistency < 60) riskScore += 2;
  else if (trackingConsistency < 80) riskScore += 1;

  // روزهای غیرفعال امتیاز ریسک می‌دهد
  if (daysInactive >= 7) riskScore += 3;
  else if (daysInactive >= 3) riskScore += 2;
  else if (daysInactive >= 1) riskScore += 1;

  // تعیین سطح ریسک
  if (riskScore >= 8) return 'high';
  if (riskScore >= 5) return 'medium';
  return 'low';
}

/**
 * دریافت رنگ بر اساس ریسک لول
 */
export function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case 'high':
      return '#EF4444'; // قرمز
    case 'medium':
      return '#F59E0B'; // نارنجی
    case 'low':
      return '#10B981'; // سبز
  }
}

/**
 * دریافت برچسب نمایشی ریسک
 */
export function getRiskLabel(risk: RiskLevel): string {
  switch (risk) {
    case 'high':
      return 'High Risk';
    case 'medium':
      return 'Medium Risk';
    case 'low':
      return 'Low Risk';
  }
}