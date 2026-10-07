import { useMemo, useState } from 'react';
import { 
  Text, View, ScrollView, TextInput, Pressable, 
  KeyboardAvoidingView, Platform, useWindowDimensions 
} from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { useFoods } from '../src/hooks/useFoods';
import { useFoodPrefs } from '../src/hooks/useFoodPrefs';
import Icon from '../src/components/ui/Icon';
import TimePickerModal from '../src/components/ui/TimePickerModal';
import MealReviewSheet from '../src/components/meals/MealReviewSheet';
import { faNum } from '../src/utils/format';
import { mealSlotOrder, mealSlotLabelsFa, mealSlotLabelsEn } from '../src/types/nutrition';
import type { MealSlot, Meal, MealItem } from '../src/types/nutrition';
import type { FoodEntry } from '../src/data/foodTypes';
import { router, useLocalSearchParams } from 'expo-router';

const SLOT_EMOJI: Record<MealSlot, string> = {
  breakfast: '🌅', snack1: '🍎', lunch: '🍽️', snack2: '🥜', dinner: '🌙', snack3: '🌛',
};
const SLOT_TIMES: Record<MealSlot, string[]> = {
  breakfast: ['06:00', '07:00', '08:00', '09:00'],
  snack1: ['10:00', '11:00'],
  lunch: ['12:00', '13:00', '14:00'],
  snack2: ['16:00', '17:00'],
  dinner: ['19:00', '20:00', '21:00'],
  snack3: ['22:00', '23:00'],
};
const GREEN = '#10B981', YELLOW = '#EAB308', RED = '#EF4444';
const nowStr = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
let itemSeq = 0;
const nextItemId = () => `item-${Date.now()}-${++itemSeq}`;

type FoodTab = 'all' | 'favs' | 'freq' | 'custom';

