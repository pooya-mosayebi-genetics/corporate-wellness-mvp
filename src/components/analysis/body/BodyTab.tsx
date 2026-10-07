import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../../store/ThemeContext';
import { useLanguage } from '../../../store/LanguageContext';
import type { BodyAnalysisRecord } from '../../../data/bodyAnalysisTypes';
import { faNum } from '../../../utils/format';
import TrendChart from '../shared/TrendChart';
import RangeSlider from '../shared/RangeSlider';
import HumanFigure from '../shared/HumanFigure';
import HistoryTable from './HistoryTable';

const METRICS = [
  { key: 'weight', fa: 'وزن', en: 'Weight', unit: 'kg', color: '#2563eb' },
  { key: 'bmi', fa: 'شاخص تودهٔ بدنی', en: 'BMI', unit: '', color: '#3b82f6' },
  { key: 'fat', fa: 'درصد چربی بدن', en: 'Body Fat %', unit: '٪', color: '#f97316' },
  { key: 'muscle', fa: 'تودهٔ عضلانی', en: 'Muscle', unit: 'kg', color: '#22c55e' },
  { key: 'water', fa: 'آب بدن', en: 'Body Water', unit: 'L', color: '#a855f7' },
  { key: 'visceral', fa: 'چربی احشایی', en: 'Visceral Fat', unit: 'cm²', color: '#f59e0b' },
];

