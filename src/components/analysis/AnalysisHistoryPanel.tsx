import { useMemo, useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import ChartTooltip from '../charts/ChartTooltip';
import type { ClientAnalysisSnapshot } from '../../types/clients';

interface MetricDef {
  key: keyof ClientAnalysisSnapshot;
  labelFa: string;
  labelEn: string;
  unit: string;
  good: 'up' | 'down';
  dec: number;
}

const METRICS: MetricDef[] = [
  { key: 'weightKg', labelFa: 'وزن', labelEn: 'Weight', unit: 'kg', good: 'down', dec: 1 },
  { key: 'bmi', labelFa: 'BMI', labelEn: 'BMI', unit: '', good: 'down', dec: 1 },
  { key: 'pbfPercent', labelFa: 'درصد چربی', labelEn: 'Body Fat', unit: '%', good: 'down', dec: 1 },
  { key: 'smmKg', labelFa: 'توده عضلانی', labelEn: 'Muscle Mass', unit: 'kg', good: 'up', dec: 1 },
  { key: 'bfmKg', labelFa: 'توده چربی', labelEn: 'Fat Mass', unit: 'kg', good: 'down', dec: 1 },
  { key: 'vfl', labelFa: 'چربی احشایی', labelEn: 'Visceral Fat', unit: '', good: 'down', dec: 0 },
  { key: 'tbwPercent', labelFa: 'آب بدن', labelEn: 'Body Water', unit: '%', good: 'up', dec: 1 },
  { key: 'bioAge', labelFa: 'سن بیولوژیک', labelEn: 'Bio Age', unit: 'y', good: 'down', dec: 0 },
];

function TrendMiniChart({
  values,
  color,
  title,
  unit,
  labels,
  goodWhen,
}: {
  values: number[];
  color: string;
  title: string;
  unit: string;
  labels: string[];
  goodWhen: 'up' | 'down';
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const [hover, setHover] = useState<number | null>(null);

  const w = 320;
  const h = 110;
  const padT = 12;
  const padB = 18;
  const innerH = h - padT - padB;

  if (values.length < 2) return null;

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 0.5) {
    min -= 0.5;
    max += 0.5;
  }
  const x = (i: number) => 12 + (i / (values.length - 1)) * (w - 24);
  const y = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  const deltaAt = (i: number) => (i > 0 ? Math.round((values[i] - values[i - 1]) * 10) / 10 : null);
  const deltaGood = (d: number) => (goodWhen === 'down' ? d <= 0 : d >= 0);

  return (
    <View className="mb-3">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
          {title}
        </Text>
        <Text className="text-xs font-bold" style={{ color }}>
          {values[values.length - 1]}
          {unit}
        </Text>
      </View>

      <View style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Polyline
            points={points}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {values.map((v, i) => (
            <Circle
              key={i}
              cx={x(i)}
              cy={y(v)}
              r={hover === i ? 6 : i === values.length - 1 ? 4.5 : 3}
              fill={hover === i || i === values.length - 1 ? color : colors.surface}
              stroke={color}
              strokeWidth={2}
            />
          ))}
          <SvgText x={12} y={h - 4} fontSize={9} fill={colors.textMuted}>
            {labels[0]}
          </SvgText>
          <SvgText x={w - 12} y={h - 4} fontSize={9} fill={colors.textMuted} textAnchor="end">
            {labels[labels.length - 1]}
          </SvgText>
        </Svg>

        {/* لایهٔ هاور /タップ */}
        {values.map((_, i) => (
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
            y={y(values[hover])}
            containerWidth={w}
            title={labels[hover] ?? title}
            rows={[
              { label: title, value: `${values[hover]}${unit}`, color },
              ...(deltaAt(hover) !== null
                ? [
                    {
                      label: isFa ? 'تغییر' : 'Change',
                      value: `${(deltaAt(hover) as number) > 0 ? '+' : ''}${deltaAt(hover)}${unit}`,
                      color: deltaGood(deltaAt(hover) as number) ? colors.success : colors.danger,
                    },
                  ]
                : []),
            ]}
          />
        )}
      </View>
    </View>
  );
}

export default function AnalysisHistoryPanel({
  snapshots,
}: {
  snapshots: ClientAnalysisSnapshot[];
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';

  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => a.date.localeCompare(b.date)),
    [snapshots],
  );

  const cardStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  };

  if (sorted.length === 0) {
    return (
      <View className="rounded-2xl p-6 items-center" style={cardStyle}>
        <Text style={{ fontSize: 26 }}>🗂️</Text>
        <Text className="text-sm font-bold mt-2 mb-1" style={{ color: colors.text }}>
          {isFa ? 'تاریخچه‌ای وجود ندارد' : 'No history yet'}
        </Text>
        <Text className="text-xs text-center" style={{ color: colors.textMuted }}>
          {isFa
            ? 'با هر بار وارد کردن فایل اکسل دستگاه، یک نسخهٔ زمانی ذخیره می‌شود و اینجا روند قابل مشاهده خواهد بود.'
            : 'Each Excel import creates a dated snapshot; trends will appear here.'}
        </Text>
      </View>
    );
  }

  const labels = sorted.map((s) =>
    new Date(s.date).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', {
      year: '2-digit',
      month: 'short',
      day: 'numeric',
    }),
  );

  const a = sorted[0];
  const b = sorted[sorted.length - 1];

  return (
    <View className="rounded-2xl p-5" style={cardStyle}>
      <Text className="text-sm font-bold mb-1" style={{ color: colors.text }}>
        {isFa ? 'تاریخچه و مقایسهٔ آنالیزها' : 'Analysis History & Comparison'}
      </Text>
      <Text className="text-xs mb-3" style={{ color: colors.textMuted }}>
        {isFa
          ? `${sorted.length} نسخهٔ زمانی — نشانگر موس را روی نقطه‌ها ببرید`
          : `${sorted.length} snapshots — hover the points for details`}
      </Text>

      {sorted.length >= 2 && (
        <>
          {/* جدول دلتا */}
          <View className="rounded-xl mb-4" style={{ backgroundColor: colors.surfaceAlt }}>
            <View
              className="flex-row py-2 px-3"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Text className="flex-1 text-xs font-bold" style={{ color: colors.textMuted }}>
                {isFa ? 'سنجه' : 'Metric'}
              </Text>
              <Text className="w-16 text-xs font-bold text-center" style={{ color: colors.textMuted }}>
                A
              </Text>
              <Text className="w-16 text-xs font-bold text-center" style={{ color: colors.textMuted }}>
                B
              </Text>
              <Text className="w-20 text-xs font-bold text-center" style={{ color: colors.textMuted }}>
                {isFa ? 'تغییر' : 'Delta'}
              </Text>
            </View>

            {METRICS.map((m, rowIndex) => {
              const va = a[m.key] as number | null;
              const vb = b[m.key] as number | null;
              if (va == null || vb == null) {
                return (
                  <View
                    key={m.key}
                    className="flex-row py-2 px-3"
                    style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
                  >
                    <Text className="flex-1 text-xs" style={{ color: colors.textSecondary }}>
                      {isFa ? m.labelFa : m.labelEn}
                    </Text>
                    <Text className="w-16 text-xs text-center" style={{ color: colors.textMuted }}>—</Text>
                    <Text className="w-16 text-xs text-center" style={{ color: colors.textMuted }}>—</Text>
                    <Text className="w-20 text-xs text-center" style={{ color: colors.textMuted }}>—</Text>
                  </View>
                );
              }
              const delta = Math.round((vb - va) * 10 ** m.dec) / 10 ** m.dec;
              const good = m.good === 'down' ? delta <= 0 : delta >= 0;
              const color = Math.abs(delta) < 0.05 ? colors.textMuted : good ? colors.success : colors.danger;
              const arrow = Math.abs(delta) < 0.05 ? '•' : delta > 0 ? '▲' : '▼';
              return (
                <View
                  key={m.key}
                  className="flex-row py-2 px-3 items-center"
                  style={{
                    borderBottomWidth: rowIndex < METRICS.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text className="flex-1 text-xs font-semibold" style={{ color: colors.textSecondary }}>
                    {isFa ? m.labelFa : m.labelEn}
                    {m.unit ? ` (${m.unit})` : ''}
                  </Text>
                  <Text className="w-16 text-xs text-center" style={{ color: colors.text }}>
                    {va}
                  </Text>
                  <Text className="w-16 text-xs text-center" style={{ color: colors.text }}>
                    {vb}
                  </Text>
                  <Text className="w-20 text-xs font-bold text-center" style={{ color }}>
                    {arrow} {delta > 0 ? '+' : ''}
                    {delta}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* روندها با هاور */}
          <TrendMiniChart
            title={isFa ? 'روند وزن (kg)' : 'Weight trend (kg)'}
            unit=""
            color={colors.chart[0]}
            values={sorted.map((s) => s.weightKg)}
            labels={labels}
            goodWhen="down"
          />
          <TrendMiniChart
            title={isFa ? 'روند درصد چربی (%)' : 'Body fat trend (%)'}
            unit=""
            color={colors.chart[2]}
            values={sorted.map((s) => s.pbfPercent)}
            labels={labels}
            goodWhen="down"
          />
          <TrendMiniChart
            title={isFa ? 'روند توده عضلانی (kg)' : 'Muscle mass trend (kg)'}
            unit=""
            color={colors.chart[1]}
            values={sorted.map((s) => s.smmKg)}
            labels={labels}
            goodWhen="up"
          />
        </>
      )}
    </View>
  );
}