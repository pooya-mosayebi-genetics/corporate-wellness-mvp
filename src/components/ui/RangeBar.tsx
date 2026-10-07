import { Text, View, Pressable } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { faNum } from '../../utils/format';

export default function RangeBar({
  label, value, unit, lo, hi, zoneMin, zoneMax, peer, color, onPress,
}: {
  label: string; value: number; unit: string; lo: number; hi: number;
  zoneMin: number; zoneMax: number; peer: number; color: string; onPress?: () => void;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const span = hi - lo || 1;
  const pct = (v: number) => Math.min(Math.max(((v - lo) / span) * 100, 0), 100);
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ paddingVertical: 7 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 10, color: colors.textSecondary }}>{label}</Text>
        <Text style={{ fontSize: 10, fontWeight: '700', color }}>
          {faNum(value, isFa)}
          {unit}
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt }}>
        <View style={{ position: 'absolute', left: `${pct(zoneMin)}%`, width: `${Math.max(pct(zoneMax) - pct(zoneMin), 5)}%`, height: 6, borderRadius: 3, backgroundColor: colors.success + '55' }} />
        <View style={{ position: 'absolute', left: `${pct(peer)}%`, top: -2, width: 2, height: 10, backgroundColor: colors.textMuted }} />
        <View style={{ position: 'absolute', left: `${pct(value)}%`, top: -3, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: color, borderWidth: 2, borderColor: colors.surface }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 8, color: colors.textMuted }}>{faNum(lo, isFa)}</Text>
        <Text style={{ fontSize: 8, color: colors.textMuted }}>{faNum(hi, isFa)}</Text>
      </View>
    </Pressable>
  );
}