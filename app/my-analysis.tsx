import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useAuth } from '../src/store/AuthContext';
import { usePersonnel } from '../src/store/PersonnelContext';
import { useBodyAnalysis } from '../src/store/BodyAnalysisContext';
import AnalysisDashboard from '../src/components/analysis/AnalysisDashboard';
import { faNum, faDigits } from '../src/utils/format';

export default function MyAnalysisScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: any) => faNum(v, isFa);
  const { session } = useAuth();
  const { getByNationalId } = usePersonnel();
  const { getUserAnalyses } = useBodyAnalysis();

  const nationalId = String(session?.nationalId || '');
  const person = nationalId ? getByNationalId(nationalId) : undefined;
  const records = getUserAnalyses(nationalId);

  const name = isFa
    ? person?.fullNamePrefixed || person?.fullName || (session as any)?.fullName || nationalId
    : (session as any)?.fullName || person?.fullName || nationalId;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* هدر — همان استایل client-detail */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 15, color: colors.text }}>{isFa ? '→' : '←'}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{name}</Text>
          <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 3 }}>
            {isFa ? `کد ملی: ${faDigits(nationalId)}` : `National ID: ${nationalId}`}
            {'  ·  '}
            {n(records.length)} {isFa ? 'آنالیز ثبت‌شده' : 'analyses recorded'}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 30 }}>
        <AnalysisDashboard records={records} />
      </ScrollView>
    </View>
  );
}