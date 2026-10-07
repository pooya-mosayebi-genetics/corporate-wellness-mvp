import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../../store/ThemeContext';
import { useLanguage } from '../../../store/LanguageContext';
import type { BodyAnalysisRecord } from '../../../data/bodyAnalysisTypes';
import { faNum } from '../../../utils/format';
import TrendChart from '../TrendChart';

const METRICS = [
  { key: 'weight', fa: 'وزن', en: 'Weight', unit: 'kg', color: '#2563eb', get: (r: BodyAnalysisRecord) => Number(r.weight) },
  { key: 'bmi', fa: 'شاخص تودهٔ بدنی', en: 'BMI', unit: 'kg/m²', color: '#60a5fa', get: (r: BodyAnalysisRecord) => (r.height ? r.weight / Math.pow(r.height / 100, 2) : 0) },
  { key: 'fat', fa: 'درصد چربی بدن', en: 'Fat %', unit: '٪', color: '#fb923c', get: (r: BodyAnalysisRecord) => (r.weight ? (r.bfm / r.weight) * 100 : 0) },
  { key: 'muscle', fa: 'تودهٔ عضلانی', en: 'Muscle', unit: 'kg', color: '#22c55e', get: (r: BodyAnalysisRecord) => Number(r.smm) },
];

export default function OverviewTrend({ records, onOpenAnalysis }: { records: BodyAnalysisRecord[]; onOpenAnalysis: () => void }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const [mk, setMk] = useState('weight');
  const metric = METRICS.find((m) => m.key === mk) || METRICS[0];

  const asc = [...records].sort((a, b) => +new Date(a.analyzeTime) - +new Date(b.analyzeTime));
  const points = asc.map((r) => ({ date: r.analyzeTime, value: metric.get(r) }));

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, padding: 14, flexGrow: 1, flexBasis: '55%' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>📈 {isFa ? 'روند ترکیب بدنی' : 'Composition trend'}</Text>
        <Pressable onPress={onOpenAnalysis} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 9, color: colors.textSecondary }}>{isFa ? 'تحلیل کامل' : 'Full analysis'}</Text>
          <Text style={{ fontSize: 9, color: colors.textSecondary, marginLeft: 4 }}>‹</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 12, justifyContent: 'flex-end' }}>
        {METRICS.map((m) => (
          <Pressable key={m.key} onPress={() => setMk(m.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: mk === m.key ? m.color + '18' : colors.surfaceAlt, borderWidth: 1, borderColor: mk === m.key ? m.color : colors.border }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: m.color }} />
            <Text style={{ fontSize: 8, color: mk === m.key ? m.color : colors.textSecondary }}>{isFa ? m.fa : m.en}</Text>
          </Pressable>
        ))}
      </View>

      <TrendChart points={points} color={metric.color} unit={metric.unit} height={170} />
    </View>
  );
}