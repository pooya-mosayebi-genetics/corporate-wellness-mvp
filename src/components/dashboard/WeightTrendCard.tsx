import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import ChartTooltip from '../charts/ChartTooltip';

export interface WeightPoint {
  label: string;
  weight: number;
}

export default function WeightTrendCard({ points }: { points: WeightPoint[] }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const [hover, setHover] = useState<number | null>(null);

  const w = 320;
  const h = 150;
  const padT = 14;
  const padB = 22;
  const innerH = h - padT - padB;

  if (points.length < 2) {
    return (
      <View
        className="rounded-2xl p-6 items-center"
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <Text style={{ fontSize: 26 }}>⚖️</Text>
        <Text className="text-sm font-bold mt-2 mb-1" style={{ color: colors.text }}>
          {isFa ? 'روند وزن' : 'Weight Trend'}
        </Text>
        <Text className="text-xs text-center" style={{ color: colors.textMuted }}>
          {isFa
            ? 'برای دیدن روند، حداقل دو آنالیز ثبت کنید'
            : 'Log at least two analyses to see the trend'}
        </Text>
      </View>
    );
  }

  let min = Math.min(...points.map((p) => p.weight));
  let max = Math.max(...points.map((p) => p.weight));
  if (max - min < 0.5) {
    min -= 0.5;
    max += 0.5;
  }
  const x = (i: number) => 12 + (i / (points.length - 1)) * (w - 24);
  const y = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;
  const line = points.map((p, i) => `${x(i)},${y(p.weight)}`).join(' ');

  const tooltipFor = (i: number) => {
    const delta = i > 0 ? Math.round((points[i].weight - points[i - 1].weight) * 10) / 10 : null;
    return {
      title: points[i].label,
      rows: [
        { label: isFa ? 'وزن' : 'Weight', value: `${points[i].weight} kg`, color: colors.chart[0] },
        ...(delta !== null
          ? [
              {
                label: isFa ? 'تغییر' : 'Change',
                value: `${delta > 0 ? '+' : ''}${delta} kg`,
                color: delta <= 0 ? colors.success : colors.danger,
              },
            ]
          : []),
      ],
    };
  };

  return (
    <View
      className="rounded-2xl p-5"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-bold" style={{ color: colors.text }}>
          {isFa ? 'روند وزن' : 'Weight Trend'}
        </Text>
        <Text className="text-xs font-bold" style={{ color: colors.chart[0] }}>
          {points[points.length - 1].weight} kg
        </Text>
      </View>

      <View style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Polyline
            points={line}
            stroke={colors.chart[0]}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={x(i)}
              cy={y(p.weight)}
              r={hover === i ? 6 : i === points.length - 1 ? 4.5 : 3}
              fill={hover === i || i === points.length - 1 ? colors.chart[0] : colors.surface}
              stroke={colors.chart[0]}
              strokeWidth={2}
            />
          ))}
          <SvgText x={12} y={h - 6} fontSize={9} fill={colors.textMuted}>
            {points[0].label}
          </SvgText>
          <SvgText x={w - 12} y={h - 6} fontSize={9} fill={colors.textMuted} textAnchor="end">
            {points[points.length - 1].label}
          </SvgText>
        </Svg>

        {/* لایهٔ هاور /タップ */}
        {points.map((_, i) => (
          <Pressable
            key={i}
            style={{ position: 'absolute', left: x(i) - 14, top: 0, width: 28, height: h }}
            onHoverIn={() => setHover(i)}
            onHoverOut={() => setHover((hv) => (hv === i ? null : hv))}
            onPress={() => setHover((hv) => (hv === i ? null : i))}
          />
        ))}

        {hover !== null && (
          <ChartTooltip
            visible
            x={x(hover)}
            y={y(points[hover].weight)}
            containerWidth={w}
            title={tooltipFor(hover).title}
            rows={tooltipFor(hover).rows}
          />
        )}
      </View>
    </View>
  );
}