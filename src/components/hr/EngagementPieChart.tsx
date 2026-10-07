import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../store/ThemeContext';
import type { EngagementData } from '../../data/mockHrData';

interface EngagementPieChartProps {
  data: EngagementData[];
  centerLabel?: string;
  centerValue?: string;
}

export default function EngagementPieChart({
  data,
  centerLabel = 'Engagement',
  centerValue = '88%',
}: EngagementPieChartProps) {
  const { colors } = useTheme();

  const size = 200;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let accumulatedOffset = 0;

  return (
    <View className="items-center w-full">
      <View style={{ width: size, height: size }} className="items-center justify-center">
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {data.map((item, index) => {
            const segmentLength = (item.value / total) * circumference;
            const offset = accumulatedOffset;
            accumulatedOffset += segmentLength;

            return (
              <Circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })}
        </Svg>

        <View className="absolute items-center">
          <Text className="text-2xl font-bold" style={{ color: colors.primary }}>
            {centerValue}
          </Text>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>{centerLabel}</Text>
        </View>
      </View>

      <View className="mt-4 w-full">
        {data.map((item, index) => (
          <View
            key={index}
            className="flex-row items-center justify-between py-2"
            style={{
              borderBottomWidth: index < data.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}
          >
            <View className="flex-row items-center flex-1">
              <View
                className="w-3 h-3 rounded-full ml-2"
                style={{ backgroundColor: item.color }}
              />
              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                {item.label}
              </Text>
            </View>
            <Text className="text-sm font-bold" style={{ color: colors.text }}>
              {item.value}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}