import { useMemo, useState } from 'react';
import { Text, View, ScrollView, Pressable, TextInput, useWindowDimensions } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { useFoods } from '../src/hooks/useFoods';
import { SectionTitle, IconTile, Chip } from '../src/components/ui/Card';
import Icon, { IconName } from '../src/components/ui/Icon';
import ChartPreviewModal from '../src/components/charts/ChartPreviewModal';
import type { PreviewRow } from '../src/components/charts/ChartPreviewModal';
import { faNum } from '../src/utils/format';
import type { TipCategory } from '../src/data/nutritionTips';
import { router } from 'expo-router';

const CATS: TipCategory[] = ['office', 'hydration', 'mindfulness', 'nutrition', 'snacking'];
const CAT_ICON: Record<TipCategory, IconName> = { office: 'org', hydration: 'water', mindfulness: 'heart', nutrition: 'meal', snacking: 'diet' };

export default function ContentStudioScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { width: winW } = useWindowDimensions();
  const isWide = winW >= 900;
  const { state, publishPost, deletePost } = useWellness();
  const foods = useFoods();
  const [kind, setKind] = useState<'tip' | 'recipe'>('tip');
  const [cat, setCat] = useState<TipCategory>('nutrition');
  const [titleFa, setTitleFa] = useState('');
  const [bodyFa, setBodyFa] = useState('');
  const [foodQ, setFoodQ] = useState('');
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ title: string; subtitle?: string; rows: PreviewRow[] } | null>(null);

  const posts = state.customPosts ?? [];
  const tips = posts.filter((p) => p.kind === 'tip').length;
  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };
  const inp = { backgroundColor: colors.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 8, fontSize: 11, color: colors.text };
  const col = (b: string) => ({ flexBasis: b, flexGrow: 1, padding: 3 });

  const foodResults = useMemo(() => { const q = foodQ.trim().toLowerCase(); return q ? foods.filter((f) => f.nameFa.toLowerCase().includes(q)).slice(0, 4) : []; }, [foodQ, foods]);

  const openPost = (p: any) => setPreview({ title: p.titleFa, subtitle: p.bodyFa, rows: [
    { label: isFa ? 'نوع' : 'Type', value: p.kind === 'tip' ? (isFa ? 'نکته' : 'Tip') : isFa ? 'رسپی' : 'Recipe', color: colors.primary },
    { label: isFa ? 'دسته' : 'Cat', value: p.category, color: colors.chart[2] },
    { label: isFa ? 'تاریخ' : 'Date', value: n(p.publishedAt), color: colors.chart[4] },
    ...(p.recipe?.length ? [{ label: isFa ? 'اقلام' : 'Items', value: n(p.recipe.length), color: colors.chart[3] }] : []),
  ] });

  const publish = () => {
    if (!titleFa.trim() || !bodyFa.trim()) { setMessage(isFa ? 'عنوان و متن الزامی' : 'Title & body required'); return; }
    if (kind === 'recipe' && !recipeItems.length) { setMessage(isFa ? 'رسپی غذا می‌خواهد' : 'Recipe needs food'); return; }
    publishPost({ id: `post-${Date.now()}`, kind, category: cat, titleFa: titleFa.trim(), titleEn: titleFa.trim(), bodyFa: bodyFa.trim(), bodyEn: bodyFa.trim(), recipe: kind === 'recipe' ? recipeItems : undefined, author: 'admin', publishedAt: new Date().toISOString().slice(0, 10), source: 'admin' } as any);
    setTitleFa(''); setBodyFa(''); setRecipeItems([]); setFoodQ(''); setMessage(isFa ? '✓ منتشر شد' : '✓ Published');
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{isFa ? 'استودیو محتوا' : 'Content Studio'}</Text>
        <Pressable onPress={() => router.back()} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}>
          <Text style={{ fontSize: 12, color: colors.text }}>←</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', marginHorizontal: -3, marginBottom: 6 }}>
        {[
          { label: isFa ? 'کل' : 'Total', value: posts.length, tone: colors.primary },
          { label: isFa ? 'نکته' : 'Tips', value: tips, tone: colors.chart[2] },
          { label: isFa ? 'رسپی' : 'Recipes', value: posts.length - tips, tone: colors.chart[3] },
        ].map((t) => (
          <View key={t.label} style={{ flex: 1, padding: 3 }}>
            <View style={[card, { alignItems: 'center' }]}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: t.tone }}>{n(t.value)}</Text>
              <Text style={{ fontSize: 8, color: colors.textMuted }}>{t.label}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 }}>
        <View style={col(isWide ? '50%' : '100%')}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle>{isFa ? 'ساخت پست جدید' : 'Create post'}</SectionTitle>
            <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
              {(['tip', 'recipe'] as const).map((k) => (
                <Pressable key={k} onPress={() => setKind(k)} style={{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', backgroundColor: kind === k ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: kind === k ? colors.primary : colors.border }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: kind === k ? '#FFFFFF' : colors.textSecondary }}>{k === 'tip' ? (isFa ? 'نکته' : 'Tip') : isFa ? 'رسپی' : 'Recipe'}</Text>
                </Pressable>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }} contentContainerStyle={{ paddingRight: 6 }}>
              {CATS.map((c) => (<Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />))}
            </ScrollView>
            <TextInput style={[inp, { marginBottom: 5 }]} placeholder={isFa ? 'عنوان *' : 'Title *'} placeholderTextColor={colors.textMuted} value={titleFa} onChangeText={setTitleFa} />
            <TextInput style={[inp, { minHeight: 50, marginBottom: 5 }]} multiline placeholder={isFa ? 'متن *' : 'Body *'} placeholderTextColor={colors.textMuted} value={bodyFa} onChangeText={setBodyFa} />
            {kind === 'recipe' && (
              <>
                <TextInput style={[inp, { marginBottom: 5 }]} placeholder={isFa ? 'جستجوی غذا...' : 'Search food...'} placeholderTextColor={colors.textMuted} value={foodQ} onChangeText={setFoodQ} />
                {foodResults.map((f) => (
                  <Pressable key={f.id} onPress={() => { setRecipeItems((r) => [...r, { foodId: f.id, nameFa: f.nameFa, nameEn: f.nameEn, portionFa: f.portionFa, portionEn: f.portionEn, qty: 1, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat }]); setFoodQ(''); }} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ fontSize: 9, color: colors.textSecondary }}>+ {f.nameFa}</Text>
                    <Text style={{ fontSize: 9, color: colors.textMuted }}>{n(f.kcal)}</Text>
                  </Pressable>
                ))}
                {recipeItems.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 5 }}>
                    {recipeItems.map((r, i) => (
                      <Pressable key={i} onPress={() => setRecipeItems((x) => x.filter((_, j) => j !== i))} style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.chart[3] + '22' }}>
                        <Text style={{ fontSize: 8, fontWeight: '700', color: colors.chart[3] }}>{r.nameFa} ✕</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}
            {message && <View style={{ backgroundColor: colors.accentSoft, borderRadius: 8, padding: 7, marginBottom: 5 }}><Text style={{ fontSize: 9, fontWeight: '700', color: colors.success }}>{message}</Text></View>}
            <Pressable onPress={publish} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? '📤 انتشار' : ' Publish'}</Text>
            </Pressable>
          </View>
        </View>
        <View style={col(isWide ? '50%' : '100%')}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle action={isFa ? 'جزئیات = ضربه' : 'tap=details'}>{isFa ? `پست‌ها (${n(posts.length)})` : `Posts (${posts.length})`}</SectionTitle>
            {posts.length === 0 ? (
              <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: colors.textMuted }}>{isFa ? 'خالی' : 'Empty'}</Text>
              </View>
            ) : (
              posts.map((p, i, arr) => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                  <Pressable onPress={() => openPost(p)} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <IconTile icon={CAT_ICON[p.category] || 'tips'} tone={colors.chart[i % colors.chart.length]} size={22} />
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{p.titleFa}</Text>
                      <Text style={{ fontSize: 8, color: colors.textMuted }}>{p.kind} · {n(p.publishedAt)}</Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => deletePost(p.id)} style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft }}>
                    <Icon name="trash" size={10} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>
      </View>

      <ChartPreviewModal visible={preview !== null} onClose={() => setPreview(null)} title={preview?.title ?? ''} subtitle={preview?.subtitle} rows={preview?.rows ?? []} />
    </ScrollView>
  );
}