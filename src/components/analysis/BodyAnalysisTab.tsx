import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import type { BodyAnalysisRecord } from '../../data/bodyAnalysisTypes';
import { faNum } from '../../utils/format';
import FixedOverlay from '../ui/FixedOverlay';
import TrendLineChart from './TrendLineChart';
import CompareReportOverlay from '../reports/CompareReportOverlay';
import AnalysisFinalizeBar from './AnalysisFinalizeBar'; // 🆕 L-08
import { usePermissions } from '../../hooks/usePermissions';

const FONT = Platform.select({ web: 'Vazirmatn, Vazir, Tahoma, sans-serif', default: 'Vazirmatn' }) as string;

const C_LOW = '#f59e0b';
const C_HIGH = '#ef4444';
const C_OK = '#22c55e';
const C_LEAN = '#22c55e';
const C_FAT = '#f97316';

const statusOf = (v: number, lo: number, hi: number) => (v < lo ? 'low' : v > hi ? 'high' : 'normal');
const STATUS_FA: Record<string, string> = { low: 'پایین', high: 'بالا', normal: 'نرمال' };
const STATUS_C: Record<string, string> = { low: C_LOW, high: C_HIGH, normal: C_OK };

const num = (v: any): number => {
  if (v === null || v === undefined || v === "") return NaN;
  const n = Number(v);
  return isNaN(n) ? NaN : n;
};

const safePair = (lo: number, hi: number, fb: [number, number]): [number, number] =>
  isFinite(lo) && isFinite(hi) && hi > lo && lo >= 0 ? [lo, hi] : fb;

