import { View, Text } from 'react-native';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { faNum } from '../../utils/format';

export interface SegmentValues {
  rightArm: number;
  leftArm: number;
  trunk: number;
  rightLeg: number;
  leftLeg: number;
}

export function BodySegmentCard({ title, titleEn, tone, values, demo = true }: {
  title: string; titleEn: string; tone: string; values: SegmentValues; demo?: boolean;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);

  const max = Math.max(values.rightArm, values.leftArm, values.trunk, values.rightLeg, values.leftLeg, 0.001);
  const total = values.rightArm + values.leftArm + values.trunk + values.rightLeg + values.leftLeg;
  const armDiffPct = Math.round((Math.abs(values.rightArm - values.leftArm) / Math.max(values.rightArm, values.leftArm, 0.001)) * 100);
  const legDiffPct = Math.round((Math.abs(values.rightLeg - values.leftLeg) / Math.max(values.rightLeg, values.leftLeg, 0.001)) * 100);
  const op = (v: number) => 0.22 + 0.6 * (v / max);

  const rows = [
    { label: isFa ? 'دست راست' : 'Right arm', v: values.rightArm },
    { label: isFa ? 'دست چپ' : 'Left arm', v: values.leftArm },
    { label: isFa ? 'تنه' : 'Trunk', v: values.trunk },
    { label: isFa ? 'پای راست' : 'Right leg', v: values.rightLeg },
    { label: isFa ? 'پای چپ' : 'Left leg', v: values.leftLeg },
  ];

  const W = 120, H = 190;

  return (
    <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 12 }}>
      {/* هدر */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{isFa ? title : titleEn}</Text>
          <Text style={{ fontSize: 8, color: colors.textMuted }}>kg</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: tone + '18' }}>
            <Text style={{ fontSize: 8, fontWeight: '700', color: tone }}>{isFa ? `اختلاف دست‌ها ${n(armDiffPct)}٪` : `Arms ${armDiffPct}%`}</Text>
          </View>
          <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: tone + '18' }}>
            <Text style={{ fontSize: 8, fontWeight: '700', color: tone }}>{isFa ? `اختلاف پاها ${n(legDiffPct)}٪` : `Legs ${legDiffPct}%`}</Text>
          </View>
        </View>
      </View>

      {demo && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6, backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 5 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning }} />
          <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'دادهٔ نمونه — به‌زودی دادهٔ واقعی' : 'Sample data — real data soon'}</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* دیاگرام بدن */}
        <View style={{ width: W, height: H, marginRight: 10, marginLeft: 10 }}>
          <Svg width={W} height={H}>
            <Circle cx={60} cy={16} r={12} fill={colors.surfaceAlt} stroke={colors.border} strokeWidth={1} />
            <Rect x={16} y={36} width={17} height={66} rx={8.5} fill={tone} opacity={op(values.rightArm)} />
            <SvgText x={24.5} y={72} fontSize={8} fontWeight="700" fill={colors.text} textAnchor="middle">{n(values.rightArm)}</SvgText>
            <Rect x={87} y={36} width={17} height={66} rx={8.5} fill={tone} opacity={op(values.leftArm)} />
            <SvgText x={95.5} y={72} fontSize={8} fontWeight="700" fill={colors.text} textAnchor="middle">{n(values.leftArm)}</SvgText>
            <Rect x={41} y={34} width={38} height={72} rx={11} fill={tone} opacity={op(values.trunk)} />
            <SvgText x={60} y={73} fontSize={10} fontWeight="800" fill={colors.text} textAnchor="middle">{n(values.trunk)}</SvgText>
            <Rect x={43} y={112} width={16} height={66} rx={8} fill={tone} opacity={op(values.rightLeg)} />
            <SvgText x={51} y={148} fontSize={8} fontWeight="700" fill={colors.text} textAnchor="middle">{n(values.rightLeg)}</SvgText>
            <Rect x={61} y={112} width={16} height={66} rx={8} fill={tone} opacity={op(values.leftLeg)} />
            <SvgText x={69} y={148} fontSize={8} fontWeight="700" fill={colors.text} textAnchor="middle">{n(values.leftLeg)}</SvgText>
          </Svg>
        </View>

        {/* لیست مقادیر قطعه‌ها */}
        <View style={{ flex: 1 }}>
          {rows.map((r, i) => (
            <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <Text style={{ width: 52, fontSize: 9, color: colors.textSecondary }}>{r.label}</Text>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginRight: 8, marginLeft: 8 }}>
                <View style={{ height: 6, borderRadius: 3, width: `${Math.max((r.v / max) * 100, 4)}%`, backgroundColor: tone }} />
              </View>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.text, minWidth: 30, textAlign: 'right' }}>{n(r.v)}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, backgroundColor: tone + '14', borderRadius: 8, padding: 6 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>{isFa ? 'مجموع قطعه‌ها' : 'Segment total'}</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: tone }}>{n(Math.round(total * 10) / 10)} kg</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default BodySegmentCard;