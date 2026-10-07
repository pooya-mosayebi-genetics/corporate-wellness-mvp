import { useState } from 'react';
import { Text, View, ScrollView, TextInput, Pressable } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { useAuth } from '../src/store/AuthContext';
import { Card, SectionTitle, IconTile } from '../src/components/ui/Card';
import Icon from '../src/components/ui/Icon';
import BrandLogo from '../src/components/ui/BrandLogo';
import { BRAND } from '../src/config/brand';
import { router } from 'expo-router';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { language, t } = useLanguage();
  const isFa = language === 'fa';
  const { state, setProfile } = useWellness();
  const { session } = useAuth();
  const existing = state.profile;

  const isAdminish = session?.role === 'admin' || session?.role === 'coach';
  const genderLocked = !!existing;          // جنسیت پس از اولین ثبت قفل
  const hwLocked = !isAdminish;             // قد/وزن فقط ادمین/کوچ (یا ایمپورت)

  const [age, setAge] = useState(existing ? String(existing.age) : '');
  const [gender, setGender] = useState<'male' | 'female' | ''>(existing?.gender ?? '');
  const [height, setHeight] = useState(existing ? String(existing.heightCm) : '');
  const [weight, setWeight] = useState(existing ? String(existing.weightKg) : '');
  const [activity, setActivity] = useState(existing?.activityLevel ?? 'moderate');
  const [goal, setGoal] = useState(existing?.goal ?? 'lose_fat');
  const [error, setError] = useState<string | null>(null);

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };
  const inp = (disabled: boolean) => ({
    backgroundColor: disabled ? colors.surfaceAlt : colors.surfaceAlt,
    borderRadius: 8, borderWidth: 1, borderColor: disabled ? colors.border : colors.primary + '66',
    paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: disabled ? colors.textMuted : colors.text,
  });

  const save = () => {
    const a = parseInt(age, 10); const h = parseFloat(height); const w = parseFloat(weight);
    if (!a || a < 10 || a > 100) { setError(isFa ? 'سن معتبر وارد کنید' : 'Valid age required'); return; }
    if (!gender) { setError(isFa ? 'جنسیت را انتخاب کنید' : 'Select gender'); return; }
    // قد/وزن: اگر قفل باشد، مقدار قبلی حفظ می‌شود
    const finalH = hwLocked && existing ? existing.heightCm : h;
    const finalW = hwLocked && existing ? existing.weightKg : w;
    if (!hwLocked && (!finalH || !finalW)) { setError(isFa ? 'قد و وزن الزامی است' : 'Height & weight required'); return; }
    if (hwLocked && !existing) { setError(isFa ? 'قد و وزن توسط کارشناس/ایمپورت تنظیم می‌شود' : 'Height/weight set by admin/import'); return; }
    setError(null);
    setProfile({
      age: a,
      gender: gender as 'male' | 'female',
      heightCm: finalH,
      weightKg: finalW,
      activityLevel: activity as any,
      goal: goal as any,
    });
    router.back();
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: 30 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <BrandLogo size={28} />
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{BRAND.title}</Text>
          <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'تنظیم پروفایل سلامت' : 'Health profile setup'}</Text>
        </View>
        <Pressable onPress={() => router.back()} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}>
          <Text style={{ fontSize: 12, color: colors.text }}>✕</Text>
        </Pressable>
      </View>

      <View style={[card, { marginBottom: 6 }]}>
        <SectionTitle>{isFa ? 'اطلاعات پایه' : 'Basic info'}</SectionTitle>

        <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3 }}>{t('age')}</Text>
        <TextInput style={inp(false)} keyboardType="numeric" value={age} onChangeText={(v) => setAge(v.replace(/\D/g, ''))} placeholder="30" placeholderTextColor={colors.textMuted} />

        <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 6, marginBottom: 3 }}>
          {t('gender')} {genderLocked && <Text style={{ color: colors.warning }}> 🔒 {isFa ? 'قفل (پس از ثبت قابل تغییر نیست)' : 'locked'}</Text>}
        </Text>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {(['male', 'female'] as const).map((g) => (
            <Pressable key={g} disabled={genderLocked} onPress={() => setGender(g)} style={{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', backgroundColor: gender === g ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: gender === g ? colors.primary : colors.border, opacity: genderLocked && gender !== g ? 0.5 : 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: gender === g ? '#FFFFFF' : colors.textSecondary }}>
                {g === 'male' ? (isFa ? 'مرد' : 'Male') : isFa ? 'زن' : 'Female'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 5, marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3 }}>
              {t('height')} (cm) {hwLocked && <Text style={{ color: colors.warning }}> 🔒</Text>}
            </Text>
            <TextInput style={inp(hwLocked)} keyboardType="numeric" editable={!hwLocked} value={height} onChangeText={(v) => setHeight(v.replace(/[^\d.]/g, ''))} placeholder="170" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3 }}>
              {t('weight')} (kg) {hwLocked && <Text style={{ color: colors.warning }}> 🔒</Text>}
            </Text>
            <TextInput style={inp(hwLocked)} keyboardType="numeric" editable={!hwLocked} value={weight} onChangeText={(v) => setWeight(v.replace(/[^\d.]/g, ''))} placeholder="70" placeholderTextColor={colors.textMuted} />
          </View>
        </View>
        {hwLocked && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: colors.warningSoft, borderRadius: 8, padding: 6 }}>
            <Icon name="lock" size={11} color={colors.warning} />
            <Text style={{ fontSize: 8, color: colors.warning }}>
              {isFa ? 'قد و وزن فقط توسط کارشناس/ادمین یا از طریق فایل ایمپورت تنظیم می‌شود؛ شما فقط مشاهده می‌کنید.' : 'Height/weight are set by coach/admin or import file; view-only for you.'}
            </Text>
          </View>
        )}
      </View>

      <View style={[card, { marginBottom: 6 }]}>
        <SectionTitle>{t('activityLevel')}</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
          {(['sedentary', 'light', 'moderate', 'active', 'very_active'] as const).map((a) => (
            <Pressable key={a} onPress={() => setActivity(a)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: activity === a ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: activity === a ? colors.primary : colors.border }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: activity === a ? '#FFFFFF' : colors.textSecondary }}>
                {a === 'sedentary' ? (isFa ? 'کم‌تحرک' : 'Sedentary') : a === 'light' ? (isFa ? 'سبک' : 'Light') : a === 'moderate' ? (isFa ? 'متوسط' : 'Moderate') : a === 'active' ? (isFa ? 'فعال' : 'Active') : isFa ? 'خیلی فعال' : 'Very active'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[card, { marginBottom: 6 }]}>
        <SectionTitle>{t('goal')}</SectionTitle>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {(['lose_fat', 'maintain', 'gain_muscle'] as const).map((g) => (
            <Pressable key={g} onPress={() => setGoal(g)} style={{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', backgroundColor: goal === g ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: goal === g ? colors.primary : colors.border }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: goal === g ? '#FFFFFF' : colors.textSecondary }}>
                {g === 'lose_fat' ? (isFa ? 'کاهش چربی' : 'Lose fat') : g === 'maintain' ? (isFa ? 'ثابت' : 'Maintain') : isFa ? 'افزای عضله' : 'Gain muscle'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error && (
        <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 8, padding: 7, marginBottom: 6 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.danger }}>{error}</Text>
        </View>
      )}

      <Pressable onPress={save} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{existing ? (isFa ? '💾 ذخیره تغییرات' : '💾 Save') : isFa ? '✅ ایجاد پروفایل' : '✅ Create profile'}</Text>
      </Pressable>
    </ScrollView>
  );
}