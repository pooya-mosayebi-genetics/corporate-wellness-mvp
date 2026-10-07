import { memo } from 'react'; // 🆕 L-10 Perf: Import memo
import { View, Text, Pressable } from 'react-native';
import Svg, { Circle, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { faNum } from '../../utils/format';

/**
 * 🆕 L-10 Perf: MiniDonut is now memoized.
 * Prevents expensive SVG recalculations when parent state changes but segments remain identical.
 */
export const MiniDonut = memo(function MiniDonut({ segments, size = 100, thickness = 14, centerValue, centerLabel }: {
  segments: { value: number; color: string }[]; size?: number; thickness?: number; centerValue?: string; centerLabel?: string;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={thickness} fill="none" />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const off = acc;
          acc += len;
          return (
            <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={s.color} strokeWidth={thickness} fill="none"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          );
        })}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{centerValue ? faNum(centerValue, isFa) : ''}</Text>
        {centerLabel ? <Text style={{ fontSize: 8, color: colors.textMuted }}>{centerLabel}</Text> : null}
      </View>
    </View>
  );
});

/**
 * 🆕 L-10 Perf: MultiLine chart memoized for performance in dashboards with frequent updates.
 */
export const MultiLine = memo(function MultiLine({ labels, series, width = 300, height = 120 }: {
  labels: string[]; series: { name: string; color: string; values: number[] }[]; width?: number; height?: number;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const padT = 10; const padB = 18; const innerH = height - padT - padB;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all, 1); const min = Math.min(...all, 0);
  const x = (i: number) => 8 + (i / Math.max(labels.length - 1, 1)) * (width - 16);
  const y = (v: number) => padT + innerH - ((v - min) / (max - min || 1)) * innerH;
  const step = Math.max(1, Math.ceil((labels.length * 26) / Math.max(width - 16, 40)));
  
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {series.map((s, si) => (
          <Polyline key={si} points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} stroke={s.color} strokeWidth={2} fill="none" strokeLinecap="round" />
        ))}
        {series.map((s, si) => s.values.map((v, i) => (
          <Circle key={`${si}-${i}`} cx={x(i)} cy={y(v)} r={2.5} fill={s.color} />
        )))}
        {labels.map((l, i) =>
          (i % step === 0 || i === labels.length - 1) ? (
            <SvgText key={i} x={x(i)} y={height - 4} fontSize={7.5} fill={colors.textMuted} textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}>
              {faNum(l, isFa)}
            </SvgText>
          ) : null,
        )}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 2 }}>
        {series.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: s.color }} />
            <Text style={{ fontSize: 9, color: colors.textMuted }}>{s.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

/**
 * 🆕 L-10 Perf: ColorBars memoized. 
 * The hit areas are calculated purely based on index and slot width, ensuring stability across renders.
 */
export const ColorBars = memo(function ColorBars({ data, width = 300, height = 130, onBarPress }: {
  data: { label: string; value: number; color: string }[]; width?: number; height?: number; onBarPress?: (i: number) => void;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const padT = 16; const padB = 18; const innerH = height - padT - padB;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = (width - 16) / Math.max(data.length, 1);
  const bw = Math.min(slot * 0.5, 22);
  
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const cx = 8 + i * slot + slot / 2;
          const h = Math.max((d.value / max) * innerH, 3);
          return (
            <Svg key={i}>
              <Rect x={cx - bw / 2} y={padT + innerH - h} width={bw} height={h} rx={5} fill={d.color} />
              <SvgText x={cx} y={padT + innerH - h - 4} fontSize={9} fontWeight="bold" fill={colors.text} textAnchor="middle">
                {faNum(d.value, isFa)}
              </SvgText>
              <SvgText x={cx} y={height - 5} fontSize={8} fill={colors.textMuted} textAnchor="middle">
                {faNum(d.label, isFa)}
              </SvgText>
            </Svg>
          );
        })}
      </Svg>
      {/* ✅ خانه‌های کلیک: مطلق و با left محاسبه‌شده از ایندکس → همیشه منطبق بر ستون خودش */}
      {onBarPress && data.map((_, i) => (
        <Pressable
          key={`hit-${i}`}
          onPress={() => onBarPress(i)}
          style={{ position: 'absolute', left: 8 + i * slot, top: padT, width: slot, height: innerH }}
        />
      ))}
    </View>
  );
});

/**
 * 🆕 L-10 Perf: MeterRow memoized to prevent layout thrashing in long lists of metrics.
 */
export const MeterRow = memo(function MeterRow({ icon, label, left, right, progress, color, badge }: {
  icon: string; label: string; left: string; right: string; progress: number; color: string; badge?: string;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }}>
      <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
        <Text style={{ fontSize: 12, includeFontPadding: false }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 10, color: colors.textSecondary, includeFontPadding: false }}>{label}</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: colors.textMuted, includeFontPadding: false }}>{faNum(left, isFa)}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, includeFontPadding: false }}>{faNum(right, isFa)}</Text>
            {badge ? (
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: color + '22' }}>
                <Text style={{ fontSize: 8, fontWeight: '700', color, includeFontPadding: false }}>{faNum(badge, isFa)}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.border, marginTop: 5, overflow: 'hidden' }}>
          <View style={{ height: 5, borderRadius: 3, width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }} />
        </View>
      </View>
    </View>
  );
});