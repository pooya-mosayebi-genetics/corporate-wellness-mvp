import { View, Text } from 'react-native';
import { useTheme } from '../../store/ThemeContext';

interface ProgressRowProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}

export default function ProgressRow({ label, value, target, unit, color }: ProgressRowProps) {
  const { colors } = useTheme();
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;

  return (
    <View className="mb-3">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
          {label}
        </Text>
        <Text style={{ fontSize: 10, color: colors.textMuted }}>
          {value}/{target} {unit}
        </Text>
      </View>
      <View
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: colors.surfaceAlt }}
      >
        <View
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}