export default function BodyAnalysisTab({ records }: { records: BodyAnalysisRecord[] }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';

  // 🆕 استفاده از Permission جدید
  const { can } = usePermissions();
  const canReport = can('reports.view');
  const [compareOpen, setCompareOpen] = useState(false);

  const n = (v: any) => {
    const val = num(v);
    if (isNaN(val)) return isFa ? '۰' : '0';
    return faNum(val, isFa);
  };

  const asc = useMemo(() => [...records].sort((a, b) => +new Date(a.analyzeTime) - +new Date(b.analyzeTime)), [records]);
  const [viewIdx, setViewIdx] = useState<number | null>(null);
  const [metricKey, setMetricKey] = useState('weight');
  const [period, setPeriod] = useState<number | null>(null);
  const [modal, setModal] = useState<null | { type: string; key?: string }>(null);

  if (!asc.length) {
    return (
      <View style={{ padding: 30, alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted }}>{isFa ? 'داده‌ای موجود نیست' : 'No data'}</Text>
      </View>
    );
  }

  const vIdx = viewIdx === null ? asc.length - 1 : Math.min(Math.max(viewIdx, 0), asc.length - 1);
  const r = asc[vIdx];

  const isFemale = r.gender?.toLowerCase().includes('woman') || r.gender?.toLowerCase().includes('female') || r.gender === 'F';

  const bmiOf = (x: BodyAnalysisRecord) => (num(x.height) ? num(x.weight) / Math.pow(num(x.height) / 100, 2) : 0);
  const fatPctOf = (x: BodyAnalysisRecord) => (num(x.weight) ? (num(x.bfm) / num(x.weight)) * 100 : 0);
  const asmOf = (x: BodyAnalysisRecord) => {
    const la = num(x.leftArmLean) || 0;
    const ra = num(x.rightArmLean) || 0;
    const ll = num(x.leftLegLean) || 0;
    const rl = num(x.rightLegLean) || 0;
    return la + ra + ll + rl;
  };
  const smiOf = (x: BodyAnalysisRecord) => (num(x.height) ? asmOf(x) / Math.pow(num(x.height) / 100, 2) : 0);

  const smiThreshold = isFemale ? 5.45 : 7.0;

  const ffm = num(r.ffm) || 0;
  const hM = (num(r.height) || 0) / 100;
  const wNow = num(r.weight) || 0;

  const healthyWeight: [number, number] =
    ffm > 0
      ? [ffm / 0.83, ffm / 0.73]
      : hM > 0
        ? [18.5 * hM * hM, 25 * hM * hM]
        : [wNow * 0.9, wNow * 1.1];

  const dailyNeed = Math.round((num(r.bmr) || 0) * 1.2);

  const bL = num(r.bfmLower);
  const bU = num(r.bfmUpper);
  const fatPctRange: [number, number] =
    wNow > 0 && isFinite(bL) && isFinite(bU) && bU > bL && bL >= 0
      ? [(bL / wNow) * 100, (bU / wNow) * 100]
      : isFemale ? [18, 28] : [10, 20];

  const muscleRange = safePair(num(r.smmLower), num(r.smmUpper), isFemale ? [18, 26] : [25, 33]);
  const waterRange = safePair(num(r.tbwLower), num(r.tbwUpper), isFemale ? [28, 36] : [35, 45]);

  const wc = num((r as any).weightControl) || 0;
  const wcText = wc > 0 ? (isFa ? `نیاز به افزایش: +${n(wc.toFixed(1))} kg` : `Gain: +${n(wc.toFixed(1))} kg`)
    : wc < 0 ? (isFa ? `نیاز به کاهش: ${n(Math.abs(wc).toFixed(1))} kg` : `Lose: ${n(wc.toFixed(1))} kg`)
      : (isFa ? 'وزن ایده‌آل ✓' : 'Ideal weight ✓');

  const METRICS: { key: string; label: string; unit: string; color: string; get: (x: BodyAnalysisRecord) => number; range: [number, number]; zeroBased?: boolean; desc: string }[] = [
    { key: 'weight', label: isFa ? 'وزن' : 'Weight', unit: 'kg', color: '#6366f1', get: (x) => num(x.weight) || 0, range: healthyWeight, desc: isFa ? 'وزن کل بدن؛ محدودهٔ سالم بر اساس تودهٔ بدون چربی محاسبه می‌شود.' : 'Total body weight.' },
    { key: 'bmi', label: isFa ? 'شاخص تودهٔ بدنی' : 'BMI', unit: '', color: '#3b82f6', get: bmiOf, range: [18.5, 25], desc: isFa ? 'نسبت وزن به مربع قد؛ نمایهٔ کلی وضعیت وزن.' : 'Weight-to-height ratio.' },
    { key: 'fatpct', label: isFa ? 'درصد چربی بدن' : 'Body Fat %', unit: isFa ? '٪' : '%', color: '#f97316', get: fatPctOf, range: fatPctRange, desc: isFa ? 'سهم چربی از وزن کل بدن؛ محدودهٔ سالم از ستون‌های BFM دستگاه محاسبه می‌شود.' : 'Fat share of total weight.' },
    { key: 'muscle', label: isFa ? 'تودهٔ عضلانی' : 'Muscle Mass', unit: 'kg', color: '#22c55e', get: (x) => num(x.smm) || 0, range: muscleRange, desc: isFa ? 'تودهٔ عضله اسکلتی؛ محدودهٔ سالم مستقیم از ستون‌های SMM دستگاه.' : 'Skeletal muscle mass.' },
    { key: 'water', label: isFa ? 'آب بدن' : 'Body Water', unit: 'L', color: '#a855f7', get: (x) => num(x.tbw) || 0, range: waterRange, desc: isFa ? 'مجموع آب بدن؛ محدودهٔ سالم مستقیم از ستون‌های TBW دستگاه.' : 'Total body water.' },
    { key: 'visceral', label: isFa ? 'چربی احشایی' : 'Visceral Fat', unit: 'cm²', color: '#f59e0b', get: (x) => num(x.vfa) || 0, range: [0, 100], zeroBased: true, desc: isFa ? 'چربی دور اندام‌های داخلی؛ بالای ۱۰۰ پرخطر است.' : 'Visceral fat area.' },
  ];
  const metric = METRICS.find((m) => m.key === metricKey) || METRICS[0];

  const trendData = period ? asc.slice(-period) : asc;

  const segs = (kind: 'lean' | 'fat') =>
    kind === 'lean'
      ? [num(r.rightArmLean) || 0, num(r.leftArmLean) || 0, num(r.torsoLean) || 0, num(r.rightLegLean) || 0, num(r.leftLegLean) || 0]
      : [num(r.rightArmFat) || 0, num(r.leftArmFat) || 0, num(r.torsoFat) || 0, num(r.rightLegFat) || 0, num(r.leftLegFat) || 0];

  const SEG_LABELS = [isFa ? 'دست راست' : 'R Arm', isFa ? 'دست چپ' : 'L Arm', isFa ? 'تنه' : 'Torso', isFa ? 'پای راست' : 'R Leg', isFa ? 'پای چپ' : 'L Leg'];
  const leanSegs = segs('lean');
  const fatSegs = segs('fat');
  const armDiff = (s: number[]) => (Math.max(s[0], s[1]) ? (Math.abs(s[0] - s[1]) / Math.max(s[0], s[1])) * 100 : 0);
  const legDiff = (s: number[]) => (Math.max(s[3], s[4]) ? (Math.abs(s[3] - s[4]) / Math.max(s[3], s[4])) * 100 : 0);

  const asm = asmOf(r);
  const smi = smiOf(r);
  const muscleGap = Math.max(0, (num(r.smmLower) || 0) - (num(r.smm) || 0));

  const pd = (iso: string) => new Date(iso).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { day: 'numeric', month: 'short' });
  const pdFull = (iso: string) => new Date(iso).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const card: any = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 14 };

  const MiniBars = ({ data, color }: { data: number[]; color: string }) => {
    const max = Math.max(...data, 0.001);
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 4, marginTop: 10 }}>
        {data.map((v, i) => (
          <View key={i} style={{ flex: 1, height: Math.max(4, (v / max) * 66), borderRadius: 4, backgroundColor: color, opacity: 0.4 + 0.6 * (v / max) }} />
        ))}
      </View>
    );
  };

  const MetricCard = ({ m }: { m: (typeof METRICS)[number] }) => {
    const v = m.get(r);
    const lo = m.range[0];
    const hi = m.range[1];
    const st = statusOf(v, lo, hi);
    const active = metricKey === m.key;

    const span = hi - lo || 1;
    let axMin = Math.min(lo, v) - span * 0.35;
    let axMax = Math.max(hi, v) + span * 0.35;
    if (m.zeroBased) axMin = Math.max(0, axMin);
    if (axMax <= axMin) axMax = axMin + 1;
    const pctOf = (x: number) => Math.max(0, Math.min(100, ((x - axMin) / (axMax - axMin)) * 100));

    const bandLeft = pctOf(lo);
    const bandWidth = Math.max(2, pctOf(hi) - pctOf(lo));
    const dotLeft = pctOf(v);

    return (
      <Pressable
        onPress={() => setMetricKey(m.key)}
        style={[card, { flexGrow: 1, flexBasis: '46%', borderWidth: active ? 2 : 1, borderColor: active ? m.color : colors.cardBorder, backgroundColor: active ? m.color + '10' : colors.surface }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: STATUS_C[st] }} />
            <Text style={{ fontSize: 9, color: STATUS_C[st] }}>{STATUS_FA[st]}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{m.label}</Text>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.color }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{n(Number(v).toFixed(1))}</Text>
          {m.unit ? <Text style={{ fontSize: 9, color: colors.textMuted, marginStart: 3 }}>{m.unit}</Text> : null}
        </View>

        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, marginTop: 10 }}>
          <View
            style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${bandLeft}%`, width: `${bandWidth}%`,
              backgroundColor: C_OK + '66', borderRadius: 3,
              borderWidth: 1, borderColor: C_OK,
            }}
          />
          <View
            style={{
              position: 'absolute', top: -2,
              left: `${dotLeft}%`, marginLeft: -5,
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: m.color, borderWidth: 1.5, borderColor: colors.surface,
            }}
          />
        </View>

        <View style={{ height: 12, marginTop: 4 }}>
          <Text style={{ position: 'absolute', top: 0, left: `${bandLeft}%`, marginLeft: -20, width: 40, textAlign: 'center', fontSize: 8, color: colors.textMuted }}>
            {n(lo.toFixed(1))}
          </Text>
          <Text style={{ position: 'absolute', top: 0, left: `${bandLeft + bandWidth}%`, marginLeft: -20, width: 40, textAlign: 'center', fontSize: 8, color: colors.textMuted }}>
            {n(hi.toFixed(1))}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={{ fontSize: 8, color: colors.textMuted }}>
            {m.unit ? (isFa ? `محدودهٔ سالم (${m.unit})` : `Healthy range (${m.unit})`) : (isFa ? 'محدودهٔ سالم' : 'Healthy range')}
          </Text>
          <Pressable onPress={() => setModal({ type: 'metric', key: m.key })}>
            <Text style={{ fontSize: 8, color: m.color, fontWeight: '700' }}>{isFa ? 'جزئیات و نمودار ›' : 'Details & chart ›'}</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const SegmentPanel = ({ kind }: { kind: 'lean' | 'fat' }) => {
    const vals = kind === 'lean' ? leanSegs : fatSegs;
    const color = kind === 'lean' ? C_LEAN : C_FAT;
    const max = Math.max(...vals, 0.001);
    const aD = armDiff(vals);
    const lD = legDiff(vals);
    const badge = aD >= lD ? `${isFa ? 'اختلاف دست‌ها' : 'Arm diff'} ${n(aD.toFixed(0))}٪` : `${isFa ? 'اختلاف پاها' : 'Leg diff'} ${n(lD.toFixed(0))}٪`;
    const maxIdx = vals.indexOf(max);
    return (
      <Pressable onPress={() => setModal({ type: 'segment', key: kind })} style={[card, { flexGrow: 1, flexBasis: '30%' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: C_LOW + '22' }}>
            <Text style={{ fontSize: 8, color: C_LOW }}>{badge}</Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
            {kind === 'lean' ? (isFa ? 'تودهٔ بدون چربی' : 'Lean Mass') : isFa ? 'تودهٔ چربی' : 'Fat Mass'}
            <Text style={{ fontSize: 8, color: colors.textMuted }}>  ·  {isFa ? 'قطعه‌ای · kg' : 'Segmental · kg'}</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            {vals.map((v, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text, width: 30, textAlign: isFa ? 'right' : 'left' }}>{n(v.toFixed(1))}</Text>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, marginHorizontal: 6 }}>
                  <View style={{
                    position: 'absolute', top: 0, bottom: 0,
                    ...(isFa ? { right: 0 } : { left: 0 }),
                    width: `${(v / max) * 100}%`,
                    borderRadius: 3, backgroundColor: color, opacity: 0.4 + 0.6 * (v / max)
                  }} />
                </View>
                <Text style={{ fontSize: 8, color: colors.textMuted, width: 52, textAlign: isFa ? 'left' : 'right' }}>{SEG_LABELS[i]}</Text>
              </View>
            ))}
          </View>
          <View style={{ width: 92, alignItems: 'center' }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: color, opacity: 0.25, marginBottom: 3 }} />
            <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 3 }}>
              <View style={{ width: 16, borderRadius: 7, backgroundColor: color, opacity: 0.35 + 0.65 * (vals[0] / max), alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderWidth: maxIdx === 0 ? 2 : 0, borderColor: '#fbbf24' }}>
                <Text style={{ fontSize: 7, color: '#fff', fontWeight: '700' }}>{n(vals[0].toFixed(1))}</Text>
              </View>
              <View style={{ width: 34, borderRadius: 9, backgroundColor: color, opacity: 0.35 + 0.65 * (vals[2] / max), alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderWidth: maxIdx === 2 ? 2 : 0, borderColor: '#fbbf24' }}>
                <Text style={{ fontSize: 8, color: '#fff', fontWeight: '800' }}>{n(vals[2].toFixed(1))}</Text>
              </View>
              <View style={{ width: 16, borderRadius: 7, backgroundColor: color, opacity: 0.35 + 0.65 * (vals[1] / max), alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderWidth: maxIdx === 1 ? 2 : 0, borderColor: '#fbbf24' }}>
                <Text style={{ fontSize: 7, color: '#fff', fontWeight: '700' }}>{n(vals[1].toFixed(1))}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 3, marginTop: 3 }}>
              <View style={{ width: 16, height: 40, borderRadius: 7, backgroundColor: color, opacity: 0.35 + 0.65 * (vals[3] / max), alignItems: 'center', justifyContent: 'center', borderWidth: maxIdx === 3 ? 2 : 0, borderColor: '#fbbf24' }}>
                <Text style={{ fontSize: 7, color: '#fff', fontWeight: '700' }}>{n(vals[3].toFixed(1))}</Text>
              </View>
              <View style={{ width: 16, height: 40, borderRadius: 7, backgroundColor: color, opacity: 0.35 + 0.65 * (vals[4] / max), alignItems: 'center', justifyContent: 'center', borderWidth: maxIdx === 4 ? 2 : 0, borderColor: '#fbbf24' }}>
                <Text style={{ fontSize: 7, color: '#fff', fontWeight: '700' }}>{n(vals[4].toFixed(1))}</Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const smiPct = Math.min(100, (smi / 10) * 100);
  const smiThresholdPct = Math.min(100, (smiThreshold / 10) * 100);

  return (
    <View style={{ fontFamily: FONT }}>
      {/* سلکتور آنالیز */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Pressable onPress={() => setViewIdx(Math.max(0, vIdx - 1))} disabled={vIdx === 0} style={{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, opacity: vIdx === 0 ? 0.4 : 1 }}>
          <Text style={{ color: colors.text }}>→</Text>
        </Pressable>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{pdFull(r.analyzeTime)}</Text>
        <Pressable onPress={() => setViewIdx(Math.min(asc.length - 1, vIdx + 1))} disabled={vIdx === asc.length - 1} style={{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, opacity: vIdx === asc.length - 1 ? 0.4 : 1 }}>
          <Text style={{ color: colors.text }}>←</Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 4 }}>
          {asc.map((x, i) => (
            <Pressable key={i} onPress={() => setViewIdx(i)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: i === vIdx ? colors.primary : colors.surfaceAlt }}>
              <Text style={{ fontSize: 8, color: i === vIdx ? '#fff' : colors.textMuted }}>{pd(x.analyzeTime)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 🆕 L-08: نوار نهایی‌سازی / اصلاحیه */}
      <AnalysisFinalizeBar record={r} isFa={isFa} n={n} pdFull={pdFull} />

      {/* 🆕 بنر Anea + سن بیولوژیک */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <View style={[card, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: '#8b5cf622', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: '#8b5cf6' }} />
            </View>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{isFa ? 'امتیاز Anea' : 'Anea Score'}</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#8b5cf6' }}>{n(num((r as any).aneaScore).toFixed(0))}</Text>
        </View>
        <View style={[card, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: '#ec489922', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: '#ec4899' }} />
            </View>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{isFa ? 'سن بیولوژیک' : 'Bio Age'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#ec4899' }}>{n(num((r as any).biologicalAge).toFixed(0))}</Text>
            <Text style={{ fontSize: 8, color: colors.textMuted, marginStart: 3 }}>{isFa ? 'سال' : 'y'}</Text>
          </View>
        </View>
      </View>

      {/* 🆕 بنر گزارش مقایسه‌ای (ورودی اول) */}
      <View style={[card, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', flexDirection: 'row', alignItems: 'center', marginBottom: 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#1e3a8a' }}>
            {canReport ? (isFa ? 'گزارش مقایسه‌ای Before/After' : 'Before/After Comparison Report') : (isFa ? 'گزارش چاپی آنالیز ترکیب بدنی' : 'Printed Body Composition Report')}
          </Text>
          <Text style={{ fontSize: 9, color: '#3b82f6', marginTop: 2 }}>
            {canReport
              ? (isFa ? 'دو تاریخ آنالیز را انتخاب و خروجی A4 (چاپ یا PDF) بگیرید' : 'Pick two analysis dates and export A4 (print or PDF)')
              : (isFa ? 'گزارش کامل AneaBIA از دادهٔ آنالیز — آمادهٔ چاپ یا دانلود' : 'Full AneaBIA report — ready to print or download')}
          </Text>
        </View>
        <Pressable
          onPress={() => (canReport ? setCompareOpen(true) : setModal({ type: 'report' }))}
          style={{ backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}
        >
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
            {canReport ? (isFa ? '📊 گزارش مقایسه‌ای' : '📊 Compare') : (isFa ? 'گزارش آخرین آنالیز' : 'Latest report')}
          </Text>
        </Pressable>
      </View>

      {/* ۴ کارت آماری */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {[
          { l: isFa ? 'متابولیسم پایه' : 'BMR', v: n(num(r.bmr).toFixed(1)), u: isFa ? 'kcal/روز' : 'kcal/day', s: isFa ? 'انرژی پایه موردنیاز بدن' : 'Basal energy', c: '#38bdf8' },
          { l: isFa ? 'نیاز کالری روزانه' : 'Daily Need', v: n(dailyNeed), u: isFa ? 'kcal/روز' : 'kcal/day', s: isFa ? 'تخمین با فعالیت انتخابی' : 'With activity', c: '#38bdf8' },
          { l: isFa ? 'وزن هدف' : 'Target Weight', v: n(num(r.targetWeight).toFixed(1)), u: 'kg', s: `${n(Math.abs(num(r.targetWeight) - wNow).toFixed(1))} kg ${isFa ? 'تا هدف' : 'to goal'}`, c: '#6366f1' },
          { l: isFa ? 'محدودهٔ وزن سالم' : 'Healthy Weight', v: `${n(healthyWeight[0].toFixed(1))}–${n(healthyWeight[1].toFixed(1))}`, u: 'kg', s: isFa ? 'بر اساس تودهٔ بدون چربی (FFM)' : 'Based on FFM', c: '#22c55e' },
        ].map((s, i) => (
          <View key={i} style={[card, { flexGrow: 1, flexBasis: '23%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: s.c + '22', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: s.c }} />
              </View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{s.l}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{s.v}</Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, marginStart: 3 }}>{s.u}</Text>
            </View>
            <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 4, textAlign: isFa ? 'right' : 'left' }}>{s.s}</Text>
          </View>
        ))}
      </View>

      {/* روند + متریک‌ها */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        <View style={[card, { flexGrow: 1.4, flexBasis: '40%' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[null, 20, 10].map((p) => (
                <Pressable key={String(p)} onPress={() => setPeriod(p)} style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: period === p ? colors.surface : colors.surfaceAlt, borderWidth: 1, borderColor: period === p ? colors.border : 'transparent' }}>
                  <Text style={{ fontSize: 9, color: colors.textSecondary }}>{p === null ? (isFa ? 'همه' : 'All') : n(p)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{isFa ? 'روند' : 'Trend'} {metric.label}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', marginBottom: 2 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: metric.color }}>{n(Number(metric.get(r)).toFixed(1))}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, marginStart: 3 }}>{metric.unit}</Text>
          </View>
          <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: isFa ? 'right' : 'left', marginBottom: 8 }}>
            {trendData.length ? `${pdFull(trendData[0].analyzeTime)} – ${pdFull(trendData[trendData.length - 1].analyzeTime)}` : ''}
          </Text>
          <TrendLineChart
            points={trendData.map((x) => ({ date: x.analyzeTime, value: metric.get(x) }))}
            unit={metric.unit}
            color={metric.color}
            title={metric.label}
            height={170}
            onPointPress={(i) => setViewIdx(asc.length - trendData.length + i)}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, flexGrow: 2, flexBasis: '52%' }}>
          {METRICS.map((m) => (
            <MetricCard key={m.key} m={m} />
          ))}
        </View>
      </View>

      {/* قطعه‌ها + SMI + توصیه */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <SegmentPanel kind="lean" />
        <SegmentPanel kind="fat" />
        <View style={{ flexGrow: 1, flexBasis: '30%', gap: 10 }}>
          <Pressable onPress={() => setModal({ type: 'smi' })} style={[card, { marginBottom: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: smi < smiThreshold ? C_LOW : C_OK }} />
                <Text style={{ fontSize: 9, color: smi < smiThreshold ? C_LOW : C_OK }}>{smi < smiThreshold ? (isFa ? 'پایین' : 'Low') : isFa ? 'نرمال' : 'Normal'}</Text>
              </View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{isFa ? 'شاخص عضلهٔ اسکلتی (SMI)' : 'Skeletal Muscle Index'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: smi < smiThreshold ? C_LOW : colors.text }}>{n(smi.toFixed(1))}</Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, marginStart: 3 }}>kg/m²</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, marginTop: 8 }}>
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: `${smiThresholdPct}%`, width: `${100 - smiThresholdPct}%`, backgroundColor: C_OK + '55', borderRadius: 3 }} />
              <View style={{ position: 'absolute', top: -2, left: `${smiPct}%`, marginLeft: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: smi < smiThreshold ? C_LOW : C_OK }} />
            </View>
            <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 4, textAlign: isFa ? 'right' : 'left' }}>{isFa ? `آستانهٔ سارکوپنی ${n(smiThreshold.toFixed(2))} kg/m²` : `Sarcopenia threshold ${n(smiThreshold.toFixed(2))}`}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 8 }}>
                <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'عضلهٔ اندام‌ها (ASM)' : 'ASM'}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, textAlign: isFa ? 'right' : 'left' }}>{n(asm.toFixed(1))} kg</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 8 }}>
                <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'عضلهٔ اسکلتی کل' : 'Total SMM'}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, textAlign: isFa ? 'right' : 'left' }}>{n(num(r.smm).toFixed(1))} kg</Text>
              </View>
            </View>
          </Pressable>
          <Pressable onPress={() => setModal({ type: 'rec' })} style={[card, { marginBottom: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#dbeafe' }}>
                <Text style={{ fontSize: 8, color: '#1d4ed8' }}>{wcText}</Text>
              </View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{isFa ? 'توصیهٔ کنترل وزن' : 'Weight Control'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 8 }}>
                <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'center' }}>{isFa ? 'مینرال (استخوان)' : 'Minerals'}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 2 }}>{n(num((r as any).minerals).toFixed(1))} kg</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 8 }}>
                <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'center' }}>{isFa ? 'تودهٔ نرم' : 'Soft Lean'}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 2 }}>{n(num((r as any).softLeanMass).toFixed(1))} kg</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      {/* مودال‌ها */}
      <FixedOverlay visible={!!modal} onClose={() => setModal(null)}>
        {modal && (
          <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
            <View style={{ width: '100%', maxWidth: 460, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, fontFamily: FONT }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: colors.text, fontFamily: FONT }}>
                  {modal.type === 'metric' ? (METRICS.find((m) => m.key === modal.key)?.label || '') : modal.type === 'segment' ? (modal.key === 'lean' ? (isFa ? 'تودهٔ بدون چربی' : 'Lean Mass') : isFa ? 'تودهٔ چربی' : 'Fat Mass') : modal.type === 'smi' ? 'SMI' : modal.type === 'rec' ? (isFa ? 'توصیهٔ کنترل وزن' : 'Weight Control') : isFa ? 'گزارش' : 'Report'}
                </Text>
                <Pressable onPress={() => setModal(null)} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
                  <Text style={{ color: colors.textMuted }}>✕</Text>
                </Pressable>
              </View>

              {modal.type === 'metric' && (() => {
                const m = METRICS.find((x) => x.key === modal.key)!;
                const v = m.get(r);
                const st = statusOf(v, m.range[0], m.range[1]);
                const prev = asc[vIdx - 1];
                const d = prev ? v - m.get(prev) : 0;
                return (
                  <View>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: FONT, marginBottom: 6 }}>{m.desc}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                      <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 8 }}>
                        <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'مقدار فعلی' : 'Current'}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: m.color }}>{n(v.toFixed(1))} {m.unit}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 8 }}>
                        <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'وضعیت' : 'Status'}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: STATUS_C[st] }}>{STATUS_FA[st]}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 8 }}>
                        <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'تغییر از قبل' : 'Δ prev'}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: d === 0 ? colors.textMuted : d > 0 ? C_HIGH : C_OK }}>{d >= 0 ? '+' : ''}{n(d.toFixed(1))}</Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 8, marginBottom: 6 }}>
                      <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 4 }}>
                        {isFa ? 'محدودهٔ سالم (دستگاه)' : 'Healthy range (device)'}: {n(m.range[0].toFixed(1))}–{n(m.range[1].toFixed(1))} {m.unit}
                      </Text>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: STATUS_C[st] }}>
                        {st === 'normal'
                          ? (isFa ? '✅ داخل محدودهٔ سالم' : '✅ Within healthy range')
                          : st === 'low'
                            ? `⬇ ${n((m.range[0] - v).toFixed(1))} ${m.unit} ${isFa ? 'پایین‌تر از کف سالم' : 'below floor'}`
                            : `⬆ ${n((v - m.range[1]).toFixed(1))} ${m.unit} ${isFa ? 'بالاتر از سقف سالم' : 'above ceiling'}`}
                      </Text>
                    </View>
                    <MiniBars data={asc.map(m.get)} color={m.color} />
                  </View>
                );
              })()}

              {modal.type === 'segment' && (() => {
                const kind = modal.key as 'lean' | 'fat';
                const vals = kind === 'lean' ? leanSegs : fatSegs;
                const color = kind === 'lean' ? C_LEAN : C_FAT;
                return (
                  <View>
                    {vals.map((v, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                        <Text style={{ flex: 1, fontSize: 11, color: colors.textSecondary, fontFamily: FONT }}>{SEG_LABELS[i]}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color }}>{n(v.toFixed(1))} kg</Text>
                      </View>
                    ))}
                    <MiniBars data={vals} color={color} />
                  </View>
                );
              })()}

              {modal.type === 'smi' && (
                <View>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: FONT, marginBottom: 6 }}>
                    {isFa ? 'SMI = عضلهٔ اندام‌ها (ASM) تقسیم بر مربع قد. زیر آستانه یعنی احتمال سارکوپنی؛ تمرین مقاومتی و پروتئین کافی توصیه می‌شود.' : 'SMI = ASM / height². Below threshold suggests sarcopenia.'}
                  </Text>
                  <MiniBars data={asc.map(smiOf)} color={C_LOW} />
                </View>
              )}

              {modal.type === 'rec' && (
                <View>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: FONT, marginBottom: 6 }}>
                    {isFa ? `بر اساس آنالیز دستگاه، اختلاف وزن شما با هدف ${n(wc.toFixed(1))} kg است.` : `Weight difference to goal is ${n(wc.toFixed(1))} kg.`}
                  </Text>
                  <MiniBars data={asc.map((x) => num(x.smm) || 0)} color={C_LEAN} />
                </View>
              )}

              {modal.type === 'report' && (
                <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: FONT }}>
                  {isFa ? 'گزارش چاپی شامل همهٔ بخش‌های این صفحه برای آخرین آنالیز آماده می‌شود.' : 'Printed report for latest analysis.'}
                </Text>
              )}

              <Pressable onPress={() => setModal(null)} style={{ marginTop: 12, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', fontFamily: FONT }}>{isFa ? 'بستن' : 'Close'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </FixedOverlay>

      {/* 🆕 ورودی اول: گزارش مقایسه‌ای (با Permission جدید) */}
      {canReport && (
        <CompareReportOverlay visible={compareOpen} onClose={() => setCompareOpen(false)} records={asc} />
      )}
    </View>
  );
}