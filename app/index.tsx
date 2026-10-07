import { useMemo, useState, memo } from 'react'; // 🆕 Added memo
import { Text, View, ScrollView, Pressable, useWindowDimensions, FlatList } from 'react-native'; // 🆕 Added FlatList
// ✅ Import paths corrected for root level
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { useGamification } from '../src/store/GamificationContext';
import { usePersonnel } from '../src/store/PersonnelContext';
import { useAuth } from '../src/store/AuthContext';
import { useBodyAnalysis } from '../src/store/BodyAnalysisContext'; 

import { SectionTitle } from '../src/components/ui/Card';
import Icon, { IconName } from '../src/components/ui/Icon';
import BrandLogo from '../src/components/ui/BrandLogo';
import { MiniDonut, ColorBars } from '../src/components/dashboard/DenseCharts';
import ChartPreviewModal from '../src/components/charts/ChartPreviewModal';
import type { PreviewRow } from '../src/components/charts/ChartPreviewModal';
import { nutritionTips } from '../src/data/nutritionTips';
import { mealSlotOrder, mealSlotLabelsFa, mealSlotLabelsEn } from '../src/types/nutrition';
import type { MealSlot, MealItem } from '../src/types/nutrition';
import { faNum } from '../src/utils/format';
import { router } from 'expo-router';
import RiskCard from '../src/components/analysis/RiskCard'; 

const SLOT_EMOJI: Record<MealSlot, string> = {
  breakfast: '🌅', snack1: '🍎', lunch: '🍽️', snack2: '🥜', dinner: '🌙', snack3: '🌛',
};
const SLOT_TONE: Record<MealSlot, string> = {
  breakfast: '#F59E0B', snack1: '#22C55E', lunch: '#23408E', snack2: '#8B5CF6', dinner: '#0EA5E9', snack3: '#64748B',
};
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

// ==========================================
// 🚀 OPTIMIZED COMPONENT: TodayMealsList
// Uses FlatList + Memoization to prevent lag on long lists
// ==========================================
interface MealListItem extends MealItem {
  slot: MealSlot;
}

const TodayMealsList = memo(({ 
  meals, 
  colors, 
  isFa, 
  n, 
  onLogPress 
}: { 
  meals: any[]; 
  colors: any; 
  isFa: boolean; 
  n: Function;
  onLogPress?: () => void;
}) => {
  if (!meals || meals.length === 0) {
    return (
      <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 16, alignItems: 'center' }}>
        <Icon name="meal" size={18} color={colors.textMuted} />
        <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 4 }}>{isFa ? 'وعده‌ای ثبت نشده' : 'No meals yet'}</Text>
        {onLogPress && (
           <Pressable onPress={onLogPress} style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primarySoft }}>
             <Text style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>{isFa ? '+ افزودن وعده' : '+ Add Meal'}</Text>
           </Pressable>
        )}
      </View>
    );
  }

  // Flatten slots into a single array for efficient rendering
  const flatItems: MealListItem[] = mealSlotOrder.flatMap(slot => {
    const slotMeals = meals.filter((m: any) => m.type === slot);
    if (!slotMeals.length) return [];
    return slotMeals.map(meal => ({ ...meal, slot }));
  });

  return (
    <FlatList
      data={flatItems}
      scrollEnabled={false} // Disable internal scrolling since parent is ScrollView
      nestedScrollEnabled={false}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const tone = SLOT_TONE[item.slot];
        return (
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 8, marginBottom: 8, borderStartWidth: 3, borderStartColor: tone }}>
            {/* Meal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: tone + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, lineHeight: 28, textAlign: 'center', includeFontPadding: false }}>{SLOT_EMOJI[item.slot]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: tone, includeFontPadding: false, textAlign: isFa ? 'right' : 'left' }}>
                  {isFa ? mealSlotLabelsFa[item.slot] : mealSlotLabelsEn[item.slot]}
                </Text>
                <Text style={{ fontSize: 8, color: colors.textMuted, includeFontPadding: false, marginTop: 1, textAlign: isFa ? 'right' : 'left', direction: isFa ? 'rtl' : 'ltr' } as any}>
                   {item.time || ''} 
                </Text>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: tone + '22' }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: tone, includeFontPadding: false }}>{n(item.calories)} kcal</Text>
              </View>
            </View>
            
            {/* Items List */}
            <View style={{ borderStartWidth: 2, borderStartColor: tone + '55', paddingStart: 10, marginStart: 6 }}>
              {item.items?.length ? item.items.map((it: any) => (
                <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: tone }} />
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 9, fontWeight: '600', color: colors.text, includeFontPadding: false }}>{it.nameFa}</Text>
                  <Text style={{ fontSize: 8, color: colors.textMuted, includeFontPadding: false }}>×{n(it.qty)}</Text>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: colors.textSecondary, includeFontPadding: false }}>{n(Math.round(it.kcal * it.qty))}</Text>
                </View>
              )) : (
                <Text style={{ fontSize: 8, color: colors.textMuted, includeFontPadding: false }}>{isFa ? 'بدون اقلام' : 'No items'}</Text>
              )}
            </View>
          </View>
        );
      }}
    />
  );
});

