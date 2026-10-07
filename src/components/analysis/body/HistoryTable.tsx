import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../../store/ThemeContext';
import { useLanguage } from '../../../store/LanguageContext';
import type { BodyAnalysisRecord } from '../../../data/bodyAnalysisTypes';
import { faNum } from '../../../utils/format';

export default function HistoryTable({ records }: { records: BodyAnalysisRecord[] }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: any) => faNum(v, isFa);
  const desc = [...records].sort((a, b) => +new Date(b.analyzeTime) - +new Date(a.analyzeTime));
  const bmi = (r: BodyAnalysisRecord) => (r.height ? r.weight / Math.pow(r.height / 100, 2) : 0);
  const fat = (r: BodyAnalysisRecord) => (r.weight ? (r.bfm / r.weight) * 100 : 0);

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, padding: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 9, color: colors.textMuted }}>{n(records.length)} {isFa ? 'آنالیز' : 'analyses'}</Text>
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>🕒 {isFa ? 'تاریخچهٔ آنالیزها' : 'Analysis history'}</Text>
      </View>
      <View style={{ flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ flex: 2, fontSize: 9, color: colors.textMuted }}>{isFa ? 'تاریخ' : 'Date'}</Text>
        <Text style={{ flex: 1.4, fontSize: 9, color: colors.textMuted }}>{isFa ? 'دستگاه' : 'Device'}</Text>
        <Text style={{ flex: 1, fontSize: 9, color: colors.textMuted }}>{isFa ? 'وزن' : 'Weight'}</Text>
        <Text style={{ flex: 1, fontSize: 9, color: colors.textMuted }}>BMI</Text>
        <Text style={{ flex: 1, fontSize: 9, color: colors.textMuted }}>{isFa ? 'چربی٪' : 'Fat%'}</Text>
        <Text style={{ flex: 1, fontSize: 9, color: colors.textMuted }}>{isFa ? 'وزن عضله' : 'Muscle'}</Text>
        <View style={{ width: 70 }} />
      </View>
      {desc.map((r, i) => (
        <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: i === 0 ? '#eef2ff' : 'transparent', borderLeftWidth: i === 0 ? 3 : 0, borderLeftColor: '#2563eb' }}>
          <View style={{ flex: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#2563eb' }} />
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>
                {new Date(r.analyzeTime).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </Text>
            </View>
            <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>
              {new Date(r.analyzeTime).toLocaleTimeString(isFa ? 'fa-IR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              {i === 0 ? ` · ${isFa ? 'آخرین' : 'Latest'}` : ''}
            </Text>
          </View>
          <View style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' }} />
            <Text style={{ fontSize: 9, color: colors.textSecondary }}>{isFa ? 'بادی آنالیز' : 'Body Analyzer'}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: colors.text }}>{n(Number(r.weight).toFixed(1))}</Text>
          <Text style={{ flex: 1, fontSize: 10, color: colors.textSecondary }}>{n(bmi(r).toFixed(1))}</Text>
          <Text style={{ flex: 1, fontSize: 10, color: colors.textSecondary }}>{n(fat(r).toFixed(1))}</Text>
          <Text style={{ flex: 1, fontSize: 10, color: colors.textSecondary }}>{n(Number(r.smm).toFixed(1))}</Text>
          <View style={{ width: 70 }}>
            <Pressable style={{ backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 6, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>📄 {isFa ? 'گزارش' : 'Report'}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}