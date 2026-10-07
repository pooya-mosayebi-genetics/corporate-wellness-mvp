import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../../store/ThemeContext';
import { useLanguage } from '../../../store/LanguageContext';
import type { BodyAnalysisRecord } from '../../../data/bodyAnalysisTypes';
import { faNum } from '../../../utils/format';
import TrendChart from '../shared/TrendChart';
import RangeSlider from '../shared/RangeSlider';

const METRICS = [
  { key: 'weight', fa: 'وزن', en: 'Weight', unit: 'kg', color: '#2563eb' },
  { key: 'bmi', fa: 'شاخص تودهٔ بدنی', en: 'BMI', unit: '', color: '#60a5fa' },
  { key: 'fat', fa: 'درصد چربی بدن', en: 'Body Fat %', unit: '٪', color: '#fbbf24' },
  { key: 'muscle', fa: 'تودهٔ عضلانی', en: 'Muscle', unit: 'kg', color: '#22c55e' },
];

export default function OverviewTab({ records, onOpenBody }: { records: BodyAnalysisRecord[]; onOpenBody: () => void }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: any) => faNum(v, isFa);
  const [mk, setMk] = useState('weight');

  const asc = [...records].sort((a, b) => +new Date(a.analyzeTime) - +new Date(b.analyzeTime));
  const latest = asc[asc.length - 1];
  if (!latest) return null;

  const bmi = latest.height ? latest.weight / Math.pow(latest.height / 100, 2) : 0;
  const fatPct = latest.weight ? (latest.bfm / latest.weight) * 100 : 0;
  const maintenance = Math.round((Number(latest.bmr) * 1.2) / 50) * 50;
  const fatTarget = Number(latest.bfmUpper) || 0;
  const musTarget = Number(latest.smmUpper) || 0;
  const musGap = Math.max(0, musTarget - Number(latest.smm));
  const metric = METRICS.find((m) => m.key === mk) || METRICS[0];
  const getVal = (r: BodyAnalysisRecord): number =>
    mk === 'weight' ? Number(r.weight) : mk === 'bmi' ? (r.height ? r.weight / Math.pow(r.height / 100, 2) : 0)
    : mk === 'fat' ? (r.weight ? (r.bfm / r.weight) * 100 : 0) : Number(r.smm);

  const card = { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, padding: 14 } as any;

  return (
    <View>
      {/* کارت‌های منبع داده */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <View style={[card, { flex: 1, borderTopWidth: 3, borderTopColor: '#2563eb' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#fef3c7' }}>
              <Text style={{ fontSize: 8, color: '#b45309' }}>{isFa ? 'در حال پیگیری' : 'Tracking'}</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{isFa ? 'آنالیز بدن' : 'Body Analysis'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{n(Number(latest.weight).toFixed(1))}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>kg</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>—</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <View><Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'درصد چربی' : 'Fat %'}</Text><Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{n(fatPct.toFixed(1))}٪</Text></View>
            <View><Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'تودهٔ عضلانی' : 'Muscle'}</Text><Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{n(Number(latest.smm).toFixed(1))}٪</Text></View>
            <View><Text style={{ fontSize: 8, color: colors.textMuted }}>BMI</Text><Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{n(bmi.toFixed(1))}</Text></View>
          </View>
          <Pressable onPress={onOpenBody} style={{ flexDirection: 'row', alignSelf: 'flex-end', marginTop: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 9, color: colors.textSecondary }}>{isFa ? 'آنالیز کامل' : 'Full analysis'}</Text>
            <Text style={{ fontSize: 9, color: colors.textSecondary, marginLeft: 4 }}>‹</Text>
          </Pressable>
        </View>

        <View style={[card, { flex: 1, borderTopWidth: 3, borderTopColor: '#f97316' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.surfaceAlt }}>
              <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'قفل' : 'Locked'}</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{isFa ? 'دادهٔ غذایی' : 'Food Data'}</Text>
          </View>
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>🔒 {isFa ? 'دسترسی به دادهٔ غذایی هنوز تأیید نشده است.' : 'Food data not approved yet.'}</Text>
          <Pressable style={{ flexDirection: 'row', alignSelf: 'flex-end', marginTop: 24, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 9, color: colors.textSecondary }}>{isFa ? 'مشاهدهٔ وضعیت' : 'View status'}</Text>
            <Text style={{ fontSize: 9, color: colors.textSecondary, marginLeft: 4 }}>‹</Text>
          </Pressable>
        </View>

        <View style={[card, { flex: 1, borderTopWidth: 3, borderTopColor: '#16a34a' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.surfaceAlt }}>
              <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'به‌زودی' : 'Soon'}</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{isFa ? 'فعالیت بدنی' : 'Activity'}</Text>
          </View>
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>ⓘ {isFa ? 'پایش فعالیت بدنی از طریق ساعت هوشمند به‌زودی در دسترس قرار می‌گیرد.' : 'Activity tracking via smartwatch coming soon.'}</Text>
        </View>
      </View>

      {/* هدف فعال و فاصله تا ترکیب هدف */}
      <View style={[card, { marginBottom: 12 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#dbeafe' }}>
            <Text style={{ fontSize: 9, color: '#1d4ed8' }}>● {isFa ? 'حفظ وزن' : 'Maintain weight'}</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>◎ {isFa ? 'هدف فعال و فاصله تا ترکیب هدف' : 'Active goal & gap'}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e8f2fd', borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#2563eb' }}>{n(maintenance)}</Text>
            <Text style={{ fontSize: 9, color: colors.textMuted }}>kcal {isFa ? 'هدف روزانه' : 'daily target'}</Text>
          </View>
          <Text style={{ fontSize: 9, color: colors.textMuted }}>{isFa ? `هم‌تراز نگهداری · نگهداری ${n(maintenance)}` : `Maintenance ${n(maintenance)}`}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>{isFa ? 'تودهٔ چربی' : 'Fat mass'}</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{n(Number(latest.bfm).toFixed(1))} <Text style={{ fontSize: 8, color: colors.textMuted }}>kg</Text></Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, marginTop: 8 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: '#f97316', width: `${Math.min(100, (Number(latest.bfm) / (fatTarget || 1)) * 100)}%` }} />
            </View>
            <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 6 }}>
              {Number(latest.bfm) <= fatTarget ? (isFa ? 'در محدودهٔ هدف ✓' : 'In target ✓') : (isFa ? 'بالاتر از هدف' : 'Above target')} · {isFa ? 'هدف' : 'Target'}: {n(fatTarget.toFixed(1))} kg
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>{isFa ? 'تودهٔ عضلانی' : 'Muscle mass'}</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{n(Number(latest.smm).toFixed(1))} <Text style={{ fontSize: 8, color: colors.textMuted }}>kg</Text></Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, marginTop: 8 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: '#16a34a', width: `${Math.min(100, (Number(latest.smm) / (musTarget || 1)) * 100)}%` }} />
            </View>
            <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 6 }}>
              {musGap > 0 ? `${n(musGap.toFixed(1))} kg ${isFa ? 'پایین‌تر از هدف' : 'below target'}` : (isFa ? 'به هدف رسیده ✓' : 'At target ✓')} · {isFa ? 'هدف' : 'Target'}: {n(musTarget.toFixed(1))} kg
            </Text>
          </View>
        </View>
        <Pressable style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontSize: 9, color: colors.textMuted }}>‹</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>{isFa ? 'طراحی رژیم' : 'Diet design'}</Text>
            <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'هنوز رژیمی طراحی نشده' : 'No diet designed yet'}</Text>
          </View>
        </Pressable>
        <Pressable style={{ borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>◎ {isFa ? 'تنظیم هدف در طراحی رژیم' : 'Set goal in diet design'} ›</Text>
        </Pressable>
      </View>

      {/* روند + دستیار */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={[card, { flex: 1.4 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Pressable onPress={onOpenBody} style={{ flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 9, color: colors.textSecondary }}>{isFa ? 'تحلیل کامل' : 'Full analysis'}</Text>
              <Text style={{ fontSize: 9, color: colors.textSecondary, marginLeft: 4 }}>‹</Text>
            </Pressable>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>📈 {isFa ? 'روند ترکیب بدنی' : 'Composition trend'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, alignSelf: 'flex-end', marginBottom: 10 }}>
            {METRICS.map((m) => (
              <Pressable key={m.key} onPress={() => setMk(m.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: mk === m.key ? colors.surface : colors.surfaceAlt, borderWidth: 1, borderColor: mk === m.key ? colors.border : 'transparent' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: m.color }} />
                <Text style={{ fontSize: 8, color: mk === m.key ? colors.text : colors.textMuted }}>{isFa ? m.fa : m.en}</Text>
              </Pressable>
            ))}
          </View>
          <TrendChart points={asc.map((r) => ({ id: r.id, date: r.analyzeTime, value: getVal(r) }))} color={metric.color} unit={metric.unit} title={isFa ? metric.fa : metric.en} />
        </View>
        <View style={{ flex: 1, backgroundColor: '#e8f2fd', borderRadius: 14, borderWidth: 1, borderColor: '#bfdbfe', padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, color: '#fff' }}>✦</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{isFa ? 'جمع‌بندی دستیار هوشمند' : 'AI summary'}</Text>
          </View>
          <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 16 }}>
            {isFa
              ? `روند کلی این‌گونه است: درصد چربی ${n(Math.abs(fatPct - (asc[0] ? (asc[0].weight ? (asc[0].bfm / asc[0].weight) * 100 : 0) : fatPct)).toFixed(1))}٪ کاهش و تودهٔ عضلانی ${n(Math.abs(Number(latest.smm) - Number(asc[0]?.smm || 0)).toFixed(1))} واحد کاهش داشته. آماده‌ام برنامهٔ فاز بعد را پیشنهاد دهم.`
              : 'Overall trend summary. Ready to suggest the next phase plan.'}
          </Text>
          <Pressable style={{ backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>💬 {isFa ? 'گفتگو با دستیار' : 'Chat with assistant'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}