import { useMemo, useState } from 'react';
import { Text, View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useTheme } from '../store/ThemeContext'; // مسیر نسبی از src/pages به src/store
import { useLanguage } from '../store/LanguageContext';
import { useWellness } from '../store/WellnessContext';
// 🆕 L-09 fix: منبع اصلی دادهٔ بادی = BodyAnalysisContext (CSV دستگاه)
import { useBodyAnalysis } from '../store/BodyAnalysisContext';
import type { BodyAnalysisRecord } from '../data/bodyAnalysisTypes';
import { usePersonnel, calcAgeJalali, type PersonnelRecord } from '../store/PersonnelContext';
import { Card, SectionTitle } from '../components/ui/Card';
import RangeBar from '../components/ui/RangeBar';
import { MiniDonut, ColorBars, MultiLine } from '../components/dashboard/DenseCharts';
import ChartPreviewModal from '../components/charts/ChartPreviewModal';
import type { PreviewRow } from '../components/charts/ChartPreviewModal';
import { faNum } from '../utils/format';
import { maskNationalId } from '../utils/nationalId';
import type { ClientRecord, ClientAnalysisSnapshot } from '../types/clients';
import { useAggregateGuard } from '../hooks/useAggregateGuard';

const round = (v: number, dec = 1) => Math.round(v * 10 ** dec) / 10 ** dec;
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const num = (v: any): number => { const n = Number(v); return isNaN(n) ? 0 : n; };

type Risk = 'high' | 'medium' | 'low';

/* 🆕 ساختار یکپارچهٔ ردیف بادی (از records دستگاه یا fallback legacy) */
type BodyRow = {
  nationalId: string;
  sex: 'male' | 'female';
  age: number;
  weightKg: number;
  heightCm: number;
  bmi: number;
  smmKg: number;
  pbfPercent: number;
  vfl: number;
  tbwPercent: number;
  bioAge: number;
  analyzeTime: string;
};

function scoreOf(c: BodyRow): number {
  const ok = [
    c.bmi >= 18.5 && c.bmi <= 24.9,
    c.pbfPercent >= (c.sex === 'male' ? 10 : 18) && c.pbfPercent <= (c.sex === 'male' ? 25 : 32),
    c.vfl >= 1 && c.vfl <= 9,
    c.smmKg >= (c.sex === 'male' ? 35 : 23) * 0.9,
    c.tbwPercent >= (c.sex === 'male' ? 50 : 45),
    Math.abs(c.bioAge - c.age) <= 3,
  ].filter(Boolean).length;
  return Math.round((ok / 6) * 100);
}
function riskOf(c: BodyRow): Risk {
  let s = 0;
  if (c.bmi >= 30) s += 2; else if (c.bmi >= 25) s += 1;
  if (c.pbfPercent >= (c.sex === 'male' ? 25 : 32)) s += 2; else if (c.pbfPercent >= (c.sex === 'male' ? 20 : 28)) s += 1;
  if (c.vfl >= 13) s += 2; else if (c.vfl >= 10) s += 1;
  if (c.bioAge > c.age + 5) s += 1;
  return s >= 4 ? 'high' : s >= 2 ? 'medium' : 'low';
}

/* 🆕 تبدیل records دستگاه → BodyRow (آخرین آنالیز هر فرد) */
function buildBodyClients(records: BodyAnalysisRecord[]): BodyRow[] {
  const byNid = new Map<string, BodyAnalysisRecord>();
  for (const r of records || []) {
    const nid = String(r?.nationalId || '');
    if (!nid) continue;
    const prev = byNid.get(nid);
    if (!prev || new Date(r.analyzeTime).getTime() > new Date(prev.analyzeTime).getTime()) {
      byNid.set(nid, r);
    }
  }
  const out: BodyRow[] = [];
  for (const r of byNid.values()) {
    const w = num(r.weight);
    const h = num(r.height);
    const bmi = h > 0 ? w / Math.pow(h / 100, 2) : 0;
    const pbf = w > 0 ? (num(r.bfm) / w) * 100 : 0;
    const tbwPct = w > 0 ? (num(r.tbw) / w) * 100 : 0;
    out.push({
      nationalId: String(r.nationalId),
      sex: r.gender === 'female' ? 'female' : 'male',
      age: num(r.age) || 0,
      weightKg: w,
      heightCm: h,
      bmi: round(bmi),
      smmKg: num(r.smm),
      pbfPercent: round(pbf),
      vfl: num(r.vfa),
      tbwPercent: round(tbwPct),
      bioAge: num(r.biologicalAge) || (num(r.age) || 0),
      analyzeTime: r.analyzeTime,
    });
  }
  return out;
}

