import { useState } from 'react';
import { Text, View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { useAuth } from '../src/store/AuthContext';
import { usePersonnel, calcAgeJalali, parseJalali } from '../src/store/PersonnelContext';
import { SectionTitle, IconTile, InfoRow, LinkRow } from '../src/components/ui/Card';
import Icon from '../src/components/ui/Icon';
import BrandLogo from '../src/components/ui/BrandLogo';
import { BRAND } from '../src/config/brand';
import { faNum } from '../src/utils/format';
import { canAccess } from '../src/utils/access';
import { buildPersonalBackup, downloadBackup, parseBackup } from '../src/services/backup';
import { themeLabels } from '../src/theme/colors';
import type { ThemeMode } from '../src/theme/colors';
import { languageLabels } from '../src/i18n/translations';
import type { Language } from '../src/i18n/translations';
import { router } from 'expo-router';
// 🆕 کارت تغییر رمز عبور (متصل به بک‌اند)
import ChangePasswordCard from '../src/components/settings/ChangePasswordCard';

/* ── توکن‌های زبان طراحی ژرفا (ZDL) — همان مقیاس سراسری ── */
const Z_RADIUS = { card: 14, inner: 12, control: 10, chip: 999 };
const Z_SPACE = { xs: 4, sm: 8, md: 12, lg: 16 };

/** ✅ تبدیل به ارقام فارسی بدون جداکننده هزارگان (مناسب موبایل/سال تولد) */
const faPlain = (v: string | number) => {
  const s = String(v);
  return s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
};

export default function ProfileScreen() {
  const { state, resetApp, restoreState } = useWellness();
  const { mode, colors, setMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { session, logout } = useAuth();
  const { getByNationalId } = usePersonnel();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { width: winW } = useWindowDimensions();
  const isWide = winW >= 900;
  const { profile, targets } = state;
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const rec = session ? getByNationalId(session.nationalId) : undefined;
  const birthDate = rec?.birthDate ?? null;
  const birthParsed = birthDate ? parseJalali(birthDate) : null;
  const ageExact = birthDate ? calcAgeJalali(birthDate) : null;

  /* ✅ کارت‌ها با شعاع و فاصلهٔ ژرفا */
  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: Z_RADIUS.card, padding: Z_SPACE.md };
  const col = (b: string) => ({ flexBasis: b, flexGrow: 1, padding: Z_SPACE.xs });

  const doExport = () => { downloadBackup(`themin-personal-${new Date().toISOString().slice(0, 10)}.json`, buildPersonalBackup(state)); setBackupMsg(isFa ? '✓ دانلود شد' : '✓ Downloaded'); };
  const doRestore = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: false });
      if (res.canceled || !res.assets?.length) return;
      const text = await fetch(res.assets[0].uri).then((r) => r.text());
      restoreState(parseBackup(text));
      setBackupMsg(isFa ? '✓ بازیابی شد' : '✓ Restored');
    } catch { setBackupMsg(isFa ? '❌ نامعتبر' : '❌ Invalid'); }
  };

  if (!profile) {
    return (
      <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: Z_SPACE.md, paddingBottom: 80 }}>
        <View style={[card, { alignItems: 'center', padding: 28 }]}>
          <BrandLogo size={44} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginTop: Z_SPACE.sm }}>{t('profileNotSetUp')}</Text>
          <Pressable onPress={() => router.push('/onboarding')} style={{ backgroundColor: colors.primary, borderRadius: Z_RADIUS.control, paddingHorizontal: 18, paddingVertical: 9, marginTop: Z_SPACE.md }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{t('setUpProfile')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const genderLabel = profile.gender === 'male' ? (isFa ? 'مرد' : 'Male') : profile.gender === 'female' ? (isFa ? 'زن' : 'Female') : 'Other';
  const activityLabel =
    profile.activityLevel === 'sedentary' ? (isFa ? 'کم‌تحرک' : 'Sedentary') : profile.activityLevel === 'light' ? (isFa ? 'سبک' : 'Light') :
    profile.activityLevel === 'moderate' ? (isFa ? 'متوسط' : 'Moderate') : profile.activityLevel === 'active' ? (isFa ? 'فعال' : 'Active') : isFa ? 'خیلی فعال' : 'Very Active';
  const goalLabel = profile.goal === 'lose_fat' ? (isFa ? 'کاهش چربی' : 'Lose Fat') : profile.goal === 'maintain' ? (isFa ? 'ثابت' : 'Maintain') : isFa ? 'افزای عضله' : 'Gain Muscle';
  const Lock = () => <Icon name="lock" size={10} color={colors.warning} />;

  const ageDisplay = ageExact
    ? (isFa ? `${faPlain(ageExact.years)} سال و ${faPlain(ageExact.months)} ماه و ${faPlain(ageExact.days)} روز` : `${ageExact.years}y ${ageExact.months}m ${ageExact.days}d`)
    : `${profile.age}`;

  const birthDisplay = birthParsed
    ? (isFa ? `${faPlain(birthParsed.y)}/${faPlain(String(birthParsed.m).padStart(2, '0'))}/${faPlain(String(birthParsed.d).padStart(2, '0'))}` : `${birthParsed.y}/${String(birthParsed.m).padStart(2, '0')}/${String(birthParsed.d).padStart(2, '0')}`)
    : '—';

  const mobileDisplay = rec?.mobile ? faPlain(rec.mobile) : '—';

  return (
    <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: Z_SPACE.md, paddingBottom: 80 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Z_SPACE.sm }}>
        <BrandLogo size={28} />
        <View style={{ marginLeft: Z_SPACE.sm, flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{BRAND.title}</Text>
          <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? BRAND.tagline : BRAND.taglineEn}</Text>
        </View>
        <View style={{ paddingHorizontal: Z_SPACE.sm, paddingVertical: Z_SPACE.xs, borderRadius: Z_RADIUS.chip, backgroundColor: colors.accentSoft }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.success }}>{isFa ? 'طرح حرفه‌ای' : 'Pro'}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -Z_SPACE.xs }}>
        <View style={col(isWide ? '50%' : '100%')}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle>{t('appearanceSettings')}</SectionTitle>
            <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: Z_SPACE.xs }}>{isFa ? 'زبان' : 'Language'}</Text>
            <View style={{ flexDirection: 'row', gap: Z_SPACE.sm, marginBottom: Z_SPACE.sm }}>
              {(['en', 'fa'] as Language[]).map((lang) => (
                <Pressable key={lang} onPress={() => setLanguage(lang)} style={{ flex: 1, height: 30, borderRadius: Z_RADIUS.control, alignItems: 'center', justifyContent: 'center', backgroundColor: language === lang ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: language === lang ? colors.primary : colors.border }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: language === lang ? '#FFFFFF' : colors.textSecondary }}>{languageLabels[lang]}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: Z_SPACE.xs }}>{t('theme')}</Text>
            <View style={{ flexDirection: 'row', gap: Z_SPACE.sm }}>
              {(['light', 'dark', 'corporate'] as ThemeMode[]).map((m) => (
                <Pressable key={m} onPress={() => setMode(m)} style={{ flex: 1, height: 30, borderRadius: Z_RADIUS.control, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === m ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: mode === m ? colors.primary : colors.border }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: mode === m ? '#FFFFFF' : colors.textSecondary }}>{themeLabels[m]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* ✅ دسترسی سریع — ژرفا + آنالیز من برای همه */}
        <View style={col(isWide ? '50%' : '100%')}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle>{isFa ? 'دسترسی سریع' : 'Quick Access'}</SectionTitle>

            {/* ✅ آنالیز من — برای همهٔ کاربران */}
            <LinkRow
              icon="analysis"
              tone={colors.primary}
              label={isFa ? 'آنالیز من' : 'My Analysis'}
              sub={isFa ? 'ترکیب بدنی، روندها و سلامت' : 'Composition, trends & health'}
              onPress={() => router.push('/my-analysis')}
            />

            {/* گزارش‌ها فقط برای نقش‌های مجاز */}
            {session && canAccess(session.role, 'reports') && (
              <LinkRow icon="reports" tone={colors.chart[0]} label={isFa ? 'گزارش‌ها' : 'Reports'} sub={isFa ? 'آمار دوره‌ای' : 'Period stats'} onPress={() => router.push('/reports')} />
            )}
            {session && canAccess(session.role, 'coach') && (
              <LinkRow icon="coach" tone={colors.accent} label={t('coachDashboard')} sub={t('coachDashboardDesc')} onPress={() => router.push('/coach')} />
            )}
            {session && canAccess(session.role, 'hr') && (
              <LinkRow icon="org" tone={colors.chart[2]} label={t('hrDashboard')} sub={t('hrDashboardDesc')} onPress={() => router.push('/hr')} />
            )}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -Z_SPACE.xs }}>
        <View style={col(isWide ? '50%' : '100%')}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle action={isFa ? 'ویرایش' : 'Edit'} onAction={() => router.push('/onboarding')}>{t('personalInfo')}</SectionTitle>

            {rec && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <InfoRow icon="profile" tone={colors.chart[3]} label={isFa ? 'نام' : 'Name'} value={rec.fullNamePrefixed || rec.fullName} />
                </View>
                <Lock />
              </View>
            )}

            {rec?.mobile && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <InfoRow icon="trend" tone={colors.chart[2]} label={isFa ? 'موبایل' : 'Mobile'} value={mobileDisplay} />
                </View>
                <Lock />
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <InfoRow icon="calendar" tone={colors.chart[4]} label={isFa ? 'تاریخ تولد' : 'Birth date'} value={birthDisplay} />
              </View>
              <Lock />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <InfoRow icon="calendar" tone={colors.chart[0]} label={t('age')} value={ageDisplay} />
              </View>
              <Lock />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}><InfoRow icon="profile" tone={colors.chart[3]} label={t('gender')} value={genderLabel} /></View>
              <Lock />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}><InfoRow icon="trend" tone={colors.chart[2]} label={t('weight')} value={`${profile.weightKg} kg`} /></View>
              <Lock />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}><InfoRow icon="analysis" tone={colors.chart[4]} label={t('height')} value={`${profile.heightCm} cm`} /></View>
              <Lock />
            </View>
            <InfoRow icon="stress" tone={colors.chart[1]} label={t('activityLevel')} value={activityLabel} />
            <InfoRow icon="heart" tone={colors.accent} label={t('goal')} value={goalLabel} last />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.xs, marginTop: Z_SPACE.sm, backgroundColor: colors.warningSoft, borderRadius: Z_RADIUS.inner, padding: Z_SPACE.sm }}>
              <Icon name="lock" size={10} color={colors.warning} />
              <Text style={{ fontSize: 8, color: colors.warning }}>{isFa ? 'سن/تاریخ تولد/موبایل از پرسنل؛ قد/وزن توسط کارشناس؛ جنسیت پس از ثبت قفل.' : 'Age/birth/mobile from personnel; height/weight by coach; gender locked.'}</Text>
            </View>
          </View>
        </View>

        <View style={col(isWide ? '50%' : '100%')}>
          <View style={[card, { flex: 1 }]}>
            <SectionTitle>{t('dailyTargets')}</SectionTitle>
            <View style={{ backgroundColor: colors.primary, borderRadius: Z_RADIUS.inner, padding: Z_SPACE.md, alignItems: 'center', marginBottom: Z_SPACE.sm }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>{n(targets?.calories ?? 0)}</Text>
              <Text style={{ fontSize: 9, color: '#FFFFFFCC', marginTop: 2 }}>kcal</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: Z_SPACE.sm, marginBottom: Z_SPACE.sm }}>
              {[
                { label: t('protein'), value: `${targets?.macros.proteinGrams ?? 0}g`, tone: colors.chart[3] },
                { label: t('carbs'), value: `${targets?.macros.carbGrams ?? 0}g`, tone: colors.chart[2] },
                { label: t('fat'), value: `${targets?.macros.fatGrams ?? 0}g`, tone: colors.chart[1] },
              ].map((m) => (
                <View key={m.label} style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: Z_RADIUS.inner, padding: Z_SPACE.sm, alignItems: 'center' }}>
                  <Text style={{ fontSize: 8, color: colors.textMuted }}>{m.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: m.tone, marginTop: 2 }}>{n(m.value)}</Text>
                </View>
              ))}
            </View>
            {targets && (
              <>
                <InfoRow icon="flame" tone={colors.chart[0]} label={t('bmrLabel')} value={`${targets.bmr} kcal`} />
                <InfoRow icon="trend" tone={colors.chart[4]} label={t('tdeeLabel')} value={`${targets.tdee} kcal`} last />
              </>
            )}
          </View>
        </View>
      </View>

      {/* 🆕 تغییر رمز عبور (متصل به بک‌اند) */}
      <ChangePasswordCard />

      {/* پشتیبان شخصی */}
      <View style={[card, { marginTop: Z_SPACE.sm, marginBottom: Z_SPACE.sm }]}>
        <SectionTitle>{isFa ? 'پشتیبان شخصی' : 'Personal Backup'}</SectionTitle>
        <View style={{ flexDirection: 'row', gap: Z_SPACE.sm }}>
          <Pressable onPress={doExport} style={{ flex: 1, backgroundColor: colors.primary, borderRadius: Z_RADIUS.control, paddingVertical: 9, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? 'دانلود' : 'Export'}</Text>
          </Pressable>
          <Pressable onPress={doRestore} style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: Z_RADIUS.control, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>{isFa ? 'بازیابی' : 'Restore'}</Text>
          </Pressable>
        </View>
        {backupMsg && <Text style={{ fontSize: 9, fontWeight: '700', color: colors.success, marginTop: Z_SPACE.xs }}>{backupMsg}</Text>}
      </View>

      <View style={{ flexDirection: 'row', gap: Z_SPACE.sm }}>
        <Pressable onPress={() => router.push('/onboarding')} style={{ flex: 1, borderRadius: Z_RADIUS.control, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.primary }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>{t('editProfile')}</Text>
        </Pressable>
        <Pressable onPress={() => logout('manual')} style={{ flex: 1, borderRadius: Z_RADIUS.control, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.dangerSoft }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.danger }}>{isFa ? 'خروج' : 'Sign Out'}</Text>
        </Pressable>
        <Pressable onPress={resetApp} style={{ flex: 1, borderRadius: Z_RADIUS.control, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>{isFa ? 'بازنشانی' : 'Reset'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}