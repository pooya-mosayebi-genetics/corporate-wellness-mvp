import { Text, View } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { useWellness } from '../../store/WellnessContext';

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export default function AnalysisHistoryCard() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { state } = useWellness();
  const isFa = language === 'fa';

  const chronological = [...state.bodyAnalyses].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  if (chronological.length === 0) return null;

  const rows = chronological
    .map((item, index) => {
      const prev = index > 0 ? chronological[index - 1] : null;
      return {
        item,
        weightDelta: prev ? round1(item.weightKg - prev.weightKg) : null,
        fatDelta: prev ? round1(item.bodyFatPercent - prev.bodyFatPercent) : null,
      };
    })
    .reverse();

  return (
    <View
      className="rounded-2xl p-5 mb-4"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}
    >
      <Text className="text-sm font-bold mb-1" style={{ color: colors.text }}>
        {isFa ? 'تاریخچهٔ آنالیزها' : 'Analysis History'}
      </Text>
      <Text className="text-xs mb-3" style={{ color: colors.textMuted }}>
        {isFa ? `${rows.length} آنالیز ثبت شده` : `${rows.length} analyses recorded`}
      </Text>

      {rows.slice(0, 5).map(({ item, weightDelta, fatDelta }) => (
        <View
          key={item.id}
          className="flex-row items-center justify-between py-3"
          style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
        >
          <View>
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>
              {new Date(item.date).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
              {item.weightKg} kg · {item.bodyFatPercent}% {isFa ? 'چربی' : 'fat'}
            </Text>
          </View>
          {weightDelta !== null && fatDelta !== null && (
            <View className="items-end">
              <Text
                className="text-sm font-bold"
                style={{ color: weightDelta <= 0 ? colors.success : colors.warning }}
              >
                {weightDelta > 0 ? '+' : ''}{weightDelta} kg
              </Text>
              <Text
                className="text-xs mt-1"
                style={{ color: fatDelta <= 0 ? colors.success : colors.warning }}
              >
                {fatDelta > 0 ? '+' : ''}{fatDelta}%
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}