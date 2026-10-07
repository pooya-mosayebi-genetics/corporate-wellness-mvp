import { useMemo, useState } from 'react';
import { Text, View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useAuth } from '../src/store/AuthContext';
import { useBodyAnalysis } from '../src/store/BodyAnalysisContext';
import AnalysisDetail from '../src/components/analysis/AnalysisDetail';
import { faNum } from '../src/utils/format';
import Icon from '../src/components/ui/Icon';

export default function BodyAnalysisScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { session } = useAuth();
  const { getUserAnalyses, ready } = useBodyAnalysis();

  const analyses = useMemo(
    () => getUserAnalyses(session?.nationalId || ''),
    [getUserAnalyses, session],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => analyses.find((a) => a.id === selectedId) || analyses[0] || null,
    [analyses, selectedId],
  );

  const bmi = selected && selected.height ? selected.weight / Math.pow(selected.height / 100, 2) : null;
  const fatPct = selected && selected.weight ? (selected.bfm / selected.weight) * 100 : null;

  const card = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 12,
  } as const;

  /* ---------- حالت‌های بارگذاری / خالی ---------- */
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>{isFa ? 'در حال بارگذاری...' : 'Loading...'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
      {/* هدر */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Pressable onPress={() => router.back()} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, marginRight: 8 }}>
          <Text style={{ fontSize: 12, color: colors.text }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{isFa ? 'آنالیز من' : 'My Analysis'}</Text>
        {analyses.length > 0 && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.primarySoft, marginLeft: 8 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>
              {n(analyses.length)} {isFa ? 'آنالیز' : 'analyses'}
            </Text>
          </View>
        )}
      </View>

      {analyses.length === 0 ? (
        <View style={[card, { alignItems: 'center', padding: 30 }]}>
          <Icon name="analysis" size={26} color={colors.textMuted} />
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>
            {isFa ? 'هنوز آنالیزی برای شما ثبت نشده است.' : 'No analysis recorded yet.'}
          </Text>
          <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
            {isFa ? 'پس از واردسازی دادهٔ دستگاه، آنالیز شما اینجا نمایش داده می‌شود.' : 'Once device data is imported, your analysis appears here.'}
          </Text>
        </View>
      ) : (
        <>
          {/* انتخاب آنالیز از تاریخچه */}
          {analyses.length > 1 && (
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                {isFa ? 'انتخاب آنالیز (تاریخچه):' : 'Select analysis (history):'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {analyses.map((a, i) => {
                  const active = selected?.id === a.id;
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => setSelectedId(a.id)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: active ? colors.primary : colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '700', color: active ? '#FFFFFF' : colors.textSecondary }}>
                        {new Date(a.analyzeTime).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* نوار خلاصهٔ شاخص‌ها */}
          {selected && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              <View style={[card, { flexGrow: 1, flexBasis: '30%', padding: 10 }]}>
                <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'وزن' : 'Weight'}</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 2 }}>
                  {n(Number(selected.weight).toFixed(1))} <Text style={{ fontSize: 8, color: colors.textMuted }}>kg</Text>
                </Text>
              </View>
              <View style={[card, { flexGrow: 1, flexBasis: '30%', padding: 10 }]}>
                <Text style={{ fontSize: 8, color: colors.textMuted }}>BMI</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: bmi && (bmi < 18.5 || bmi > 25) ? colors.warning : colors.success, marginTop: 2 }}>
                  {bmi !== null ? n(bmi.toFixed(1)) : '—'}
                </Text>
              </View>
              <View style={[card, { flexGrow: 1, flexBasis: '30%', padding: 10 }]}>
                <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'درصد چربی' : 'Fat %'}</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.warning, marginTop: 2 }}>
                  {fatPct !== null ? n(fatPct.toFixed(1)) : '—'} <Text style={{ fontSize: 8, color: colors.textMuted }}>%</Text>
                </Text>
              </View>
              <View style={[card, { flexGrow: 1, flexBasis: '30%', padding: 10 }]}>
                <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'عضله اسکلتی' : 'SMM'}</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.success, marginTop: 2 }}>
                  {n(Number(selected.smm).toFixed(1))} <Text style={{ fontSize: 8, color: colors.textMuted }}>kg</Text>
                </Text>
              </View>
              <View style={[card, { flexGrow: 1, flexBasis: '30%', padding: 10 }]}>
                <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'چربی احشایی' : 'VFA'}</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: selected.vfa > 10 ? colors.danger : colors.success, marginTop: 2 }}>
                  {n(selected.vfa)}
                </Text>
              </View>
              <View style={[card, { flexGrow: 1, flexBasis: '30%', padding: 10 }]}>
                <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'امتیاز آنیا' : 'Anea'}</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, marginTop: 2 }}>
                  {n(selected.aneaScore)} <Text style={{ fontSize: 8, color: colors.textMuted }}>/100</Text>
                </Text>
              </View>
            </View>
          )}

          {/* جزئیات کامل */}
          {selected && <AnalysisDetail record={selected} showHeader />}
        </>
      )}
    </ScrollView>
  );
}