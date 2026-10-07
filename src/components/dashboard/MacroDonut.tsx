import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import ChartTooltip from '../charts/ChartTooltip';

interface MacroDonutProps {
  protein: number;
  carbs: number;
  fat: number;
}

export default function MacroDonut({ protein, carbs, fat }: MacroDonutProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const [hover, setHover] = useState<number | null>(null);

  const grams = [protein, carbs, fat];
  const segments = [
    { label: isFa ? 'پروتئین' : 'Protein', kcal: protein * 4, color: colors.chart[3] },
    { label: isFa ? 'کربوهیدرات' : 'Carbs', kcal: carbs * 4, color: colors.chart[2] },
    { label: isFa ? 'چربی' : 'Fat', kcal: fat * 4, color: colors.chart[1] },
  ];

  const total = segments.reduce((s, x) => s + x.kcal, 0);

  const size = 140;
  const sw = 16;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;

  let acc = 0;

  const tooltip =
    hover !== null
      ? {
          title: segments[hover].label,
          rows: [
            { label: isFa ? 'کالری' : 'Calories', value: `${segments[hover].kcal} kcal`, color: segments[hover].color },
            { label: isFa ? 'گرم' : 'Grams', value: `${Math.round(grams[hover] * 10) / 10} g` },
            {
              label: isFa ? 'سهم کالری' : '% of kcal',
              value: `${total > 0 ? Math.round((segments[hover].kcal / total) * 100) : 0}%`,
            },
          ],
        }
      : null;

  return (
    <View className="items-center w-full">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={sw} fill="none" />
          {total > 0 &&
            segments.map((s, i) => {
              const len = (s.kcal / total) * c;
              const off = acc;
              acc += len;
              return (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={s.color}
                  strokeWidth={hover === i ? sw + 3 : sw}
                  fill="none"
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-off}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
            })}
        </Svg>

        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text className="text-xl font-bold" style={{ color: colors.text }}>
            {total}
          </Text>
          <Text style={{ fontSize: 9, color: colors.textMuted }}>kcal</Text>
        </View>

        {tooltip && (
          <ChartTooltip
            visible
            x={size / 2}
            y={size / 2 - 10}
            containerWidth={size}
            title={tooltip.title}
            rows={tooltip.rows}
          />
        )}
      </View>

      {/* لجند قابل هاور */}
      <View className="flex-row mt-3 w-full">
        {segments.map((s, i) => (
          <Pressable
            key={i}
            className="flex-1 items-center py-1"
            onHoverIn={() => setHover(i)}
            onHoverOut={() => setHover((h) => (h === i ? null : h))}
            onPress={() => setHover((h) => (h === i ? null : i))}
            style={{
              borderRadius: 8,
              backgroundColor: hover === i ? colors.surfaceAlt : 'transparent',
            }}
          >
            <View className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: s.color }} />
            <Text style={{ fontSize: 9, color: colors.textMuted }}>{s.label}</Text>
            <Text className="text-xs font-bold" style={{ color: colors.text }}>
              {Math.round(s.kcal)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}