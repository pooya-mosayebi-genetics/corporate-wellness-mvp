import { View } from 'react-native';
import { useTheme } from '../../../store/ThemeContext';

export default function RangeSlider({ value, min, max, zoneMin, zoneMax, color, zoneColor, threshold }: {
  value: number; min: number; max: number; zoneMin: number; zoneMax: number; color: string; zoneColor: string; threshold?: number;
}) {
  const { colors } = useTheme();
  const span = max - min || 1;
  const clamp = (v: number) => Math.max(0, Math.min(1, (v - min) / span));
  const pos = clamp(value);
  const z1 = clamp(zoneMin);
  const z2 = clamp(zoneMax);
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt }}>
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: `${z1 * 100}%`, width: `${Math.max(2, (z2 - z1) * 100)}%`, borderRadius: 3, backgroundColor: zoneColor }} />
      {threshold !== undefined && (
        <View style={{ position: 'absolute', top: -2, bottom: -2, left: `${clamp(threshold) * 100}%`, width: 2, backgroundColor: colors.textMuted }} />
      )}
      <View style={{ position: 'absolute', top: -2, left: `${pos * 100}%`, marginLeft: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
}