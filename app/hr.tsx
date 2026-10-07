import { Suspense, lazy } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';

/**
 * 🆕 L-10 Perf: Entry point for HR Dashboard.
 * The heavy implementation is loaded lazily to reduce initial bundle size.
 */
const HrDashboardImpl = lazy(() => import('../src/pages/HrDashboardImpl'));

export default function HrDashboardScreen() {
  const { colors } = useTheme();

  return (
    <Suspense 
      fallback={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, fontSize: 12, color: colors.textMuted }}>
            در حال آماده‌سازی داشبورد منابع انسانی...
          </Text>
        </View>
      }
    >
      <HrDashboardImpl />
    </Suspense>
  );
}