import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import type { ThemeMode } from '../../theme/colors';

const MODES: { key: ThemeMode; icon: string }[] = [
  { key: 'light', icon: '☀️' },
  { key: 'dark', icon: '🌙' },
  { key: 'corporate', icon: '🏢' },
];

export default function ThemeSwitcher() {
  const { colors, mode, setMode } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';

  return (
    <View style={{ paddingHorizontal: 10, marginBottom: 8 }}>
      <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 4 }}>
        {isFa ? 'تم' : 'THEME'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => setMode(m.key)}
              style={{
                flex: 1,
                height: 30,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? colors.primarySoft : colors.surfaceAlt,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text style={{ fontSize: 12 }}>{m.icon}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}