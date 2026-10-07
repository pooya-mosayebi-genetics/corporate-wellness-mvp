import { useMemo, useState } from 'react';
import { Text, View, ScrollView, Pressable, TextInput, Modal } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { useFoodDb } from '../src/store/FoodDbContext';
import { useFoodPrefs } from '../src/hooks/useFoodPrefs';
import { useFoods } from '../src/hooks/useFoods';
import Icon from '../src/components/ui/Icon';
import { faNum } from '../src/utils/format';
import type { FoodEntry } from '../src/data/foodTypes';

type Tab = 'all' | 'fav' | 'freq' | 'custom';

export default function FoodImportScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { foods } = useFoods();
  const { favs, toggleFav } = useFoodPrefs();
  const { updateFood } = useFoodDb();
  const { state } = useWellness();

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const freqIds = useMemo(() => {
    const c: Record<string, number> = {};
    state.meals.forEach((m) => m.items?.forEach((it) => { c[it.foodId] = (c[it.foodId] || 0) + it.qty; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }, [state.meals]);

  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = foods;
    if (tab === 'fav') list = list.filter((f) => favs.includes(f.id));
    else if (tab === 'freq') list = list.filter((f) => freqIds.includes(f.id)).sort((a, b) => freqIds.indexOf(a.id) - freqIds.indexOf(b.id));
    else if (tab === 'custom') list = list.filter((f) => f.kind === 'custom');
    if (q) list = list.filter((f) => f.nameFa.toLowerCase().includes(q));
    return list;
  }, [foods, tab, favs, freqIds, query]);

  const groups = useMemo(() => {
    const m = new Map<string, FoodEntry[]>();
    base.forEach((f) => { const arr = m.get(f.group) || []; arr.push(f); m.set(f.group, arr); });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fa'));
  }, [base]);

  const openEdit = (f: FoodEntry) => {
    setEditing(f);
    setForm({
      nameFa: f.nameFa, group: f.group, unitFa: f.unitFa,
      gramsPerUnit: String(f.gramsPerUnit),
      kcalPer100g: String(f.kcalPer100g), proteinPer100g: String(f.proteinPer100g),
      carbPer100g: String(f.carbPer100g), fatPer100g: String(f.fatPer100g),
    });
  };
  const save = () => {
    if (!editing) return;
    updateFood(editing.id, {
      nameFa: (form.nameFa ?? '').trim() || editing.nameFa,
      group: (form.group ?? '').trim() || editing.group,
      unitFa: (form.unitFa ?? '').trim() || editing.unitFa,
      gramsPerUnit: parseFloat(form.gramsPerUnit) || editing.gramsPerUnit,
      kcalPer100g: parseFloat(form.kcalPer100g) || 0,
      proteinPer100g: parseFloat(form.proteinPer100g) || 0,
      carbPer100g: parseFloat(form.carbPer100g) || 0,
      fatPer100g: parseFloat(form.fatPer100g) || 0,
    });
    setEditing(null);
  };

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };
  const inp = { backgroundColor: colors.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 8, fontSize: 11, color: colors.text };

  const TABS: { key: Tab; fa: string; en: string }[] = [
    { key: 'all', fa: 'همه', en: 'All' },
    { key: 'fav', fa: 'منتخب', en: 'Selected' },
    { key: 'freq', fa: 'پرتکرار', en: 'Frequent' },
    { key: 'custom', fa: 'شخصی', en: 'Custom' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 10, paddingBottom: 30 }}>
      {/* هدر متراکم */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
            <Icon name="food" size={15} color={colors.primary} />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{isFa ? 'دیتابیس غذا' : 'Food Database'}</Text>
            <Text style={{ fontSize: 8, color: colors.textMuted }}>{n(base.length)} {isFa ? 'قلم' : 'items'}</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'افزودن جدید: به‌زودی' : 'Add new: soon'}</Text>
        </View>
      </View>

      {/* جست‌وجو + تب‌ها */}
      <View style={[card, { marginBottom: 8, padding: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderColor: colors.border }}>
          <Icon name="tips" size={13} color={colors.textMuted} />
          <TextInput
            style={{ flex: 1, fontSize: 11, color: colors.text, marginLeft: 8, marginRight: 8, padding: 0 }}
            placeholder={isFa ? 'اسم غذا رو جست‌وجو کنید.' : 'Search food...'}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 4, marginTop: 8 }}>
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: tab === t.key ? colors.surface : 'transparent', borderWidth: 1, borderColor: tab === t.key ? colors.border : 'transparent' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: tab === t.key ? colors.primary : colors.textSecondary }}>{isFa ? t.fa : t.en}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* آکاردئون کتگوری‌ها */}
      {groups.length === 0 && (
        <View style={[card, { alignItems: 'center', padding: 24 }]}>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>{isFa ? 'موردی یافت نشد' : 'No items found'}</Text>
        </View>
      )}
      {groups.map(([g, list]) => {
        const open = !!expanded[g];
        return (
          <View key={g} style={[card, { marginBottom: 6, padding: 0, overflow: 'hidden' }]}>
            <Pressable onPress={() => setExpanded((p) => ({ ...p, [g]: !p[g] }))} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 13 }}>
              <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: colors.text }}>{g}</Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, marginLeft: 8 }}>{n(list.length)}</Text>
              <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }], marginLeft: 6 }}>
                <Icon name="chevronForward" size={12} color={colors.textMuted} />
              </View>
            </Pressable>
            {open && (
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                {list.map((f) => (
                  <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Pressable onPress={() => toggleFav(f.id)} style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13 }}>{favs.includes(f.id) ? '⭐' : '☆'}</Text>
                    </Pressable>
                    <View style={{ flex: 1, marginLeft: 6, marginRight: 6 }}>
                      <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{f.nameFa}</Text>
                      <Text style={{ fontSize: 8, color: colors.textMuted }}>{f.unitFa} · {n(f.kcalPerUnit)} {isFa ? 'کالری' : 'kcal'}</Text>
                    </View>
                    <Pressable onPress={() => openEdit(f)} style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
                      <Icon name="settings" size={12} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      {/* فرمت اکسل */}
      <View style={[card, { marginTop: 8 }]}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text, marginBottom: 4 }}>{isFa ? 'فرمت استاندارد اکسل (برای واردسازی آینده)' : 'Standard Excel format (future import)'}</Text>
        <Text style={{ fontSize: 8, color: colors.textMuted }}>
          {isFa
            ? 'نام ماده غذایی | گروه | kcal_per_100g | Protein_g | Carb_g | Fat_g | Fiber_g | Sugar_g | واحد رایج | گرم در واحد'
            : 'Name | Group | kcal_per_100g | Protein_g | Carb_g | Fat_g | Fiber_g | Sugar_g | Common unit | Grams per unit'}
        </Text>
      </View>

      {/* مودال ویرایش */}
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable onPress={() => setEditing(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420, maxHeight: '85%', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 14 }}>
            {editing && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: '800', color: colors.text }}>{isFa ? 'ویرایش' : 'Edit'}: {editing.nameFa}</Text>
                  <Pressable onPress={() => setEditing(null)} style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>✕</Text>
                  </Pressable>
                </View>
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3 }}>{isFa ? 'نام' : 'Name'}</Text>
                  <TextInput style={[inp, { marginBottom: 8 }]} value={form.nameFa ?? ''} onChangeText={(t) => setForm((p) => ({ ...p, nameFa: t }))} />
                  <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3 }}>{isFa ? 'جابجایی به دسته' : 'Move to category'}</Text>
                  <TextInput style={[inp, { marginBottom: 8 }]} value={form.group ?? ''} onChangeText={(t) => setForm((p) => ({ ...p, group: t }))} />
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3 }}>{isFa ? 'واحد رایج' : 'Unit'}</Text>
                      <TextInput style={inp} value={form.unitFa ?? ''} onChangeText={(t) => setForm((p) => ({ ...p, unitFa: t }))} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3 }}>{isFa ? 'گرم در واحد' : 'g/unit'}</Text>
                      <TextInput style={inp} keyboardType="numeric" value={form.gramsPerUnit ?? ''} onChangeText={(t) => setForm((p) => ({ ...p, gramsPerUnit: t.replace(/[^\d.]/g, '') }))} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3 }}>kcal/100g</Text>
                      <TextInput style={inp} keyboardType="numeric" value={form.kcalPer100g ?? ''} onChangeText={(t) => setForm((p) => ({ ...p, kcalPer100g: t.replace(/[^\d.]/g, '') }))} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3 }}>P/100g</Text>
                      <TextInput style={inp} keyboardType="numeric" value={form.proteinPer100g ?? ''} onChangeText={(t) => setForm((p) => ({ ...p, proteinPer100g: t.replace(/[^\d.]/g, '') }))} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3 }}>C/100g</Text>
                      <TextInput style={inp} keyboardType="numeric" value={form.carbPer100g ?? ''} onChangeText={(t) => setForm((p) => ({ ...p, carbPer100g: t.replace(/[^\d.]/g, '') }))} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3 }}>F/100g</Text>
                      <TextInput style={inp} keyboardType="numeric" value={form.fatPer100g ?? ''} onChangeText={(t) => setForm((p) => ({ ...p, fatPer100g: t.replace(/[^\d.]/g, '') }))} />
                    </View>
                  </View>
                </ScrollView>
                <Pressable onPress={save} style={{ marginTop: 10, paddingVertical: 11, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{isFa ? 'ذخیره تغییرات' : 'Save changes'}</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}