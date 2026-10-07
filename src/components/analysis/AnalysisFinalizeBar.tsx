import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { useAuth } from '../../store/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useBodyAnalysis } from '../../store/BodyAnalysisContext';
import FixedOverlay from '../ui/FixedOverlay';

const FIELD_OPTIONS = [
  { key: 'weight', fa: 'وزن', en: 'Weight' },
  { key: 'targetWeight', fa: 'وزن هدف', en: 'Target weight' },
  { key: 'weightControl', fa: 'کنترل وزن', en: 'Weight control' },
  { key: 'smm', fa: 'عضله اسکلتی', en: 'SMM' },
  { key: 'tbw', fa: 'آب بدن', en: 'TBW' },
  { key: 'bfm', fa: 'توده چربی', en: 'BFM' },
  { key: 'vfa', fa: 'چربی احشایی', en: 'VFA' },
  { key: 'bmr', fa: 'BMR', en: 'BMR' },
  { key: 'aneaScore', fa: 'امتیاز Anea', en: 'Anea score' },
  { key: 'biologicalAge', fa: 'سن بیولوژیک', en: 'Bio age' },
];

export default function AnalysisFinalizeBar({
  record,
  isFa,
  n,
  pdFull,
}: {
  record: any;
  isFa: boolean;
  n: (v: any) => string;
  pdFull: (iso: string) => string;
}) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { can } = usePermissions();
  const { finalizeAnalysis, amendAnalysis } = useBodyAnalysis();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [modal, setModal] = useState<null | 'amend' | 'amendments' | 'finalizeReason'>(null);

  const [field, setField] = useState<string>('weight');
  const [value, setValue] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  if (!record?.id) return null;

  const finalized = !!record.finalized;
  const amendments: any[] = Array.isArray(record.amendments) ? record.amendments : [];

  const canFinalize = can('radiology.finalize') || can('cardiology.finalize');
  const canAmend =
    can('section.radiology.edit') ||
    can('section.cardiology.edit') ||
    can('analysis.upload');

  const handleFinalizeClick = () => {
    setMsg(null);
    // در وب از prompt سریع استفاده می‌کنیم؛ در native مودال دلیل باز می‌شود
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.prompt === 'function') {
      const input = window.prompt(
        isFa ? 'دلیل نهایی‌سازی را وارد کنید:' : 'Enter finalize reason:',
        isFa ? 'نهایی‌سازی بالینی' : 'Clinical finalize',
      );
      if (input === null) return;
      const trimmed = String(input).trim();
      if (!trimmed) {
        setMsg({ type: 'err', text: isFa ? 'دلیل نهایی‌سازی الزامی است' : 'Reason is required' });
        return;
      }
      runFinalize(trimmed);
    } else {
      setReason(isFa ? 'نهایی‌سازی بالینی' : 'Clinical finalize');
      setModal('finalizeReason');
    }
  };

  const runFinalize = async (r: string) => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const res = await finalizeAnalysis(record.id, session?.nationalId, r);
    if (res.success) {
      setMsg({ type: 'ok', text: isFa ? '✓ رکورد نهایی‌سازی شد' : '✓ Record finalized' });
    } else {
      setMsg({ type: 'err', text: res.error || (isFa ? 'خطای نامشخص' : 'Unknown error') });
    }
    setBusy(false);
  };

  const handleFinalizeReasonSave = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setMsg({ type: 'err', text: isFa ? 'دلیل نهایی‌سازی الزامی است' : 'Reason is required' });
      return;
    }
    setModal(null);
    await runFinalize(trimmed);
  };

  const openAmend = () => {
    setField('weight');
    setValue(String(record.weight ?? ''));
    setReason('');
    setMsg(null);
    setModal('amend');
  };

  const handleAmendSave = async () => {
    if (busy) return;

    const numVal = Number(value);
    if (!isFinite(numVal)) {
      setMsg({ type: 'err', text: isFa ? 'مقدار عددی معتبر وارد کنید' : 'Enter a valid number' });
      return;
    }

    const trimReason = reason.trim();
    if (!trimReason) {
      setMsg({ type: 'err', text: isFa ? 'دلیل اصلاحیه الزامی است' : 'Reason is required' });
      return;
    }

    setBusy(true);
    setMsg(null);

    const res = await amendAnalysis(
      record.id,
      { [field]: numVal } as any,
      session?.nationalId,
      trimReason,
    );

    if (res.success) {
      setMsg({ type: 'ok', text: isFa ? '✓ اصلاحیه ثبت شد' : '✓ Amendment saved' });
      setModal(null);
    } else {
      setMsg({ type: 'err', text: res.error || (isFa ? 'خطای نامشخص' : 'Unknown error') });
    }

    setBusy(false);
  };

  const card: any = {
    backgroundColor: finalized ? '#fffbeb' : colors.surface,
    borderWidth: 1,
    borderColor: finalized ? '#f59e0b' : colors.cardBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  };

  const btnPrimary: any = {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primary,
  };

  const btnWarn: any = {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#d97706',
  };

  const btnGhost: any = {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  };

  const inp: any = {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 11,
    color: colors.text,
  };

  return (
    <>
      {(finalized || canFinalize || canAmend || amendments.length > 0) && (
        <View style={card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {finalized ? (
              <>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#b45309' }}>
                  🔒 {isFa ? 'رکورد نهایی‌سازی شده' : 'Finalized record'}
                </Text>
                <Text style={{ fontSize: 9, color: colors.textSecondary }}>
                  {isFa ? 'توسط' : 'by'} {record.finalizedBy || '—'} ·{' '}
                  {record.finalizedAt ? pdFull(record.finalizedAt) : '—'}
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>
                {isFa ? 'وضعیت رکورد: باز' : 'Record status: open'}
              </Text>
            )}

            <View style={{ flex: 1 }} />

            {!finalized && canFinalize && (
              <Pressable onPress={handleFinalizeClick} disabled={busy} style={[btnWarn, { opacity: busy ? 0.6 : 1 }]}>
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                    🔒 {isFa ? 'نهایی‌سازی' : 'Finalize'}
                  </Text>
                )}
              </Pressable>
            )}

            {finalized && canAmend && (
              <Pressable onPress={openAmend} style={btnPrimary}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                  📝 {isFa ? 'ثبت اصلاحیه' : 'Add amendment'}
                </Text>
              </Pressable>
            )}

            {amendments.length > 0 && (
              <Pressable onPress={() => setModal('amendments')} style={btnGhost}>
                <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '800' }}>
                  📜 {n(amendments.length)} {isFa ? 'اصلاحیه' : 'amendments'}
                </Text>
              </Pressable>
            )}
          </View>

          {finalized && record.finalizeReason && (
            <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 6 }}>
              {isFa ? 'دلیل finalize: ' : 'Finalize reason: '}
              {record.finalizeReason}
            </Text>
          )}

          {msg && (
            <View
              style={{
                marginTop: 8,
                backgroundColor: msg.type === 'ok' ? colors.success + '22' : colors.danger + '22',
                borderRadius: 10,
                padding: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '700',
                  color: msg.type === 'ok' ? colors.success : colors.danger,
                }}
              >
                {msg.text}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* مودال دلیل finalize (native) */}
      <FixedOverlay visible={modal === 'finalizeReason'} onClose={() => setModal(null)}>
        <View
          style={{
            width: '100%',
            maxWidth: 460,
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: colors.text }}>
              🔒 {isFa ? 'دلیل نهایی‌سازی' : 'Finalize reason'}
            </Text>
            <Pressable
              onPress={() => setModal(null)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceAlt,
              }}
            >
              <Text style={{ color: colors.textMuted }}>✕</Text>
            </Pressable>
          </View>

          <TextInput
            style={[inp, { minHeight: 70, marginBottom: 12 }]}
            multiline
            value={reason}
            onChangeText={setReason}
            placeholder={isFa ? 'مثال: تأیید نهایی گزارش رادیولوژی' : 'e.g. Final approval of radiology report'}
            placeholderTextColor={colors.textMuted}
          />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setModal(null)} style={[btnGhost, { flex: 1 }]}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary, textAlign: 'center' }}>
                {isFa ? 'انصراف' : 'Cancel'}
              </Text>
            </Pressable>
            <Pressable onPress={handleFinalizeReasonSave} style={[btnWarn, { flex: 1 }]}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center' }}>
                {isFa ? '✓ نهایی‌سازی' : '✓ Finalize'}
              </Text>
            </Pressable>
          </View>
        </View>
      </FixedOverlay>

      {/* مودال ثبت اصلاحیه */}
      <FixedOverlay visible={modal === 'amend'} onClose={() => setModal(null)}>
        <ScrollView style={{ maxHeight: '85%' }} showsVerticalScrollIndicator={false}>
          <View
            style={{
              width: '100%',
              maxWidth: 500,
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: colors.text }}>
                📝 {isFa ? 'ثبت اصلاحیه' : 'Add amendment'}
              </Text>
              <Pressable
                onPress={() => setModal(null)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surfaceAlt,
                }}
              >
                <Text style={{ color: colors.textMuted }}>✕</Text>
              </Pressable>
            </View>

            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
              {isFa ? 'فیلد' : 'Field'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {FIELD_OPTIONS.map((f) => (
                  <Pressable
                    key={f.key}
                    onPress={() => {
                      setField(f.key);
                      setValue(String(record[f.key] ?? ''));
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: field === f.key ? colors.primary : colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: field === f.key ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '700',
                        color: field === f.key ? '#fff' : colors.textSecondary,
                      }}
                    >
                      {isFa ? f.fa : f.en}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
              {isFa ? 'مقدار جدید' : 'New value'}
            </Text>
            <TextInput
              style={[inp, { marginBottom: 12 }]}
              keyboardType="numeric"
              value={value}
              onChangeText={setValue}
              placeholder={isFa ? 'مثال: 72.5' : 'e.g. 72.5'}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
              {isFa ? 'دلیل اصلاحیه *' : 'Reason *'}
            </Text>
            <TextInput
              style={[inp, { minHeight: 70, marginBottom: 12 }]}
              multiline
              value={reason}
              onChangeText={setReason}
              placeholder={
                isFa
                  ? 'مثال: اصلاح خطای ورود دستگاه بر اساس پرینت اصلی'
                  : 'e.g. Correct device entry error based on original printout'
              }
              placeholderTextColor={colors.textMuted}
            />

            {msg && (
              <View
                style={{
                  backgroundColor: msg.type === 'ok' ? colors.success + '22' : colors.danger + '22',
                  borderRadius: 10,
                  padding: 8,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: '700',
                    color: msg.type === 'ok' ? colors.success : colors.danger,
                  }}
                >
                  {msg.text}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => setModal(null)}
                disabled={busy}
                style={[btnGhost, { flex: 1, opacity: busy ? 0.6 : 1 }]}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary, textAlign: 'center' }}>
                  {isFa ? 'انصراف' : 'Cancel'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAmendSave}
                disabled={busy}
                style={[btnPrimary, { flex: 1, opacity: busy ? 0.6 : 1 }]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center' }}>
                    {isFa ? 'ثبت' : 'Save'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </FixedOverlay>

      {/* مودال لیست اصلاحیه‌ها */}
      <FixedOverlay visible={modal === 'amendments'} onClose={() => setModal(null)}>
        <ScrollView style={{ maxHeight: '85%' }} showsVerticalScrollIndicator={false}>
          <View
            style={{
              width: '100%',
              maxWidth: 560,
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: colors.text }}>
                📜 {isFa ? 'تاریخچه اصلاحیه‌ها' : 'Amendment history'}
              </Text>
              <Pressable
                onPress={() => setModal(null)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surfaceAlt,
                }}
              >
                <Text style={{ color: colors.textMuted }}>✕</Text>
              </Pressable>
            </View>

            {amendments.length === 0 ? (
              <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', paddingVertical: 20 }}>
                {isFa ? 'اصلاحیه‌ای ثبت نشده است' : 'No amendments yet'}
              </Text>
            ) : (
              amendments
                .slice()
                .reverse()
                .map((a, idx) => {
                  const fieldLabel =
                    FIELD_OPTIONS.find((f) => f.key === a.field)?.[isFa ? 'fa' : 'en'] || a.field;
                  return (
                    <View
                      key={a.id || idx}
                      style={{
                        backgroundColor: colors.surfaceAlt,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 12,
                        marginBottom: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: colors.text }}>
                          {fieldLabel}
                        </Text>
                        <Text style={{ fontSize: 8, color: colors.textMuted }}>
                          {a.createdAt ? pdFull(a.createdAt) : '—'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 8, color: colors.textMuted }}>
                            {isFa ? 'قبلی' : 'Old'}
                          </Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.danger }}>
                            {String(a.oldValue ?? '—')}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 8, color: colors.textMuted }}>
                            {isFa ? 'جدید' : 'New'}
                          </Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success }}>
                            {String(a.newValue ?? '—')}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 9, color: colors.textSecondary, marginBottom: 4 }}>
                        {isFa ? 'دلیل: ' : 'Reason: '}
                        {a.reason}
                      </Text>
                      <Text style={{ fontSize: 8, color: colors.textMuted }}>
                        {isFa ? 'ثبت‌کننده: ' : 'By: '}
                        {a.actorId} {a.actorRole ? `(${a.actorRole})` : ''}
                      </Text>
                    </View>
                  );
                })
            )}

            <Pressable
              onPress={() => setModal(null)}
              style={[btnPrimary, { marginTop: 8 }]}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center' }}>
                {isFa ? 'بستن' : 'Close'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </FixedOverlay>
    </>
  );
}