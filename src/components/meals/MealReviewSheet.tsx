import { useState } from 'react';
import { Text, View, Modal, Pressable, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { faNum } from '../../utils/format';
import Icon from '../ui/Icon';
import type { MealItem } from '../../types/nutrition';
import type { FoodEntry } from '../../data/foodTypes';

const GREEN = '#10B981', YELLOW = '#EAB308', RED = '#EF4444';
/** ✅ فونت یکسان با بقیهٔ اپ */
const FONT = 'Vazirmatn, Vazir, Tahoma, sans-serif';
/** ✅ متن تراز‌شده کنار آیکون */
const tx = (size: number, color: string, weight?: string) => ({
  fontSize: size,
  color,
  fontWeight: (weight ?? '400') as any,
  fontFamily: FONT,
  includeFontPadding: false,
  textAlignVertical: 'center' as const,
});

interface Props {
  visible: boolean;
  onClose: () => void;
  items: MealItem[];
  byId: Record<string, FoodEntry>;
  onQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onConfirm: () => void;
  time: string;
  onTime: () => void;
  slotLabel: string;
  slotEmoji: string;
  targets: any | null;
}

export default function MealReviewSheet({ visible, onClose, items, byId, onQty, onRemove, onClear, onConfirm, time, onTime, slotLabel, slotEmoji, targets }: Props) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { width: winW } = useWindowDimensions();
  const isWide = winW >= 720;
  const [openId, setOpenId] = useState<string | null>(null);

  const totals = items.reduce((a, it) => ({ kcal: a.kcal + it.kcal * it.qty, protein: a.protein + it.protein * it.qty, carbs: a.carbs + it.carbs * it.qty, fat: a.fat + it.fat * it.qty }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const remaining = targets ? targets.calories - totals.kcal : null;

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };

  const Row = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text style={tx(8, colors.textMuted)}>{label}</Text>
      <Text style={tx(8, tone ?? colors.text, '700')}>{value}</Text>
    </View>
  );

  const Bar = ({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) => {
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    return (
      <View style={{ marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={tx(8, colors.textMuted)}>{label}</Text>
          <Text style={tx(8, tone, '700')}>{n(Math.round(value * 10) / 10)} / {n(max)}</Text>
        </View>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
          <View style={{ height: 5, borderRadius: 3, width: `${pct * 100}%`, backgroundColor: tone }} />
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 12, maxHeight: '88%', fontFamily: FONT }}>
          {/* هدر */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: FONT, includeFontPadding: false, textAlign: 'center', textAlignVertical: 'center' }}>{slotEmoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={tx(13, colors.text, '800')}>{isFa ? 'بررسی وعده' : 'Meal Review'} · {slotLabel}</Text>
              <Text style={[tx(8, colors.textMuted), { marginTop: 1 }]}>{isFa ? 'مشاهدهٔ دیتیل، ویرایش و حذف هر قلم' : 'View, edit or remove items'}</Text>
            </View>
            <Pressable onPress={onTime} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primarySoft, marginRight: 6 }}>
              <Icon name="trend" size={11} color={colors.primary} />
              <Text style={tx(10, colors.primary, '700')}>{n(time)}</Text>
            </Pressable>
            <Pressable onPress={onClose} style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
              <Text style={tx(12, colors.textSecondary)}>✕</Text>
            </Pressable>
          </View>

          {/* دو کارت نصف‌صفحه */}
          <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 8 }}>
            {/* کارت اقلام */}
            <View style={[card, { flex: 1 }]}>
              <View style={{ marginBottom: 8 }}>
                <Text style={tx(12, colors.text, '800')}>{isFa ? `اقلام وعده (${n(items.length)})` : `Items (${items.length})`}</Text>
                <Text style={[tx(8, colors.textMuted), { marginTop: 1 }]}>{isFa ? 'برای دیتیل ضربه بزن' : 'Tap for details'}</Text>
              </View>
              <ScrollView style={{ maxHeight: isWide ? 260 : 220 }} showsVerticalScrollIndicator={false}>
                {items.length === 0 ? (
                  <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 16, alignItems: 'center' }}>
                    <Icon name="meal" size={16} color={colors.textMuted} />
                    <Text style={[tx(9, colors.textMuted), { marginTop: 4 }]}>{isFa ? 'وعده خالی است' : 'Meal is empty'}</Text>
                  </View>
                ) : (
                  items.map((it) => {
                    const share = totals.kcal > 0 ? Math.round(((it.kcal * it.qty) / totals.kcal) * 100) : 0;
                    const open = openId === it.id;
                    const food = byId[it.foodId];
                    return (
                      <View key={it.id} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 8, marginBottom: 6 }}>
                        {/* ردیف اصلی: آیکون + نام + بج — همه تراز مرکز */}
                        <Pressable onPress={() => setOpenId(open ? null : it.id)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 7 }}>
                            <Icon name="meal" size={12} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={tx(10, colors.text, '700')}>{it.nameFa}</Text>
                            <Text style={[tx(8, colors.textMuted), { marginTop: 1 }]}>{n(it.qty)} × {it.portionFa} · {n(Math.round(it.kcal * it.qty))} kcal</Text>
                          </View>
                          <View style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.primary + '18' }}>
                            <Text style={tx(8, colors.primary, '700')}>{n(share)}٪</Text>
                          </View>
                          <View style={{ marginLeft: 6 }}>
                            <Icon name="chevronForward" size={11} color={colors.textMuted} />
                          </View>
                        </Pressable>

                        {/* کنترل تعداد + حذف */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Pressable onPress={() => onQty(it.id, Math.max(it.qty - 1, 0))} style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                              <Text style={tx(10, colors.textSecondary)}>-</Text>
                            </Pressable>
                            <TextInput
                              style={{ width: 34, textAlign: 'center', fontSize: 10, fontWeight: '800', color: colors.text, backgroundColor: colors.surface, borderRadius: 7, borderWidth: 1, borderColor: colors.border, paddingVertical: 3, fontFamily: FONT, includeFontPadding: false }}
                              keyboardType="numeric"
                              value={String(it.qty)}
                              onChangeText={(t) => { const v = parseInt(t.replace(/\D/g, ''), 10); onQty(it.id, isNaN(v) ? 0 : v); }}
                            />
                            <Pressable onPress={() => onQty(it.id, it.qty + 1)} style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
                              <Text style={tx(10, '#FFFFFF', '700')}>+</Text>
                            </Pressable>
                          </View>
                          <Pressable onPress={() => onRemove(it.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.dangerSoft }}>
                            <Icon name="trash" size={10} color={colors.danger} />
                            <Text style={tx(8, colors.danger, '700')}>{isFa ? 'حذف' : 'Remove'}</Text>
                          </Pressable>
                        </View>

                        {/* دیتیل */}
                        {open && (
                          <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }}>
                            <Row label={isFa ? 'کالری هر واحد' : 'kcal / unit'} value={`${n(it.kcal)} kcal`} />
                            <Row label={isFa ? 'ماکرو هر واحد' : 'Macros / unit'} value={`P ${n(it.protein)} · C ${n(it.carbs)} · F ${n(it.fat)}`} />
                            <Row label={isFa ? 'گرم هر واحد' : 'grams / unit'} value={food ? `${n(food.gramsPerUnit)} g` : '—'} />
                            <Row label={isFa ? 'کالری هر ۱۰ گرم' : 'kcal / 100g'} value={food ? `${n(food.kcalPer100g)}` : '—'} />
                            <Row label={isFa ? 'مجموع کالری این قلم' : 'Item total'} value={`${n(Math.round(it.kcal * it.qty))} kcal`} tone={colors.primary} />
                            <Row label={isFa ? 'سهم از وعده' : 'Share of meal'} value={`${n(share)}٪`} tone={colors.primary} />
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>

            {/* کارت مجموع */}
            <View style={[card, { flex: 1 }]}>
              <Text style={tx(12, colors.text, '800')}>{isFa ? 'مجموع وعده' : 'Meal Total'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6, marginBottom: 6 }}>
                <Text style={tx(9, colors.textMuted)}>{isFa ? 'کالری' : 'Calories'}</Text>
                <Text style={tx(18, colors.text, '800')}>{n(Math.round(totals.kcal))} <Text style={tx(9, colors.textMuted)}>kcal</Text></Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={tx(9, GREEN, '700')}>Pro {n(Math.round(totals.protein * 10) / 10)}g</Text>
                <Text style={tx(9, YELLOW, '700')}>Carb {n(Math.round(totals.carbs * 10) / 10)}g</Text>
                <Text style={tx(9, RED, '700')}>Fat {n(Math.round(totals.fat * 10) / 10)}g</Text>
              </View>
              {targets && (
                <>
                  <Bar label={isFa ? 'کالری روز' : 'Daily kcal'} value={totals.kcal} max={targets.calories} tone={colors.chart[0]} />
                  <Bar label={isFa ? 'پروتئین روز' : 'Daily protein'} value={totals.protein} max={targets.macros.proteinGrams} tone={GREEN} />
                  <Bar label={isFa ? 'کربوهیدرات روز' : 'Daily carbs'} value={totals.carbs} max={targets.macros.carbGrams} tone={YELLOW} />
                  <Bar label={isFa ? 'چربی روز' : 'Daily fat'} value={totals.fat} max={targets.macros.fatGrams} tone={RED} />
                  {remaining !== null && (
                    <Text style={[tx(9, remaining >= 0 ? colors.success : colors.danger, '700'), { marginTop: 2 }]}>
                      {remaining >= 0
                        ? (isFa ? `${n(Math.round(remaining))} کالری تا سقف روز باقی می‌ماند` : `${Math.round(remaining)} kcal left today`)
                        : (isFa ? `${n(Math.round(-remaining))} کالری بیش از سقف روز` : `${Math.round(-remaining)} kcal over limit`)}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>

          {/* دکمه‌ها */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <Pressable onPress={onClear} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.danger + '55', backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={tx(11, colors.danger, '700')}>{isFa ? 'حذف همه' : 'Clear all'}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} disabled={items.length === 0} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: items.length ? colors.primary : colors.border }}>
              <Icon name="check" size={13} color="#FFFFFF" />
              <Text style={tx(11, '#FFFFFF', '800')}>{isFa ? 'ثبت نهایی وعده' : 'Confirm meal'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}