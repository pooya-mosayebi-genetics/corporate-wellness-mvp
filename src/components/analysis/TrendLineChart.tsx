import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { faNum } from '../../utils/format';

export interface TrendPoint { date: string; value: number; }

interface Props {
  points: TrendPoint[];
  unit: string;
  color: string;
  title: string;
  height?: number;
  onPointPress?: (index: number) => void;
}

export default function TrendLineChart({ points, unit, color, title, height = 170, onPointPress }: Props) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: any) => faNum(v, isFa);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  if (!points || points.length === 0) return null;

  const AXIS = 40;
  const PADT = 12;
  const PADB = 20;
  const vals = points.map((p) => Number(p.value) || 0);
  let vmin = Math.min(...vals);
  let vmax = Math.max(...vals);
  if (vmax - vmin < 0.001) { vmin -= 1; vmax += 1; }
  const pad = (vmax - vmin) * 0.15;
  vmin -= pad;
  vmax += pad;
  const span = vmax - vmin || 1;
  const plotW = Math.max(0, w - AXIS - 8);
  const x = (i: number) => AXIS + (points.length > 1 ? (i * plotW) / (points.length - 1) : plotW / 2);
  const y = (v: number) => PADT + (1 - (v - vmin) / span) * (height - PADT - PADB);

  const fmtFull = (iso: string) => new Date(iso).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { day: 'numeric', month: 'short' });

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={{ height }}>
        {/* خطوط راهنما + برچسب محور با واحد */}
        {[vmax, (vmax + vmin) / 2, vmin].map((t, ti) => (
          <View key={ti}>
            <View style={{ position: 'absolute', left: AXIS, right: 0, top: y(t), height: 0, borderTopWidth: 1, borderTopColor: colors.border, borderTopStyle: 'dashed' }} />
            <Text style={{ position: 'absolute', left: 0, top: y(t) - 7, width: AXIS - 6, fontSize: 8, color: colors.textMuted }}>
              {n(Number(t.toFixed(1)))}{ti === 0 ? ` ${unit}` : ''}
            </Text>
          </View>
        ))}

        {/* خطوط اتصال بین نقاط */}
        {w > 0 && points.slice(0, -1).map((_, i) => {
          const x1 = x(i), y1 = y(vals[i]);
          const x2 = x(i + 1), y2 = y(vals[i + 1]);
          const dx = x2 - x1, dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len <= 0) return null;
          const ang = Math.atan2(dy, dx);
          return (
            <View key={`l${i}`} pointerEvents="none" style={{ position: 'absolute', left: (x1 + x2) / 2 - len / 2, top: (y1 + y2) / 2 - 1, width: len, height: 2, backgroundColor: color, transform: [{ rotate: `${ang}rad` }] }} />
          );
        })}

        {/* خط عمودی راهنمای نقطهٔ هاور */}
        {hover !== null && w > 0 && (
          <View pointerEvents="none" style={{ position: 'absolute', left: x(hover), top: PADT, height: height - PADT - PADB, width: 0, borderLeftWidth: 1, borderLeftColor: color + '88', borderLeftStyle: 'dashed' }} />
        )}

        {/* نقطه‌ها + ناحیهٔ هاور */}
        {points.map((p, i) => (
          <Pressable
            key={`${p.date}-${i}`}
            onPress={() => onPointPress?.(i)}
            {...({ onMouseEnter: () => setHover(i), onMouseLeave: () => setHover(null) } as any)}
            style={{ position: 'absolute', left: x(i) - 12, top: y(vals[i]) - 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ width: hover === i ? 12 : 9, height: hover === i ? 12 : 9, borderRadius: 6, backgroundColor: color, borderWidth: 2, borderColor: colors.surface }} />
          </Pressable>
        ))}

        {/* تولتیپ */}
        {hover !== null && w > 0 && (
          <View pointerEvents="none" style={{ position: 'absolute', left: Math.min(Math.max(x(hover) + 12, AXIS), Math.max(AXIS, w - 170)), top: Math.max(0, y(vals[hover]) - 84), width: 165, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 8, zIndex: 50 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
              <Text style={{ flex: 1, fontSize: 9, fontWeight: '700', color: colors.text }}>{fmtFull(points[hover].date)}</Text>
              {hover === points.length - 1 && (
                <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 999, backgroundColor: color }}>
                  <Text style={{ fontSize: 7, color: '#fff' }}>{isFa ? 'آخرین' : 'Latest'}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', marginBottom: 2 }}>
              <Text style={{ fontSize: 9, color: colors.textMuted }}>{title}:</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginLeft: 4 }}>{n(vals[hover].toFixed(1))}</Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, marginLeft: 2 }}>{unit}</Text>
            </View>
            <Text style={{ fontSize: 8, color: colors.textMuted }}>
              {hover === 0 ? (isFa ? 'اولین آنالیز' : 'First analysis') : isFa ? `آنالیز ${n(hover + 1)} از ${n(points.length)}` : `Analysis ${hover + 1} of ${points.length}`}
            </Text>
          </View>
        )}
      </View>

      {/* برچسب تاریخ زیر نقاط */}
      <View style={{ height: 16, marginTop: 2 }}>
        {w > 0 && points.map((p, i) => (
          <Text key={i} style={{ position: 'absolute', left: x(i) - 24, width: 48, top: 0, fontSize: 7, color: colors.textMuted, textAlign: 'center' }}>
            {fmtDay(p.date)}
          </Text>
        ))}
      </View>

      {/* لجند */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: color }} />
        <Text style={{ fontSize: 8, color: colors.textSecondary }}>{title} ({unit})</Text>
      </View>
    </View>
  );
}