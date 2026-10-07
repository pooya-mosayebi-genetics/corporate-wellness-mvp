import { Text, View } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { CURRENT_ORG, PLAN_LABELS } from '../../config/org';

/** 🏷 بج سازمان + پلن — بعداً per-tenant بدون تغییر UI */
export default function PlanBadge() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const plan = PLAN_LABELS[CURRENT_ORG.plan];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, marginBottom: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 9, fontWeight: '700', color: colors.text }}>
        {isFa ? CURRENT_ORG.nameFa : CURRENT_ORG.nameEn}
      </Text>
      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.primarySoft }}>
        <Text style={{ fontSize: 8, fontWeight: '800', color: colors.primary }}>{isFa ? plan.fa : plan.en}</Text>
      </View>
    </View>
  );
}