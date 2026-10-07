export interface DailyLog {
  date: string; // YYYY-MM-DD
  waterGlasses: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// تولید داده‌های mock برای ۳۶۵ روز گذشته
function generateMockData(): DailyLog[] {
  const data: DailyLog[] = [];
  const today = new Date();

  for (let i = 365; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // تولید داده‌های تصادفی ولی واقع‌گرایانه
    data.push({
      date: dateStr,
      waterGlasses: Math.floor(Math.random() * 4) + 5, // 5-8 لیوان
      calories: Math.floor(Math.random() * 400) + 1600, // 1600-2000 کالری
      protein: Math.floor(Math.random() * 30) + 100, // 100-130g
      carbs: Math.floor(Math.random() * 50) + 180, // 180-230g
      fat: Math.floor(Math.random() * 20) + 50, // 50-70g
    });
  }

  return data;
}

export const mockDailyLogs = generateMockData();

// محاسبه میانگین برای یک دوره زمانی
export function calculatePeriodStats(logs: DailyLog[]): {
  avgWater: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  totalDays: number;
} {
  if (logs.length === 0) {
    return { avgWater: 0, avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0, totalDays: 0 };
  }

  const totals = logs.reduce(
    (acc, log) => ({
      water: acc.water + log.waterGlasses,
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
    }),
    { water: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    avgWater: Math.round(totals.water / logs.length),
    avgCalories: Math.round(totals.calories / logs.length),
    avgProtein: Math.round(totals.protein / logs.length),
    avgCarbs: Math.round(totals.carbs / logs.length),
    avgFat: Math.round(totals.fat / logs.length),
    totalDays: logs.length,
  };
}

// فیلتر کردن داده‌ها بر اساس دوره زمانی
export function filterLogsByPeriod(logs: DailyLog[], period: 'week' | 'month' | 'year'): DailyLog[] {
  const now = new Date();
  const cutoff = new Date();

  switch (period) {
    case 'week':
      cutoff.setDate(now.getDate() - 7);
      break;
    case 'month':
      cutoff.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      cutoff.setFullYear(now.getFullYear() - 1);
      break;
  }

  const cutoffStr = cutoff.toISOString().split('T')[0];
  return logs.filter((log) => log.date >= cutoffStr);
}

// گروه‌بندی داده‌ها بر اساس ماه (برای چارت سالیانه)
export function groupByMonth(logs: DailyLog[]): { month: string; avgCalories: number }[] {
  const grouped: Record<string, { total: number; count: number }> = {};

  logs.forEach((log) => {
    const month = log.date.substring(0, 7); // YYYY-MM
    if (!grouped[month]) {
      grouped[month] = { total: 0, count: 0 };
    }
    grouped[month].total += log.calories;
    grouped[month].count++;
  });

  return Object.entries(grouped)
    .map(([month, data]) => ({
      month,
      avgCalories: Math.round(data.total / data.count),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}