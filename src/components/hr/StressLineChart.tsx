import { View, Text } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import type { WeeklyStressData } from '../../data/mockHrData';

interface StressLineChartProps {
  data: WeeklyStressData[];
}

export default function StressLineChart({ data }: StressLineChartProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';

  const width = 340;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = 10;
  const minValue = 0;

  const getX = (index: number) =>
    padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (value: number) =>
    padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

  const stressPoints = data.map((d, i) => `${getX(i)},${getY(d.averageStress)}`).join(' ');
  const sleepPoints = data.map((d, i) => `${getX(i)},${getY(d.averageSleep)}`).join(' ');

  return (
    <View className="items-center w-full">
      <Svg width={width} height={height}>
        {[0, 2, 4, 6, 8, 10].map((value) => (
          <Line
            key={value}
            x1={padding.left}
            y1={getY(value)}
            x2={width - padding.right}
            y2={getY(value)}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}

        {[0, 2, 4, 6, 8, 10].map((value) => (
          <SvgText
            key={`label-${value}`}
            x={padding.left - 8}
            y={getY(value) + 4}
            fontSize={10}
            fill={colors.textMuted}
            textAnchor="end"
          >
            {value}
          </SvgText>
        ))}

        <Polyline
          points={sleepPoints}
          stroke={colors.accent}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Polyline
          points={stressPoints}
          stroke={colors.warning}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((d, i) => (
          <Circle
            key={`stress-${i}`}
            cx={getX(i)}
            cy={getY(d.averageStress)}
            r={4}
            fill={colors.warning}
            stroke={colors.surface}
            strokeWidth={2}
          />
        ))}
        {data.map((d, i) => (
          <Circle
            key={`sleep-${i}`}
            cx={getX(i)}
            cy={getY(d.averageSleep)}
            r={4}
            fill={colors.accent}
            stroke={colors.surface}
            strokeWidth={2}
          />
        ))}

        {data.map((d, i) => (
          <SvgText
            key={`day-${i}`}
            x={getX(i)}
            y={height - 8}
            fontSize={11}
            fill={colors.textMuted}
            textAnchor="middle"
          >
            {d.day}
          </SvgText>
        ))}
      </Svg>

      <View className="flex-row justify-center mt-3 gap-6">
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full ml-2" style={{ backgroundColor: colors.warning }} />
          <Text className="text-xs" style={{ color: colors.textSecondary }}>
            {isFa ? 'میانگین استرس' : 'Avg Stress'}
          </Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full ml-2" style={{ backgroundColor: colors.accent }} />
          <Text className="text-xs" style={{ color: colors.textSecondary }}>
            {isFa ? 'میانگین خواب' : 'Avg Sleep'}
          </Text>
        </View>
      </View>
    </View>
  );
}