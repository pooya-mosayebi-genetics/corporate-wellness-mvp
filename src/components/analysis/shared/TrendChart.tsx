import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../../store/ThemeContext';
import { useLanguage } from '../../../store/LanguageContext';
import { faNum } from '../../../utils/format';

export interface TrendPoint { id: string; date: string; value: number; }

export default function TrendChart({ points, color, unit, title, height = 150 }: {
  points: TrendPoint[]; color: string; unit: string; title: string; height?: number;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: any) => faNum(v, isFa);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const padX = 10;
  const padY = 14;
  const plotW = Math.max(0, w - padX * 2);
  const x = (i: number) => padX + (points.length > 1 ? (i * plotW) / (points.length - 1) : plotW / 2);
  const y = (v: number) => padY + (1 - (v - min) / span) * (height - padY * 2);
  const active = hover !== null ? hover : points.length - 1;
  const day = (iso: string) => new Date(iso).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { day: 'numeric' });
  const full = (iso: string) => new Date(iso).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // هندلرهای موس فقط برای وب؛ با cast تا TS خطا ندهد
  const hoverProps = (i: number): any => ({
    onHoverIn: () => setHover(i),
    onHoverOut: () => setHover(null),
  });

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={{ height }}>
        {/* خطوط راهنمای افقی خط‌چین */}
        {[0, 0.5, 1].map((t) => (
          <View
            key={String(t)}
            style={{ position: 'absolute', left: 0, right: 0, top: padY + t * (height - padY * 2), height: 1, borderTopWidth: 1, borderTopColor: colors.border, borderStyle: 'dashed' }}
          />
        ))}

        {/* خط عمودی راهنمای نقطه فعال */}
        {w > 0 && (
          <View style={{ position: 'absolute', top: padY, bottom: padY, left: x(active), width: 1, borderLeftWidth: 1, borderLeftColor: color, borderStyle: 'dashed' }} />
        )}

        {/* پاره‌خط‌های اتصال بین نقاط */}
        {w > 0 && points.slice(0, -1).map((p, i) => {
          const x1 = x(i), y1 = y(p.value), x2 = x(i + 1), y2 = y(points[i + 1].value);
          const len = Math.hypot(x2 - x1, y2 - y1);
          const ang = Math.atan2(y2 - y1, x2 - x1);
          return (
            <View key={i} style={{ position: 'absolute', left: (x1 + x2) / 2 - len / 2, top: (y1 + y2) / 2 - 1, width: len, height: 2, backgroundColor: color, transform: [{ rotate: `${ang}rad` }] }} />
          );
        })}

        {/* نقاط + ناحیه هاور/کلیک */}
        {points.map((p, i) => (
          <Pressable
            key={p.id}
            {...hoverProps(i)}
            onPress={() => setHover(hover === i ? null : i)}
            style={{ position: 'absolute', left: x(i) - 12, top: y(p.value) - 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, borderWidth: 2, borderColor: colors.surface }} />
          </Pressable>
        ))}

        {/* تولتیپ */}
        {hover !== null && w > 0 && (
          <View style={{ position: 'absolute', top: Math.max(0, y(points[hover].value) - 74), left: Math.min(Math.max(x(hover) - 80, 0), Math.max(0, w - 170)), width: 165, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 8, zIndex: 30, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
              <Text style={{ flex: 1, fontSize: 9, fontWeight: '700', color: colors.text }}>{full(points[hover].date)}</Text>
              {hover === points.length - 1 && (
                <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 999, backgroundColor: color }}>
                  <Text style={{ fontSize: 7, color: '#fff' }}>{isFa ? 'آخرین' : 'Latest'}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', marginBottom: 2 }}>
              <Text style={{ fontSize: 9, color: colors.textMuted }}>{title}:</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginLeft: 4 }}>{n(points[hover].value.toFixed(1))}</Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, marginLeft: 2 }}>{unit}</Text>
            </View>
            <Text style={{ fontSize: 8, color: colors.textMuted }}>
              {hover === 0 ? (isFa ? 'اولین آنالیز' : 'First analysis') : isFa ? `آنالیز ${n(hover + 1)}` : `Analysis ${hover + 1}`}
            </Text>
          </View>
        )}
      </View>

      {/* برچسب تاریخ زیر نقاط */}
      <View style={{ height: 14, marginTop: 2 }}>
        {w > 0 && points.map((p, i) => (
          <View key={i} style={{ position: 'absolute', top: 0, left: x(i) - 20, width: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 7, color: colors.textMuted }}>{day(p.date)}</Text>
          </View>
        ))}
      </View>

      {/* لجند */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 2 }}>
        <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: color }} />
        <Text style={{ fontSize: 8, color: colors.textSecondary }}>{title}</Text>
      </View>
    </View>
  );
}