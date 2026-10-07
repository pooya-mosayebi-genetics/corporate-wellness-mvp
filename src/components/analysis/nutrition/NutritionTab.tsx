import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../../store/ThemeContext';
import { useLanguage } from '../../../store/LanguageContext';
import { useAuth } from '../../../store/AuthContext';
import { usePersonalOf } from '../../../store/WellnessContext';
import { useFoods } from '../../../hooks/useFoods';
import { useFoodPrefs } from '../../../hooks/useFoodPrefs';
import { usePermissions } from '../../../hooks/usePermissions';
import { faNum } from '../../../utils/format';
import FixedOverlay from '../../ui/FixedOverlay';
import MealFormModal from './MealFormModal';

const Z_RADIUS = { card: 14, inner: 12, control: 10, chip: 999 };
const Z_SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

const SLOT_EMOJI: Record<string, string> = {
  breakfast: '🌅', snack1: '🍎', lunch: '🍽️', snack2: '🥜', dinner: '🌙', snack3: '🌛',
};
const SLOT_ORDER = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3'];

type Period = 'day' | 'week' | 'month';

/* ── هلپرهای تاریخ (local-safe) ── */
const fmtKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shiftDay = (key: string, delta: number) => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return fmtKey(dt);
};
const TODAY = fmtKey(new Date());

interface DayAgg { kcal: number; protein: number; carbs: number; fat: number; count: number; water: number; }
const zeroAgg = (): DayAgg => ({ kcal: 0, protein: 0, carbs: 0, fat: 0, count: 0, water: 0 });