export default function HomeScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { width: winW } = useWindowDimensions();
  
  // 🆕 Detect Screen Size
  const isMobile = winW < 900; 
  const isWide = !isMobile;
  
  const { state, addWater, removeWater } = useWellness();
  const { state: gam } = useGamification();
  const { getByNationalId } = usePersonnel();
  const { session } = useAuth();
  
  const { getUserAnalyses } = useBodyAnalysis();
  
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [preview, setPreview] = useState<{ title: string; subtitle?: string; rows: PreviewRow[] } | null>(null);
  const [lineW, setLineW] = useState(isMobile ? 150 : 180); 
  const [waterW, setWaterW] = useState(isMobile ? 130 : 160);

  const rec = session ? getByNationalId(session.nationalId) : undefined;
  const myId = session?.nationalId ?? '';
  
  const { meals, waterEntries, targets, checkIn } = state;
  
  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = meals.filter((m) => m.date === today);
  const todayWaterEntries = waterEntries.filter((e) => e.loggedAt.slice(0, 10) === today);
  const todayWaterMl = todayWaterEntries.reduce((s, e) => s + e.ml, 0);
  
  // Fetch latest analysis
  const last = useMemo(() => {
    if (!myId) return undefined;
    let userRecords = [];
    try {
      if (getUserAnalyses && typeof getUserAnalyses === 'function') {
        userRecords = getUserAnalyses(myId);
      }
    } catch (e) { console.warn('[HomeScreen] Error fetching body analyses:', e); }

    if ((!userRecords || userRecords.length === 0) && state.bodyAnalyses) {
       userRecords = state.bodyAnalyses.filter(r => String(r.nationalId).trim() === String(myId).trim());
    }
    if (!userRecords || userRecords.length === 0) return undefined;
    const sorted = [...userRecords].sort((a, b) => {
       const timeA = a.analyzeTime || a.date || '';
       const timeB = b.analyzeTime || b.date || '';
       return String(timeA).localeCompare(String(timeB));
    });
    return sorted[sorted.length - 1];
  }, [myId, getUserAnalyses, state.bodyAnalyses]); 

  const consumed = todayMeals.reduce((a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const days = useMemo(() => {
    const arr: any[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = dayKey(d);
      const dm = meals.filter((m) => m.date === key);
      const wm = waterEntries.filter((e) => e.loggedAt.slice(0, 10) === key).reduce((s, e) => s + e.ml, 0);
      arr.push({ key, label: d.toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { weekday: 'short' }), calories: dm.reduce((s, m) => s + m.calories, 0), water: wm });
    }
    return arr;
  }, [meals, waterEntries, isFa]);

  const week = useMemo(() => {
    const now = new Date();
    const offset = (now.getDay() + 1) % 7;
    const start = new Date(now); start.setDate(now.getDate() - offset);
    const arr: any[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const key = dayKey(d);
      const dm = meals.filter((m) => m.date === key);
      const wm = waterEntries.filter((e) => e.loggedAt.slice(0, 10) === key).reduce((s, e) => s + e.ml, 0);
      arr.push({ key, label: d.toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { weekday: 'short' }), calories: dm.reduce((s, m) => s + m.calories, 0), water: wm });
    }
    return arr;
  }, [meals, waterEntries, isFa]);

  const monthBuckets = useMemo(() => {
    const out: any[] = []; const base = days.slice(-28);
    for (let g = 0; g < 4; g++) {
      const s = base.slice(g * 7, g * 7 + 7);
      out.push({ key: 'W' + (g + 1), label: isFa ? 'هفته ' + (g + 1) : 'Week ' + (g + 1), calories: s.reduce((a, d) => a + d.calories, 0), water: s.reduce((a, d) => a + d.water, 0) });
    }
    return out;
  }, [days, isFa]);

  const periodChart = period === 'week' ? week : monthBuckets;

  const openBar = (i: number) => setPreview({ title: periodChart[i].label, rows: [{ label: isFa ? 'کالری' : 'Calories', value: periodChart[i].calories + ' kcal', color: colors.chart[0] }] });
  const openWaterBar = (i: number) => setPreview({ title: periodChart[i].label, rows: [{ label: isFa ? 'آب' : 'Water', value: periodChart[i].water + ' ml', color: colors.chart[4] }] });
  const openMacro = () => {
    const pk = consumed.protein * 4, ck = consumed.carbs * 4, fk = consumed.fat * 9; const tot = pk + ck + fk || 1;
    setPreview({
      title: isFa ? 'ترکیب ماکروی امروز' : 'Macro Split',
      subtitle: n(consumed.calories) + ' kcal',
      rows: [
        { label: isFa ? 'پروتئین' : 'Protein', value: n(pk) + ' kcal (' + n(Math.round((pk / tot) * 100)) + '٪)', color: colors.chart[3] },
        { label: isFa ? 'کربوهیدرات' : 'Carbs', value: n(ck) + ' kcal (' + n(Math.round((ck / tot) * 100)) + '٪)', color: colors.chart[2] },
        { label: isFa ? 'چربی' : 'Fat', value: n(fk) + ' kcal (' + n(Math.round((fk / tot) * 100)) + '٪)', color: colors.chart[1] },
      ],
    });
  };

  const glassCount = todayWaterEntries.filter((e) => e.ml === 250).length;
  const bottleCount = todayWaterEntries.filter((e) => e.ml === 500).length;
  const addGlass = () => addWater({ id: 'w-' + Date.now(), ml: 250, time: new Date().toLocaleTimeString(isFa ? 'fa-IR' : 'en-US', { hour: '2-digit', minute: '2-digit' }), loggedAt: new Date().toISOString() });
  const addBottle = () => addWater({ id: 'w-' + Date.now(), ml: 500, time: new Date().toLocaleTimeString(isFa ? 'fa-IR' : 'en-US', { hour: '2-digit', minute: '2-digit' }), loggedAt: new Date().toISOString() });
  const removeGlass = () => { const l = [...todayWaterEntries].reverse().find((e) => e.ml === 250); if (l) removeWater(l.id); };
  const removeBottle = () => { const l = [...todayWaterEntries].reverse().find((e) => e.ml === 500); if (l) removeWater(l.id); };

  const waterGoalDays = useMemo(() => { const per: Record<string, number> = {}; waterEntries.forEach((e) => { const k = e.loggedAt.slice(0, 10); per[k] = (per[k] || 0) + e.ml; }); let c = 0; for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); if ((per[dayKey(d)] || 0) >= 2500) c++; } return c; }, [waterEntries]);
  let streak = 0; for (let i = week.length - 1; i >= 0; i--) { if (week[i].calories > 0) streak++; else break; }

  const autoDefs = [
    { icon: 'meal' as IconName, fa: 'اولین ثبت', en: 'First Log', earned: meals.length >= 1 },
    { icon: 'water' as IconName, fa: 'قهرمان آب', en: 'Water Hero', earned: waterGoalDays >= 7 },
    { icon: 'flame' as IconName, fa: 'استریک ۷ روز', en: '7-day Streak', earned: streak >= 7 },
    { icon: 'diet' as IconName, fa: '۳۰ وعده', en: '30 Meals', earned: meals.length >= 30 },
  ];
  const manualEarned = gam.badgeAwards.filter((b) => b.userId === myId).sort((a, b) => b.awardedAt.localeCompare(a.awardedAt)).map((b) => ({ icon: (b.icon as IconName) || ('tips' as IconName), fa: b.titleFa, en: b.titleFa, earned: true }));
  const earned = [...manualEarned, ...autoDefs.filter((d) => d.earned)].slice(0, 2);
  const locked = autoDefs.find((d) => !d.earned) ?? { icon: 'shield' as IconName, fa: 'بج بعدی', en: 'Next', earned: false };
  const badgeTiles = [...earned, { ...locked, earned: false }];

  const calPct = targets ? Math.min(consumed.calories / targets.calories, 1) : 0;
  const proPct = targets ? Math.min(consumed.protein / targets.macros.proteinGrams, 1) : 0;
  const fatPct = targets ? Math.min(consumed.fat / targets.macros.fatGrams, 1) : 0;
  const carbPct = targets ? Math.min(consumed.carbs / targets.macros.carbGrams, 1) : 0;
  const waterPct = Math.min(todayWaterMl / 2500, 1);
  const daysLogged = periodChart.filter((d) => d.calories > 0).length;

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: isMobile ? 12 : 12 }; 
  
  /** Helper for LTR numbers */
  const mealTimeLabel = (t: any): string => {
    let s = String(t ?? '');
    if (!s) return '';
    s = s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    return isFa ? s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]) : s;
  };

  /** Compact Water Counter Row */
  const CounterRow = ({ icon, label, count, onAdd, onRemove, ml }: { icon: string; label: string; count: number; onAdd: () => void; onRemove: () => void; ml: number }) => (
    <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 8, marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 14 }}>{icon}</Text>
        <Text style={{ flex: 1, fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>{label} ({n(ml)}ml)</Text>
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>{n(count)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
        {/* Larger touch targets for mobile */}
        <Pressable onPress={onAdd} style={{ flex: 1, height: isMobile ? 32 : 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
          <Text style={{ fontSize: isMobile ? 14 : 10, fontWeight: '700', color: '#FFFFFF' }}>+</Text>
        </Pressable>
        <Pressable onPress={onRemove} style={{ flex: 1, height: isMobile ? 32 : 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: isMobile ? 14 : 10, color: colors.textSecondary }}>−</Text>
        </Pressable>
      </View>
    </View>
  );

  /** Macro Meter Row */
  const MacroMeterRow = ({ icon, tint, label, value, unit, target, targetUnit, progress, badge, isLast }: {
    icon: string; tint: string; label: string; value: string; unit?: string; target?: string; targetUnit?: string; progress: number; badge: string; isLast?: boolean;
  }) => (
    <View style={{ marginBottom: isLast ? 0 : 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: tint + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <Text numberOfLines={1} style={{ flex: 1, flexShrink: 1, fontSize: 10.5, fontWeight: '700', color: colors.textSecondary }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text, direction: 'ltr' } as any}>{value}{unit ? ' ' + unit : ''}</Text>
          {target ? (
            <Text style={{ fontSize: 8, color: colors.textMuted }}>
              {isFa ? 'از' : '/'} {target}{targetUnit ? ' ' + targetUnit : ''}
            </Text>
          ) : null}
          <View style={{ minWidth: 34, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: tint + '22', alignItems: 'center' }}>
            <Text style={{ fontSize: 8, fontWeight: '800', color: tint }}>{badge}</Text>
          </View>
        </View>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginTop: 8, marginStart: 46 }}>
        <View style={{ height: 6, borderRadius: 3, width: (Math.min(Math.max(progress, 0), 1) * 100).toFixed(0) + '%', backgroundColor: tint }} />
      </View>
    </View>
  );

  // ==========================================
  // RENDER LOGIC: MOBILE VS DESKTOP
  // ==========================================

  if (isMobile) {
    // 📱 MOBILE LAYOUT (Linear Vertical Flow)
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 10, paddingBottom: 80 }}>
        
        {/* Welcome Header */}
        {rec && (
          <View style={{ backgroundColor: colors.primarySoft, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '33', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>
              {isFa ? 'خوش آمدید، ' + (rec.fullNamePrefixed || rec.fullName) : 'Welcome, ' + rec.fullName}
            </Text>
            <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2 }}>
              {isFa ? 'سامانهٔ سلامت سازمانی' : 'Organizational health system'}
            </Text>
          </View>
        )}

        {/* Period Toggle (Centered & Touch Friendly) */}
        <View style={{ alignSelf: 'center', flexDirection: 'row', gap: 4, backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 3, marginBottom: 12 }}>
          {(['week', 'month'] as const).map((p) => (
            <Pressable key={p} onPress={() => setPeriod(p)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: period === p ? colors.primary : 'transparent', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: period === p ? '#FFFFFF' : colors.textSecondary }}>
                {p === 'week' ? (isFa ? 'هفته' : 'Week') : isFa ? 'ماه' : 'Month'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 1. Health Metrics (Top Priority) */}
        <View style={[card, { marginBottom: 12 }]}>
           <SectionTitle action={isFa ? 'مشاهدهٔ آنالیز' : 'View analysis'} onAction={() => router.push('/my-analysis')}>
             {isFa ? 'شاخص‌های سلامتی' : 'Health Metrics'}
           </SectionTitle>
           <RiskCard latest={last} />
        </View>

        {/* 2. Today's Status (Macros) */}
        <View style={[card, { marginBottom: 12 }]}>
          <SectionTitle>{isFa ? 'وضعیت امروز' : 'Today Posture'}</SectionTitle>
          <MacroMeterRow icon="🔥" tint={colors.chart[0]} label={isFa ? 'کالری' : 'Calories'} value={n(consumed.calories)} unit="kcal" target={n(targets?.calories ?? 0)} targetUnit="kcal" progress={calPct} badge={n(Math.round(calPct * 100)) + '٪'} />
          <MacroMeterRow icon="🥩" tint={colors.chart[3]} label={isFa ? 'پروتئین' : 'Protein'} value={n(Math.round(consumed.protein * 10) / 10)} unit="g" target={n(targets?.macros.proteinGrams ?? 0)} targetUnit="g" progress={proPct} badge={n(Math.round(proPct * 100)) + '٪'} />
          <MacroMeterRow icon="🥑" tint={colors.chart[1]} label={isFa ? 'چربی' : 'Fat'} value={n(Math.round(consumed.fat * 10) / 10)} unit="g" target={n(targets?.macros.fatGrams ?? 0)} targetUnit="g" progress={fatPct} badge={n(Math.round(fatPct * 100)) + '٪'} />
          <MacroMeterRow icon="🌾" tint={colors.chart[2]} label={isFa ? 'کربوهیدرات' : 'Carbs'} value={n(Math.round(consumed.carbs * 10) / 10)} unit="g" target={n(targets?.macros.carbGrams ?? 0)} targetUnit="g" progress={carbPct} badge={n(Math.round(carbPct * 100)) + '٪'} isLast />
        </View>

        {/* 3. Calories & Macros Chart (Compact) */}
        <View style={[card, { marginBottom: 12 }]}>
          <SectionTitle action={isFa ? 'جزئیات = ضربه' : 'tap=details'} onAction={openMacro}>{isFa ? 'کالری و ماکروها' : 'Calories & Macros'}</SectionTitle>
          <View style={{ flexDirection: 'column', alignItems: 'center' }}>
            {/* Donut Centered */}
            <Pressable onPress={openMacro} style={{ marginBottom: 10 }}>
               <MiniDonut segments={[{ value: consumed.protein * 4 || 1, color: colors.chart[3] }, { value: consumed.carbs * 4 || 1, color: colors.chart[2] }, { value: consumed.fat * 9 || 1, color: colors.chart[1] }]} size={92} thickness={13} centerValue={n(consumed.calories)} centerLabel="kcal" />
            </Pressable>
            {/* Bar Chart Below */}
            <View style={{ width: '100%', paddingHorizontal: 4 }} onLayout={(e) => setLineW(Math.max(Math.floor(e.nativeEvent.layout.width) - 8, 120))}>
              <Text style={{ fontSize: 8, fontWeight: '700', color: colors.textMuted, marginBottom: 4, textAlign: 'center' }}>{isFa ? 'کالری مصرفی بر روز هفته' : 'kcal per weekday'}</Text>
              <ColorBars data={periodChart.map((d) => ({ label: d.label, value: d.calories, color: colors.chart[0] }))} width={lineW} height={80} onBarPress={openBar} />
            </View>
          </View>
        </View>

        {/* 4. Water Tracker (Stacked Layout) */}
        <View style={[card, { marginBottom: 12 }]}>
          <SectionTitle action={isFa ? 'جزئیات = ضربه' : 'tap=details'} onAction={() => openWaterBar(periodChart.length - 1)}>{isFa ? 'آب امروز' : 'Water Today'}</SectionTitle>
          
          {/* Progress Summary */}
          <View style={{ backgroundColor: colors.primarySoft, borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>{n(todayWaterMl)} / {n(2500)}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>ml</Text>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', width: '100%', marginTop: 6 }}>
              <View style={{ height: 6, borderRadius: 3, width: (waterPct * 100).toFixed(0) + '%', backgroundColor: colors.chart[4] }} />
            </View>
          </View>

          {/* Controls Grid */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
             <View style={{ flex: 1 }}>
                <CounterRow icon="🥛" label={isFa ? 'لیوان' : 'Glass'} count={glassCount} onAdd={addGlass} onRemove={removeGlass} ml={250} />
             </View>
             <View style={{ flex: 1 }}>
                <CounterRow icon="🍶" label={isFa ? 'بطری' : 'Bottle'} count={bottleCount} onAdd={addBottle} onRemove={removeBottle} ml={500} />
             </View>
          </View>

          {/* Small Chart */}
          <View style={{ width: '100%' }} onLayout={(e) => setWaterW(Math.max(Math.floor(e.nativeEvent.layout.width) - 4, 120))}>
             <Text style={{ fontSize: 8, fontWeight: '700', color: colors.textMuted, marginBottom: 4, textAlign: 'center' }}>{isFa ? 'میلی‌لیتر بر روز هفته' : 'ml per weekday'}</Text>
             <ColorBars data={periodChart.map((d) => ({ label: d.label, value: d.water, color: colors.chart[4] }))} width={waterW} height={80} onBarPress={openWaterBar} />
          </View>
        </View>

        {/* 5. Automation & Badges */}
        <View style={[card, { marginBottom: 12 }]}>
          <SectionTitle action={isFa ? 'بج‌ها' : 'Badges'} onAction={() => router.push('/leaderboard')}>{isFa ? 'خودکارسازی و بج‌ها' : 'Automation & Badges'}</SectionTitle>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{n(daysLogged)}</Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'center' }}>{isFa ? 'روز ثبت در بازه' : 'Days logged'}</Text>
            </View>
            <View style={{ width: 1, height: 30, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{n(streak)}</Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'center' }}>{isFa ? 'روز پیوسته' : 'Day streak'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 2 }}>
            {badgeTiles.map((b, i) => (
              <View key={i} style={{ alignItems: 'center', opacity: b.earned ? 1 : 0.45 }}>
                <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: b.earned ? [colors.warning, colors.accent][i % 2] + '22' : colors.surfaceAlt, borderWidth: 1, borderColor: b.earned ? [colors.warning, colors.accent][i % 2] : colors.border }}>
                  <Icon name={b.earned ? b.icon : 'lock'} size={15} color={b.earned ? [colors.warning, colors.accent][i % 2] : colors.textMuted} />
                </View>
                <Text numberOfLines={1} style={{ fontSize: 7, fontWeight: '700', color: b.earned ? colors.text : colors.textMuted, marginTop: 3, textAlign: 'center' }}>{isFa ? b.fa : b.en}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 6. Latest Tips */}
        <View style={[card, { marginBottom: 12 }]}>
          <SectionTitle action={isFa ? 'همه' : 'View all'} onAction={() => router.push('/tips')}>{isFa ? 'آخرین نکات' : 'Latest Tips'}</SectionTitle>
          {nutritionTips.slice(0, 2).map((t) => (
            <View key={t.id} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{isFa ? t.title.fa : t.title.en}</Text>
              <Text numberOfLines={2} style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>{isFa ? t.description.fa : t.description.en}</Text>
            </View>
          ))}
        </View>

        {/* 7. Today's Meals (Optimized with FlatList) */}
        <View style={[card, {}]}>
          <SectionTitle action={isFa ? '+ ثبت' : '+ Log'} onAction={() => router.push('/log-meal')}>{isFa ? 'وعده‌های امروز' : 'Today’s Meals'}</SectionTitle>
          <TodayMealsList 
            meals={todayMeals} 
            colors={colors} 
            isFa={isFa} 
            n={n}
            onLogPress={() => router.push('/log-meal')}
          />
        </View>

      </ScrollView>
    );
  }

  // 💻 DESKTOP LAYOUT (Original 3-Column Grid)
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 10, paddingBottom: 80 }}>
      {/* Desktop Header remains unchanged */}
      {rec && (
        <View style={{ backgroundColor: colors.primarySoft, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '33', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>
            {isFa ? 'خوش آمدید، ' + (rec.fullNamePrefixed || rec.fullName) : 'Welcome, ' + rec.fullName}
          </Text>
          <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2 }}>
            {isFa ? 'سامانهٔ سلامت سازمانی' : 'Organizational health system'}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BrandLogo size={28} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{isFa ? 'داشبورد سلامت' : 'Health Dashboard'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 3 }}>
          {(['week', 'month'] as const).map((p) => (
            <Pressable key={p} onPress={() => setPeriod(p)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: period === p ? colors.primary : 'transparent', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: period === p ? '#FFFFFF' : colors.textSecondary }}>
                {p === 'week' ? (isFa ? 'هفته' : 'Week') : isFa ? 'ماه' : 'Month'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
        {/* Column 1 */}
        <View style={{ flexBasis: '33.33%', flexGrow: 1, padding: 4 }}>
          <View style={[card, { marginBottom: 8 }]}>
            <SectionTitle>{isFa ? 'وضعیت امروز' : 'Today Posture'}</SectionTitle>
            <MacroMeterRow icon="🔥" tint={colors.chart[0]} label={isFa ? 'کالری' : 'Calories'} value={n(consumed.calories)} unit="kcal" target={n(targets?.calories ?? 0)} targetUnit="kcal" progress={calPct} badge={n(Math.round(calPct * 100)) + '٪'} />
            <MacroMeterRow icon="🥩" tint={colors.chart[3]} label={isFa ? 'پروتئین' : 'Protein'} value={n(Math.round(consumed.protein * 10) / 10)} unit="g" target={n(targets?.macros.proteinGrams ?? 0)} targetUnit="g" progress={proPct} badge={n(Math.round(proPct * 100)) + '٪'} />
            <MacroMeterRow icon="🥑" tint={colors.chart[1]} label={isFa ? 'چربی' : 'Fat'} value={n(Math.round(consumed.fat * 10) / 10)} unit="g" target={n(targets?.macros.fatGrams ?? 0)} targetUnit="g" progress={fatPct} badge={n(Math.round(fatPct * 100)) + '٪'} />
            <MacroMeterRow icon="🌾" tint={colors.chart[2]} label={isFa ? 'کربوهیدرات' : 'Carbs'} value={n(Math.round(consumed.carbs * 10) / 10)} unit="g" target={n(targets?.macros.carbGrams ?? 0)} targetUnit="g" progress={carbPct} badge={n(Math.round(carbPct * 100)) + '٪'} isLast />
          </View>

          <View style={[card, { flexGrow: 1, flexBasis: 'auto' as any, marginBottom: 8 }]}>
            <SectionTitle action={isFa ? 'جزئیات = ضربه' : 'tap=details'} onAction={openMacro}>{isFa ? 'کالری و ماکروها' : 'Calories & Macros'}</SectionTitle>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable onPress={openMacro}>
                <MiniDonut segments={[{ value: consumed.protein * 4 || 1, color: colors.chart[3] }, { value: consumed.carbs * 4 || 1, color: colors.chart[2] }, { value: consumed.fat * 9 || 1, color: colors.chart[1] }]} size={92} thickness={13} centerValue={n(consumed.calories)} centerLabel="kcal" />
              </Pressable>
              <View style={{ flex: 1, marginLeft: 8, marginRight: 8 }} onLayout={(e) => setLineW(Math.max(Math.floor(e.nativeEvent.layout.width) - 4, 120))}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: colors.textMuted, marginBottom: 4 }}>{isFa ? 'کالری مصرفی بر روز هفته' : 'kcal per weekday'}</Text>
                <ColorBars data={periodChart.map((d) => ({ label: d.label, value: d.calories, color: colors.chart[0] }))} width={lineW} height={100} onBarPress={openBar} />
              </View>
            </View>
          </View>

          <View style={[card, { flexGrow: 1, flexBasis: 'auto' as any }]}>
            <SectionTitle action={isFa ? 'جزئیات = ضربه' : 'tap=details'} onAction={() => openWaterBar(periodChart.length - 1)}>{isFa ? 'آب امروز' : 'Water Today'}</SectionTitle>
            <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
              <View style={{ width: 150 }}>
                <View style={{ backgroundColor: colors.primarySoft, borderRadius: 10, padding: 8, alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary }}>{n(todayWaterMl)} / {n(2500)}</Text>
                  <Text style={{ fontSize: 8, color: colors.textMuted }}>ml</Text>
                </View>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginBottom: 8 }}>
                  <View style={{ height: 5, borderRadius: 3, width: (waterPct * 100).toFixed(0) + '%', backgroundColor: colors.chart[4] }} />
                </View>
                <CounterRow icon="🥛" label={isFa ? 'لیوان' : 'Glass'} count={glassCount} onAdd={addGlass} onRemove={removeGlass} ml={250} />
                <CounterRow icon="🍶" label={isFa ? 'بطری' : 'Bottle'} count={bottleCount} onAdd={addBottle} onRemove={removeBottle} ml={500} />
              </View>
              <View style={{ flex: 1, marginLeft: 8, justifyContent: 'center' }} onLayout={(e) => setWaterW(Math.max(Math.floor(e.nativeEvent.layout.width) - 4, 120))}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: colors.textMuted, marginBottom: 4 }}>{isFa ? 'میلی‌لیتر بر روز هفته' : 'ml per weekday'}</Text>
                <ColorBars data={periodChart.map((d) => ({ label: d.label, value: d.water, color: colors.chart[4] }))} width={waterW} height={110} onBarPress={openWaterBar} />
              </View>
            </View>
          </View>
        </View>

        {/* Column 2 */}
        <View style={{ flexBasis: '33.33%', flexGrow: 1, padding: 4 }}>
          <View style={[card, { flexGrow: 1, flexBasis: 'auto' as any, marginBottom: 8 }]}>
             <SectionTitle action={isFa ? 'مشاهدهٔ آنالیز' : 'View analysis'} onAction={() => router.push('/my-analysis')}>
               {isFa ? 'شاخص‌های سلامتی' : 'Health Metrics'}
             </SectionTitle>
             <RiskCard latest={last} />
          </View>

          <View style={[card, { flexGrow: 1, flexBasis: 'auto' as any, marginBottom: 8 }]}>
            <SectionTitle action={isFa ? 'همه' : 'View all'} onAction={() => router.push('/tips')}>{isFa ? 'آخرین نکات' : 'Latest Tips'}</SectionTitle>
            {nutritionTips.slice(0, 2).map((t) => (
              <View key={t.id} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{isFa ? t.title.fa : t.title.en}</Text>
                <Text numberOfLines={2} style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>{isFa ? t.description.fa : t.description.en}</Text>
              </View>
            ))}
          </View>

          <View style={[card, { flexGrow: 1, flexBasis: 'auto' as any }]}>
            <SectionTitle action={isFa ? 'بج‌ها' : 'Badges'} onAction={() => router.push('/leaderboard')}>{isFa ? 'خودکارسازی و بج‌ها' : 'Automation & Badges'}</SectionTitle>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{n(daysLogged)}</Text>
                <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'center' }}>{isFa ? 'روز ثبت در بازه' : 'Days logged'}</Text>
              </View>
              <View style={{ width: 1, height: 30, backgroundColor: colors.border }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{n(streak)}</Text>
                <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'center' }}>{isFa ? 'روز پیوسته' : 'Day streak'}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 2 }}>
              {badgeTiles.map((b, i) => (
                <View key={i} style={{ alignItems: 'center', opacity: b.earned ? 1 : 0.45 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: b.earned ? [colors.warning, colors.accent][i % 2] + '22' : colors.surfaceAlt, borderWidth: 1, borderColor: b.earned ? [colors.warning, colors.accent][i % 2] : colors.border }}>
                    <Icon name={b.earned ? b.icon : 'lock'} size={15} color={b.earned ? [colors.warning, colors.accent][i % 2] : colors.textMuted} />
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 7, fontWeight: '700', color: b.earned ? colors.text : colors.textMuted, marginTop: 3, textAlign: 'center' }}>{isFa ? b.fa : b.en}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Column 3 */}
        <View style={{ flexBasis: '33.33%', flexGrow: 1, padding: 4 }}>
          <View style={[card, { flexGrow: 1, flexBasis: 'auto' as any }]}>
            <SectionTitle action={isFa ? '+ ثبت' : '+ Log'} onAction={() => router.push('/log-meal')}>{isFa ? 'وعده‌های امروز' : 'Today’s Meals'}</SectionTitle>
            <TodayMealsList 
              meals={todayMeals} 
              colors={colors} 
              isFa={isFa} 
              n={n}
              onLogPress={() => router.push('/log-meal')}
            />
          </View>
        </View>
      </View>

      <ChartPreviewModal visible={preview !== null} onClose={() => setPreview(null)} title={preview?.title ?? ''} subtitle={preview?.subtitle} rows={preview?.rows ?? []} />
    </ScrollView>
  );
}