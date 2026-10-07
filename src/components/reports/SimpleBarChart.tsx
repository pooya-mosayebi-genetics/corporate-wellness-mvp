import { useState } from 'react';
import { View, Pressable } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../store/ThemeContext';

export interface BarDatum {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  data: BarDatum[];
  barColor: string;
  maxValue?: number;
  onBarPress?: (index: number) => void;
}

export default function SimpleBarChart({ data, barColor, maxValue, onBarPress }: SimpleBarChartProps) {
  const { colors } = useTheme();
  const [hover, setHover] = useState<number | null>(null);

  const width = 320;
  const height = 160;
  const padT = 14;
  const padB = 22;
  const innerH = height - padT - padB;
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const slot = (width - 16) / Math.max(data.length, 1);
  const bw = Math.min(slot * 0.55, 26);

  return (
    <View style={{ width, height }}>
      {/* SVG فقط نمایشی — بدون هیچ هندلر رویداد */}
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const cx = 8 + i * slot + slot / 2;
          const h = Math.max((d.value / max) * innerH, 3);
          const active = hover === i;
          return (
            <Svg key={i}>
              <Rect
                x={cx - bw / 2}
                y={padT + innerH - h}
                width={bw}
                height={h}
                rx={5}
                fill={barColor}
                opacity={active ? 1 : 0.8}
              />
              {active && (
                <SvgText
                  x={cx}
                  y={padT + innerH - h - 5}
                  fontSize={10}
                  fontWeight="bold"
                  fill={colors.text}
                  textAnchor="middle"
                >
                  {d.value}
                </SvgText>
              )}
              <SvgText x={cx} y={height - 6} fontSize={9} fill={colors.textMuted} textAnchor="middle">
                {d.label}
              </SvgText>
            </Svg>
          );
        })}
      </Svg>

      {/* لایهٔ تعامل شفاف روی میله‌ها */}
      {onBarPress && (
        <View
          style={{
            position: 'absolute',
            left: 8,
            top: padT,
            width: width - 16,
            height: innerH,
            flexDirection: 'row',
          }}
        >
          {data.map((_, i) => (
            <Pressable
              key={i}
              style={{ flex: 1 }}
              onHoverIn={() => setHover(i)}
              onHoverOut={() => setHover((h) => (h === i ? null : h))}
              onPress={() => onBarPress(i)}
            />
          ))}
        </View>
      )}
    </View>
  );
}