export default function BodyTab({ records }: { records: BodyAnalysisRecord[] }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: any) => faNum(v, isFa);
  const [mk, setMk] = useState('weight');
  const [period, setPeriod] = useState<number | null>(null);

  const asc = [...records].sort((a, b) => +new Date(a.analyzeTime) - +new Date(b.analyzeTime));
  const r = asc[asc.length - 1];
  if (!r) return null;

  const bmi = r.height ? r.weight / Math.pow(r.height / 100, 2) : 0;
  const fatPct = r.weight ? (r.bfm / r.weight) * 100 : 0;
  const maintenance = Math.round((Number(r.bmr) * 1.2) / 50) * 50;
  const healthyWeight: [number, number] = [Number(r.ffm) / 0.83, Number(r.ffm) / 0.73];
  const asm = Number(r.leftArmLean) + Number(r.rightArmLean) + Number(r.leftLegLean) + Number(r.rightLegLean);
  const smi = r.height ? asm / Math.pow(r.height / 100, 2) : 0;
  const smiTh = r.gender === 'female' ? 5.45 : 7.0;
  const musGap = Math.max(0, Number(r.smmUpper) - Number(r.smm));

  const metric = METRICS.find((m) => m.key === mk) || METRICS[0];
  const getVal = (x: BodyAnalysisRecord): number =>
    mk === 'weight' ? Number(x.weight) : mk === 'bmi' ? (x.height ? x.weight / Math.pow(x.height / 100, 2) : 0)
    : mk === 'fat' ? (x.weight ? (x.bfm / x.weight) * 100 : 0) : mk === 'muscle' ? Number(x.smm)
    : mk === 'water' ? Number(x.tbw) : Number(x.vfa);
  const getRange = (): [number, number] =>
    mk === 'weight' ? healthyWeight : mk === 'bmi' ? [18.5, 25] : mk === 'fat' ? (r.gender === 'female' ? [18, 28] : [10, 20])
    : mk === 'muscle' ? [Number(r.smmLower), Number(r.smmUpper)] : mk === 'water' ? [Number(r.tbwLower), Number(r.tbwUpper)] : [0, 100];

  const trendData = period ? asc.slice(-period) : asc;
  const card = { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, padding: 14 } as any;

  const metricCard = (m: (typeof METRICS)[number]) => {
    const v = getVal(r);
    const [z1, z2] = m.key === 'weight' ? healthyWeight : m.key === 'bmi' ? [18.5, 25] : m.key === 'fat' ? (r.gender === 'female' ? [18, 28] : [10, 20]) : m.key === 'muscle' ? [Number(r.smmLower), Number(r.smmUpper)] : m.key === 'water' ? [Number(r.tbwLower), Number(r.tbwUpper)] : [0, 100];
    const st = v < z1 ? 'low' : v > z2 ? 'high' : 'normal';
    const stColor = st === 'low' ? '#f59e0b' : st === 'high' ? '#ef4444' : '#22c55e';
    const active = mk === m.key;
    return (
      <Pressable key={m.key} onPress={() => setMk(m.key)} style={[card, { flexBasis: '48%', flexGrow: 1, borderWidth: active ? 2 : 1, borderColor: active ? m.color : colors.cardBorder, backgroundColor: active ? '#eef2ff' : colors.surface }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stColor }} />
            <Text style={{ fontSize: 8, color: stColor }}>{st === 'normal' ? (isFa ? 'نرمال' : 'Normal') : st === 'low' ? (isFa ? 'پایین' : 'Low') : isFa ? 'بالا' : 'High'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{isFa ? m.fa : m.en}</Text>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: m.color }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{n(v.toFixed(1))}</Text>
          <Text style={{ fontSize: 9, color: colors.textMuted, marginLeft: 3 }}>{m.unit}</Text>
        </View>
        <RangeSlider value={v} min={z1 - (z2 - z1) * 0.6} max={z2 + (z2 - z1) * 0.6} zoneMin={z1} zoneMax={z2} color={m.color} zoneColor={m.color + '55'} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontSize: 8, color: colors.textMuted }}>{`${n(z1.toFixed(1))}–${n(z2.toFixed(1))} ${m.unit}`}</Text>
          <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'محدودهٔ سالم' : 'Healthy range'}</Text>
        </View>
      </Pressable>
    );
  };

  const segmental = (kind: 'lean' | 'fat') => {
    const vals = kind === 'lean'
      ? [Number(r.rightArmLean), Number(r.leftArmLean), Number(r.torsoLean), Number(r.rightLegLean), Number(r.leftLegLean)]
      : [Number(r.rightArmFat), Number(r.leftArmFat), Number(r.torsoFat), Number(r.rightLegFat), Number(r.leftLegFat)];
    const color = kind === 'lean' ? '#22c55e' : '#f97316';
    const labels = [isFa ? 'دست راست' : 'R Arm', isFa ? 'دست چپ' : 'L Arm', isFa ? 'تنه' : 'Torso', isFa ? 'پای راست' : 'R Leg', isFa ? 'پای چپ' : 'L Leg'];
    const max = Math.max(...vals, 0.001);
    const armDiff = Math.max(vals[0], vals[1]) ? (Math.abs(vals[0] - vals[1]) / Math.max(vals[0], vals[1])) * 100 : 0;
    const legDiff = Math.max(vals[3], vals[4]) ? (Math.abs(vals[3] - vals[4]) / Math.max(vals[3], vals[4])) * 100 : 0;
    const badge = armDiff >= legDiff ? `${isFa ? 'اختلاف دست‌ها' : 'Arm diff'} ${n(armDiff.toFixed(0))}٪` : `${isFa ? 'اختلاف پاها' : 'Leg diff'} ${n(legDiff.toFixed(0))}٪`;
    return (
      <View style={[card, { flex: 1 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#fef3c7' }}>
            <Text style={{ fontSize: 8, color: '#b45309' }}>● {badge}</Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>
            {kind === 'lean' ? (isFa ? 'تودهٔ بدون چربی' : 'Lean Mass') : isFa ? 'تودهٔ چربی' : 'Fat Mass'}
            <Text style={{ fontSize: 8, color: colors.textMuted }}>  ·  {isFa ? 'قطعه‌ای · kg' : 'Segmental · kg'}</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            {vals.map((v, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text, width: 30 }}>{n(v.toFixed(1))}</Text>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, marginLeft: 6, marginRight: 6 }}>
                  <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${(v / max) * 100}%`, borderRadius: 3, backgroundColor: color }} />
                </View>
                <Text style={{ fontSize: 8, color: colors.textMuted, width: 52, textAlign: 'left' }}>{labels[i]}</Text>
              </View>
            ))}
          </View>
          <HumanFigure values={vals} color={color} />
        </View>
      </View>
    );
  };

  return (
    <View>
      {/* بنر گزارش */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f2fd', borderRadius: 14, borderWidth: 1, borderColor: '#bfdbfe', padding: 14, marginBottom: 12 }}>
        <Pressable style={{ backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>📄 {isFa ? 'گزارش آخرین آنالیز' : 'Latest report'}</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{isFa ? 'گزارش چاپی آنالیز ترکیب بدنی' : 'Printed composition report'}</Text>
          <Text style={{ fontSize: 9, color: '#3b82f6', marginTop: 2 }}>{isFa ? 'گزارش کامل AneaBIA از دادهٔ آناباکالود — آمادهٔ چاپ یا دانلود' : 'Full AneaBIA report — ready to print or download'}</Text>
        </View>
      </View>

      {/* ۴ کارت آماری */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        {[
          { t: isFa ? 'متابولیسم پایه' : 'BMR', v: n(Number(r.bmr).toFixed(1)), u: isFa ? 'kcal/روز' : 'kcal/day', f: isFa ? 'انرژی پایهٔ موردنیاز بدن' : 'Basal energy need' },
          { t: isFa ? 'نیاز کالری روزانه' : 'Daily calories', v: n(maintenance), u: isFa ? 'kcal/روز' : 'kcal/day', f: isFa ? 'تخمین با فعالیت انتخابی' : 'Estimated with activity' },
          { t: isFa ? 'وزن هدف' : 'Target weight', v: n(Number(r.targetWeight).toFixed(1)), u: 'kg', f: `${n(Math.abs(Number(r.targetWeight) - Number(r.weight)).toFixed(1))} kg ${isFa ? 'کمتر از هدف' : 'from target'}` },
          { t: isFa ? 'محدودهٔ وزن سالم' : 'Healthy weight', v: `${n(healthyWeight[0].toFixed(1))}–${n(healthyWeight[1].toFixed(1))}`, u: 'kg', f: isFa ? 'بر اساس تودهٔ بدون چربی (FFM)' : 'Based on FFM' },
        ].map((s, i) => (
          <View key={i} style={[card, { flex: 1 }]}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'right' }}>{s.t}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', marginBottom: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{s.v}</Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, marginLeft: 3 }}>{s.u}</Text>
            </View>
            <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'right' }}>{s.f}</Text>
          </View>
        ))}
      </View>

      {/* متریک‌ها + روند */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <View style={[card, { flex: 1.2 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[null, 20, 10].map((p) => (
                <Pressable key={String(p)} onPress={() => setPeriod(p)} style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: period === p ? colors.surface : colors.surfaceAlt, borderWidth: 1, borderColor: period === p ? colors.border : 'transparent' }}>
                  <Text style={{ fontSize: 9, color: colors.textSecondary }}>{p === null ? (isFa ? 'همه' : 'All') : n(p)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>📈 {isFa ? `روند ${metric.fa}` : `Trend ${metric.en}`}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', marginBottom: 2 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: metric.color }}>{n(getVal(r).toFixed(1))}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 3 }}>{metric.unit}</Text>
          </View>
          <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'right', marginBottom: 8 }}>
            {trendData.length ? `${new Date(trendData[0].analyzeTime).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })} – ${new Date(trendData[trendData.length - 1].analyzeTime).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}` : ''}
          </Text>
          <TrendChart points={trendData.map((x) => ({ id: x.id, date: x.analyzeTime, value: getVal(x) }))} color={metric.color} unit={metric.unit} title={isFa ? metric.fa : metric.en} />
        </View>
        <View style={{ flex: 1.6, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {METRICS.map(metricCard)}
        </View>
      </View>

      {/* قطعه‌ای + SMI + کنترل وزن */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        {segmental('lean')}
        {segmental('fat')}
        <View style={{ flex: 1, gap: 10 }}>
          <View style={card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: smi < smiTh ? '#f59e0b' : '#22c55e' }} />
                <Text style={{ fontSize: 8, color: smi < smiTh ? '#f59e0b' : '#22c55e' }}>{smi < smiTh ? (isFa ? 'پایین' : 'Low') : isFa ? 'نرمال' : 'Normal'}</Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{isFa ? 'شاخص عضلهٔ اسکلتی (SMI)' : 'SMI'}</Text>
            </View>
            <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'right', marginBottom: 6 }}>{isFa ? 'شاخص سارکوپنی — روش Baumgartner' : 'Sarcopenia index — Baumgartner'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', marginBottom: 8 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: smi < smiTh ? '#f59e0b' : colors.text }}>{n(smi.toFixed(1))}</Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, marginLeft: 3 }}>kg/m²</Text>
            </View>
            <RangeSlider value={smi} min={0} max={12} zoneMin={smiTh} zoneMax={12} color="#f59e0b" zoneColor="#22c55e55" threshold={smiTh} />
            <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 6, textAlign: 'right' }}>{isFa ? `آستانهٔ سارکوپنی ${n(smiTh.toFixed(2))} kg/m²` : `Threshold ${n(smiTh.toFixed(2))} kg/m²`}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 10 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text, textAlign: 'right' }}>{n(Number(r.smm).toFixed(1))} <Text style={{ fontSize: 8, color: colors.textMuted }}>kg</Text></Text>
                <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'right', marginTop: 2 }}>{isFa ? 'عضلهٔ اسکلتی کل' : 'Total skeletal'}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 10 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text, textAlign: 'right' }}>{n(asm.toFixed(1))} <Text style={{ fontSize: 8, color: colors.textMuted }}>kg</Text></Text>
                <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'right', marginTop: 2 }}>{isFa ? 'عضلهٔ اندام‌ها (ASM)' : 'Limbs (ASM)'}</Text>
              </View>
            </View>
            {smi < smiTh && (
              <View style={{ backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginTop: 10 }}>
                <Text style={{ fontSize: 9, color: '#92400e' }}>{isFa ? 'SMI زیر آستانهٔ سارکوپنی است؛ نشانگر کاهش تودهٔ عضلانی اسکلتی (احتمال سارکوپنی). تمرین مقاومتی و تأمین پروتئین کافی توصیه می‌شود.' : 'SMI below sarcopenia threshold; resistance training and adequate protein recommended.'}</Text>
              </View>
            )}
          </View>
          <View style={card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#dbeafe' }}>
                <Text style={{ fontSize: 8, color: '#1d4ed8' }}>● {isFa ? 'هدف غذایی: حفظ وزن' : 'Goal: maintain'}</Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{isFa ? 'توصیهٔ کنترل وزن' : 'Weight control'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 10 }}>
                <Text style={{ fontSize: 9, color: colors.textSecondary, textAlign: 'right' }}>{isFa ? 'کاهش چربی' : 'Fat loss'}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#22c55e', textAlign: 'right', marginTop: 4 }}>✓ {isFa ? 'در حد مطلوب' : 'On target'}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 10 }}>
                <Text style={{ fontSize: 9, color: colors.textSecondary, textAlign: 'right' }}>{isFa ? 'افزایش عضله' : 'Muscle gain'}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'right', marginTop: 4 }}>{musGap > 0 ? `+${n(musGap.toFixed(1))} kg` : '—'}</Text>
              </View>
            </View>
            {musGap > 0 && (
              <View style={{ backgroundColor: '#fef3c7', borderRadius: 8, padding: 10 }}>
                <Text style={{ fontSize: 9, color: '#92400e' }}>{isFa ? `هدف «حفظ وزن» است، اما ترکیب بدن هنوز ${n(musGap.toFixed(1))} kg کمبود عضله دارد؛ تغییر هدف قابل بررسی است.` : `Goal is maintain, but ${n(musGap.toFixed(1))} kg muscle deficit remains.`}</Text>
              </View>
            )}
            <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 8, textAlign: 'right' }}>ⓘ {isFa ? 'هدف پیش‌فرض بر پایهٔ ترکیب بدن — در تب دادهٔ غذایی قابل تغییر است' : 'Default goal based on composition — changeable in food tab'}</Text>
          </View>
        </View>
      </View>

      <HistoryTable records={asc} />
    </View>
  );
}