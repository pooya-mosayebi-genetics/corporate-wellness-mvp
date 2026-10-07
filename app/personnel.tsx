import { useState, useCallback } from 'react';
import { Text, View, ScrollView, Pressable, Alert } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useAudit } from '../src/store/AuditContext';
import { useAuth } from '../src/store/AuthContext';
import { canAccess } from '../src/utils/access';
import { faNum } from '../src/utils/format';
import Icon from '../src/components/ui/Icon';
import { router } from 'expo-router';
import PersonnelServerImportCard from '../src/components/personnel/PersonnelServerImportCard';
import PersonnelServerList, { refetchPersonnelList } from '../src/components/personnel/PersonnelServerList';

export default function PersonnelScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { log } = useAudit();
  const { session } = useAuth();

  const role = session?.role;
  const canManage = !!role && canAccess(role, 'personnel');
  const canImport = !!role && canAccess(role, 'import');

  const onImportSuccess = useCallback(() => {
    log({
      action: 'personnel:import',
      entity: 'personnel',
      severity: 'warn',
      messageFa: 'واردسازی پرسنل از طریق سرور با موفقیت انجام شد',
    });
    refetchPersonnelList();
  }, [log]);

  if (!canManage) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Icon name="shield" size={28} color={colors.textMuted} />
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 10, textAlign: 'center' }}>
          {isFa
            ? 'شما دسترسی لازم برای مشاهده این بخش را ندارید.'
            : 'You do not have permission to access this section.'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 12,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? 'بازگشت' : 'Back'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 10, paddingBottom: 30 }}>
      {/* هدر */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.text }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{isFa ? 'پرسنل سازمان' : 'Organization Personnel'}</Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: colors.primarySoft,
            marginLeft: 8,
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>
            {isFa ? 'سرور' : 'Server'}
          </Text>
        </View>
      </View>

      {/* کارت Import (فقط مدیران) */}
      {canImport && <PersonnelServerImportCard onSuccess={onImportSuccess} />}

      {/* لیست از سرور */}
      <PersonnelServerList />
    </ScrollView>
  );
}