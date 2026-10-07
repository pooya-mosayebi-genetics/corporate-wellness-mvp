import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { api } from '../../lib/api';
import Icon from '../ui/Icon';
import { SectionTitle } from '../ui/Card';

export default function ChangePasswordCard() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const checks = useMemo(
    () => [
      { ok: next.length >= 8, label: isFa ? 'حداقل ۸ کاراکتر' : 'Min 8 chars' },
      { ok: /[A-Z]/.test(next), label: isFa ? 'یک حرف بزرگ' : 'One uppercase' },
      { ok: /[a-z]/.test(next), label: isFa ? 'یک حرف کوچک' : 'One lowercase' },
      { ok: /\d/.test(next), label: isFa ? 'یک عدد' : 'One digit' },
      { ok: next.length > 0 && next === confirm, label: isFa ? 'تکرار رمز مطابقت دارد' : 'Passwords match' },
    ],
    [next, confirm, isFa]
  );

  const ready = current.length > 0 && checks.every((c) => c.ok) && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.changePassword(current, next);
      setMsg({ kind: 'ok', text: isFa ? '✓ رمز عبور با موفقیت تغییر کرد.' : '✓ Password changed successfully.' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e: any) {
      const ae = e?.apiError;
      setMsg({
        kind: 'err',
        text: ae?.fa || ae?.en || e?.message || (isFa ? 'خطا در تغییر رمز' : 'Failed to change password'),
      });
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    color: colors.text,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  };

  return (
    <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 12, marginTop: 8 }}>
      <SectionTitle>{isFa ? 'تغییر رمز عبور' : 'Change Password'}</SectionTitle>

      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
        {isFa ? 'رمز فعلی' : 'Current password'}
      </Text>
      <TextInput
        style={inputStyle}
        secureTextEntry={!show}
        value={current}
        onChangeText={setCurrent}
        placeholder={isFa ? 'رمز فعلی خود را وارد کنید' : 'Enter current password'}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
      />

      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginTop: 10, marginBottom: 6 }}>
        {isFa ? 'رمز جدید' : 'New password'}
      </Text>
      <TextInput
        style={inputStyle}
        secureTextEntry={!show}
        value={next}
        onChangeText={setNext}
        placeholder={isFa ? 'رمز جدید' : 'New password'}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
      />

      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginTop: 10, marginBottom: 6 }}>
        {isFa ? 'تکرار رمز جدید' : 'Confirm new password'}
      </Text>
      <TextInput
        style={inputStyle}
        secureTextEntry={!show}
        value={confirm}
        onChangeText={setConfirm}
        placeholder={isFa ? 'تکرار رمز جدید' : 'Repeat new password'}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
      />

      <Pressable onPress={() => setShow(!show)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <Icon name={show ? 'eyeOff' : 'eye'} size={14} color={colors.textMuted} />
        <Text style={{ fontSize: 10, color: colors.textMuted }}>
          {isFa ? 'نمایش/پنهان کردن رمزها' : 'Show/hide passwords'}
        </Text>
      </Pressable>

      <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 10, marginTop: 10 }}>
        {checks.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Text style={{ fontSize: 10, marginRight: 4, color: r.ok ? colors.success : colors.textMuted }}>
              {r.ok ? '✓' : '○'}
            </Text>
            <Text style={{ fontSize: 10, color: r.ok ? colors.success : colors.textMuted }}>{r.label}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={submit}
        disabled={!ready}
        style={{ borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12, backgroundColor: ready ? colors.primary : colors.border }}
      >
        {busy ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
            {isFa ? 'ثبت تغییر رمز' : 'Update password'}
          </Text>
        )}
      </Pressable>

      {msg && (
        <View
          style={{
            backgroundColor: msg.kind === 'ok' ? colors.success + '22' : colors.dangerSoft,
            borderRadius: 10,
            padding: 10,
            marginTop: 10,
            borderWidth: 1,
            borderColor: msg.kind === 'ok' ? colors.success : colors.danger,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: msg.kind === 'ok' ? colors.success : colors.danger, textAlign: 'center' }}>
            {msg.text}
          </Text>
        </View>
      )}
    </View>
  );
}