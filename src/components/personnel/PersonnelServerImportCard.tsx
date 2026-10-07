import { useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { api } from '../../lib/api';
import Icon from '../ui/Icon';
import { SectionTitle } from '../ui/Card';
import { parsePersonnelFile, importPersonnelRows } from '../../utils/personnelImport';
import { isValidNationalId } from '../../utils/nationalId';
import { notifyPersonnelChanged } from '../../utils/personnelBus';

interface Props {
  onSuccess?: () => void;
}

export default function PersonnelServerImportCard({ onSuccess }: Props) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    updated: number;
    failed: number;
    skipped: number;
    orgsCreated: number;
    errors: any[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const doImport = useCallback(async () => {
    setBusy(true);
    setErr(null);
    setResult(null);

    try {
      // ۱) انتخاب فایل
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/plain',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: false,
      });
      if (res.canceled || !res.assets?.length) {
        setBusy(false);
        return;
      }

      // ۲) پارس با تنها پارسر معتبر سیستم
      const blob = await fetch(res.assets[0].uri).then((r) => r.blob());
      const rawRows = await parsePersonnelFile(blob);

      if (rawRows.length === 0) {
        setErr(isFa ? 'هیچ رکورد معتبری در فایل یافت نشد' : 'No valid records found');
        setBusy(false);
        return;
      }

      // ۳) نرمال‌سازی با منطق خود ژرفا
      const normalized = importPersonnelRows(rawRows, [], []);

      // ۴) فیلتر چک‌سام کد ملی قبل از ارسال (تا سرور کل batch را رد نکند)
      const validPersons = normalized.persons.filter((p) => isValidNationalId(p.nationalId));
      const skippedCount = normalized.skipped.length + (normalized.persons.length - validPersons.length);

      if (validPersons.length === 0) {
        setErr(isFa ? 'هیچ کد ملی معتبری (با چک‌سام) در فایل یافت نشد' : 'No checksum-valid national IDs found');
        setBusy(false);
        return;
      }

      // ۵) تبدیل به فرمت API و ارسال
      const apiRows = validPersons.map((p) => ({
        nationalId: p.nationalId,
        fullName: p.fullName,
        fullNamePrefixed: p.fullNamePrefixed ?? null,
        mobile: p.mobile ?? null,
        birthDate: p.birthDate ?? null,
        gender: p.gender ?? null,
        position: null,
        department: null,
        orgId: p.orgId ?? null,
        role: p.role ?? null,
      }));

      const apiResult = await api.importPersonnel(apiRows);

      setResult({ ...apiResult, skipped: skippedCount });

      if (apiResult.inserted > 0 || apiResult.updated > 0) {
        notifyPersonnelChanged();
        onSuccess?.();
      }
    } catch (e: any) {
      console.error('[PersonnelImport]', e);
      const ae = e?.apiError;
      setErr(ae?.fa || ae?.en || e?.message || (isFa ? 'خطا در import' : 'Import failed'));
    } finally {
      setBusy(false);
    }
  }, [isFa, onSuccess]);

  const reset = () => {
    setResult(null);
    setErr(null);
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: 14,
        padding: 12,
        marginTop: 8,
      }}
    >
      <SectionTitle>{isFa ? 'واردسازی CSV/Excel پرسنل' : 'Import Personnel CSV/Excel'}</SectionTitle>

      <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 8, lineHeight: 14 }}>
        {isFa
          ? 'فایل Excel یا CSV با ستون‌های: کد ملی، نام، نام خانوادگی، شماره موبایل'
          : 'Excel or CSV with columns: NationalID, Name, Mobile'}
      </Text>

      {!result && !err && (
        <Pressable
          onPress={doImport}
          disabled={busy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: colors.primary,
            borderRadius: 10,
            paddingVertical: 10,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Icon name="upload" size={13} color="#FFF" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                {isFa ? 'انتخاب و import فایل' : 'Pick file & Import'}
              </Text>
            </>
          )}
        </Pressable>
      )}

      {err && (
        <View
          style={{
            backgroundColor: colors.dangerSoft,
            borderRadius: 10,
            padding: 10,
            borderWidth: 1,
            borderColor: colors.danger,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.danger }}>❌ {err}</Text>
          <Pressable
            onPress={reset}
            style={{
              marginTop: 8,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: colors.surfaceAlt,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>
              {isFa ? 'تلاش مجدد' : 'Try again'}
            </Text>
          </Pressable>
        </View>
      )}

      {result && (
        <View
          style={{
            backgroundColor: colors.success + '22',
            borderRadius: 10,
            padding: 10,
            borderWidth: 1,
            borderColor: colors.success,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.success, marginBottom: 6 }}>
            ✅ {isFa ? 'Import با موفقیت انجام شد' : 'Import completed'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 8, padding: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.success }}>{result.inserted}</Text>
              <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'جدید' : 'Inserted'}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 8, padding: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{result.updated}</Text>
              <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'به‌روزشده' : 'Updated'}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 8, padding: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.warning }}>{result.skipped}</Text>
              <Text style={{ fontSize: 8, color: colors.textMuted }}>{isFa ? 'رد شده' : 'Skipped'}</Text>
            </View>
          </View>

          {result.errors.length > 0 && (
            <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 8, padding: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.danger, marginBottom: 4 }}>
                {isFa ? 'خطاهای سرور:' : 'Server errors:'}
              </Text>
              {result.errors.slice(0, 5).map((e, i) => (
                <Text key={i} style={{ fontSize: 9, color: colors.text, lineHeight: 14 }}>
                  #{e.index}: {e.nationalId} — {e.message}
                </Text>
              ))}
            </View>
          )}

          <Pressable
            onPress={reset}
            style={{ paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
              {isFa ? 'Import مجدد' : 'Import another'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}