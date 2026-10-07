export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  cardBorder: string;
  chart: string[];
  metricZone: {
    weight: string;
    bmi: string;
    bodyFat: string;
    muscle: string;
    visceral: string;
    water: string;
  };
}

export type ThemeMode = 'light' | 'dark' | 'corporate';

export const themeLabels: Record<ThemeMode, string> = {
  light: '☀️ Light',
  dark: '🌙 Dark',
  corporate: '🏢 Corporate',
};

const lightMetricZone = {
  weight: '#8B5CF6',
  bmi: '#38BDF8',
  bodyFat: '#FB923C',
  muscle: '#34D399',
  visceral: '#EAB308',
  water: '#C084FC',
};

// 🎨 رنگ سازمانی The Min: سرمه‌ای (#23408E) + فیروزه‌ای (#14B8A6)
export const lightTheme: ThemeColors = {
  background: '#F2F4FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F8FC',
  primary: '#23408E',
  primaryDark: '#1A326F',
  primaryLight: '#14B8A6',
  primarySoft: '#E9EDF9',
  accent: '#14B8A6',
  accentSoft: '#E0F5F1',
  success: '#16A34A',
  warning: '#D97706',
  warningSoft: '#FCF1E3',
  danger: '#DC2626',
  dangerSoft: '#FCEAEA',
  text: '#1B2333',
  textSecondary: '#4B5565',
  textMuted: '#98A1B3',
  border: '#E2E8F0',
  cardBorder: '#EBEEF8',
  chart: ['#23408E', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6'],
  metricZone: lightMetricZone,
};

export const darkTheme: ThemeColors = {
  background: '#0D1021',
  surface: '#171A2E',
  surfaceAlt: '#1E2240',
  primary: '#7C93F5',
  primaryDark: '#5B74E8',
  primaryLight: '#2DD4BF',
  primarySoft: '#1B2340',
  accent: '#2DD4BF',
  accentSoft: '#0E2A26',
  success: '#4ADE80',
  warning: '#FBBF24',
  warningSoft: '#332708',
  danger: '#F87171',
  dangerSoft: '#3A1220',
  text: '#EDF0FF',
  textSecondary: '#B6C0D2',
  textMuted: '#6E7691',
  border: '#262B45',
  cardBorder: '#232842',
  chart: ['#7C93F5', '#2DD4BF', '#FBBF24', '#F87171', '#A78BFA'],
  metricZone: {
    weight: '#A78BFA',
    bmi: '#7DD3FC',
    bodyFat: '#FDBA74',
    muscle: '#6EE7B7',
    visceral: '#FDE047',
    water: '#D8B4FE',
  },
};

export const corporateTheme: ThemeColors = {
  ...lightTheme,
  background: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F9FC',
  primary: '#23408E',
  accent: '#14B8A6',
  chart: ['#23408E', '#14B8A6', '#0EA5E9', '#DC2626', '#7C3AED'],
};

export function getTheme(mode: ThemeMode): ThemeColors {
  switch (mode) {
    case 'dark':
      return darkTheme;
    case 'corporate':
      return corporateTheme;
    case 'light':
    default:
      return lightTheme;
  }
}