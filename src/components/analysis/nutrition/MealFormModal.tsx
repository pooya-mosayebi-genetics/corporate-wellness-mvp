import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../store/ThemeContext';
import { useLanguage } from '../../../store/LanguageContext';
import { useFoods } from '../../../hooks/useFoods';
import { useWellness } from '../../../store/WellnessContext';
import { faNum } from '../../../utils/format';
import FixedOverlay from '../../ui/FixedOverlay';

const Z_RADIUS = { card: 14, inner: 12, control: 10, chip: 999 };
const Z_SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

const SLOT_ORDER = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3'];
const SLOT_LABELS: Record<string, { fa: string; en: string; emoji: string }> = {
  breakfast: { fa: 'صبحانه', en: 'Breakfast', emoji: '🌅' },
  snack1: { fa: 'میان‌وعده ۱', en: 'Snack 1', emoji: '🍎' },
  lunch: { fa: 'ناهار', en: 'Lunch', emoji: '🍽️' },
  snack2: { fa: 'میان‌وعده ۲', en: 'Snack 2', emoji: '🥜' },
  dinner: { fa: 'شام', en: 'Dinner', emoji: '🌙' },
  snack3: { fa: 'میان‌وعده ۳', en: 'Snack 3', emoji: '🌛' },
};

export default function MealFormModal({
  visible,
  onClose,
  nationalId,
  date,
}: {
  visible: boolean;
  onClose: () => void;
  nationalId: string | null;
  date: string;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: any) => faNum(v, isFa);

  const foodsHook = useFoods() as any;
  const wellness = useWellness() as any;

  // 🆕 State برای loading هنگام ذخیره
  const [saving, setSaving] = useState(false);

  // ✅ PATCH: سازگاری با خروجی useFoods
  const items: any[] = useMemo(() => {
    if (Array.isArray(foodsHook?.items)) return foodsHook.items;
    if (Array.isArray(foodsHook?.foods)) return foodsHook.foods;
    if (foodsHook?.byId && typeof foodsHook.byId === 'object') return Object.values(foodsHook.byId);
    return [];
  }, [foodsHook]);

  const [search, setSearch] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [qty, setQty] = useState('1');
  const [mealType, setMealType] = useState<string>('lunch');
  const [err, setErr] = useState('');

  // ✅ PATCH: async برای استفاده از await روی addMealFor
  const handleSave = async () => {
    setErr('');
    if (!selectedFood) {
      setErr(isFa ? 'لطفاً یک غذا انتخاب کنید' : 'Please select a food');
      return;
    }
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) {
      setErr(isFa ? 'مقدار باید بزرگتر از صفر باشد' : 'Quantity must be greater than 0');
      return;
    }
    if (!nationalId) {
      setErr(isFa ? 'شناسه کاربر مشخص نیست' : 'User ID not specified');
      return;
    }
    if (typeof wellness?.addMealFor !== 'function') {
      setErr(isFa ? 'تابع addMealFor در WellnessContext یافت نشد' : 'addMealFor not found in WellnessContext');
      return;
    }

    const unitKcal = selectedFood.kcalPer100g || 0;
    const unitP = selectedFood.proteinPer100g || 0;
    const unitC = selectedFood.carbPer100g || 0;
    const unitF = selectedFood.fatPer100g || 0;

    setSaving(true);
    try {
      // ✅ مهم: استفاده از addMealFor با nationalId (و await برای تکمیل ذخیره)
      await wellness.addMealFor(nationalId, {
        id: `meal-${Date.now()}`,
        date,
        type: mealType,
        time: new Date().toTimeString().slice(0, 5),
        name: isFa ? selectedFood.nameFa : selectedFood.nameEn || selectedFood.nameFa,
        items: [
          {
            id: `item-${Date.now()}`,
            foodId: selectedFood.id,
            nameFa: selectedFood.nameFa,
            qty: qtyNum,
            portionFa: selectedFood.unitFa || 'واحد',
            kcal: unitKcal,
            protein: unitP,
            carbs: unitC,
            fat: unitF,
          },
        ],
        calories: unitKcal * qtyNum,
        protein: unitP * qtyNum,
        carbs: unitC * qtyNum,
        fat: unitF * qtyNum,
      });

      // ✅ ریست فرم و بستن مودال بعد از ذخیره موفق
      setSelectedFoodId(null);
      setQty('1');
      setSearch('');
      onClose();
    } catch (e: any) {
      setErr(isFa ? `خطا در ثبت وعده: ${e?.message || 'نامشخص'}` : `Save failed: ${e?.message || 'Unknown'}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredFoods = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    const q = search.trim().toLowerCase();
    if (!q) return base.slice(0, 20);
    return base
      .filter(
        (f: any) =>
          (f?.nameFa || '').toLowerCase().includes(q) ||
          (f?.nameEn || '').toLowerCase().includes(q) ||
          (f?.group || '').toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [items, search]);

  const selectedFood = selectedFoodId ? items.find((f: any) => f.id === selectedFoodId) : null;

  if (!visible) return null;

  return (
    <FixedOverlay visible={visible} onClose={onClose}>
      <ScrollView style={{ maxHeight: '85%' }} showsVerticalScrollIndicator={false}>
        <View
          style={{
            width: '100%',
            maxWidth: 500,
            backgroundColor: colors.surface,
            borderRadius: Z_RADIUS.card,
            padding: Z_SPACE.lg,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* هدر */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Z_SPACE.md }}>
            <Text style={{ fontSize: 22 }}>🍽️</Text>
            <View style={{ flex: 1, marginHorizontal: Z_SPACE.sm }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                {isFa ? 'ثبت وعده جدید' : 'Add New Meal'}
              </Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
                {new Date(date + 'T00:00:00').toLocaleDateString(isFa ? 'fa-IR' : 'en-US')}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: Z_RADIUS.control,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>✕</Text>
            </Pressable>
          </View>

          {/* انتخاب نوع وعده */}
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, marginBottom: Z_SPACE.xs }}>
            {isFa ? 'نوع وعده' : 'Meal type'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Z_SPACE.md }}>
            <View style={{ flexDirection: 'row', gap: Z_SPACE.xs }}>
              {SLOT_ORDER.map((slot) => (
                <Pressable
                  key={slot}
                  onPress={() => setMealType(slot)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: Z_RADIUS.chip,
                    backgroundColor: mealType === slot ? colors.primary : colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: mealType === slot ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '700',
                      color: mealType === slot ? '#fff' : colors.textSecondary,
                    }}
                  >
                    {SLOT_LABELS[slot].emoji} {isFa ? SLOT_LABELS[slot].fa : SLOT_LABELS[slot].en}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* جستجوی غذا */}
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, marginBottom: Z_SPACE.xs }}>
            {isFa ? 'جستجوی غذا' : 'Search food'}
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.surfaceAlt,
              borderRadius: Z_RADIUS.control,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: Z_SPACE.sm,
              paddingVertical: 10,
              fontSize: 11,
              color: colors.text,
              marginBottom: Z_SPACE.sm,
            }}
            placeholder={isFa ? 'نام غذا...' : 'Food name...'}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />

          {/* لیست غذاها */}
          <ScrollView style={{ maxHeight: 200, marginBottom: Z_SPACE.md }}>
            {filteredFoods.length === 0 ? (
              <Text
                style={{
                  fontSize: 9,
                  color: colors.textMuted,
                  textAlign: 'center',
                  paddingVertical: Z_SPACE.md,
                }}
              >
                {isFa ? 'غذایی یافت نشد' : 'No foods found'}
              </Text>
            ) : (
              filteredFoods.map((f: any) => (
                <Pressable
                  key={f.id}
                  onPress={() => setSelectedFoodId(f.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: Z_SPACE.sm,
                    borderRadius: Z_RADIUS.inner,
                    backgroundColor: selectedFoodId === f.id ? colors.primary + '22' : colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: selectedFoodId === f.id ? colors.primary : colors.border,
                    marginBottom: Z_SPACE.xs,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>
                      {isFa ? f.nameFa : f.nameEn || f.nameFa}
                    </Text>
                    <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>
                      {f.group} · {n(f.kcalPer100g)} kcal/100g
                    </Text>
                  </View>
                  {selectedFoodId === f.id && (
                    <Text style={{ fontSize: 14, color: colors.primary }}>✓</Text>
                  )}
                </Pressable>
              ))
            )}
          </ScrollView>

          {/* مقدار */}
          {selectedFood && (
            <View style={{ marginBottom: Z_SPACE.md }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, marginBottom: Z_SPACE.xs }}>
                {isFa ? 'مقدار' : 'Quantity'} ({selectedFood.unitFa || 'واحد'})
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: Z_RADIUS.control,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: Z_SPACE.sm,
                  paddingVertical: 10,
                  fontSize: 11,
                  color: colors.text,
                }}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={colors.textMuted}
                value={qty}
                onChangeText={setQty}
              />
              <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: Z_SPACE.xs }}>
                {isFa ? 'کالری تقریبی' : 'Estimated calories'}:{' '}
                {n(Math.round((selectedFood.kcalPer100g || 0) * Number(qty || 0)))} kcal
              </Text>
            </View>
          )}

          {/* خطا */}
          {err !== '' && (
            <View
              style={{
                backgroundColor: colors.danger + '22',
                borderRadius: Z_RADIUS.inner,
                padding: Z_SPACE.sm,
                marginBottom: Z_SPACE.md,
              }}
            >
              <Text style={{ fontSize: 9, color: colors.danger, fontWeight: '700' }}>{err}</Text>
            </View>
          )}

          {/* دکمه‌ها */}
          <View style={{ flexDirection: 'row', gap: Z_SPACE.sm }}>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={{
                flex: 1,
                backgroundColor: colors.surfaceAlt,
                borderRadius: Z_RADIUS.control,
                paddingVertical: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary }}>
                {isFa ? 'انصراف' : 'Cancel'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                backgroundColor: colors.primary,
                borderRadius: Z_RADIUS.control,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>
                  {isFa ? 'ذخیره' : 'Save'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </FixedOverlay>
  );
}