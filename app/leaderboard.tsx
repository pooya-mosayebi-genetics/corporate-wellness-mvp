import { useEffect, useMemo, useState } from 'react';
import { Text, View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { useGamification } from '../src/store/GamificationContext';
import { useAuth } from '../src/store/AuthContext';
import { SectionTitle, IconTile } from '../src/components/ui/Card';
import Icon, { IconName } from '../src/components/ui/Icon';
import { faNum } from '../src/utils/format';
import { maskNationalId } from '../src/utils/nationalId';
import { router } from 'expo-router';

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
interface Entry { id: string; isMe: boolean; score: number; badges: number; }

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { state } = useWellness();
  const { state: gam } = useGamification();
  const { session } = useAuth();
  const [tab, setTab] = useState<'board' | 'badges' | 'challenges'>('board');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [my, setMy] = useState({ streak: 0, activeDays: 0, waterGoalDays: 0, points: 0, badgeCount: 0, breakfast: 0 });

  const meId = session?.nationalId ?? '';
  const { meals, waterEntries, clients, clientAnalyses, bodyAnalyses } = state;
  const days = period === 'week' ? 7 : 30;

  /* ✅ ایندکس‌های O(1) — یک‌بار ساخته می‌شوند */
  const idx = useMemo(() => {
    const activeDaysSet = new Set<string>();
    const waterPerDay: Record<string, number> = {};
    for (const m of meals) activeDaysSet.add(m.date);
    for (const e of waterEntries) {
      const k = e.loggedAt.slice(0, 10);
      activeDaysSet.add(k);
      waterPerDay[k] = (waterPerDay[k] || 0) + e.ml;
    }
    const snapsByUser = new Map<string, any[]>();
    for (const s of clientAnalyses) {
      const arr = snapsByUser.get(s.nationalId);
      if (arr) arr.push(s); else snapsByUser.set(s.nationalId, [s]);
    }
    snapsByUser.forEach((arr) => arr.sort((a, b) => a.date.localeCompare(b.date)));
    return { activeDaysSet, waterPerDay, snapsByUser };
  }, [meals, waterEntries, clientAnalyses]);

  /* ✅ محاسبهٔ deferred بعد از اولین paint */
  useEffect(() => {
    const t = setTimeout(() => {
      const { activeDaysSet, waterPerDay, snapsByUser } = idx;

      // استریک
      let i = activeDaysSet.has(dayKey(new Date())) ? 0 : 1;
      let streak = 0;
      for (;; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (activeDaysSet.has(dayKey(d))) streak++; else break; }

      // روزهای فعال و آب در پنجره
      let activeDays = 0, waterGoalDays = 0;
      for (let k = 0; k < days; k++) {
        const d = new Date(); d.setDate(d.getDate() - k); const key = dayKey(d);
        if (activeDaysSet.has(key)) activeDays++;
        if ((waterPerDay[key] || 0) >= 2500) waterGoalDays++;
      }
      const breakfast = meals.filter((m) => m.type === 'breakfast').length;

      // پیشرفت چالش‌ها برای من
      const inWin = (c: any, k: string) => k >= c.start && k <= c.end;
      const progressOf = (c: any): number => {
        if (c.metric === 'meals') return meals.filter((m) => inWin(c, m.date)).length;
        if (c.metric === 'water') return Object.keys(waterPerDay).filter((k) => inWin(c, k) && waterPerDay[k] >= 2500).length;
        if (c.metric === 'checkin') { const s = new Set<string>(); meals.forEach((m) => inWin(c, m.date) && s.add(m.date)); for (const k of Object.keys(waterPerDay)) if (inWin(c, k)) s.add(k); return s.size; }
        return bodyAnalyses.length ? 80 : 0;
      };
      const completed = gam.challenges.filter((c) => c.active && progressOf(c) >= c.target);
      const autoPoints = completed.reduce((s, c) => s + c.points, 0);

      const autoBadgesEarned = [
        meals.length >= 1, streak >= 7, streak >= 30, waterGoalDays >= 7, meals.length >= 30, breakfast >= 7, completed.length >= 1,
      ].filter(Boolean).length;
      const myManual = gam.manualPoints[meId] || 0;
      const myBadgeCount = autoBadgesEarned + gam.badgeAwards.filter((b) => b.userId === meId).length;

      setMy({ streak, activeDays, waterGoalDays, points: myManual + autoPoints, badgeCount: myBadgeCount, breakfast });

      // جدول
      const list: Entry[] = clients.map((c) => {
        const snaps = snapsByUser.get(c.nationalId) || [];
        let wellness = 50;
        if (snaps.length) {
          const l = snaps[snaps.length - 1];
          const ok = [l.bmi >= 18.5 && l.bmi <= 24.9, l.vfl <= 9, l.pbfPercent <= (c.sex === 'male' ? 25 : 32)].filter(Boolean).length;
          wellness = Math.round((ok / 3) * 100);
        }
        let imp = 0;
        if (snaps.length >= 2) { const f = snaps[0], l = snaps[snaps.length - 1]; imp = Math.min(Math.max((f.weightKg - l.weightKg) + (f.vfl - l.vfl) * 2 + (f.pbfPercent - l.pbfPercent), 0), 20); }
        const isMe = c.nationalId === meId;
        const adherence = isMe ? Math.min(activeDays, days) * 3 + Math.min(waterGoalDays, days) * 3 : Math.round(wellness * 0.42);
        const pts = (gam.manualPoints[c.nationalId] || 0) + (isMe ? autoPoints : 0);
        const bdg = gam.badgeAwards.filter((b) => b.userId === c.nationalId).length + (isMe ? autoBadgesEarned : 0);
        return { id: c.nationalId, isMe, badges: bdg, score: Math.round(wellness * 0.4 + adherence + imp + pts + bdg * 5) };
      }).sort((a, b) => b.score - a.score);
      setEntries(list);
    }, 0);
    return () => clearTimeout(t);
  }, [idx, clients, gam, meId, days, meals, bodyAnalyses]);

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };

  return (
    <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: 80 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{isFa ? 'لیدربورد و گیمیفیکیشن' : 'Leaderboard & Gamification'}</Text>
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: colors.surfaceAlt, borderRadius: 999, padding: 3 }}>
          {(['board', 'badges', 'challenges'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: tab === t ? colors.primary : 'transparent' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: tab === t ? '#FFFFFF' : colors.textSecondary }}>
                {t === 'board' ? (isFa ? 'جدول' : 'Board') : t === 'badges' ? (isFa ? 'بج‌ها' : 'Badges') : isFa ? 'چالش‌ها' : 'Challenges'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* بنر استریک */}
      <View style={[card, { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warningSoft, marginBottom: 8 }]}>
        <IconTile icon="flame" tone={colors.warning} size={34} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.warning }}>{n(my.streak)} {isFa ? 'روز استریک' : 'day streak'}</Text>
          <Text style={{ fontSize: 8, color: colors.textSecondary }}>{isFa ? `${n(my.activeDays)} روز فعال · ${n(my.waterGoalDays)} روز آب کامل` : `${my.activeDays} active · ${my.waterGoalDays} water days`}</Text>
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.primarySoft }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>{n(my.points)} {isFa ? 'امتیاز' : 'pts'}</Text>
        </View>
      </View>

      {tab === 'board' && (
        <>
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
            {(['week', 'month'] as const).map((p) => (
              <Pressable key={p} onPress={() => setPeriod(p)} style={{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', backgroundColor: period === p ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: period === p ? colors.primary : colors.border }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: period === p ? '#FFFFFF' : colors.textSecondary }}>{p === 'week' ? (isFa ? 'هفته' : 'Week') : isFa ? 'ماه' : 'Month'}</Text>
              </Pressable>
            ))}
          </View>

          {!entries ? (
            <View style={[card, { alignItems: 'center', padding: 24 }]}>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{isFa ? 'در حال محاسبهٔ رتبه‌ها...' : 'Computing ranks...'}</Text>
            </View>
          ) : (
            <>
              {entries.length >= 3 && (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
                  {[1, 0, 2].map((idx2) => { const e = entries[idx2]; const h = idx2 === 0 ? 70 : idx2 === 1 ? 55 : 45; return (
                    <View key={idx2} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 14 }}>{idx2 === 0 ? '🥇' : idx2 === 1 ? '🥈' : '🥉'}</Text>
                      <Text numberOfLines={1} style={{ fontSize: 9, fontWeight: '700', color: e.isMe ? colors.primary : colors.text }}>{maskNationalId(e.id)}</Text>
                      <View style={{ width: '100%', height: h, borderRadius: 8, backgroundColor: idx2 === 0 ? colors.warning : idx2 === 1 ? colors.textMuted : colors.chart[1], alignItems: 'center', paddingTop: 6, marginTop: 3 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{n(e.score)}</Text>
                      </View>
                    </View> ); })}
                </View>
              )}
              <View style={card}>
                <SectionTitle>{isFa ? 'رتبه‌بندی کارکنان' : 'Employee Ranking'}</SectionTitle>
                {entries.map((e, i) => (
                  <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: i < entries.length - 1 ? 1 : 0, borderBottomColor: colors.border, backgroundColor: e.isMe ? colors.primarySoft : 'transparent', borderRadius: e.isMe ? 8 : 0, paddingHorizontal: e.isMe ? 6 : 0 }}>
                    <Text style={{ width: 24, fontSize: 11, fontWeight: '800', color: i < 3 ? colors.warning : colors.textMuted }}>{n(i + 1)}</Text>
                    <IconTile icon="profile" tone={e.isMe ? colors.primary : colors.chart[i % colors.chart.length]} size={24} />
                    <View style={{ flex: 1, marginLeft: 7 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: e.isMe ? colors.primary : colors.text }}>{maskNationalId(e.id)}{e.isMe ? ` (${isFa ? 'شما' : 'You'})` : ''}</Text>
                      <Text style={{ fontSize: 8, color: colors.textMuted }}>{n(e.badges)} {isFa ? 'بج' : 'badges'}</Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{n(e.score)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}

      {tab === 'badges' && (
        <View style={card}>
          <SectionTitle>{isFa ? 'بج‌های من' : 'My Badges'}</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[
              { icon: 'meal' as IconName, fa: 'اولین ثبت', en: 'First Log', earned: true },
              { icon: 'flame' as IconName, fa: 'استریک ۷ روز', en: '7-day', earned: my.streak >= 7 },
              { icon: 'flame' as IconName, fa: 'استریک ۳۰ روز', en: '30-day', earned: my.streak >= 30 },
              { icon: 'water' as IconName, fa: 'قهرمان آب', en: 'Water Hero', earned: my.waterGoalDays >= 7 },
              { icon: 'sunny' as IconName, fa: 'سحرخیز', en: 'Early Bird', earned: my.breakfast >= 7 },
            ].map((b, i) => (
              <View key={i} style={{ width: '30%', alignItems: 'center', backgroundColor: b.earned ? colors.accentSoft : colors.surfaceAlt, borderRadius: 10, padding: 8, borderWidth: 1, borderColor: b.earned ? colors.success : colors.border, opacity: b.earned ? 1 : 0.5 }}>
                <Icon name={b.icon} size={18} color={b.earned ? colors.success : colors.textMuted} />
                <Text style={{ fontSize: 8, fontWeight: '700', color: b.earned ? colors.success : colors.textMuted, marginTop: 4, textAlign: 'center' }}>{isFa ? b.fa : b.en}</Text>
              </View>
            ))}
          </View>
          {gam.badgeAwards.filter((b) => b.userId === meId).map((b) => (
            <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 8, padding: 7, marginTop: 6 }}>
              <Icon name={(b.icon as IconName) || 'tips'} size={14} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 7 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>{b.titleFa}</Text>
                <Text style={{ fontSize: 8, color: colors.textSecondary }}>{b.reason}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {tab === 'challenges' && (
        <View style={card}>
          <SectionTitle>{isFa ? 'چالش‌های فعال' : 'Active Challenges'}</SectionTitle>
          {gam.challenges.filter((c) => c.active).length === 0 ? (
            <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 9, color: colors.textMuted }}>{isFa ? 'چالشی فعال نیست' : 'No active challenges'}</Text>
            </View>
          ) : (
            gam.challenges.filter((c) => c.active).map((c) => (
              <View key={c.id} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 8, marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{isFa ? c.titleFa : c.titleEn}</Text>
                  <View style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.warning }}>
                    <Text style={{ fontSize: 8, fontWeight: '700', color: '#FFFFFF' }}>+{n(c.points)}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 4 }}>{isFa ? `معیار: ${c.metric} · هدف ${n(c.target)}` : `${c.metric} · target ${c.target}`}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}