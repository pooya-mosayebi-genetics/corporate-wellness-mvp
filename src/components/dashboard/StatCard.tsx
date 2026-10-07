import { Text, View } from 'react-native';
import { useTheme } from '../../store/ThemeContext';

export type StatTone = 'primary' | 'accent' | 'warning';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: string;
  tone?: StatTone;
  deltaText?: string;
  deltaPositive?: boolean;
}

export default function StatCard({
  label,
  value,
  unit,
  icon,
  tone = 'primary',
  deltaText,
  deltaPositive = true,
}: StatCardProps) {
  const { colors } = useTheme();

  const soft =
    tone === 'accent'
      ? colors.accentSoft
      : tone === 'warning'
      ? colors.warningSoft
      : colors.primarySoft;

  return (
    <View
      className="flex-1 rounded-2xl p-4 m-1.5"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}
    >
      <View className="flex-row items-start justify-between mb-3">
        <Text className="text-xs" style={{ color: colors.textMuted }}>
          {label}
        </Text>
        <View
          className="w-9 h-9 rounded-xl items-center justify-center"
          style={{ backgroundColor: soft }}
        >
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
      </View>

      <View className="flex-row items-baseline">
        <Text className="text-2xl font-bold" style={{ color: colors.text }}>
          {value}
        </Text>
        {unit ? (
          <Text className="text-xs ml-1" style={{ color: colors.textMuted }}>
            {unit}
          </Text>
        ) : null}
      </View>

      {deltaText ? (
        <View
          className="self-start px-2 py-0.5 rounded-full mt-2"
          style={{
            backgroundColor: deltaPositive ? colors.accentSoft : colors.dangerSoft,
          }}
        >
          <Text
            className="font-bold"
            style={{
              fontSize: 10,
              color: deltaPositive ? colors.success : colors.danger,
            }}
          >
            {deltaText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}