import { useMemo, useState } from 'react';
import { Text, View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { Card, SectionTitle, Chip } from '../src/components/ui/Card';
import RangeBar from '../src/components/ui/RangeBar';
import { MiniDonut, ColorBars, MultiLine } from '../src/components/dashboard/DenseCharts';
import ChartPreviewModal from '../src/components/charts/ChartPreviewModal';
import type { PreviewRow } from '../src/components/charts/ChartPreviewModal';
import { faNum, faDateRange } from '../src/utils/format';
import { router } from 'expo-router';

const round = (v: number, dec = 1) => Math.round(v * 10 ** dec) / 10 ** dec;
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { width: winW } = useWindowDimensions();
  const isWide = winW >= 900;
  const { state } = useWellness();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [preview, setPreview] = useState<{ title: string; subtitle?: string; rows: PreviewRow[] } | null>(null);

  const clients = state.clients;
  const nClients = clients.length;

  const d = useMemo(() => {
    if (!nClients) return null;
    const male = clients.filter((c) => c.sex === 'male').length;
    const female = nClients - male;
    const scores = clients.map((c) => {
      const ok = [c.bmi >= 18.5 && c.bmi <= 24.9, c.vfl >= 1 && c.vfl <= 9, Math.abs(c.bioAge - c.age) <= 3].filter(Boolean).length;
      return Math.round((ok / 3) * 100);
    });
    const avgScore = Math.round(avg(scores));
    const high = clients.filter((c) => c.vfl >= 13 || c.bmi >= 30).length;
    return {
      male, female, avgScore, high,
      highPct: Math.round((high / nClients) * 100),
      avgBmi: round(avg(clients.map((c) => c.bmi))),
      avgPbf: round(avg(clients.map((c) => c.pbfPercent))),
      avgVfl: round(avg(clients.map((c) => c.vfl))),
      avgAge: Math.round(avg(clients.map((c) => c.age))),
    };
  }, [clients, nClients]);

  const openMetric = (key: 'bmi' | 'pbf' | 'vfl') => {
    if (!d) return;
    const conf = {
      bmi: { label: 'BMI', get: (c: any) => c.bmi, min: 18.5, max: 24.9, unit: '', a: d.avgBmi },
      pbf: { label: isFa ? 'درصد چربی' : 'Body Fat', get: (c: any) => c.pbfPercent, min: 18, max: 32, unit: '٪', a: d.avgPbf },
      vfl: { label: isFa ? 'چربی احشایی' : 'Visceral', get: (c: any) => c.vfl, min: 1, max: 9, unit: '', a: d.avgVfl },
    }[key];
    const vals = clients.map(conf.get);
    const out = vals.filter((v) => v < conf.min || v > conf.max).length;
    setPreview({ title: conf.label, subtitle: isFa ? 'توزیع سازمانی' : 'Org distribution', rows: [
      { label: isFa ? 'میانگین' : 'Avg', value: `${conf.a}${conf.unit}`, color: colors.primary },
      { label: isFa ? 'بازهٔ سالم' : 'Healthy', value: `${conf.min}–${conf.max}${conf.unit}`, color: colors.success },
      { label: isFa ? 'خارج از بازه' : 'Out', value: `${out} (${Math.round((out / nClients) * 100)}٪)`, color: colors.warning },
      { label: isFa ? 'کمینه' : 'Min', value: `${round(Math.min(...vals))}${conf.unit}`, color: colors.chart[4] },
      { label: isFa ? 'بیشینه' : 'Max', value: `${round(Math.max(...vals))}${conf.unit}`, color: colors.chart[1] },
    ] });
  };

  if (!d) {
    return (
      <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 10 }}>
        <Card style={{ alignItems: 'center', padding: 28 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{isFa ? 'داده‌ای نیست' : 'No data'}</Text>
        </Card>
      </ScrollView>
    );
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 6 * 864e5);

  const summary = isFa
    ? `سازمان ${n(nClients)} کارمند (${n(d.male)} مرد، ${n(d.female)} زن) با میانگین سنی ${n(d.avgAge)} سال دارد. ${n(d.highPct)}٪ در ریسک بالا و میانگین امتیاز سلامت ${n(d.avgScore)} از ۱۰۰ است.`
    : `Org has ${nClients} employees (${d.male} M, ${d.female} F), avg age ${d.avgAge}. ${d.highPct}% high-risk; wellness score ${d.avgScore}/100.`;

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };

  return (
    <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{isFa ? 'گزارش‌ها' : 'Reports'}</Text>
          <Text style={{ fontSize: 9, color: colors.textMuted }}>{isFa ? faDateRange(weekAgo, now) : `${weekAgo.toDateString()} – ${now.toDateString()}`}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 3 }}>
          {(['week', 'month', 'year'] as const).map((p) => (
            <Pressable key={p} onPress={() => setPeriod(p)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: period === p ? colors.primary : 'transparent' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: period === p ? '#FFFFFF' : colors.textSecondary }}>
                {p === 'week' ? (isFa ? 'هفته' : 'Week') : p === 'month' ? (isFa ? 'ماه' : 'Month') : isFa ? 'سال' : 'Year'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* خلاصهٔ مدیریتی */}
      <View style={[card, { backgroundColor: colors.primarySoft, marginBottom: 6 }]}>
        <SectionTitle>{isFa ? '📋 خلاصهٔ مدیریتی' : '📋 Executive Summary'}</SectionTitle>
        <Text style={{ fontSize: 11, color: colors.text, lineHeight: 18 }}>{summary}</Text>
      </View>

      {/* KPI */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, marginBottom: 4 }}>
        {[
          { label: isFa ? 'امتیاز سلامت' : 'Score', value: `${d.avgScore}`, tone: d.avgScore >= 70 ? colors.success : colors.warning },
          { label: isFa ? 'ریسک بالا' : 'High Risk', value: `${d.highPct}٪`, tone: colors.danger },
          { label: 'BMI', value: `${d.avgBmi}`, tone: colors.chart[0] },
          { label: isFa ? 'میانگین چربی' : 'Avg Fat', value: `${d.avgPbf}٪`, tone: colors.chart[2] },
        ].map((t) => (
          <View key={t.label} style={{ flexBasis: isWide ? '25%' : '50%', flexGrow: 1, padding: 3 }}>
            <View style={card}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: t.tone, textAlign: 'center' }}>{n(t.value)}</Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'center' }}>{t.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* دونات جنسیت + میانگین‌ها */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 }}>
        <View style={{ flexBasis: isWide ? '45%' : '100%', flexGrow: 1, padding: 3 }}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle>{isFa ? 'ترکیب جنسیتی' : 'Gender Split'}</SectionTitle>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MiniDonut segments={[{ value: d.male, color: colors.chart[0] }, { value: d.female, color: colors.chart[2] }]} size={90} thickness={13} centerValue={`${nClients}`} centerLabel={isFa ? 'نفر' : 'ppl'} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: colors.chart[0], marginRight: 7 }} />
                  <Text style={{ flex: 1, fontSize: 10, color: colors.textSecondary }}>{isFa ? 'مردان' : 'Male'}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{n(d.male)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: colors.chart[2], marginRight: 7 }} />
                  <Text style={{ flex: 1, fontSize: 10, color: colors.textSecondary }}>{isFa ? 'زنان' : 'Female'}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{n(d.female)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        <View style={{ flexBasis: isWide ? '55%' : '100%', flexGrow: 1, padding: 3 }}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle action={isFa ? 'توزیع = ضربه' : 'tap=distribution'}>{isFa ? 'میانگین‌ها vs بازهٔ سالم' : 'Averages vs healthy'}</SectionTitle>
            <RangeBar label="BMI" value={d.avgBmi} unit="" lo={15} hi={40} zoneMin={18.5} zoneMax={24.9} peer={25} color={colors.chart[0]} onPress={() => openMetric('bmi')} />
            <RangeBar label={isFa ? 'درصد چربی' : 'Body Fat'} value={d.avgPbf} unit="٪" lo={5} hi={45} zoneMin={18} zoneMax={32} peer={28} color={colors.chart[2]} onPress={() => openMetric('pbf')} />
            <RangeBar label={isFa ? 'چربی احشایی' : 'Visceral'} value={d.avgVfl} unit="" lo={1} hi={20} zoneMin={1} zoneMax={9} peer={9} color={colors.chart[1]} onPress={() => openMetric('vfl')} />
          </View>
        </View>
      </View>

      <ChartPreviewModal visible={preview !== null} onClose={() => setPreview(null)} title={preview?.title ?? ''} subtitle={preview?.subtitle} rows={preview?.rows ?? []} />
    </ScrollView>
  );
}