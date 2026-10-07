// داده‌های تجمیعی - بدون هیچ داده فردی
// این ساختار برای انطباق با HIPAA و GDPR طراحی شده

export interface WeeklyStressData {
  day: string;
  averageStress: number; // 1-10
  averageSleep: number; // 1-10
}

export interface EngagementData {
  label: string;
  value: number; // درصد
  color: string;
}

export interface HrSummary {
  totalEmployees: number;
  activeEmployees: number;
  engagementRate: number;
  averageStress: number;
  averageSleep: number;
  highStressPercentage: number;
}

// روند استرس و خواب در ۷ روز گذشته
export const weeklyTrendData: WeeklyStressData[] = [
  { day: 'Mon', averageStress: 6.2, averageSleep: 6.8 },
  { day: 'Tue', averageStress: 5.8, averageSleep: 7.1 },
  { day: 'Wed', averageStress: 7.1, averageSleep: 6.2 },
  { day: 'Thu', averageStress: 6.5, averageSleep: 6.5 },
  { day: 'Fri', averageStress: 5.4, averageSleep: 7.3 },
  { day: 'Sat', averageStress: 4.2, averageSleep: 8.1 },
  { day: 'Sun', averageStress: 3.8, averageSleep: 8.4 },
];

// میزان مشارکت کارمندان
export const engagementData: EngagementData[] = [
  { label: 'Logging Meals', value: 68, color: '#1E3A8A' },
  { label: 'Daily Check-ins', value: 82, color: '#10B981' },
  { label: 'Tracking Water', value: 54, color: '#3B82F6' },
  { label: 'Not Engaged', value: 12, color: '#94A3B8' },
];

// آمار کلی
export const hrSummary: HrSummary = {
  totalEmployees: 247,
  activeEmployees: 218,
  engagementRate: 88,
  averageStress: 5.6,
  averageSleep: 7.1,
  highStressPercentage: 18,
};