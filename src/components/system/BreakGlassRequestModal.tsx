import { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { useBreakGlass } from '../../store/BreakGlassContext';
import { BG_DEFAULT_MINUTES, BG_MAX_MINUTES, BG_MIN_REASON_LEN } from '../../types/breakGlass';
import FixedOverlay from '../ui/FixedOverlay';

export default function BreakGlassRequestModal({
  visible, onClose, targetId, targetName, onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  targetName?: string;
  onSuccess: () => void;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const { request } = useBreakGlass();

  const [minutes, setMinutes] = useState<string>(String(BG_DEFAULT_MINUTES));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null);
    const mins = parseInt(minutes, 10) || BG_DEFAULT_MINUTES;
    const res = await request(targetId, mins, reason);
    setBusy(false);
    if (res.ok) { onSuccess(); onClose(); }
    else setError(res.error || (isFa ? 'خطای نامشخص' : 'Unknown error'));
  };

  const inp: any = {
    backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 10, paddingVertical: 10, fontSize: 11, color: colors.text,
  };

  return (
    <FixedOverlay visible={visible} onClose={onClose}>
      <View style={{ width: '100%', maxWidth: 480, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.danger }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '900', color: colors.danger }}>
            🔓 {isFa ? 'درخواست دسترسی اضطراری' : 'Break-glass access'}
          </Text>
          <Pressable onPress={onClose} style={{ width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.textMuted }}>✕</Text>
          </Pressable>
        </View>

        <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: 9, color: colors.danger, lineHeight: 15 }}>
            {isFa
              ? 'این عملیات تمام‌عیار ممیزی می‌شود (severity: critical) و برای مدیر ارشد آلرت امنیتی ایجاد می‌کند. فقط برای رفع فوریت فنی/عملیاتی استفاده کنید.'
              : 'This action is fully audited (critical severity) and raises a security alert for the super admin. Use only for genuine technical/operational urgency.'}
          </Text>
        </View>

        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
          {isFa ? 'مراجع هدف' : 'Target client'}
        </Text>
        <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{targetName || targetId}</Text>
          <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>{targetId}</Text>
        </View>

        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
          {isFa ? 'مدت (دقیقه)' : 'Duration (minutes)'}
        </Text>
        <TextInput style={[inp, { marginBottom: 12 }]} keyboardType="numeric" value={minutes} onChangeText={(t) => setMinutes(t.replace(/\D/g, ''))} placeholder={String(BG_DEFAULT_MINUTES)} placeholderTextColor={colors.textMuted} />
        <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: -8, marginBottom: 12 }}>
          {isFa ? `حداقل ۵ و حداکثر ${BG_MAX_MINUTES} دقیقه` : `min 5, max ${BG_MAX_MINUTES} min`}
        </Text>

        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
          {isFa ? `دلیل * (حداقل ${BG_MIN_REASON_LEN} کاراکتر)` : `Reason * (min ${BG_MIN_REASON_LEN} chars)`}
        </Text>
        <TextInput
          style={[inp, { minHeight: 80, marginBottom: 12 }]}
          multiline value={reason} onChangeText={setReason}
          placeholder={isFa ? 'مثال: بازیابی اورژانسی داده پس از خرابی سرویس sync؛ نیاز به بررسی پروندهٔ X برای تیکت Y' : 'e.g. Emergency data recovery after sync outage; need to review record X for ticket Y'}
          placeholderTextColor={colors.textMuted}
        />
        <Text style={{ fontSize: 8, color: reason.trim().length >= BG_MIN_REASON_LEN ? colors.success : colors.textMuted, textAlign: 'right', marginTop: -8, marginBottom: 12 }}>
          {reason.trim().length}/{BG_MIN_REASON_LEN}
        </Text>

        {error && (
          <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.danger }}>{error}</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={onClose} disabled={busy} style={{ flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary }}>{isFa ? 'انصراف' : 'Cancel'}</Text>
          </Pressable>
          <Pressable onPress={submit} disabled={busy || reason.trim().length < BG_MIN_REASON_LEN} style={{ flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', backgroundColor: colors.danger, opacity: busy || reason.trim().length < BG_MIN_REASON_LEN ? 0.6 : 1 }}>
            {busy ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{isFa ? '🔓 ثبت درخواست' : '🔓 Submit'}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </FixedOverlay>
  );
}