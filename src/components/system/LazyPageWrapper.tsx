import { Suspense, lazy, ReactNode } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../../store/ThemeContext';

/**
 * 🆕 L-10 Perf: Wrapper استاندارد برای بارگذاری تنبل صفحات.
 * استفاده: <LazyPageLoader loader={() => import('../../pages/heavy')} />
 */
export function LazyPageLoader({ 
  loader, 
  fallbackText = 'در حال بارگذاری...' 
}: { 
  loader: () => Promise<{ default: any }>; 
  fallbackText?: string;
}) {
  const { colors } = useTheme();
  
  // تبدیل loader به Component
  const LazyComponent = lazy(loader);

  return (
    <Suspense 
      fallback={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, fontSize: 12, color: colors.textMuted }}>{fallbackText}</Text>
        </View>
      }
    >
      <LazyComponent />
    </Suspense>
  );
}