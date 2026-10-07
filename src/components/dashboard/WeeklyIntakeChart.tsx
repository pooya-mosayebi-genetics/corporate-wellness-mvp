import { View, Pressable } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';

export interface IntakeDay {
  label: string;
  value: number;
  isToday?: boolean;
}

interface WeeklyIntakeChartProps {
  data: IntakeDay[];
  target: number;
  targetLabel: string;
  width?: number;
  onBarPress?: (index: number) => void;
}

export default function WeeklyIntakeChart({
  data,
  target,
  targetLabel,
  width = 320,
  onBarPress,
}: WeeklyIntakeChartProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';

  const height = 170;
  const padL = 6;
  const padR = 6;
  const padT = 26;
  const padB = 20;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const maxVal = Math.max(target, ...data.map((d) => d.value)) * 1.12;
  const slot = chartW / data.length;
  const barW = Math.min(slot * 0.5, 20);

  const y = (v: number) => padT + chartH - (v / maxVal) * chartH;

  const todayIndex = data.findIndex((d) => d.isToday);
  const today = todayIndex >= 0 ? data[todayIndex] : null;
  const todayX = today ? padL + todayIndex * slot + slot / 2 : 0;
  const todayY = today ? y(today.value) : 0;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line
          x1={padL}
          x2={width - padR}
          y1={y(target)}
          y2={y(target)}
          stroke={colors.textMuted}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        <SvgText
          x={width - padR}
          y={y(target) - 4}
          fontSize={8}
          fill={colors.textMuted}
          textAnchor="end"
        >
          {targetLabel}
        </SvgText>

        {data.map((d, i) => {
          const cx = padL + i * slot + slot / 2;
          const bh = Math.max((d.value / maxVal) * chartH, 5);
          return (
            <Rect
              key={i}
              x={cx - barW / 2}
              y={padT + chartH - bh}
              width={barW}
              height={bh}
              rx={barW / 2}
              fill={d.isToday ? colors.primary : colors.primaryLight}
              opacity={d.isToday ? 1 : 0.35}
            />
          );
        })}

        {today && (
          <>
            <Rect
              x={todayX - 24}
              y={Math.max(todayY - 22, 2)}
              width={48}
              height={16}
              rx={8}
              fill={colors.primary}
            />
            <SvgText
              x={todayX}
              y={Math.max(todayY - 22, 2) + 11}
              fontSize={9}
              fontWeight="bold"
              fill="#FFFFFF"
              textAnchor="middle"
            >
              {today.value}
            </SvgText>
          </>
        )}

        {data.map((d, i) => (
          <SvgText
            key={`l${i}`}
            x={padL + i * slot + slot / 2}
            y={height - 5}
            fontSize={8}
            fill={colors.textMuted}
            textAnchor="middle"
          >
            {d.label}
          </SvgText>
        ))}
      </Svg>

      {onBarPress && (
        <View
          style={{
            position: 'absolute',
            left: padL,
            top: padT,
            width: chartW,
            height: chartH,
            flexDirection: 'row',
          }}
        >
          {data.map((_, i) => (
            <Pressable
              key={i}
              style={{ flex: 1 }}
              onPress={() => onBarPress(i)}
            />
          ))}
        </View>
      )}
    </View>
  );
}