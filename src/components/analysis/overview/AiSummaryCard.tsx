import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../../store/ThemeContext';
import { useLanguage } from '../../../store/LanguageContext';
import type { BodyAnalysisRecord } from '../../../data/bodyAnalysisTypes';
import { faNum } from '../../../utils/format';

export default function AiSummaryCard({ records }: { records: BodyAnalysisRecord[] }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: any) => faNum(v, isFa);
  const asc = [...records].sort((a, b) => +new Date(a.analyzeTime) - +new Date(b.analyzeTime));
  const first = asc[0];
  const last = asc[asc.length - 1];

  const fp = (r: BodyAnalysisRecord) => (r.weight ? (r.bfm / r.weight) * 100 : 0);
  const dFat = fp(last) - fp(first);
  const dMus = Number(last.smm) - Number(first.smm);

  const txt = isFa
    ? `روند کلی این‌گونه است: درصد چربی ${dFat <= 0 ? 'کاهش' : 'افزایش'} ${n(Math.abs(dFat).toFixed(1))}٪ و تودهٔ عضلانی ${dMus <= 0 ? 'کاهش' : 'افزایش'} ${n(Math.abs(dMus).toFixed(1))} واحد. آماده‌ام برنامهٔ فاز بعد را پیشنهاد دهم.`
    : `Overall: fat ${dFat <= 0 ? 'down' : 'up'} ${n(Math.abs(dFat).toFixed(1))}%, muscle ${dMus <= 0 ? 'down' : 'up'} ${n(Math.abs(dMus).toFixed(1))}. Ready to suggest the next phase.`;

  return (
    <View style={{ backgroundColor: colors.primary + '10', borderRadius: 14, borderWidth: 1, borderColor: colors.primary + '33', padding: 14, flexGrow: 1, flexBasis: '40%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 12, color: '#fff' }}>✦</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{isFa ? 'جمع‌بندی دستیار هوشمند' : 'AI summary'}</Text>
      </View>
      <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 16 }}>{txt}</Text>
      <Pressable style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>💬 {isFa ? 'گفتگو با دستیار' : 'Chat with assistant'}</Text>
      </Pressable>
    </View>
  );
}