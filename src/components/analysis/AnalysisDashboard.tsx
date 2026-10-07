import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { useAuth } from '../../store/AuthContext';
import type { BodyAnalysisRecord } from '../../data/bodyAnalysisTypes';
import AnalysisTabs, { AnalysisTabKey } from './AnalysisTabs';
import BodyAnalysisTab from './BodyAnalysisTab';
import NutritionTab from './nutrition/NutritionTab';
import OverviewTab from './overview/OverviewTab';

export default function AnalysisDashboard({
  records,
}: {
  records: BodyAnalysisRecord[];
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const { session } = useAuth();

  // 🆕 فرد هدف: از رکوردها (پروندهٔ مراجع) یا خود کاربر (آنالیز من)
  const targetNationalId = records[0]?.nationalId ?? session?.nationalId ?? undefined;

  const [tab, setTab] = useState<AnalysisTabKey>('overview');

  return (
    <View>
      <AnalysisTabs active={tab} onChange={setTab} />

      {tab === 'overview' && <OverviewTab records={records} onOpenAnalysis={() => setTab('body')} />}
      {tab === 'body' && <BodyAnalysisTab records={records} />}
      {tab === 'food' && <NutritionTab nationalId={targetNationalId} />}

      {/* 🆕 Placeholder برای تب‌های جدید (مرحله ۲.۲) */}
      {tab !== 'overview' &&
        tab !== 'body' &&
        tab !== 'food' && (
          <View
            style={{
              padding: 40,
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}
          >
            <Text style={{ fontSize: 32, marginBottom: 10 }}>🚧</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center' }}>
              {isFa
                ? 'این بخش در فاز بعدی فعال می‌شود.'
                : 'This section will be available in the next phase.'}
            </Text>
          </View>
        )}
    </View>
  );
}