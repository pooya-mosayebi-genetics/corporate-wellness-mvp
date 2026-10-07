import { View, Text } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { useAuth } from '../../store/AuthContext';
import { usePersonnel, calcAgeJalali, parseJalali } from '../../store/PersonnelContext';
import { faNum } from '../../utils/format';
import { SectionTitle } from '../ui/Card';

/** ✅ کارت سن و تاریخ تولد — فقط خواندنی، از دیتابیس پرسنل */
export default function ProfileAgeCard() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { session } = useAuth();
  const { getByNationalId } = usePersonnel();
  const rec = session ? getByNationalId(session.nationalId) : undefined;
  const age = rec ? calcAgeJalali(rec.birthDate) : null;
  const b = rec ? parseJalali(rec.birthDate) : null;

  return (
    <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 12, marginBottom: 8 }}>
      <SectionTitle>{isFa ? 'سن و تاریخ تولد' : 'Age & Birth Date'}</SectionTitle>
      {!rec || !age || !b ? (
        <Text style={{ fontSize: 10, color: colors.textMuted }}>{isFa ? 'اطلاعات پرسنلی برای این کاربر ثبت نشده است.' : 'No personnel record for this user.'}</Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>{isFa ? 'تاریخ تولد' : 'Birth date'}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>
              {n(b.y)}/{n(String(b.m).padStart(2, '0'))}/{n(String(b.d).padStart(2, '0'))}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>{isFa ? 'سن دقیق' : 'Exact age'}</Text>
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>
              {n(age.years)} {isFa ? 'سال و' : 'y, '} {n(age.months)} {isFa ? 'ماه و' : 'm, '} {n(age.days)} {isFa ? 'روز' : 'd'}
            </Text>
          </View>
          <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 4 }}>{isFa ? 'منبع: دیتابیس پرسنلی سازمان' : 'Source: organizational personnel DB'}</Text>
        </>
      )}
    </View>
  );
}