/* fallback: wellness clients/clientAnalyses → BodyRow */
function snapshotToRow(s: ClientAnalysisSnapshot): BodyRow {
  return {
    nationalId: s.nationalId, sex: s.sex, age: s.age, weightKg: s.weightKg, heightCm: s.heightCm,
    bmi: s.bmi, smmKg: s.smmKg, pbfPercent: s.pbfPercent, vfl: s.vfl, tbwPercent: s.tbwPercent,
    bioAge: s.bioAge, analyzeTime: s.date,
  };
}
function clientToRow(c: ClientRecord): BodyRow {
  return {
    nationalId: c.nationalId, sex: c.sex, age: c.age, weightKg: c.weightKg, heightCm: c.heightCm,
    bmi: c.bmi, smmKg: c.smmKg, pbfPercent: c.pbfPercent, vfl: c.vfl, tbwPercent: c.tbwPercent,
    bioAge: c.bioAge, analyzeTime: c.importedAt,
  };
}

function ageOfPerson(p: PersonnelRecord): number | null {
  const a = calcAgeJalali(p.birthDate);
  return a ? a.years : null;
}

export default function HrDashboardImpl() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { width: winW } = useWindowDimensions();
  const isWide = winW >= 900;
  const { state } = useWellness();
  const { records: deviceRecords } = useBodyAnalysis(); // 🆕 منبع اصلی
  const { records: personnel } = usePersonnel();
  const [preview, setPreview] = useState<{ title: string; subtitle?: string; rows: PreviewRow[] } | null>(null);

  const { isAggregateOnly, minCellSize } = useAggregateGuard('dashboard.hr.view');

  /* 🆕 اولویت منبع: دستگاه (CSV) ← legacy (اکسل) */
  const bodySource = useMemo<{ rows: BodyRow[]; source: 'device-csv' | 'legacy' | 'none' }>(() => {
    const fromDevice = buildBodyClients(deviceRecords);
    if (fromDevice.length) return { rows: fromDevice, source: 'device-csv' };

    if (state.clients?.length) return { rows: state.clients.map(clientToRow), source: 'legacy' };

    const byNid = new Map<string, ClientAnalysisSnapshot>();
    for (const s of state.clientAnalyses || []) {
      const prev = byNid.get(s.nationalId);
      if (!prev || s.date > prev.date) byNid.set(s.nationalId, s);
    }
    const legacy = Array.from(byNid.values()).map(snapshotToRow);
    if (legacy.length) return { rows: legacy, source: 'legacy' };

    return { rows: [], source: 'none' };
  }, [deviceRecords, state.clients, state.clientAnalyses]);

  const clients = bodySource.rows;
  const hasBody = clients.length > 0;
  const hasRoster = personnel.length > 0;

  const diag = useMemo(
    () => ({
      device: deviceRecords?.length ?? 0,
      clients: state.clients?.length ?? 0,
      clientAnalyses: state.clientAnalyses?.length ?? 0,
      personnel: personnel.length,
    }),
    [deviceRecords, state.clients, state.clientAnalyses, personnel],
  );

  const nC = hasBody ? clients.length : personnel.length;

  const maleCount = hasBody
    ? clients.filter((c) => c.sex === 'male').length
    : personnel.filter((p) => p.gender === 'male').length;
  const femaleCount = nC - maleCount;

  const ages = hasBody
    ? clients.map((c) => c.age)
    : personnel.map(ageOfPerson).filter((a): a is number => a !== null);
  const avgAge = ages.length ? Math.round(avg(ages)) : 0;

  const d = useMemo(() => {
    if (!hasBody) return null;
    const scores = clients.map(scoreOf);
    const counts = { high: 0, medium: 0, low: 0 };
    clients.forEach((c) => counts[riskOf(c)]++);
    return {
      avgScore: Math.round(avg(scores)),
      bands: { good: scores.filter((s) => s >= 70).length, fair: scores.filter((s) => s >= 50 && s < 70).length, poor: scores.filter((s) => s < 50).length },
      counts,
      highPct: Math.round((counts.high / nC) * 100),
      avgBmi: round(avg(clients.map((c) => c.bmi))),
      avgPbf: round(avg(clients.map((c) => c.pbfPercent))),
      avgVfl: round(avg(clients.map((c) => c.vfl))),
      avgSmm: round(avg(clients.map((c) => c.smmKg))),
      avgBioGap: round(avg(clients.map((c) => c.bioAge - c.age))),
    };
  }, [clients, hasBody, nC]);

  const factors = useMemo(() => {
    if (!hasBody) return [];
    return [
      { key: 'vfl', labelFa: 'چربی احشایی بالا', labelEn: 'High visceral', count: clients.filter((c) => c.vfl >= 10).length },
      { key: 'bmi', labelFa: 'اضافه‌وزن/چاقی', labelEn: 'Overweight', count: clients.filter((c) => c.bmi >= 25).length },
      { key: 'pbf', labelFa: 'چربی بدن بالا', labelEn: 'High body fat', count: clients.filter((c) => c.pbfPercent >= (c.sex === 'male' ? 25 : 32)).length },
      { key: 'bio', labelFa: 'شکاف سن بیولوژیک', labelEn: 'Bio-age gap', count: clients.filter((c) => c.bioAge - c.age >= 3).length },
      { key: 'smm', labelFa: 'عضلهٔ کم', labelEn: 'Low muscle', count: clients.filter((c) => c.smmKg < (c.sex === 'male' ? 35 : 23) * 0.9).length },
    ].sort((a, b) => b.count - a.count);
  }, [clients, hasBody]);

  const ageBuckets = useMemo(() => {
    const b = [
      { label: isFa ? '<۳۰' : '<30', min: 0, max: 29 },
      { label: isFa ? '۳۰-۳۹' : '30-39', min: 30, max: 39 },
      { label: isFa ? '۴۰-۴۹' : '40-49', min: 40, max: 49 },
      { label: isFa ? '۵۰+' : '50+', min: 50, max: 200 },
    ];
    return b.map((x) => ({ label: x.label, value: ages.filter((a) => a >= x.min && a <= x.max).length }));
  }, [ages, isFa]);

  const gapBuckets = useMemo(() => {
    if (!hasBody) return [];
    const b = [
      { label: isFa ? '<-۳' : '<-3', min: -99, max: -3 },
      { label: isFa ? '-۳..۰' : '-3..0', min: -3, max: 0 },
      { label: isFa ? '۰..۳' : '0..3', min: 0, max: 3 },
      { label: isFa ? '۳..۶' : '3..6', min: 3, max: 6 },
      { label: isFa ? '>۶' : '>6', min: 6, max: 99 },
    ];
    return b.map((x) => ({ label: x.label, value: clients.filter((c) => { const g = c.bioAge - c.age; return g >= x.min && g < x.max; }).length }));
  }, [clients, hasBody, isFa]);

  /* 🆕 trend از records دستگاه (گروه‌بندی تاریخ) ← fallback clientAnalyses */
  const trend = useMemo(() => {
    let rows: { date: string; weightKg: number; bmi: number }[] = [];
    if (bodySource.source === 'device-csv') {
      rows = (deviceRecords || []).map((r) => {
        const w = num(r.weight); const h = num(r.height);
        return { date: String(r.analyzeTime || '').slice(0, 10), weightKg: w, bmi: h > 0 ? w / Math.pow(h / 100, 2) : 0 };
      });
    } else {
      rows = (state.clientAnalyses || []).map((s) => ({ date: s.date, weightKg: s.weightKg, bmi: s.bmi }));
    }
    const byDate: Record<string, any[]> = {};
    rows.forEach((x) => { if (!x.date) return; (byDate[x.date] = byDate[x.date] || []).push(x); });
    return Object.keys(byDate).sort().map((date) => ({
      date,
      weight: round(avg(byDate[date].map((x) => x.weightKg))),
      bmi: round(avg(byDate[date].map((x) => x.bmi))),
    }));
  }, [deviceRecords, state.clientAnalyses, bodySource.source]);

  const openList = (title: string, list: BodyRow[], color: string, sub?: string) => {
    if (isAggregateOnly) {
      if (list.length < minCellSize) {
        setPreview({ title, subtitle: isFa ? `🔒 سرکوب شده — کمتر از ${n(minCellSize)} نفر` : `🔒 Suppressed — fewer than ${minCellSize}`, rows: [] });
        return;
      }
      const bmis = list.map((c) => c.bmi);
      const vfls = list.map((c) => c.vfl);
      const male = list.filter((c) => c.sex === 'male').length;
      setPreview({
        title,
        subtitle: sub ?? (isFa ? 'خلاصهٔ تجمیعی — بدون شناسهٔ فردی' : 'Aggregate summary — no individual identifiers'),
        rows: [
          { label: isFa ? 'تعداد' : 'Count', value: n(list.length), color },
          { label: isFa ? 'میانگین BMI' : 'Avg BMI', value: `${round(avg(bmis))}`, color: colors.chart[0] },
          { label: isFa ? 'میانگین چربی احشایی' : 'Avg VFL', value: `${round(avg(vfls))}`, color: colors.chart[1] },
          { label: isFa ? 'مرد / زن' : 'Male / Female', value: `${n(male)} / ${n(list.length - male)}`, color: colors.chart[2] },
        ],
      });
      return;
    }
    setPreview({ title, subtitle: sub, rows: list.slice(0, 8).map((c) => ({ label: maskNationalId(c.nationalId), value: `BMI ${n(c.bmi)} · VFL ${n(c.vfl)}`, color })) });
  };

  const openFactor = (f: { key: string; labelFa: string; labelEn: string; count: number }) => {
    const list = clients.filter((c) =>
      f.key === 'vfl' ? c.vfl >= 10 :
      f.key === 'bmi' ? c.bmi >= 25 :
      f.key === 'pbf' ? c.pbfPercent >= (c.sex === 'male' ? 25 : 32) :
      f.key === 'bio' ? c.bioAge - c.age >= 3 :
      c.smmKg < (c.sex === 'male' ? 35 : 23) * 0.9);
    openList(isFa ? f.labelFa : f.labelEn, list, colors.warning, isFa ? `${n(f.count)} نفر (${n(Math.round((f.count / nC) * 100))}٪)` : `${f.count} (${Math.round((f.count / nC) * 100)}%)`);
  };

  const openMetric = (key: 'bmi' | 'pbf' | 'vfl') => {
    if (!d) return;
    if (isAggregateOnly && nC < minCellSize) {
      setPreview({ title: key.toUpperCase(), subtitle: isFa ? '🔒 سرکوب شده' : '🔒 Suppressed', rows: [] });
      return;
    }
    const conf = {
      bmi: { label: 'BMI', get: (c: BodyRow) => c.bmi, min: 18.5, max: 24.9, unit: '', a: d.avgBmi },
      pbf: { label: isFa ? 'درصد چربی' : 'Body Fat', get: (c: BodyRow) => c.pbfPercent, min: 18, max: 32, unit: '٪', a: d.avgPbf },
      vfl: { label: isFa ? 'چربی احشایی' : 'Visceral', get: (c: BodyRow) => c.vfl, min: 1, max: 9, unit: '', a: d.avgVfl },
    }[key];
    const vals = clients.map(conf.get);
    const out = vals.filter((v) => v < conf.min || v > conf.max).length;
    setPreview({ title: conf.label, subtitle: isFa ? 'توزیع سازمانی' : 'Org distribution', rows: [
      { label: isFa ? 'میانگین' : 'Avg', value: `${conf.a}${conf.unit}`, color: colors.primary },
      { label: isFa ? 'بازهٔ سالم' : 'Healthy', value: `${conf.min}–${conf.max}${conf.unit}`, color: colors.success },
      { label: isFa ? 'خارج از بازه' : 'Out', value: `${n(out)} (${n(Math.round((out / nC) * 100))}٪)`, color: colors.warning },
      { label: isFa ? 'کمینه' : 'Min', value: `${round(Math.min(...vals))}${conf.unit}`, color: colors.chart[4] },
      { label: isFa ? 'بیشینه' : 'Max', value: `${round(Math.max(...vals))}${conf.unit}`, color: colors.chart[1] },
    ] });
  };

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };
  const col = (b: string) => ({ flexBasis: b, flexGrow: 1, padding: 3 });
  const chartW = Math.min(280, winW * (isWide ? 0.42 : 0.85));
  const riskColor = (r: Risk) => (r === 'high' ? colors.danger : r === 'medium' ? colors.warning : colors.success);

  if (!hasBody && !hasRoster) {
    return (
      <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 10 }}>
        <Card style={{ alignItems: 'center', padding: 28, gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{isFa ? 'داده‌ای برای تحلیل نیست' : 'No data to analyze'}</Text>
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 10, width: '100%', marginTop: 6 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>{isFa ? 'وضعیت منابع داده:' : 'Data sources:'}</Text>
            <Text style={{ fontSize: 9, color: diag.device ? colors.success : colors.danger }}>{isFa ? 'دستگاه/CSV (records): ' : 'device CSV (records): '}{n(diag.device)}</Text>
            <Text style={{ fontSize: 9, color: diag.personnel ? colors.success : colors.danger }}>{isFa ? 'پرسنل (personnel): ' : 'personnel: '}{n(diag.personnel)}</Text>
            <Text style={{ fontSize: 9, color: diag.clients ? colors.success : colors.textMuted }}>{isFa ? 'مراجعین قدیمی (clients): ' : 'legacy clients: '}{n(diag.clients)}</Text>
            <Text style={{ fontSize: 9, color: diag.clientAnalyses ? colors.success : colors.textMuted }}>{isFa ? 'آنالیز قدیمی (clientAnalyses): ' : 'legacy analyses: '}{n(diag.clientAnalyses)}</Text>
          </View>
          <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center' }}>
            {isFa ? 'برای شروع، از بخش «مراجعه‌کنندگان» یا ایمپورت CSV دستگاه، داده وارد کنید.' : 'Import device CSV via Clients to begin.'}
          </Text>
        </Card>
      </ScrollView>
    );
  }

  const topFactor = factors[0];
  const srcLabel =
    bodySource.source === 'device-csv' ? (isFa ? '📡 داده از دستگاه (CSV)' : '📡 Device CSV')
    : bodySource.source === 'legacy' ? (isFa ? '🗃 داده قدیمی' : '🗃 Legacy')
    : '';

  const summary = hasBody && d && topFactor
    ? (isFa
        ? `سازمان ${n(nC)} کارمند دارد (${n(maleCount)} مرد، ${n(femaleCount)} زن) با میانگین سنی ${n(avgAge)} سال. در حال حاضر ${n(d.highPct)}٪ در ریسک بالا و میانگین امتیاز سلامت ${n(d.avgScore)} از ۱۰۰ است. شایع‌ترین مسئله «${topFactor.labelFa}» است که ${n(topFactor.count)} نفر (${n(Math.round((topFactor.count / nC) * 100))}٪) را درگیر کرده.`
        : `Org has ${nC} employees (${maleCount} M, ${femaleCount} F), avg age ${avgAge}. ${d.highPct}% high-risk; wellness score ${d.avgScore}/100. Top issue "${topFactor.labelEn}" affecting ${topFactor.count} (${Math.round((topFactor.count / nC) * 100)}%).`)
    : (isFa
        ? `سازمان ${n(nC)} کارمند دارد (${n(maleCount)} مرد، ${n(femaleCount)} زن) با میانگین سنی ${n(avgAge)} سال. برای گزارش‌های ریسک و ترکیب بدنی، آنالیز بدن مراجعین را وارد کنید.`
        : `Org has ${nC} employees (${maleCount} M, ${femaleCount} F), avg age ${avgAge}. Import client body analyses for risk & composition reports.`);

  const recs = hasBody && d && topFactor
    ? (isFa
        ? [
            topFactor.key === 'vfl' ? 'برنامهٔ پیاده‌روی هفتگی و حذف نوشیدنی‌های شیرین برای کاهش چربی احشایی.' :
            topFactor.key === 'bmi' ? 'کارگاه مدیریت وزن و کنترل پرس غذا.' :
            topFactor.key === 'pbf' ? 'تمرین مقاومتی و تغذیه پروتئین‌محور.' :
            topFactor.key === 'bio' ? 'برنامهٔ مدیریت خواب و استرس.' : 'دسترسی به تمرین مقاومتی برای افزایش عضله.',
            'افزایش مشارکت با یادآورهای منظم و چالش‌های گروهی.',
          ]
        : [
            topFactor.key === 'vfl' ? 'Weekly walking program and cutting sugary drinks.' :
            topFactor.key === 'bmi' ? 'Weight-management workshops and portion control.' :
            topFactor.key === 'pbf' ? 'Resistance training and protein-focused nutrition.' :
            topFactor.key === 'bio' ? 'Sleep and stress management program.' : 'Provide resistance-training access.',
            'Boost engagement with reminders and team challenges.',
          ])
    : (isFa
        ? ['ایمپورت آنالیز بدن مراجعین برای فعال‌سازی گزارش‌های ریسک.', 'ترکیب جنسیتی و سنی بر اساس فهرست پرسنل محاسبه می‌شود.']
        : ['Import client body analyses to enable risk reports.', 'Gender & age mix computed from personnel roster.']);

  const kpis = hasBody && d
    ? [
        { label: isFa ? 'امتیاز سلامت' : 'Wellness Score', value: `${d.avgScore}`, tone: d.avgScore >= 70 ? colors.success : colors.warning },
        { label: isFa ? 'ریسک بالا' : 'High Risk', value: `${d.highPct}٪`, tone: colors.danger },
        { label: isFa ? 'میانگین BMI' : 'Avg BMI', value: `${d.avgBmi}`, tone: colors.chart[0] },
        { label: isFa ? 'شکاف سن بیولوژیک' : 'Bio-age Gap', value: `${d.avgBioGap > 0 ? '+' : ''}${d.avgBioGap}`, tone: colors.chart[1] },
      ]
    : [
        { label: isFa ? 'کل کارمندان' : 'Employees', value: `${nC}`, tone: colors.primary },
        { label: isFa ? 'مردان' : 'Male', value: `${maleCount}`, tone: colors.chart[0] },
        { label: isFa ? 'زنان' : 'Female', value: `${femaleCount}`, tone: colors.chart[2] },
        { label: isFa ? 'میانگین سن' : 'Avg Age', value: `${avgAge}`, tone: colors.chart[1] },
      ];

  return (
    <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: 40 }}>
      {/* هدر */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{isFa ? 'داشبورد منابع انسانی' : 'HR Dashboard'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* 🆕 برچسب منبع داده */}
          {srcLabel ? (
            <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: bodySource.source === 'device-csv' ? colors.successSoft : colors.surfaceAlt, borderWidth: 1, borderColor: bodySource.source === 'device-csv' ? colors.success : colors.border }}>
              <Text style={{ fontSize: 8, fontWeight: '700', color: bodySource.source === 'device-csv' ? colors.success : colors.textSecondary }}>{srcLabel}</Text>
            </View>
          ) : null}
          {isAggregateOnly && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.warningSoft }}>
              <Text style={{ fontSize: 8, fontWeight: '700', color: colors.warning }}>🔒 {isFa ? 'حالت تجمیعی' : 'Aggregate mode'}</Text>
            </View>
          )}
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.primarySoft }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>{n(nC)} {isFa ? 'کارمند' : 'employees'}</Text>
          </View>
        </View>
      </View>

      {/* KPI */}
      <View style={{ flexDirection: 'row', marginHorizontal: -3, marginBottom: 4 }}>
        {kpis.map((t) => (
          <View key={t.label} style={{ flex: 1, padding: 3 }}>
            <View style={[card, { alignItems: 'center' }]}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: t.tone }}>{n(t.value)}</Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'center' }}>{t.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* خلاصهٔ مدیریتی */}
      <View style={[card, { backgroundColor: colors.primarySoft, marginBottom: 6 }]}>
        <SectionTitle>{isFa ? '📋 خلاصهٔ مدیریتی' : '📋 Executive Summary'}</SectionTitle>
        <Text style={{ fontSize: 11, color: colors.text, lineHeight: 18 }}>{summary}</Text>
        <View style={{ marginTop: 6 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, marginBottom: 3 }}>{isFa ? 'پیشنهادهای اقدام:' : 'Recommended actions:'}</Text>
          {recs.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
              <Text style={{ fontSize: 10, color: colors.primary, marginLeft: 4, marginRight: 4 }}>•</Text>
              <Text style={{ flex: 1, fontSize: 10, color: colors.textSecondary, lineHeight: 15 }}>{r}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ردیف ۱: جنسیت + سن */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 }}>
        <View style={col(isWide ? '50%' : '100%')}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle>{isFa ? 'ترکیب جنسیتی' : 'Gender Split'}</SectionTitle>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MiniDonut segments={[{ value: maleCount, color: colors.chart[0] }, { value: femaleCount, color: colors.chart[2] }]} size={90} thickness={13} centerValue={`${n(nC)}`} centerLabel={isFa ? 'نفر' : 'ppl'} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: colors.chart[0], marginRight: 7 }} />
                  <Text style={{ flex: 1, fontSize: 10, color: colors.textSecondary }}>{isFa ? 'مردان' : 'Male'}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{n(maleCount)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: colors.chart[2], marginRight: 7 }} />
                  <Text style={{ flex: 1, fontSize: 10, color: colors.textSecondary }}>{isFa ? 'زنان' : 'Female'}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{n(femaleCount)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        <View style={col(isWide ? '50%' : '100%')}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle>{isFa ? 'توزیع سنی' : 'Age Distribution'}</SectionTitle>
            <View style={{ alignItems: 'center' }}>
              <ColorBars data={ageBuckets.map((b, i) => ({ label: b.label, value: b.value, color: colors.chart[i % colors.chart.length] }))} width={chartW} height={110} />
            </View>
          </View>
        </View>
      </View>

      {/* بخش‌های بدنی */}
      {hasBody && d ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, marginTop: 6 }}>
            <View style={col(isWide ? '50%' : '100%')}>
              <View style={[card, { flex: 1 }]}>
                <SectionTitle action={isFa ? (isAggregateOnly ? 'تجمیعی' : 'لیست = ضربه') : (isAggregateOnly ? 'aggregate' : 'tap=list')}>{isFa ? 'توزیع ریسک' : 'Risk Distribution'}</SectionTitle>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MiniDonut segments={[{ value: d.counts.high, color: colors.danger }, { value: d.counts.medium, color: colors.warning }, { value: d.counts.low, color: colors.success }]} size={90} thickness={13} centerValue={`${n(nC)}`} centerLabel={isFa ? 'نفر' : 'ppl'} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    {(['high', 'medium', 'low'] as Risk[]).map((r, i) => (
                      <Pressable key={r} onPress={() => openList(r === 'high' ? (isFa ? 'پرریسک' : 'High') : r === 'medium' ? (isFa ? 'متوسط' : 'Medium') : isFa ? 'کم‌ریسک' : 'Low', clients.filter((c) => riskOf(c) === r), riskColor(r))} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: colors.border }}>
                        <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: riskColor(r), marginRight: 7 }} />
                        <Text style={{ flex: 1, fontSize: 10, color: colors.textSecondary }}>{r === 'high' ? (isFa ? 'پرریسک' : 'High') : r === 'medium' ? (isFa ? 'متوسط' : 'Medium') : isFa ? 'کم‌ریسک' : 'Low'}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{n(d.counts[r])}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </View>
            <View style={col(isWide ? '50%' : '100%')}>
              <View style={[card, { flex: 1 }]}>
                <SectionTitle action={isFa ? (isAggregateOnly ? 'تجمیعی' : 'جزئیات = ضربه') : (isAggregateOnly ? 'aggregate' : 'tap=details')}>{isFa ? 'عوامل ریسک اصلی' : 'Top Risk Factors'}</SectionTitle>
                <View style={{ gap: 6 }}>
                  {factors.map((f) => (
                    <Pressable key={f.key} onPress={() => openFactor(f)}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>{isFa ? f.labelFa : f.labelEn}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{n(f.count)}</Text>
                      </View>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
                        <View style={{ height: 8, borderRadius: 4, width: `${Math.min((f.count / nC) * 100, 100)}%`, backgroundColor: colors.warning }} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, marginTop: 6 }}>
            <View style={col(isWide ? '50%' : '100%')}>
              <View style={[card, { flex: 1 }]}>
                <SectionTitle>{isFa ? 'روند وزن سازمان' : 'Org Weight Trend'}</SectionTitle>
                {trend.length >= 2 ? (
                  <>
                    <MultiLine labels={trend.map((t) => new Date(t.date).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { month: 'short' }))} series={[{ name: 'kg', color: colors.chart[0], values: trend.map((t) => t.weight) }]} width={chartW} height={90} />
                    <View style={{ marginTop: 6 }}>
                      <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 3 }}>{isFa ? 'میانگین BMI در هر دوره' : 'Avg BMI per period'}</Text>
                      <ColorBars data={trend.map((t) => ({ label: new Date(t.date).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { month: 'short' }), value: t.bmi, color: colors.chart[2] }))} width={chartW} height={60} />
                    </View>
                  </>
                ) : (
                  <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, color: colors.textMuted }}>{isFa ? 'برای روند، ≥۲ دورهٔ واردات لازم است' : 'Need ≥2 import periods'}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={col(isWide ? '50%' : '100%')}>
              <View style={[card, { flex: 1 }]}>
                <SectionTitle>{isFa ? 'توزیع شکاف سن بیولوژیک' : 'Bio-age Gap Distribution'}</SectionTitle>
                <View style={{ alignItems: 'center' }}>
                  <ColorBars data={gapBuckets.map((b, i) => ({ label: b.label, value: b.value, color: i <= 1 ? colors.success : i === 2 ? colors.chart[0] : colors.warning }))} width={chartW} height={110} />
                </View>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, marginTop: 6 }}>
            <View style={col(isWide ? '45%' : '100%')}>
              <View style={[card, { flex: 1 }]}>
                <SectionTitle>{isFa ? 'باندهای امتیاز سلامت' : 'Wellness Score Bands'}</SectionTitle>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MiniDonut segments={[{ value: d.bands.good, color: colors.success }, { value: d.bands.fair, color: colors.warning }, { value: d.bands.poor, color: colors.danger }]} size={90} thickness={13} centerValue={`${n(d.avgScore)}`} centerLabel="/100" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    {[
                      { label: isFa ? 'خوب (≥۷۰)' : 'Good (≥70)', v: d.bands.good, c: colors.success },
                      { label: isFa ? 'متوسط (۵۰-۶۹)' : 'Fair (50-69)', v: d.bands.fair, c: colors.warning },
                      { label: isFa ? 'ضعیف (<۵۰)' : 'Poor (<50)', v: d.bands.poor, c: colors.danger },
                    ].map((r, i) => (
                      <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: colors.border }}>
                        <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: r.c, marginRight: 7 }} />
                        <Text style={{ flex: 1, fontSize: 10, color: colors.textSecondary }}>{r.label}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{n(r.v)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
            <View style={col(isWide ? '55%' : '100%')}>
              <View style={[card, { flex: 1 }]}>
                <SectionTitle action={isFa ? (isAggregateOnly ? 'تجمیعی' : 'توزیع = ضربه') : (isAggregateOnly ? 'aggregate' : 'tap=distribution')}>{isFa ? 'میانگین‌ها vs بازهٔ سالم' : 'Averages vs healthy zone'}</SectionTitle>
                <RangeBar label="BMI" value={d.avgBmi} unit="" lo={15} hi={40} zoneMin={18.5} zoneMax={24.9} peer={25} color={colors.chart[0]} onPress={() => openMetric('bmi')} />
                <RangeBar label={isFa ? 'درصد چربی' : 'Body Fat'} value={d.avgPbf} unit="٪" lo={5} hi={45} zoneMin={18} zoneMax={32} peer={28} color={colors.chart[2]} onPress={() => openMetric('pbf')} />
                <RangeBar label={isFa ? 'چربی احشایی' : 'Visceral'} value={d.avgVfl} unit="" lo={1} hi={20} zoneMin={1} zoneMax={9} peer={9} color={colors.chart[1]} onPress={() => openMetric('vfl')} />
                <RangeBar label={isFa ? 'تودهٔ عضلانی' : 'Muscle Mass'} value={d.avgSmm} unit="kg" lo={15} hi={45} zoneMin={0} zoneMax={0} peer={0} color={colors.chart[3]} onPress={() => {}} />
              </View>
            </View>
          </View>
        </>
      ) : (
        <View style={[card, { backgroundColor: colors.warningSoft, borderColor: colors.warning, marginTop: 6 }]}>
          <SectionTitle>{isFa ? '⚠️ دادهٔ آنالیز بدن موجود نیست' : '⚠️ No body-composition data'}</SectionTitle>
          <Text style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 16 }}>
            {isFa
              ? 'داشبورد جمعیتی (جنسیت، سن، تعداد) از فهرست پرسنل محاسبه می‌شود. برای فعال‌سازی گزارش‌های ریسک، BMI، چربی احشایی و روند سازمان، آنالیز بدن مراجعین را از بخش «مراجعه‌کنندگان» یا ایمپورت CSV دستگاه وارد کنید.'
              : 'Demographic dashboard is computed from the personnel roster. Import client body analyses via Clients or device CSV to enable risk reports.'}
          </Text>
        </View>
      )}

      <ChartPreviewModal visible={preview !== null} onClose={() => setPreview(null)} title={preview?.title ?? ''} subtitle={preview?.subtitle} rows={preview?.rows ?? []} />
    </ScrollView>
  );
}