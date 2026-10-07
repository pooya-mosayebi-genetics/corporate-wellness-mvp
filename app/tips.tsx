// ✅ کدهای اصلاح شده برای app/tips.tsx
import { useEffect, useState } from 'react';
import { Text, View, ScrollView, Pressable, Share, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/store/ThemeContext'; // Changed
import { useLanguage } from '../src/store/LanguageContext'; // Changed
import { SectionTitle, IconTile, Chip } from '../src/components/ui/Card'; // Changed
import Icon, { IconName } from '../src/components/ui/Icon'; // Changed
import ChartPreviewModal from '../src/components/charts/ChartPreviewModal'; // Changed
import type { PreviewRow } from '../src/components/charts/ChartPreviewModal'; // Changed
import { faNum } from '../src/utils/format'; // Changed
import { nutritionTips } from '../src/data/nutritionTips'; // Changed
import type { TipCategory, NutritionTip } from '../src/data/nutritionTips'; // Changed
import { iranianFoods } from '../src/data/iranianFoods'; // Changed
const CAT_ICON: Record<TipCategory, IconName> = { office: 'org', hydration: 'water', mindfulness: 'heart', nutrition: 'meal', snacking: 'diet' };
const CAT_ORDER: TipCategory[] = ['office', 'hydration', 'mindfulness', 'nutrition', 'snacking'];
const ALL_CATS: (TipCategory | 'all')[] = ['all', ...CAT_ORDER];
const REACTIONS_KEY = 'tip_reactions_v1';

/** ✅ نگاشت دستهٔ نکته → گروه‌های جدید دیتابیس غذا (بعد از جایگذاری دیتابیس جدید) */
const RELATED_GROUPS: Record<TipCategory, string[]> = {
  office: ['غذاهای آماده', 'غذاهای سنتی', 'صبحانه', 'سالاد و ساندویچ', 'پیش‌غذا'],
  hydration: ['نوشیدنی', 'لبنیات و نوشیدنی', 'لبنیات'],
  mindfulness: ['میوه', 'میوه/خشکبار', 'سبزیجات', 'سبزیجات و چاشنی'],
  nutrition: ['گوشت و مرغ', 'گوشت قرمز', 'ماهی و دریایی', 'تخم مرغ', 'حبوبات', 'حبوبات و جایگزین‌ها'],
  snacking: ['شیرینی', 'شیرینی و خشکبار', 'خشکبار', 'مغزها', 'دانه‌ها', 'دسر'],
};

function catLabel(c: TipCategory | 'all', isFa: boolean, t: any): string {
  if (c === 'all') return t('allTips');
  return c === 'office' ? t('categoryOffice') : c === 'hydration' ? t('categoryHydration') : c === 'mindfulness' ? t('categoryMindfulness') : c === 'nutrition' ? t('categoryNutrition') : t('categorySnacking');
}

export default function TipsScreen() {
  const { colors } = useTheme();
  const { language, t } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { width: winW } = useWindowDimensions();
  const isWide = winW >= 900;
  const [cat, setCat] = useState<TipCategory | 'all'>('all');
  const [reactions, setReactions] = useState<Record<string, 'like' | 'dislike'>>({});
  const [preview, setPreview] = useState<{ title: string; subtitle?: string; rows: PreviewRow[] } | null>(null);

  useEffect(() => { (async () => { try { const raw = await AsyncStorage.getItem(REACTIONS_KEY); if (raw) setReactions(JSON.parse(raw)); } catch {} })(); }, []);

  const setReaction = async (id: string, r: 'like' | 'dislike') => {
    const next = { ...reactions };
    if (next[id] === r) delete next[id]; else next[id] = r;
    setReactions(next);
    try { await AsyncStorage.setItem(REACTIONS_KEY, JSON.stringify(next)); } catch {}
  };

  const share = async (tip: NutritionTip) => {
    try { await Share.share({ message: `${isFa ? tip.title.fa : tip.title.en}\n\n${isFa ? tip.description.fa : tip.description.en}` }); } catch {}
  };

  const filtered = cat === 'all' ? nutritionTips : nutritionTips.filter((x) => x.category === cat);
  const catColor = (c: TipCategory) => colors.chart[CAT_ORDER.indexOf(c) % colors.chart.length];

  /** ✅ غذاهای مرتبط با گروه‌های جدید + fallback تا مودال هرگز خالی نماند */
  const related = (c: TipCategory) => {
    const groups = RELATED_GROUPS[c] || [];
    const list = iranianFoods.filter((f) => groups.includes(f.category));
    return (list.length ? list : iranianFoods).slice(0, 3);
  };

  const openTip = (tip: NutritionTip) => {
    setPreview({
      title: isFa ? tip.title.fa : tip.title.en,
      subtitle: isFa ? tip.description.fa : tip.description.en,
      rows: related(tip.category).map((f) => ({
        label: `${f.nameFa} (${f.portionFa})`,
        value: `${n(f.kcal)} kcal`,
        color: catColor(tip.category),
      })),
    });
  };

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };

  return (
    <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: 80 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{t('tipsTitle')}</Text>
        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.primarySoft }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>{n(filtered.length)} {isFa ? 'نکته' : 'tips'}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ paddingRight: 6 }}>
        {ALL_CATS.map((c) => (<Chip key={c} label={catLabel(c, isFa, t)} active={cat === c} onPress={() => setCat(c)} />))}
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 }}>
        {filtered.map((tip) => {
          const r = reactions[tip.id];
          return (
            <View key={tip.id} style={{ flexBasis: isWide ? '50%' : '100%', flexGrow: 1, padding: 3 }}>
              <View style={[card, { flex: 1 }]}>
                <Pressable onPress={() => openTip(tip)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <IconTile icon={CAT_ICON[tip.category]} tone={catColor(tip.category)} size={30} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{isFa ? tip.title.fa : tip.title.en}</Text>
                    <Text numberOfLines={2} style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2 }}>{isFa ? tip.description.fa : tip.description.en}</Text>
                  </View>
                  {r === 'like' && <Icon name="heart" size={13} color={colors.danger} />}
                </Pressable>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7, paddingTop: 7, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    <Pressable onPress={() => setReaction(tip.id, 'like')} style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: r === 'like' ? colors.accentSoft : colors.surfaceAlt, borderWidth: 1, borderColor: r === 'like' ? colors.success : colors.border }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: r === 'like' ? colors.success : colors.textMuted }}>👍</Text>
                    </Pressable>
                    <Pressable onPress={() => setReaction(tip.id, 'dislike')} style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: r === 'dislike' ? colors.dangerSoft : colors.surfaceAlt, borderWidth: 1, borderColor: r === 'dislike' ? colors.danger : colors.border }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: r === 'dislike' ? colors.danger : colors.textMuted }}>👎</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable onPress={() => share(tip)}><Icon name="share" size={12} color={colors.textMuted} /></Pressable>
                    <Text style={{ fontSize: 8, color: colors.textMuted }}>⏱ {n(tip.readTimeMinutes)} {t('minRead')}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <ChartPreviewModal visible={preview !== null} onClose={() => setPreview(null)} title={preview?.title ?? ''} subtitle={preview?.subtitle} rows={preview?.rows ?? []} />
    </ScrollView>
  );
}