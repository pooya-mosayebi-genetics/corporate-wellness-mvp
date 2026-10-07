import { Component, ReactNode, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { logger } from '../../utils/logger';

const Z_RADIUS = { card: 14, inner: 12, control: 10, chip: 999 };
const Z_SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

function downloadLogs() {
  if (typeof window === 'undefined') return;
  logger.exportJson().then((text) => {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zharfa-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

function Fallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const [showDetail, setShowDetail] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: Z_SPACE.lg }}>
      <View style={{ width: '100%', maxWidth: 460, backgroundColor: colors.surface, borderRadius: Z_RADIUS.card, borderWidth: 1, borderColor: colors.danger + '44', padding: Z_SPACE.lg, alignItems: 'center' }}>
        <Text style={{ fontSize: 40, marginBottom: Z_SPACE.sm }}>⚠️</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.danger, marginBottom: Z_SPACE.xs }}>
          {isFa ? 'خطایی رخ داد' : 'Something went wrong'}
        </Text>
        <Text style={{ fontSize: 10, color: colors.textSecondary, textAlign: 'center', lineHeight: 17, marginBottom: Z_SPACE.md }}>
          {isFa
            ? 'نگران نباشید؛ داده‌های شما امن است. خطا ثبت شد و می‌توانید دوباره تلاش کنید یا لاگ را برای بررسی دانلود کنید.'
            : 'Your data is safe. The error was logged. Retry or download the log for inspection.'}
        </Text>

        <Pressable onPress={() => setShowDetail((v) => !v)} style={{ width: '100%', marginBottom: Z_SPACE.md, backgroundColor: colors.surfaceAlt, borderRadius: Z_RADIUS.inner, padding: Z_SPACE.sm, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary, marginBottom: showDetail ? Z_SPACE.xs : 0 }}>
            {showDetail ? '▾ ' : '▸ '}{isFa ? 'جزئیات فنی خطا' : 'Technical details'}
          </Text>
          {showDetail && (
            <ScrollView style={{ maxHeight: 140 }}>
              <Text style={{ fontSize: 8, color: colors.textMuted, lineHeight: 13 }}>
                {error?.message || 'Unknown error'}
              </Text>
            </ScrollView>
          )}
        </Pressable>

        <View style={{ flexDirection: 'row', gap: Z_SPACE.sm, width: '100%' }}>
          <Pressable onPress={onReset} style={{ flex: 1, backgroundColor: colors.primary, borderRadius: Z_RADIUS.control, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{isFa ? 'تلاش دوباره' : 'Retry'}</Text>
          </Pressable>
          <Pressable onPress={downloadLogs} style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: Z_RADIUS.control, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800' }}>⬇ {isFa ? 'دانلود لاگ' : 'Download log'}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => { if (typeof window !== 'undefined') window.location.reload(); }}
          style={{ marginTop: Z_SPACE.sm, width: '100%', paddingVertical: 10, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, textDecorationLine: 'underline' }}>
            {isFa ? 'بارگذاری مجدد کامل اپ' : 'Full reload'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    logger.error(
      'ui_crash',
      error?.message || 'Unknown UI crash',
      (info?.componentStack || '').slice(0, 800),
      'ErrorBoundary',
    );
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Fallback
        error={this.state.error}
        onReset={() => this.setState({ hasError: false, error: null })}
      />
    );
  }
}