import { Text, View } from 'react-native';
import type { NutritionTip, TipCategory } from '../../data/nutritionTips';
import { categoryColors } from '../../data/nutritionTips';
import { useLanguage } from '../../store/LanguageContext';
import { useTheme } from '../../store/ThemeContext';
import type { TranslationStrings } from '../../i18n/translations';

interface TipCardProps {
  tip: NutritionTip;
}

function getCategoryLabel(
  category: TipCategory,
  t: (key: keyof TranslationStrings) => string,
): string {
  switch (category) {
    case 'office': return t('categoryOffice');
    case 'hydration': return t('categoryHydration');
    case 'mindfulness': return t('categoryMindfulness');
    case 'nutrition': return t('categoryNutrition');
    case 'snacking': return t('categorySnacking');
  }
}

export default function TipCard({ tip }: TipCardProps) {
  const { language, t } = useLanguage();
  const { colors } = useTheme();
  const categoryColor = categoryColors[tip.category];
  const categoryLabel = getCategoryLabel(tip.category, t);

  return (
    <View
      className="rounded-2xl p-5 mb-3"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}
    >
      {/* سربرگ: آیکون مربعی + بج دسته‌بندی */}
      <View className="flex-row items-center justify-between mb-3">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: categoryColor + '1A' }}
        >
          <Text style={{ fontSize: 18 }}>{tip.icon}</Text>
        </View>
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: categoryColor + '1A' }}
        >
          <Text className="text-xs font-bold" style={{ color: categoryColor }}>
            {categoryLabel}
          </Text>
        </View>
      </View>

      {/* عنوان */}
      <Text className="text-base font-bold mb-2" style={{ color: colors.text }}>
        {tip.title[language]}
      </Text>

      {/* توضیحات */}
      <Text className="text-sm mb-3" style={{ color: colors.textSecondary, lineHeight: 22 }}>
        {tip.description[language]}
      </Text>

      {/* پانوشت */}
      <View
        className="flex-row items-center justify-between pt-3"
        style={{ borderTopWidth: 1, borderTopColor: colors.border }}
      >
        <Text style={{ fontSize: 10, color: colors.textMuted }}>
          ⏱️ {tip.readTimeMinutes} {t('minRead')}
        </Text>
        <Text className="font-bold" style={{ fontSize: 10, color: colors.primary }}>
          {t('fromExpertTeam')}
        </Text>
      </View>
    </View>
  );
}