export default function LogMealScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { state, addMeal, updateMeal } = useWellness();
  const { foods, byId } = useFoods();
  const { favs, toggleFav, isFav } = useFoodPrefs();
  
  // 🆕 Responsive Detection
  const { width } = useWindowDimensions();
  const isMobile = width < 900;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState<FoodTab>('all');
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const editing = params.id ? state.meals.find((m) => m.id === params.id) : undefined;
  const [slot, setSlot] = useState<MealSlot>(editing?.type ?? 'lunch');
  const [time, setTime] = useState(editing?.time ?? nowStr());
  const [items, setItems] = useState<MealItem[]>(editing?.items ?? []);
  const [error, setError] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  /** پرتکرارترین‌ها */
  const freqIds = useMemo(() => {
    const c: Record<string, number> = {};
    state.meals.forEach((m) => m.items?.forEach((it) => { c[it.foodId] = (c[it.foodId] || 0) + it.qty; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }, [state.meals]);

  const q = query.trim().toLowerCase();
  const matchQ = (f: FoodEntry) => (q ? f.nameFa.toLowerCase().includes(q) : true);

  /** گروه‌ها با تعداد (برای آکاردئون تب همه) */
  const groupsWithCount = useMemo(() => {
    const m = new Map<string, FoodEntry[]>();
    foods.forEach((f) => { const a = m.get(f.group) || []; a.push(f); m.set(f.group, a); });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fa'));
  }, [foods]);

  const favList = useMemo(() => foods.filter((f) => favs.includes(f.id) && matchQ(f)), [foods, favs, q]);
  const freqList = useMemo(() => freqIds.map((id) => byId[id]).filter((f) => f && matchQ(f)), [freqIds, byId, q]);
  const customList = useMemo(() => foods.filter((f) => f.kind === 'custom' && matchQ(f)), [foods, q]);

  const totals = items.reduce(
    (a, it) => ({ kcal: a.kcal + it.kcal * it.qty, protein: a.protein + it.protein * it.qty, carbs: a.carbs + it.carbs * it.qty, fat: a.fat + it.fat * it.qty }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const addFood = (food: FoodEntry) => {
    setError(null);
    setItems((prev) => {
      const ex = prev.find((it) => it.foodId === food.id);
      if (ex) return prev.map((it) => (it.foodId === food.id ? { ...it, qty: it.qty + 1 } : it));
      return [...prev, {
        id: nextItemId(), foodId: food.id,
        nameFa: food.nameFa, nameEn: food.nameFa,
        portionFa: food.unitFa, portionEn: food.unitFa,
        qty: 1,
        kcal: food.kcalPerUnit, protein: food.proteinPerUnit, carbs: food.carbPerUnit, fat: food.fatPerUnit,
      }];
    });
  };
  const setQty = (id: string, qty: number) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, qty } : it)).filter((it) => it.qty > 0));
  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  /** ✅ ثبت وعده */
  const handleSave = () => {
    if (items.length === 0) { setError(isFa ? 'حداقل یک قلم غذایی اضافه کنید' : 'Add at least one food'); return; }
    if (!/^\d{1,2}:\d{2}$/.test(time)) { setError(isFa ? 'ساعت را به شکل HH:MM وارد کنید' : 'Time must be HH:MM'); return; }
    const meal: Meal = {
      id: editing?.id ?? `meal-${Date.now()}`,
      type: slot,
      date: editing?.date ?? new Date().toISOString().slice(0, 10),
      time,
      name: items.map((it) => it.nameFa).join('، ').slice(0, 48),
      calories: Math.round(totals.kcal),
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      items,
      loggedAt: editing?.loggedAt ?? new Date().toISOString(),
    };
    if (editing) updateMeal(meal); else addMeal(meal);
    setSheetOpen(false);
    setItems([]);
    setError(null);
    showToast(isFa ? '✓ وعده ثبت شد؛ می‌توانید وعدهٔ بعدی را ثبت کنید' : '✓ Meal saved; you can log another');
  };

  // 🆕 Dynamic Styles based on device
  const card = { 
    backgroundColor: colors.surface, 
    borderWidth: 1, 
    borderColor: colors.cardBorder, 
    borderRadius: isMobile ? 12 : 14, 
    padding: isMobile ? 10 : 12,
    marginBottom: isMobile ? 8 : 10
  };
  
  const inp = { 
    backgroundColor: colors.surfaceAlt, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: colors.border, 
    paddingHorizontal: 10, 
    paddingVertical: isMobile ? 10 : 8, // Taller input for mobile touch
    fontSize: isMobile ? 14 : 12,       // Larger font for readability
    color: colors.text,
    outlineStyle: 'none' as any,
  };

  /** ردیف غذا: ستاره + نام + واحد/کالری + افزودن */
  const FoodRow = ({ f }: { f: FoodEntry }) => (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingVertical: isMobile ? 10 : 6, // More vertical space on mobile
      borderBottomWidth: 1, 
      borderBottomColor: colors.border 
    }}>
      <Pressable onPress={() => toggleFav(f.id)} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: isMobile ? 16 : 13 }}>{isFav(f.id) ? '⭐' : '☆'}</Text>
      </Pressable>
      
      <Pressable onPress={() => addFood(f)} style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: 4 }}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: isMobile ? 13 : 11, fontWeight: '700', color: colors.text }}>{f.nameFa}</Text>
          <Text numberOfLines={1} style={{ fontSize: isMobile ? 10 : 8, color: colors.textMuted, marginTop: 2 }}>
            {f.group} · {f.unitFa} · {n(f.kcalPerUnit)} kcal
          </Text>
        </View>
      </Pressable>
      
      {/* Bigger Add Button for Mobile */}
      <Pressable 
        onPress={() => addFood(f)} 
        style={{ 
          width: isMobile ? 32 : 26, 
          height: isMobile ? 32 : 26, 
          borderRadius: isMobile ? 10 : 8, 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: colors.primary,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2
        }}
      >
        <Text style={{ fontSize: isMobile ? 14 : 11, fontWeight: '700', color: '#FFFFFF' }}>+</Text>
      </Pressable>
    </View>
  );

  const TABS: { key: FoodTab; fa: string; en: string }[] = [
    { key: 'all', fa: 'همه', en: 'All' },
    { key: 'favs', fa: 'منتخب', en: 'Fav' },
    { key: 'freq', fa: 'پرتکرار', en: 'Freq' },
    { key: 'custom', fa: 'شخصی', en: 'Custom' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* هدر */}
      <View style={{ 
        backgroundColor: colors.surface, 
        borderBottomWidth: 1, 
        borderBottomColor: colors.cardBorder, 
        paddingHorizontal: isMobile ? 12 : 10, 
        paddingVertical: isMobile ? 12 : 8, 
        flexDirection: 'row', 
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 12 : undefined // Status bar fix
      }}>
        <Pressable onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 14, color: colors.text }}>←</Text>
        </Pressable>
        <Text style={{ flex: 1, fontSize: isMobile ? 16 : 14, fontWeight: '800', color: colors.text, marginLeft: 10, marginRight: 10 }}>
          {editing ? (isFa ? 'ویرایش وعده' : 'Edit Meal') : isFa ? 'ثبت وعده غذایی' : 'Log Meal'}
        </Text>
        <Pressable onPress={() => setTime(nowStr())} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primarySoft }}>
          <Icon name="trend" size={12} color={colors.primary} />
          <Text style={{ fontSize: isMobile ? 11 : 10, fontWeight: '700', color: colors.primary }}>{n(time)}</Text>
        </Pressable>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          padding: isMobile ? 12 : 10, 
          paddingBottom: isMobile ? 100 : 16, // Extra space for sticky footer
          gap: isMobile ? 10 : 8 
        }}
        keyboardShouldPersistTaps="handled" // Prevents closing keyboard when tapping scroll area
      >
        {/* کارت وعده + ساعت‌ها + زمان دلخواه */}
        <View style={[card, { overflow: 'visible' }]}>
          
          {/* Container for Horizontal Scroll with Edge Fades */}
          <View style={{ position: 'relative', width: '100%' }}>
            
            {/* Left Fade Gradient (Visual Cue) */}
            {isMobile && (
              <View pointerEvents="none" style={{ 
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, zIndex: 10,
                backgroundColor: colors.surface, // Match card bg to hide content behind fade
                opacity: 0.95,
                shadowColor: '#000', shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.1, shadowRadius: 4,
                elevation: 2
              }} />
            )}

            {/* Right Fade Gradient (Visual Cue) */}
            {isMobile && (
              <View pointerEvents="none" style={{ 
                position: 'absolute', right: 0, top: 0, bottom: 0, width: 20, zIndex: 10,
                backgroundColor: colors.surface,
                opacity: 0.95,
                shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.1, shadowRadius: 4,
                elevation: 2
              }} />
            )}

            {/* Actual Scroll View */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true} // ✅ FORCE SHOW SCROLLBAR FOR CLARITY
              indicatorStyle={Platform.OS === 'ios' ? 'black' : undefined}
              snapToInterval={isMobile ? 80 : 60} // Snap effect for better feel
              decelerationRate="fast"
              contentContainerStyle={{ 
                paddingRight: isMobile ? 20 : 10, // Space for last item not touching edge
                paddingLeft: isMobile ? 20 : 10,
                gap: 8,
                alignItems: 'center'
              }}
            >
              {mealSlotOrder.map((s) => (
                <Pressable 
                  key={s} 
                  onPress={() => setSlot(s)} 
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    gap: 6, 
                    paddingHorizontal: isMobile ? 16 : 12, 
                    paddingVertical: isMobile ? 12 : 8, // Taller touch target
                    borderRadius: 999, 
                    backgroundColor: slot === s ? colors.primary : colors.surfaceAlt, 
                    borderWidth: 1, 
                    borderColor: slot === s ? colors.primary : colors.border,
                    minWidth: isMobile ? 90 : 70, // Ensure consistent width
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{ fontSize: isMobile ? 16 : 14 }}>{SLOT_EMOJI[s]}</Text>
                  <Text style={{ fontSize: isMobile ? 13 : 11, fontWeight: '700', color: slot === s ? '#FFFFFF' : colors.textSecondary }}>
                    {isFa ? mealSlotLabelsFa[s] : mealSlotLabelsEn[s]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          
          {/* Time Chips Section - Same treatment */}
          <View style={{ marginTop: 10, position: 'relative' }}>
             <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ gap: 6, paddingRight: 10 }}
            >
              {SLOT_TIMES[slot].map((t) => (
                <Pressable 
                  key={t} 
                  onPress={() => setTime(t)} 
                  style={{ 
                    paddingHorizontal: isMobile ? 14 : 10, 
                    paddingVertical: isMobile ? 10 : 6, 
                    borderRadius: 999, 
                    backgroundColor: time === t ? colors.accent : colors.surfaceAlt, 
                    borderWidth: 1, 
                    borderColor: time === t ? colors.accent : colors.border,
                    minWidth: isMobile ? 60 : 50,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: isMobile ? 12 : 10, fontWeight: '700', color: time === t ? '#FFFFFF' : colors.textSecondary }}>{n(t)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Custom Time Button */}
          <Pressable 
            onPress={() => setPickerOpen(true)} 
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginTop: 12, 
              backgroundColor: colors.surfaceAlt, 
              borderRadius: 12, 
              padding: isMobile ? 14 : 10, 
              borderWidth: 1, 
              borderColor: colors.border 
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="trend" size={isMobile ? 18 : 14} color={colors.primary} />
              <Text style={{ fontSize: isMobile ? 13 : 11, fontWeight: '700', color: colors.textSecondary }}>{isFa ? 'زمان دلخواه' : 'Custom time'}</Text>
            </View>
            <Text style={{ fontSize: isMobile ? 18 : 14, fontWeight: '800', color: colors.primary }}>{n(time)}</Text>
          </Pressable>
        </View>

        {/* کارت مرور غذا: جستجو + تب‌ها + آکاردئون/لیست */}
        <View style={[card, {}]}>
          <TextInput 
            style={[inp, { marginBottom: 8 }]} 
            placeholder={isFa ? 'جستجوی غذا...' : 'Search food...'} 
            placeholderTextColor={colors.textMuted} 
            value={query} 
            onChangeText={setQuery}
            keyboardType="default" // Standard keyboard for text search
            autoCorrect={false}
            onSubmitEditing={() => {}} // No action needed, live filter works
          />

          {/* تب‌ها */}
          <View style={{ 
            flexDirection: 'row', 
            backgroundColor: colors.surfaceAlt, 
            borderRadius: 10, 
            padding: 3, 
            marginBottom: 10,
            gap: 2
          }}>
            {TABS.map((t) => (
              <Pressable 
                key={t.key} 
                onPress={() => setTab(t.key)} 
                style={{ 
                  flex: 1, 
                  paddingVertical: isMobile ? 10 : 7, // Taller tabs
                  borderRadius: 8, 
                  alignItems: 'center', 
                  backgroundColor: tab === t.key ? colors.surface : 'transparent', 
                  borderWidth: 1, 
                  borderColor: tab === t.key ? colors.border : 'transparent' 
                }}
              >
                <Text style={{ fontSize: isMobile ? 11 : 10, fontWeight: '700', color: tab === t.key ? colors.primary : colors.textSecondary }}>
                  {isFa ? t.fa : t.en}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* محتوای تب */}
          {tab === 'all' ? (
            /* ✅ آکاردئون دسته‌ها */
            <View>
              {groupsWithCount.map(([g, list]) => {
                const filteredList = list.filter(matchQ);
                if (q && filteredList.length === 0) return null;
                const open = !!openCats[g];
                return (
                  <View key={g} style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Pressable 
                      onPress={() => setOpenCats((p) => ({ ...p, [g]: !p[g] }))} 
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        paddingVertical: isMobile ? 12 : 9, // Easier tap target
                        minHeight: 44 
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: isMobile ? 13 : 11, fontWeight: '700', color: colors.text }}>{g}</Text>
                      <Text style={{ fontSize: isMobile ? 11 : 9, color: colors.textMuted, marginLeft: 6 }}>{n(filteredList.length)}</Text>
                      <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }], marginLeft: 6 }}>
                        <Icon name="chevronForward" size={isMobile ? 14 : 12} color={colors.textMuted} />
                      </View>
                    </Pressable>
                    {open && (
                      <View style={{ paddingBottom: 6 }}>
                        {filteredList.map((f) => <FoodRow key={f.id} f={f} />)}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            /* ✅ لیست تخت برای منتخب/پرتکرار/شخصی */
            <View>
              {(tab === 'favs' ? favList : tab === 'freq' ? freqList : customList).map((f) => <FoodRow key={f.id} f={f} />)}
              {(tab === 'favs' ? favList : tab === 'freq' ? freqList : customList).length === 0 && (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{isFa ? 'موردی نیست' : 'Empty'}</Text>
                </View>
              )}
            </View>
          )}

          {/* دکمهٔ مشاهدهٔ وعده (Optional inside form) */}
          {items.length > 0 && (
             <Pressable 
               onPress={() => setSheetOpen(true)} 
               style={{ 
                 flexDirection: 'row', 
                 alignItems: 'center', 
                 justifyContent: 'center', 
                 gap: 6, 
                 marginTop: 10, 
                 backgroundColor: colors.surfaceAlt, 
                 borderRadius: 10, 
                 paddingVertical: 10, 
                 borderWidth: 1, 
                 borderColor: colors.border 
               }}
             >
               <Icon name="eye" size={14} color={colors.textSecondary} />
               <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                 {isFa ? `مشاهده جزئیات (${n(items.length)})` : `View Details (${items.length})`}
               </Text>
             </Pressable>
          )}
        </View>

        {error && (
          <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 8, padding: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.danger }}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* 🆕 Sticky Bottom Bar (Always Visible) */}
      <View style={{ 
        backgroundColor: colors.surface, 
        borderTopWidth: 1, 
        borderTopColor: colors.cardBorder, 
        paddingHorizontal: isMobile ? 16 : 10, 
        paddingVertical: isMobile ? 12 : 10, 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5
      }}>
        <Pressable 
          onPress={() => setSheetOpen(true)} 
          style={{ 
            flex: 1, 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: colors.surfaceAlt, 
            borderRadius: 12, 
            padding: 10, 
            borderWidth: 1, 
            borderColor: colors.border 
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{ fontSize: isMobile ? 20 : 18, fontWeight: '800', color: colors.text }}>{n(Math.round(totals.kcal))}</Text>
              <Text style={{ fontSize: isMobile ? 10 : 9, color: colors.textMuted }}>kcal</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
              <Text style={{ fontSize: isMobile ? 10 : 9, fontWeight: '700', color: GREEN }}>P:{n(Math.round(totals.protein))}g</Text>
              <Text style={{ fontSize: isMobile ? 10 : 9, fontWeight: '700', color: YELLOW }}>C:{n(Math.round(totals.carbs))}g</Text>
              <Text style={{ fontSize: isMobile ? 10 : 9, fontWeight: '700', color: RED }}>F:{n(Math.round(totals.fat))}g</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: isMobile ? 10 : 9, fontWeight: '700', color: colors.primary }}>{isFa ? 'ویرایش' : 'Edit'}</Text>
            <Text style={{ fontSize: isMobile ? 9 : 8, color: colors.textMuted, marginTop: 2 }}>{n(items.length)} {isFa ? 'قلم' : 'items'}</Text>
          </View>
          <Icon name="chevronForward" size={14} color={colors.textMuted} />
        </Pressable>
        
        {/* Primary Action Button */}
        <Pressable 
          onPress={handleSave} 
          disabled={items.length === 0} 
          style={{ 
            paddingHorizontal: isMobile ? 20 : 16, 
            paddingVertical: isMobile ? 16 : 14, // Big touch target
            borderRadius: 12, 
            backgroundColor: items.length ? colors.primary : colors.border,
            minWidth: isMobile ? 60 : 50,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon name="check" size={isMobile ? 20 : 16} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* toast موفقیت */}
      {toast && (
        <View style={{ 
          position: 'absolute', 
          bottom: isMobile ? 100 : 90, 
          alignSelf: 'center', 
          paddingHorizontal: 20, 
          paddingVertical: 12, 
          borderRadius: 999, 
          backgroundColor: colors.success,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 5
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{toast}</Text>
        </View>
      )}

      <MealReviewSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        items={items}
        byId={byId}
        onQty={setQty}
        onRemove={removeItem}
        onClear={() => setItems([])}
        onConfirm={handleSave}
        time={time}
        onTime={() => { setSheetOpen(false); setPickerOpen(true); }}
        slotLabel={isFa ? mealSlotLabelsFa[slot] : mealSlotLabelsEn[slot]}
        slotEmoji={SLOT_EMOJI[slot]}
        targets={state.targets}
      />

      <TimePickerModal visible={pickerOpen} initial={time} onConfirm={(v) => setTime(v)} onClose={() => setPickerOpen(false)} />
    </KeyboardAvoidingView>
  );
}