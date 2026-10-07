import { Text, View } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import type { MetricStatus } from '../../types/bodyAnalysis';

interface MetricRangeCardProps {
  label: string;
  value: number;
  unit: string;
  status: MetricStatus;
  zoneMin: number;
  zoneMax: number;
  zoneColor: string;
}

export default function MetricRangeCard({
  label,
  value,
  unit,
  status,
  zoneMin,
  zoneMax,
  zoneColor,
}: MetricRangeCardProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';

  const statusColor =
    status === 'normal'
      ? colors.success
      : status === 'high'
      ? colors.warning
      : colors.primaryLight;

  const statusText =
    status === 'normal'
      ? isFa ? 'نرمال' : 'Normal'
      : status === 'high'
      ? isFa ? 'بالا' : 'High'
      : isFa ? 'پایین' : 'Low';

  // مقیاس نمایش نوار
  const lo0 = Math.min(zoneMin, value);
  const hi0 = Math.max(zoneMax, value);
  const span = hi0 - lo0 || 1;
  const lo = lo0 - span * 0.18;
  const hi = hi0 + span * 0.18;
  const pct = (v: number) =>
    Math.min(Math.max(((v - lo) / (hi - lo)) * 100, 2), 98);

  return (
    <View
      className="flex-1 rounded-2xl p-4 m-1.5"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: status === 'high' ? colors.warning + '80' : colors.cardBorder,
      }}
    >
      {/* سربرگ: نقطه + برچسب + بج وضعیت */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View
            className="w-2 h-2 rounded-full ml-2"
            style={{ backgroundColor: statusColor }}
          />
          <Text
            className="text-xs font-semibold"
            style={{ color: colors.textSecondary }}
          >
            {label}
          </Text>
        </View>
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: statusColor + '1A' }}
        >
          <Text className="font-bold" style={{ fontSize: 10, color: statusColor }}>
            {statusText}
          </Text>
        </View>
      </View>

      {/* مقدار */}
      <View className="flex-row items-baseline mb-3">
        <Text className="text-2xl font-bold" style={{ color: colors.text }}>
          {value}
        </Text>
        <Text className="text-xs ml-1" style={{ color: colors.textMuted }}>
          {unit}
        </Text>
      </View>

      {/* نوار بازهٔ سالم + نشانگر */}
      <View style={{ height: 12, justifyContent: 'center' }}>
        <View
          style={{ height: 4, backgroundColor: colors.border, borderRadius: 2 }}
        />
        <View
          style={{
            position: 'absolute',
            height: 4,
            borderRadius: 2,
            backgroundColor: zoneColor + '66',
            left: `${pct(zoneMin)}%`,
            width: `${Math.max(pct(zoneMax) - pct(zoneMin), 4)}%`,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: zoneColor,
            top: 1,
            left: `${pct(value)}%`,
            marginLeft: -5,
          }}
        />
      </View>

      {/* پانوشت بازه */}
      <View className="flex-row items-center justify-between mt-2">
        <Text className="font-medium" style={{ fontSize: 10, color: colors.textMuted }}>
          {isFa ? 'محدودهٔ سالم' : 'Healthy range'}
        </Text>
        <Text style={{ fontSize: 10, color: colors.textMuted }}>
          {zoneMin}–{zoneMax} {unit}
        </Text>
      </View>
    </View>
  );
}