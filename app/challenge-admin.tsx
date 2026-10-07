import { useMemo, useState } from 'react';
import { Text, View, ScrollView, Pressable, TextInput, useWindowDimensions } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { useGamification } from '../src/store/GamificationContext';
import { useAuth } from '../src/store/AuthContext';
import { SectionTitle, IconTile, Chip } from '../src/components/ui/Card';
import Icon, { IconName } from '../src/components/ui/Icon';
import { faNum } from '../src/utils/format';
import { maskNationalId, normalizeNationalId } from '../src/utils/nationalId';
import { router } from 'expo-router';

const METRICS: { key: 'meals' | 'water' | 'checkin' | 'score'; fa: string; en: string }[] = [
  { key: 'meals', fa: 'تعداد وعده', en: 'Meals' },
  { key: 'water', fa: 'روز آب کامل', en: 'Water days' },
  { key: 'checkin', fa: 'روز فعال', en: 'Active days' },
  { key: 'score', fa: 'امتیاز سلامت', en: 'Health score' },
];
const BADGE_ICONS: IconName[] = ['tips', 'flame', 'water', 'meal', 'diet', 'heart', 'trend', 'shield'];

export default function ChallengeAdminScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { width: winW } = useWindowDimensions();
  const isWide = winW >= 900;
  const { state } = useWellness();
  const { state: gam, addChallenge, deleteChallenge, toggleChallenge, awardBadge, revokeBadge } = useGamification();
  const { session } = useAuth();

  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<'meals' | 'water' | 'checkin' | 'score'>('meals');
  const [target, setTarget] = useState('');
  const [points, setPoints] = useState('');
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); });
  const [msg, setMsg] = useState<string | null>(null);

  const [nidInput, setNidInput] = useState('');
  const [selUser, setSelUser] = useState<string | null>(null);
  const [badgeTitle, setBadgeTitle] = useState('');
  const [badgeReason, setBadgeReason] = useState('');
  const [badgeIcon, setBadgeIcon] = useState<IconName>('tips');

  const clients = state.clients;
  const searchMatch = useMemo(() => { const q = normalizeNationalId(nidInput); return q.length >= 4 ? clients.filter((c) => c.nationalId.includes(q)).slice(0, 5) : []; }, [nidInput, clients]);
  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };
  const inp = { backgroundColor: colors.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 8, fontSize: 11, color: colors.text };
  const col = (b: string) => ({ flexBasis: b, flexGrow: 1, padding: 3 });

  const publish = () => {
    if (!title.trim() || !target || !points) { setMsg(isFa ? 'عنوان/هدف/امتیاز الزامی' : 'Title/target/points required'); return; }
    addChallenge({ id: `ch-${Date.now()}`, titleFa: title.trim(), titleEn: title.trim(), metric, target: parseInt(target, 10), points: parseInt(points, 10), start, end, active: true, createdBy: session?.nationalId ?? 'admin', createdAt: new Date().toISOString() } as any);
    setTitle(''); setTarget(''); setPoints(''); setMsg(isFa ? '✓ چالش منتشر شد' : '✓ Published');
  };
  const award = () => {
    if (!selUser || !badgeTitle.trim()) { setMsg(isFa ? 'کاربر و عنوان بج الزامی' : 'User & badge title required'); return; }
    awardBadge({ id: `bg-${Date.now()}`, userId: selUser, titleFa: badgeTitle.trim(), reason: badgeReason.trim(), icon: badgeIcon, tone: colors.primary, awardedBy: session?.nationalId ?? 'admin', awardedAt: new Date().toISOString() } as any);
    setBadgeTitle(''); setBadgeReason(''); setSelUser(null); setNidInput(''); setMsg(isFa ? '✓ بج اهدا شد' : '✓ Awarded');
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{isFa ? 'مدیریت چالش و بج' : 'Challenge & Badge Admin'}</Text>
        <Pressable onPress={() => router.back()} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}>
          <Text style={{ fontSize: 12, color: colors.text }}>←</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 }}>
        <View style={col(isWide ? '50%' : '100%')}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle>{isFa ? 'طراحی چالش جدید' : 'Create Challenge'}</SectionTitle>
            <TextInput style={[inp, { marginBottom: 5 }]} placeholder={isFa ? 'عنوان چالش *' : 'Title *'} placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 5 }} contentContainerStyle={{ paddingRight: 6 }}>
              {METRICS.map((m) => (<Chip key={m.key} label={isFa ? m.fa : m.en} active={metric === m.key} onPress={() => setMetric(m.key)} />))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 5, marginBottom: 5 }}>
              <TextInput style={[inp, { flex: 1 }]} keyboardType="numeric" placeholder={isFa ? 'هدف *' : 'Target *'} placeholderTextColor={colors.textMuted} value={target} onChangeText={(t) => setTarget(t.replace(/\D/g, ''))} />
              <TextInput style={[inp, { flex: 1 }]} keyboardType="numeric" placeholder={isFa ? 'امتیاز *' : 'Points *'} placeholderTextColor={colors.textMuted} value={points} onChangeText={(t) => setPoints(t.replace(/\D/g, ''))} />
            </View>
            <View style={{ flexDirection: 'row', gap: 5, marginBottom: 5 }}>
              <TextInput style={[inp, { flex: 1 }]} value={start} onChangeText={setStart} placeholder="start" placeholderTextColor={colors.textMuted} />
              <TextInput style={[inp, { flex: 1 }]} value={end} onChangeText={setEnd} placeholder="end" placeholderTextColor={colors.textMuted} />
            </View>
            {msg && <View style={{ backgroundColor: colors.accentSoft, borderRadius: 8, padding: 7, marginBottom: 5 }}><Text style={{ fontSize: 9, fontWeight: '700', color: colors.success }}>{msg}</Text></View>}
            <Pressable onPress={publish} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? '📤 انتشار چالش' : ' Publish'}</Text>
            </Pressable>

            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginTop: 8, marginBottom: 4 }}>{isFa ? `چالش‌ها (${n(gam.challenges.length)})` : `Challenges (${gam.challenges.length})`}</Text>
            {gam.challenges.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 7, marginBottom: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{isFa ? c.titleFa : c.titleEn}</Text>
                  <Text style={{ fontSize: 8, color: colors.textMuted }}>{c.metric} · {n(c.target)} · +{n(c.points)}</Text>
                </View>
                <Pressable onPress={() => toggleChallenge(c.id)} style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: c.active ? colors.accentSoft : colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, marginRight: 4 }}>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: c.active ? colors.success : colors.textMuted }}>{c.active ? '✓' : '—'}</Text>
                </Pressable>
                <Pressable onPress={() => deleteChallenge(c.id)} style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft }}>
                  <Icon name="trash" size={10} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        <View style={col(isWide ? '50%' : '100%')}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle>{isFa ? 'اهدای بج به کارمند' : 'Award Badge'}</SectionTitle>
            <TextInput style={[inp, { marginBottom: 5 }]} keyboardType="numeric" placeholder={isFa ? 'کد ملی کارمند...' : 'Employee ID...'} placeholderTextColor={colors.textMuted} value={nidInput} onChangeText={(t) => { setNidInput(t); setSelUser(null); }} />
            {searchMatch.length > 0 && !selUser && (
              <View style={{ marginBottom: 5 }}>
                {searchMatch.map((c) => (
                  <Pressable key={c.nationalId} onPress={() => { setSelUser(c.nationalId); setNidInput(c.nationalId); }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 6, marginBottom: 4 }}>
                    <IconTile icon="profile" tone={colors.chart[0]} size={22} />
                    <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: colors.text, marginLeft: 6 }}>{maskNationalId(c.nationalId)}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <TextInput style={[inp, { marginBottom: 5 }]} placeholder={isFa ? 'عنوان بج *' : 'Badge title *'} placeholderTextColor={colors.textMuted} value={badgeTitle} onChangeText={setBadgeTitle} />
            <TextInput style={[inp, { marginBottom: 5 }]} placeholder={isFa ? 'دلیل اهدا' : 'Reason'} placeholderTextColor={colors.textMuted} value={badgeReason} onChangeText={setBadgeReason} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {BADGE_ICONS.map((ic) => (
                <Pressable key={ic} onPress={() => setBadgeIcon(ic)} style={{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: badgeIcon === ic ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: badgeIcon === ic ? colors.primary : colors.border }}>
                  <Icon name={ic} size={13} color={badgeIcon === ic ? '#FFFFFF' : colors.textMuted} />
                </Pressable>
              ))}
            </View>
            <Pressable onPress={award} style={{ backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? '🏅 اهدای بج' : ' Award'}</Text>
            </Pressable>

            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginTop: 8, marginBottom: 4 }}>{isFa ? `بج‌های اهداشده (${n(gam.badgeAwards.length)})` : `Awarded (${gam.badgeAwards.length})`}</Text>
            {gam.badgeAwards.map((b) => (
              <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 7, marginBottom: 4 }}>
                <Icon name={(b.icon as IconName) || 'tips'} size={14} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 7 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{b.titleFa}</Text>
                  <Text style={{ fontSize: 8, color: colors.textMuted }}>{maskNationalId(b.userId)} · {b.reason}</Text>
                </View>
                <Pressable onPress={() => revokeBadge(b.id)} style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft }}>
                  <Icon name="trash" size={10} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}