export default function NutritionTab({ nationalId }: { nationalId?: string }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: any) => faNum(v, isFa);
  const { session } = useAuth();

  // 🆕 Permission جدید برای تشخیص امکان ویرایش
  const { can, isSelf } = usePermissions();

  const targetId = nationalId ?? session?.nationalId ?? null;
  const { personal, loaded } = usePersonalOf(targetId);
  const { byId } = useFoods();
  const { isFav } = useFoodPrefs();

  // 🆕 تشخیص اینکه کاربر می‌تواند وعده‌ها را ویرایش کند یا نه
  // اگر خود کاربر است: meal.self.edit، وگرنه meal.others.log
  const canEdit = targetId
    ? isSelf(targetId)
      ? can('meal.self.edit')
      : can('meal.others.log')
    : false;

  const [period, setPeriod] = useState<Period>('day');
  const [anchor, setAnchor] = useState<string>(TODAY);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [showAddMeal, setShowAddMeal] = useState(false);

  const targets = personal.targets;
  const targetKcal = targets?.calories || 2000;
  const targetProtein = targets?.macros?.proteinGrams || 0;
  const targetCarbs = targets?.macros?.carbGrams || 0;
  const targetFat = targets?.macros?.fatGrams || 0;
  const targetWater = 2500;

  /* ── ساخت بازهٔ روزها ── */
  const days = useMemo(() => {
    const len = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const out: string[] = [];
    for (let i = len - 1; i >= 0; i--) out.push(shiftDay(anchor, -i));
    return out;
  }, [period, anchor]);
  const daysSet = useMemo(() => new Set(days), [days]);

  /* ── تجمیع دقیق به‌تفکیک روز ── */
  const { byDay, rangeTotal, loggedDays } = useMemo(() => {
    const map = new Map<string, DayAgg>();
    days.forEach((d) => map.set(d, zeroAgg()));
    (personal.meals || []).forEach((m) => {
      const a = map.get(m.date);
      if (!a) return;
      a.kcal += m.calories || 0;
      a.protein += m.protein || 0;
      a.carbs += m.carbs || 0;
      a.fat += m.fat || 0;
      a.count += 1;
    });
    (personal.waterEntries || []).forEach((w) => {
      const d = w.loggedAt ? fmtKey(new Date(w.loggedAt)) : null;
      if (!d) return;
      const a = map.get(d);
      if (a) a.water += w.ml || 0;
    });
    const total = zeroAgg();
    let logged = 0;
    map.forEach((a) => {
      total.kcal += a.kcal; total.protein += a.protein; total.carbs += a.carbs; total.fat += a.fat;
      total.count += a.count; total.water += a.water;
      if (a.count > 0) logged++;
    });
    return { byDay: map, rangeTotal: total, loggedDays: logged };
  }, [personal.meals, personal.waterEntries, days]);

  const dayCount = days.length;
  const avg = {
    kcal: rangeTotal.kcal / dayCount,
    protein: rangeTotal.protein / dayCount,
    carbs: rangeTotal.carbs / dayCount,
    fat: rangeTotal.fat / dayCount,
    water: rangeTotal.water / dayCount,
  };

  const anchorAgg = byDay.get(anchor) || zeroAgg();
  const anchorMeals = useMemo(
    () => (personal.meals || []).filter((m) => m.date === anchor).sort((a, b) => SLOT_ORDER.indexOf(a.type) - SLOT_ORDER.indexOf(b.type) || String(a.time || '').localeCompare(String(b.time || ''))),
    [personal.meals, anchor],
  );
  const selectedMeal = selectedMealId ? anchorMeals.find((m) => m.id === selectedMealId) : null;

  const pct = (v: number, t: number) => (t ? Math.min(100, (v / t) * 100) : 0);
  const statusColor = (v: number, t: number) => {
    const r = t ? v / t : 0;
    if (r < 0.7) return colors.warning;
    if (r > 1.1) return colors.danger;
    return colors.success;
  };

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: Z_RADIUS.card, padding: Z_SPACE.md };

  const rangeLabel =
    period === 'day'
      ? new Date(anchor + 'T00:00:00').toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : `${new Date(days[0] + 'T00:00:00').toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { month: 'short', day: 'numeric' })} – ${new Date(anchor + 'T00:00:00').toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { month: 'short', day: 'numeric' })}`;

  const Ring = ({ value, target, label, unit }: any) => {
    const p = pct(value, target);
    const rc = statusColor(value, target);
    return (
      <View style={{ alignItems: 'center', flex: 1 }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 6, borderColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderRadius: 36, borderWidth: 6, borderColor: rc, opacity: 0.3 }} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{n(Math.round(p))}</Text>
          <Text style={{ fontSize: 7, color: colors.textMuted }}>٪</Text>
        </View>
        <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text, marginTop: Z_SPACE.xs }}>{label}</Text>
        <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>{n(Math.round(value))} / {n(Math.round(target))} {unit}</Text>
      </View>
    );
  };

  const MacroBar = ({ label, value, target, color }: any) => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Z_SPACE.xs }}>
        <Text style={{ fontSize: 9, color: colors.textMuted }}>{label}</Text>
        <Text style={{ fontSize: 9, fontWeight: '700', color }}>{n(Math.round(value * 10) / 10)} / {n(Math.round(target))}g</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${pct(value, target)}%` }} />
      </View>
    </View>
  );

  const StatTile = ({ label, value, unit, color }: any) => (
    <View style={{ flex: 1, minWidth: 80, backgroundColor: colors.surfaceAlt, borderRadius: Z_RADIUS.inner, padding: Z_SPACE.sm, alignItems: 'center' }}>
      <Text style={{ fontSize: 8, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '800', color, marginTop: 2 }}>{value}</Text>
      <Text style={{ fontSize: 7, color: colors.textMuted }}>{unit}</Text>
    </View>
  );

  const DayRow = ({ day }: { day: string }) => {
    const a = byDay.get(day) || zeroAgg();
    const ratio = targetKcal ? a.kcal / targetKcal : 0;
    const dot = a.count === 0 ? colors.textMuted : ratio < 0.7 ? colors.warning : ratio > 1.1 ? colors.danger : colors.success;
    return (
      <Pressable onPress={() => { setPeriod('day'); setAnchor(day); }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Z_SPACE.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot, marginRight: Z_SPACE.sm }} />
        <Text style={{ width: 74, fontSize: 9, fontWeight: '700', color: colors.text }}>
          {new Date(day + 'T00:00:00').toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { month: 'short', day: 'numeric' })}
        </Text>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, marginHorizontal: Z_SPACE.sm }}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: dot, width: `${pct(a.kcal, targetKcal)}%` }} />
        </View>
        <Text style={{ width: 52, fontSize: 9, fontWeight: '800', color: colors.text, textAlign: 'right' }}>{n(Math.round(a.kcal))}</Text>
        <Text style={{ width: 86, fontSize: 8, color: colors.textSecondary, textAlign: 'right' }}>
          P{n(Math.round(a.protein))} C{n(Math.round(a.carbs))} F{n(Math.round(a.fat))}
        </Text>
        <Text style={{ width: 44, fontSize: 8, color: '#3b82f6', textAlign: 'right' }}>💧{n(a.water)}</Text>
        <Text style={{ width: 30, fontSize: 8, color: colors.textMuted, textAlign: 'right' }}>{n(a.count)}🍽</Text>
      </Pressable>
    );
  };

  if (!loaded) {
    return <View style={[card, { alignItems: 'center', padding: Z_SPACE.xl }]}><Text style={{ fontSize: 10, color: colors.textMuted }}>{isFa ? 'در حال بارگذاری...' : 'Loading...'}</Text></View>;
  }

  return (
    <View>
      {/* سلکتور دوره + ناوبری تاریخ */}
      <View style={[card, { marginBottom: Z_SPACE.md }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.sm }}>
          <Pressable onPress={() => setAnchor(shiftDay(anchor, period === 'day' ? -1 : period === 'week' ? -7 : -30))} style={{ width: 30, height: 30, borderRadius: Z_RADIUS.control, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 12, color: colors.text }}>›</Text>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{rangeLabel}</Text>
            <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>
              {isFa ? `${loggedDays} از ${dayCount} روز ثبت شده` : `${loggedDays}/${dayCount} days logged`}
            </Text>
          </View>
          <Pressable onPress={() => setAnchor(shiftDay(anchor, period === 'day' ? 1 : period === 'week' ? 7 : 30))} disabled={anchor >= TODAY} style={{ width: 30, height: 30, borderRadius: Z_RADIUS.control, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: anchor >= TODAY ? 0.4 : 1 }}>
            <Text style={{ fontSize: 12, color: colors.text }}>‹</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: Z_SPACE.xs, marginTop: Z_SPACE.md, backgroundColor: colors.surfaceAlt, borderRadius: Z_RADIUS.control, padding: 3 }}>
          {([['day', isFa ? 'روزانه' : 'Daily'], ['week', isFa ? 'هفتگی' : 'Weekly'], ['month', isFa ? 'ماهانه' : 'Monthly']] as [Period, string][]).map(([p, label]) => (
            <Pressable key={p} onPress={() => setPeriod(p)} style={{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', backgroundColor: period === p ? colors.surface : 'transparent', borderWidth: 1, borderColor: period === p ? colors.border : 'transparent' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: period === p ? colors.primary : colors.textSecondary }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {period === 'day' ? (
        /* ── نمای روزانه ── */
        <View>
          <View style={[card, { marginBottom: Z_SPACE.md }]}>
            <View style={{ flexDirection: 'row', gap: Z_SPACE.md, marginBottom: Z_SPACE.lg }}>
              <Ring value={anchorAgg.kcal} target={targetKcal} label={isFa ? 'کالری' : 'Calories'} unit="kcal" />
              <Ring value={anchorAgg.protein} target={targetProtein} label={isFa ? 'پروتئین' : 'Protein'} unit="g" />
              <Ring value={anchorAgg.water} target={targetWater} label={isFa ? 'آب' : 'Water'} unit="ml" />
            </View>
            <View style={{ flexDirection: 'row', gap: Z_SPACE.md }}>
              <MacroBar label={isFa ? 'پروتئین' : 'Protein'} value={anchorAgg.protein} target={targetProtein} color="#22c55e" />
              <MacroBar label={isFa ? 'کربوهیدرات' : 'Carbs'} value={anchorAgg.carbs} target={targetCarbs} color="#eab308" />
              <MacroBar label={isFa ? 'چربی' : 'Fat'} value={anchorAgg.fat} target={targetFat} color="#ef4444" />
            </View>
          </View>

          <View style={card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Z_SPACE.md }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                📋 {isFa ? 'وعده‌های این روز' : 'Meals of this day'} ({n(anchorMeals.length)})
              </Text>
              {/* 🆕 دکمه افزودن وعده (فقط اگر canEdit فعال باشد) */}
              {canEdit && (
                <Pressable
                  onPress={() => setShowAddMeal(true)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: Z_RADIUS.control,
                    backgroundColor: colors.primary,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>
                    + {isFa ? 'ثبت وعده' : 'Add meal'}
                  </Text>
                </Pressable>
              )}
            </View>
            {anchorMeals.length === 0 ? (
              <View style={{ padding: Z_SPACE.xl, alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: Z_RADIUS.inner }}>
                <Text style={{ fontSize: 24 }}>🍽️</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: Z_SPACE.sm }}>{isFa ? 'وعده‌ای ثبت نشده' : 'No meals logged'}</Text>
              </View>
            ) : (
              <View style={{ gap: Z_SPACE.sm }}>
                {anchorMeals.map((meal) => (
                  <Pressable key={meal.id} onPress={() => setSelectedMealId(meal.id)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: Z_RADIUS.inner, padding: Z_SPACE.md, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ width: 40, height: 40, borderRadius: Z_RADIUS.inner, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: Z_SPACE.sm }}>
                      <Text style={{ fontSize: 18 }}>{SLOT_EMOJI[meal.type] || '🍽️'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{meal.name || meal.type}</Text>
                      <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>{n(meal.time || '—')} · {n(meal.items?.length || 0)} {isFa ? 'قلم' : 'items'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>{n(Math.round(meal.calories || 0))}</Text>
                      <Text style={{ fontSize: 7, color: colors.textMuted }}>kcal</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      ) : (
        /* ── نمای هفتگی / ماهانه ── */
        <View>
          <View style={[card, { marginBottom: Z_SPACE.md }]}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, marginBottom: Z_SPACE.md }}>
              📊 {isFa ? 'خلاصهٔ بازه' : 'Period summary'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Z_SPACE.sm, marginBottom: Z_SPACE.md }}>
              <StatTile label={isFa ? 'جمع کالری' : 'Total kcal'} value={n(Math.round(rangeTotal.kcal))} unit="kcal" color={colors.primary} />
              <StatTile label={isFa ? 'میانگین کالری/روز' : 'Avg kcal/day'} value={n(Math.round(avg.kcal))} unit="kcal" color={statusColor(avg.kcal, targetKcal)} />
              <StatTile label={isFa ? 'میانگین پروتئین/روز' : 'Avg protein/day'} value={n(Math.round(avg.protein * 10) / 10)} unit="g" color={statusColor(avg.protein, targetProtein)} />
              <StatTile label={isFa ? 'میانگین آب/روز' : 'Avg water/day'} value={n(Math.round(avg.water))} unit="ml" color={statusColor(avg.water, targetWater)} />
            </View>
            <View style={{ flexDirection: 'row', gap: Z_SPACE.md }}>
              <MacroBar label={`${isFa ? 'میانگین پروتئین/روز' : 'Avg protein/day'}`} value={avg.protein} target={targetProtein} color="#22c55e" />
              <MacroBar label={`${isFa ? 'میانگین کربوهیدرات/روز' : 'Avg carbs/day'}`} value={avg.carbs} target={targetCarbs} color="#eab308" />
              <MacroBar label={`${isFa ? 'میانگین چربی/روز' : 'Avg fat/day'}`} value={avg.fat} target={targetFat} color="#ef4444" />
            </View>
            <View style={{ marginTop: Z_SPACE.md, paddingTop: Z_SPACE.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Z_SPACE.xs }}>
                <Text style={{ fontSize: 9, color: colors.textMuted }}>{isFa ? 'پایبندی ثبت وعده' : 'Logging adherence'}</Text>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text }}>{n(loggedDays)} / {n(dayCount)} {isFa ? 'روز' : 'days'}</Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt }}>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: loggedDays / dayCount >= 0.8 ? colors.success : loggedDays / dayCount >= 0.5 ? colors.warning : colors.danger, width: `${(loggedDays / dayCount) * 100}%` }} />
              </View>
            </View>
          </View>

          <View style={card}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, marginBottom: Z_SPACE.sm }}>
              📅 {isFa ? 'ریزکرد روزانه' : 'Daily breakdown'}
            </Text>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={true}>
              {[...days].reverse().map((d) => <DayRow key={d} day={d} />)}
            </ScrollView>
            <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: Z_SPACE.sm }}>
              {isFa ? '💡 روی هر روز کلیک کنید تا جزئیات همان روز باز شود.' : '💡 Tap a day to open its details.'}
            </Text>
          </View>
        </View>
      )}

      {/* مودال جزئیات وعده */}
      <FixedOverlay visible={!!selectedMeal} onClose={() => setSelectedMealId(null)}>
        {selectedMeal && (
          <ScrollView style={{ maxHeight: '85%' }} showsVerticalScrollIndicator={false}>
            <View style={{ width: '100%', maxWidth: 500, backgroundColor: colors.surface, borderRadius: Z_RADIUS.card, padding: Z_SPACE.lg, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Z_SPACE.md }}>
                <Text style={{ fontSize: 22 }}>{SLOT_EMOJI[selectedMeal.type] || '🍽️'}</Text>
                <View style={{ flex: 1, marginHorizontal: Z_SPACE.sm }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{selectedMeal.name || (isFa ? 'وعده' : 'Meal')}</Text>
                  <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>{n(selectedMeal.time || '—')} · {new Date(selectedMeal.date + 'T00:00:00').toLocaleDateString(isFa ? 'fa-IR' : 'en-US')}</Text>
                </View>
                <Pressable onPress={() => setSelectedMealId(null)} style={{ width: 28, height: 28, borderRadius: Z_RADIUS.control, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>✕</Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: Z_SPACE.xs, marginBottom: Z_SPACE.lg }}>
                <StatTile label={isFa ? 'کالری' : 'Cal'} value={n(Math.round(selectedMeal.calories || 0))} unit="kcal" color={colors.primary} />
                <StatTile label={isFa ? 'پروتئین' : 'Protein'} value={n(Math.round(selectedMeal.protein || 0))} unit="g" color="#22c55e" />
                <StatTile label={isFa ? 'کربوهیدرات' : 'Carbs'} value={n(Math.round(selectedMeal.carbs || 0))} unit="g" color="#eab308" />
                <StatTile label={isFa ? 'چربی' : 'Fat'} value={n(Math.round(selectedMeal.fat || 0))} unit="g" color="#ef4444" />
              </View>

              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text, marginBottom: Z_SPACE.sm }}>
                {isFa ? 'اجزای وعده' : 'Meal items'} ({n(selectedMeal.items?.length || 0)})
              </Text>
              {(selectedMeal.items || []).length === 0 ? (
                <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center', paddingVertical: Z_SPACE.md }}>{isFa ? 'آیتمی ثبت نشده' : 'No items'}</Text>
              ) : (
                <View style={{ gap: Z_SPACE.sm }}>
                  {selectedMeal.items!.map((it) => {
                    const food = byId[it.foodId];
                    return (
                      <View key={it.id} style={{ backgroundColor: colors.surfaceAlt, borderRadius: Z_RADIUS.inner, padding: Z_SPACE.md, borderWidth: 1, borderColor: colors.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Z_SPACE.sm }}>
                          {!!food && isFav(food.id) && <Text style={{ fontSize: 12, marginRight: Z_SPACE.xs }}>⭐</Text>}
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{it.nameFa}</Text>
                            <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>{n(it.qty)} × {it.portionFa}{food?.group ? ` · ${food.group}` : ''}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>{n(Math.round(it.kcal * it.qty))}</Text>
                            <Text style={{ fontSize: 7, color: colors.textMuted }}>kcal</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: Z_SPACE.xs, paddingTop: Z_SPACE.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
                          {[
                            { label: isFa ? 'پروتئین' : 'Protein', value: `${n((it.protein * it.qty).toFixed(1))}g`, color: '#22c55e' },
                            { label: isFa ? 'کربوهیدرات' : 'Carbs', value: `${n((it.carbs * it.qty).toFixed(1))}g`, color: '#eab308' },
                            { label: isFa ? 'چربی' : 'Fat', value: `${n((it.fat * it.qty).toFixed(1))}g`, color: '#ef4444' },
                            { label: isFa ? 'هر واحد' : 'Per unit', value: n(Math.round(it.kcal)), color: colors.textSecondary },
                          ].map((m) => (
                            <View key={m.label} style={{ flex: 1, alignItems: 'center' }}>
                              <Text style={{ fontSize: 7, color: colors.textMuted, marginBottom: 2, textAlign: 'center' }}>{m.label}</Text>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: m.color, textAlign: 'center' }}>{m.value}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <Pressable onPress={() => setSelectedMealId(null)} style={{ marginTop: Z_SPACE.lg, backgroundColor: colors.primary, borderRadius: Z_RADIUS.control, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{isFa ? 'بستن' : 'Close'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </FixedOverlay>

      {/* 🆕 مودال افزودن وعده */}
      <MealFormModal
        visible={showAddMeal}
        onClose={() => setShowAddMeal(false)}
        nationalId={targetId}
        date={anchor}
      />
    </View>
  );
}