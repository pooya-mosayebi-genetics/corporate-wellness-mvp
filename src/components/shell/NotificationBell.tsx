import { useState } from 'react';
import { Text, View, Modal, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { useNotification } from '../../store/NotificationContext';
import type { NotifSettings } from '../../store/NotificationContext';
import { useAuth } from '../../store/AuthContext';
import { faNum } from '../../utils/format';
import Icon, { IconName } from '../ui/Icon';
import { router } from 'expo-router';

/* 🆕 L-10: افزودن security_alert به مپ‌ها */
const TYPE_ICON: Record<string, IconName> = { 
  water: 'water', meal: 'meal', checkin: 'heart', streak: 'flame', challenge: 'tips', diet: 'diet',
  security_alert: 'shield' // 🆕 آیکن سپر/هشدار
};
const TYPE_TONE: Record<string, string> = { 
  water: '#06B6D4', meal: '#F59E0B', checkin: '#8B5CF6', streak: '#EF4444', challenge: '#14B8A6', diet: '#23408E',
  security_alert: '#DC2626' // 🆕 رنگ قرمز بحرانی
};

/** ✅ فونت یکسان با بقیهٔ اپ */
const FONT = 'Vazirmatn, Vazir, Tahoma, sans-serif';
/** ✅ استایل متن تراز‌شده کنار آیکون */
const tx = (size: number, color: string, weight?: string) => ({
  fontSize: size,
  color,
  fontWeight: (weight ?? '400') as any,
  fontFamily: FONT,
  includeFontPadding: false,
  textAlignVertical: 'center' as const,
});

export default function NotificationBell({ floating = false }: { floating?: boolean }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { state, unread, markRead, markAllRead, clearAll, setSetting } = useNotification();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const myId = session?.nationalId ?? '';

  const mine = state.notifications.filter((nn) => !nn.userId || nn.userId === myId);

  /** ✅ ساعت ارسال با اعداد فارسی */
  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const isToday = new Date().toDateString() === d.toDateString();
    const t = d.toLocaleTimeString(isFa ? 'fa-IR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return t;
    return `${d.toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { month: 'short', day: 'numeric' })} · ${t}`;
  };

  const onTick = (id: string) => markRead(id);
  const onView = (id: string, action?: string) => {
    markRead(id);
    setOpen(false);
    if (action) router.push(action as any);
  };

  const bell = (
    <Pressable onPress={() => setOpen(true)} style={{ width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
      <Icon name="tips" size={15} color={colors.textSecondary} />
      {unread > 0 && (
        <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
          <Text style={tx(8, '#FFFFFF', '800')}>{n(unread)}</Text>
        </View>
      )}
    </Pressable>
  );

  const settingsRows: { key: keyof NotifSettings; fa: string; en: string }[] = [
    { key: 'water', fa: 'یادآوری آب', en: 'Water' },
    { key: 'meals', fa: 'یادآوری وعده‌ها', en: 'Meals' },
    { key: 'checkin', fa: 'چک‌این شبانه', en: 'Check-in' },
    { key: 'streak', fa: 'هشدار استریک', en: 'Streak' },
    { key: 'challenges', fa: 'ددلاین چالش‌ها', en: 'Challenges' },
  ];

  return (
    <>
      {floating ? <View style={{ position: 'absolute', bottom: 76, right: 14, zIndex: 50 }}>{bell}</View> : bell}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420, maxHeight: '80%', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 14, fontFamily: FONT }}>
            {/* هدر */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={tx(14, colors.text, '800')}>{isFa ? 'مرکز اعلان' : 'Notifications'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Pressable onPress={() => setShowSettings((v) => !v)} style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="settings" size={12} color={colors.textSecondary} />
                </Pressable>
                <Pressable onPress={markAllRead} style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={tx(9, colors.textSecondary, '700')}>{isFa ? 'خواندن همه' : 'Read all'}</Text>
                </Pressable>
                <Pressable onPress={() => setOpen(false)} style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
                  <Text style={tx(12, colors.textSecondary)}>✕</Text>
                </Pressable>
              </View>
            </View>

            {showSettings ? (
              <View>
                {settingsRows.map((r) => (
                  <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={tx(11, colors.textSecondary)}>{isFa ? r.fa : r.en}</Text>
                    <Pressable onPress={() => setSetting(r.key, !state.settings[r.key])} style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: state.settings[r.key] ? colors.success : colors.border, justifyContent: 'center', paddingHorizontal: 2 }}>
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF', alignSelf: state.settings[r.key] ? 'flex-end' : 'flex-start' }} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                {mine.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={tx(10, colors.textMuted)}>{isFa ? 'اعلانی نیست' : 'No notifications'}</Text>
                  </View>
                ) : (
                  mine.map((nt) => {
                    // 🆕 L-10: تشخیص و استایل‌دهی ویژه برای security_alert
                    const isSecurity = nt.type === 'security_alert';
                    
                    return (
                      <View 
                        key={nt.id} 
                        style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          paddingVertical: 8, 
                          paddingHorizontal: isSecurity ? 8 : 0,
                          marginBottom: isSecurity ? 4 : 0,
                          borderBottomWidth: 1, 
                          borderBottomColor: colors.border, 
                          opacity: nt.read ? 0.65 : 1,
                          backgroundColor: isSecurity && !nt.read ? '#fef2f2' : 'transparent', // پس‌زمینه قرمز روشن برای alert خوانده‌نشده
                          borderRadius: isSecurity ? 8 : 0,
                          borderWidth: isSecurity ? 1 : 0,
                          borderColor: isSecurity ? '#dc2626' : 'transparent',
                        }}
                      >
                        <Pressable onPress={() => onTick(nt.id)} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: (TYPE_TONE[nt.type] ?? colors.primary) + '22', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                            <Icon name={TYPE_ICON[nt.type] ?? 'tips'} size={13} color={TYPE_TONE[nt.type] ?? colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Text style={tx(11, nt.read ? colors.textSecondary : (isSecurity ? '#b91c1c' : colors.text), '700')}>
                                {isFa ? nt.titleFa : nt.titleEn}
                              </Text>
                              <Text style={tx(8, colors.textMuted)}>{fmtTime(nt.at)}</Text>
                            </View>
                            <Text style={[tx(9, isSecurity ? '#7f1d1d' : colors.textMuted), { marginTop: 2 }]}>
                              {isFa ? nt.bodyFa : nt.bodyEn}
                            </Text>
                            {nt.action ? (
                              <Pressable onPress={() => onView(nt.id, nt.action)} style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: isSecurity ? '#fee2e2' : colors.primarySoft, marginTop: 4 }}>
                                <Text style={tx(8, isSecurity ? '#b91c1c' : colors.primary, '700')}>{isFa ? 'مشاهده ←' : 'View →'}</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        </Pressable>
                        {!nt.read && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isSecurity ? '#dc2626' : colors.danger, marginLeft: 6 }} />}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}

            {!showSettings && mine.length > 0 && (
              <Pressable onPress={clearAll} style={{ marginTop: 8, paddingVertical: 7, borderRadius: 8, alignItems: 'center', backgroundColor: colors.surfaceAlt }}>
                <Text style={tx(9, colors.textMuted, '700')}>{isFa ? 'پاک‌کردن همه' : 'Clear all'}</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}