import { useMemo, useState } from 'react';
import { Text, View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { Card, SectionTitle, IconTile } from '../src/components/ui/Card';
import Icon from '../src/components/ui/Icon';
import { MiniDonut, ColorBars } from '../src/components/dashboard/DenseCharts';
import ChartPreviewModal from '../src/components/charts/ChartPreviewModal';
import type { PreviewRow } from '../src/components/charts/ChartPreviewModal';
import { faNum } from '../src/utils/format';
import { maskNationalId } from '../src/utils/nationalId';
import type { ClientRecord } from '../src/types/clients';
import { router } from 'expo-router';

type Risk = 'high' | 'medium' | 'low';
function score(c: ClientRecord): number {
  let s = 0;
  if (c.bmi >= 30) s += 2; else if (c.bmi >= 25) s += 1;
  if (c.pbfPercent >= (c.sex === 'male' ? 25 : 32)) s += 2; else if (c.pbfPercent >= (c.sex === 'male' ? 20 : 28)) s += 1;
  if (c.vfl >= 13) s += 2; else if (c.vfl >= 10) s += 1;
  if (c.bioAge > c.age + 5) s += 1;
  return s;
}
const riskOf = (c: ClientRecord): Risk => (score(c) >= 4 ? 'high' : score(c) >= 2 ? 'medium' : 'low');

function nudgeFor(c: ClientRecord, isFa: boolean): string {
  if (c.vfl >= 13) return isFa ? 'چربی احشایی بالا؛ پیاده‌روی روزانه ۳۰ دقیقه + حذف قند افزوده.' : 'High visceral fat; 30-min daily walk + cut added sugar.';
  if (c.pbfPercent >= (c.sex === 'male' ? 25 : 32)) return isFa ? 'چربی بدن بالا؛ پروتئین هر وعده + ۲ جلسه مقاومتی.' : 'High body fat; protein per meal + 2 resistance sessions.';
  if (c.bmi >= 25) return isFa ? 'اضافه‌وزن؛ کسری ۵۰۰ کالری روزانه با حفظ عضله.' : 'Overweight; 500 kcal daily deficit preserving muscle.';
  return isFa ? 'عالی! فقط خواب منظم و آبرسانی.' : 'Great! Focus on sleep & hydration.';
}

export default function CoachDashboard() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { width: winW } = useWindowDimensions();
  const isWide = winW >= 900;
  const { state } = useWellness();
  const [preview, setPreview] = useState<{ title: string; subtitle?: string; rows: PreviewRow[] } | null>(null);

  const clients = state.clients;
  const counts = useMemo(() => { const c = { high: 0, medium: 0, low: 0 }; clients.forEach((x) => c[riskOf(x)]++); return c; }, [clients]);
  const priority = useMemo(() => [...clients].sort((a, b) => score(b) - score(a)).slice(0, 8), [clients]);

  const riskColor = (r: Risk) => (r === 'high' ? colors.danger : r === 'medium' ? colors.warning : colors.success);
  const riskLabel = (r: Risk) => (r === 'high' ? (isFa ? 'پرریسک' : 'High') : r === 'medium' ? (isFa ? 'متوسط' : 'Medium') : isFa ? 'کم‌ریسک' : 'Low');

  const openNudge = (c: ClientRecord) =>
    setPreview({ title: isFa ? 'پیام پیشنهادی' : 'Suggested nudge', subtitle: maskNationalId(c.nationalId), rows: [
      { label: isFa ? 'متن' : 'Message', value: nudgeFor(c, isFa), color: colors.primary },
      { label: isFa ? 'ریسک' : 'Risk', value: riskLabel(riskOf(c)), color: riskColor(riskOf(c)) },
    ] });

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };

  return (
    <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{isFa ? 'داشبورد کوچ' : 'Coach Dashboard'}</Text>
        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.dangerSoft }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.danger }}>{n(counts.high)} {isFa ? 'پرریسک' : 'high'}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginHorizontal: -3, marginBottom: 6 }}>
        {[
          { label: isFa ? 'کل' : 'Total', value: clients.length, tone: colors.primary },
          { label: isFa ? 'پرریسک' : 'High', value: counts.high, tone: colors.danger },
          { label: isFa ? 'متوسط' : 'Med', value: counts.medium, tone: colors.warning },
          { label: isFa ? 'کم‌ریسک' : 'Low', value: counts.low, tone: colors.success },
        ].map((t) => (
          <View key={t.label} style={{ flex: 1, padding: 3 }}>
            <View style={[card, { alignItems: 'center' }]}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: t.tone }}>{n(t.value)}</Text>
              <Text style={{ fontSize: 8, color: colors.textMuted }}>{t.label}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 }}>
        <View style={{ flexBasis: isWide ? '45%' : '100%', flexGrow: 1, padding: 3 }}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle>{isFa ? 'توزیع ریسک' : 'Risk Distribution'}</SectionTitle>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MiniDonut segments={[{ value: counts.high, color: colors.danger }, { value: counts.medium, color: colors.warning }, { value: counts.low, color: colors.success }]} size={90} thickness={13} centerValue={`${n(clients.length)}`} centerLabel={isFa ? 'مرجع' : 'clients'} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                {(['high', 'medium', 'low'] as Risk[]).map((r, i) => (
                  <View key={r} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: colors.border }}>
                    <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: riskColor(r), marginRight: 7 }} />
                    <Text style={{ flex: 1, fontSize: 10, color: colors.textSecondary }}>{riskLabel(r)}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{n(counts[r])}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={{ flexBasis: isWide ? '55%' : '100%', flexGrow: 1, padding: 3 }}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle action={isFa ? '💬 = پیام' : '💬=nudge'}>{isFa ? 'اولویت پیگیری' : 'Priority Follow-up'}</SectionTitle>
            {priority.map((c, i, arr) => {
              const r = riskOf(c);
              return (
                <View key={c.nationalId} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                  <Pressable onPress={() => router.push({ pathname: '/client-detail', params: { id: c.nationalId } })} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <IconTile icon="profile" tone={riskColor(r)} size={26} />
                    <View style={{ flex: 1, marginLeft: 7 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{maskNationalId(c.nationalId)}</Text>
                      <Text style={{ fontSize: 8, color: colors.textSecondary }}>BMI {n(c.bmi)} · VFL {n(c.vfl)} · {n(c.bioAge - c.age) > 0 ? `+${n(c.bioAge - c.age)}` : n(c.bioAge - c.age)}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: riskColor(r) + '22' }}>
                      <Text style={{ fontSize: 8, fontWeight: '700', color: riskColor(r) }}>{riskLabel(r)}</Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => openNudge(c)} style={{ width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, marginLeft: 6 }}>
                    <Icon name="tips" size={11} color={colors.primary} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <ChartPreviewModal visible={preview !== null} onClose={() => setPreview(null)} title={preview?.title ?? ''} subtitle={preview?.subtitle} rows={preview?.rows ?? []} />
    </ScrollView>
  );
}