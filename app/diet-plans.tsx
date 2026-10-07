import { useMemo, useState } from 'react';
import { Text, View, ScrollView, Pressable, TextInput } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { useAuth } from '../src/store/AuthContext';
import { useNotification } from '../src/store/NotificationContext';
import { usePersonnel } from '../src/store/PersonnelContext';
import { usePermissions } from '../src/hooks/usePermissions';
import { useAssignments } from '../src/store/AssignmentsContext';
import { SectionTitle, IconTile } from '../src/components/ui/Card';
import Icon from '../src/components/ui/Icon';
import { faNum } from '../src/utils/format';
import { maskNationalId, normalizeNationalId, isValidNationalId } from '../src/utils/nationalId';
import { savePdfBlob, downloadPdf, loadPdfBlob } from '../src/services/pdfStore';
import { router } from 'expo-router';

/* ✅ هلپر تبدیل ارقام فارسی/عربی به انگلیسی */
const toEnDigits = (s: any) =>
  String(s ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export default function DietPlansScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);
  const { state, addDietPlan, deleteDietPlan, importClients } = useWellness();
  const { session } = useAuth();
  const { pushNotif, sendSms, state: notifState } = useNotification();
  const { records: persons } = usePersonnel();

  // 🆕 Permission و Assignments برای گیت scope-aware
  const { scope } = usePermissions();
  const { clientIdsFor } = useAssignments();

  // 🆕 لیست مراجعین assign شده به کاربر فعلی
  const assignedIds = useMemo(() => {
    const ids = clientIdsFor(session?.nationalId ?? '');
    return new Set(ids.map((id: string) => String(id)));
  }, [clientIdsFor, session]);

  // 🆕 scope برای diet.design
  const dietScope = scope('diet.design' as any);
  const isAssignedScope = dietScope === 'assigned';

  const [nidInput, setNidInput] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [ncSex, setNcSex] = useState<'male' | 'female'>('male');
  const [ncAge, setNcAge] = useState('');
  const [ncHeight, setNcHeight] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<{ name: string; blob: Blob } | null>(null);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /* 🆕 منبع یکسان مراجعین: state.clients + PersonnelContext */
  const allClients = useMemo(() => {
    const map = new Map<string, any>();

    for (const c of state.clients || []) {
      const nid = String(c?.nationalId ?? '');
      if (nid) map.set(nid, { ...c, nationalId: nid });
    }

    for (const p of persons || []) {
      const nid = String(p?.nationalId ?? '');
      if (!nid) continue;
      const fullName = String(p?.fullNamePrefixed || p?.fullName || '').trim();
      if (!map.has(nid)) {
        map.set(nid, { nationalId: nid, fullName });
      } else {
        const existing = map.get(nid);
        if (!existing.fullName && fullName) existing.fullName = fullName;
      }
    }

    return Array.from(map.values());
  }, [state.clients, persons]);

  /* 🆕 فیلتر بر اساس scope */
  const filteredClients = useMemo(() => {
    if (isAssignedScope) {
      return allClients.filter((c) => assignedIds.has(String(c.nationalId)));
    }
    return allClients;
  }, [allClients, assignedIds, isAssignedScope]);

  /* 🆕 سرچ با کد ملی (فارسی/انگلیسی) + نام */
    /* ✅ سرچ با کد ملی (فارسی/انگلیسی) + نام — نسخه اصلاح‌شده */
  const searchMatch = useMemo(() => {
    const raw = toEnDigits(nidInput).trim();
    const q = normalizeNationalId(raw); // فقط ارقام
    const ql = raw.toLowerCase();       // متن خام (برای نام)

    // ورودی خالی → بدون نتیجه
    if (q.length === 0 && ql.length === 0) return [];

    return filteredClients
      .filter((c) => {
        // ✅ تطبیق کد ملی فقط وقتی حداقل ۳ رقم وارد شده (جلوگیری از includes(''))
        const idMatch = q.length >= 3 && String(c.nationalId).includes(q);
        // ✅ تطبیق نام فقط وقتی حداقل ۲ کاراکتر وارد شده
        const nameMatch = ql.length >= 2 && String(c.fullName || '').toLowerCase().includes(ql);
        return idMatch || nameMatch;
      })
      .slice(0, 6);
  }, [nidInput, filteredClients]);

  /* 🆕 notFound فقط برای scope غیر assigned */
  const notFound =
    !isAssignedScope &&
    normalizeNationalId(toEnDigits(nidInput)).length === 10 &&
    searchMatch.length === 0 &&
    !selId;

  /* 🆕 پیام «ارجاع نشده» برای scope assigned */
  const notAssignedMsg =
    isAssignedScope &&
    normalizeNationalId(toEnDigits(nidInput)).length === 10 &&
    searchMatch.length === 0 &&
    !selId;

  const plans = useMemo(() => {
    if (!selId) return [];
    return state.dietPlans
      .filter((p) => p.clientNationalId === selId)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [state.dietPlans, selId]);

  const card = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 10 };
  const inp = { backgroundColor: colors.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 8, fontSize: 11, color: colors.text };

  const createClient = () => {
    const code = normalizeNationalId(toEnDigits(nidInput));
    if (!isValidNationalId(code)) { setMessage(isFa ? 'کد ملی معتبر نیست' : 'Invalid ID'); return; }
    const a = parseInt(ncAge, 10); const h = parseFloat(ncHeight);
    if (!a || !h) { setMessage(isFa ? 'سن و قد الزامی' : 'Age & height required'); return; }
    importClients([{ nationalId: code, sex: ncSex, age: a, heightCm: h, weightKg: 0, bmi: 0, smmKg: 0, pbfPercent: 0, bfmKg: 0, vfl: 0, tbwLiters: 0, tbwPercent: 0, bioAge: a, warnings: [], importedAt: new Date().toISOString() } as any]);
    setSelId(code); setShowNew(false); setMessage(isFa ? `✓ مرجع ${maskNationalId(code)} ساخته شد` : '✓ created');
  };

  const pick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: false });
      if (res.canceled || !res.assets?.length) return;
      const blob = await fetch(res.assets[0].uri).then((r) => r.blob());
      setFile({ name: res.assets[0].name ?? 'diet.pdf', blob });
    } catch { setMessage(isFa ? 'خطا در خواندن فایل' : 'Read failed'); }
  };

  const upload = async () => {
    if (!selId) { setMessage(isFa ? 'ابتدا مرجع را انتخاب کنید' : 'Select client'); return; }
    // 🆕 گیت امنیتی: در scope assigned فقط مراجعین خود کاربر
    if (isAssignedScope && !assignedIds.has(String(selId))) {
      setMessage(isFa ? 'این مراجع به شما ارجاع نشده است' : 'Client not assigned to you');
      return;
    }
    if (!title.trim()) { setMessage(isFa ? 'عنوان الزامی' : 'Title required'); return; }
    if (!file) { setMessage(isFa ? 'PDF را انتخاب کنید' : 'Pick PDF'); return; }
    setBusy(true);
    try {
      const storageKey = `pdf-diet-${Date.now()}`;
      await savePdfBlob(storageKey, file.blob);
      const planId = `dp-${Date.now()}`;
      addDietPlan({ id: planId, clientNationalId: selId, titleFa: title.trim(), titleEn: title.trim(), noteFa: note.trim(), noteEn: note.trim(), uploadedBy: session?.nationalId ?? 'coach', uploadedAt: new Date().toISOString(), fileName: file.name, sizeKb: Math.round(file.blob.size / 1024), storageKey, version: plans.length + 1 } as any);
      pushNotif({ key: `diet-${planId}`, type: 'diet', userId: selId, action: '/my-diet', titleFa: 'رژیم جدید دریافت کردید', titleEn: 'New diet plan', bodyFa: `«${title.trim()}» برای شما ثبت شد؛ از «رژیم من» دانلود کنید.`, bodyEn: `New plan "${title.trim()}" — download in My Diet.` });
      if (smsEnabled) sendSms(selId, isFa ? `کاربر گرامی، رژیم «${title.trim()}» در سامانه The Min برای شما ثبت شد.` : `New diet plan "${title.trim()}" available in The Min.`);
      setTitle(''); setNote(''); setFile(null);
      setMessage(isFa ? '✓ رژیم آپلود شد + نوتیف ارسال شد' : '✓ uploaded + notified');
    } catch { setMessage(isFa ? 'خطا در آپلود' : 'Upload failed'); }
    finally { setBusy(false); }
  };

  const view = async (p: any) => {
    const blob = await loadPdfBlob(p.storageKey);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    if (typeof window !== 'undefined') window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: 30 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{isFa ? 'رژیم‌های درمانی' : 'Diet Plans'}</Text>
          {isAssignedScope && (
            <Text style={{ fontSize: 8, color: colors.primary, marginTop: 2 }}>
              {isFa ? `فقط مراجعین من (${n(assignedIds.size)})` : `My clients only (${assignedIds.size})`}
            </Text>
          )}
        </View>
        <Pressable onPress={() => router.back()} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}>
          <Text style={{ fontSize: 12, color: colors.text }}>←</Text>
        </Pressable>
      </View>

      <View style={[card, { marginBottom: 6 }]}>
        <SectionTitle>{isFa ? 'مرجع (کد ملی یا نام)' : 'Client (National ID or name)'}</SectionTitle>
        <TextInput style={[inp, { marginBottom: 6 }]} keyboardType="numeric" placeholder={isFa ? 'کد ملی یا نام...' : 'National ID or name...'} placeholderTextColor={colors.textMuted} value={nidInput} onChangeText={(t) => { setNidInput(t); setSelId(null); }} />

        {searchMatch.length > 0 && !selId && (
          <View style={{ marginBottom: 6 }}>
            {searchMatch.map((c) => (
              <Pressable key={c.nationalId} onPress={() => { setSelId(c.nationalId); setNidInput(c.nationalId); }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 7, marginBottom: 4 }}>
                <IconTile icon="profile" tone={colors.chart[0]} size={24} />
                <View style={{ flex: 1, marginLeft: 7 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{c.fullName || maskNationalId(c.nationalId)}</Text>
                  <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 1 }}>{maskNationalId(c.nationalId)}</Text>
                </View>
                <Icon name="chevronForward" size={12} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {selId && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 8, padding: 8, marginBottom: 6 }}>
            <IconTile icon="profile" tone={colors.primary} size={24} />
            <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: colors.primary, marginLeft: 7 }}>{maskNationalId(selId)}</Text>
            <Pressable onPress={() => { setSelId(null); setNidInput(''); }}><Icon name="close" size={12} color={colors.textMuted} /></Pressable>
          </View>
        )}

        {/* 🆕 پیام ارجاع نشده (scope assigned) */}
        {notAssignedMsg && (
          <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 8, padding: 8 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.danger }}>
              {isFa
                ? ' این مراجع به شما ارجاع نشده است. فقط مراجعین assign شده قابل انتخاب‌اند.'
                : '⛔ This client is not assigned to you. Only assigned clients are selectable.'}
            </Text>
          </View>
        )}

        {/* ساخت مرجع جدید فقط برای scope غیر assigned */}
        {notFound && (
          <View style={{ backgroundColor: colors.warningSoft, borderRadius: 8, padding: 8 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.warning, marginBottom: 6 }}>{isFa ? 'کد ملی یافت نشد؛ مرجع جدید:' : 'Not found; new client:'}</Text>
            {!showNew ? (
              <Pressable onPress={() => setShowNew(true)} style={{ backgroundColor: colors.warning, borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? '+ افزودن مرجع' : '+ Add client'}</Text>
              </Pressable>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 5, marginBottom: 5 }}>
                  {(['male', 'female'] as const).map((g) => (
                    <Pressable key={g} onPress={() => setNcSex(g)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: ncSex === g ? colors.primary : colors.surfaceAlt }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: ncSex === g ? '#FFFFFF' : colors.textSecondary }}>{g === 'male' ? (isFa ? 'مرد' : 'M') : isFa ? 'زن' : 'F'}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 5, marginBottom: 5 }}>
                  <TextInput style={[inp, { flex: 1 }]} keyboardType="numeric" placeholder={isFa ? 'سن' : 'Age'} placeholderTextColor={colors.textMuted} value={ncAge} onChangeText={(t) => setNcAge(t.replace(/\D/g, ''))} />
                  <TextInput style={[inp, { flex: 1 }]} keyboardType="numeric" placeholder={isFa ? 'قد' : 'Height'} placeholderTextColor={colors.textMuted} value={ncHeight} onChangeText={(t) => setNcHeight(t.replace(/[^\d.]/g, ''))} />
                </View>
                <Pressable onPress={createClient} style={{ backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? '✓ ساخت' : '✓ Create'}</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>

      <View style={[card, { marginBottom: 6 }]}>
        <SectionTitle>{isFa ? 'آپلود رژیم جدید' : 'Upload new diet'}</SectionTitle>
        <TextInput style={[inp, { marginBottom: 5 }]} placeholder={isFa ? 'عنوان رژیم *' : 'Title *'} placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
        <TextInput style={[inp, { minHeight: 48, marginBottom: 5 }]} multiline placeholder={isFa ? 'یادداشت (اختیاری)' : 'Note'} placeholderTextColor={colors.textMuted} value={note} onChangeText={setNote} />
        <Pressable onPress={pick} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 10, paddingVertical: 10, marginBottom: 5, backgroundColor: colors.primarySoft }}>
          <Icon name="upload" size={13} color={colors.primary} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>{file ? file.name : isFa ? 'انتخاب PDF' : 'Pick PDF'}</Text>
        </Pressable>
        <Pressable onPress={() => setSmsEnabled((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 8, marginBottom: 5 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>{isFa ? '📱 ارسال پیامک اطلاع‌رسانی (کانکتور دمو)' : '📱 Send SMS (demo connector)'}</Text>
          <View style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: smsEnabled ? colors.success : colors.border, justifyContent: 'center', paddingHorizontal: 2 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF', alignSelf: smsEnabled ? 'flex-end' : 'flex-start' }} />
          </View>
        </Pressable>
        {message && <View style={{ backgroundColor: colors.accentSoft, borderRadius: 8, padding: 7, marginBottom: 5 }}><Text style={{ fontSize: 9, fontWeight: '700', color: colors.success }}>{message}</Text></View>}
        <Pressable onPress={upload} disabled={busy} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{busy ? '...' : isFa ? '📤 آپلود و اطلاع‌رسانی' : ' Upload & notify'}</Text>
        </Pressable>
      </View>

      {notifState.smsLog.length > 0 && (
        <View style={[card, { marginBottom: 6 }]}>
          <SectionTitle>{isFa ? 'لاگ پیامک (دمو)' : 'SMS log (demo)'}</SectionTitle>
          {notifState.smsLog.slice(0, 4).map((s) => (
            <View key={s.id} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 7, marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text }}>→ {maskNationalId(s.to)}</Text>
                <Text style={{ fontSize: 8, color: colors.success }}>{s.status}</Text>
              </View>
              <Text numberOfLines={1} style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>{s.text}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={card}>
        <SectionTitle>{isFa ? `رژیم‌های ${selId ? maskNationalId(selId) : '—'}` : `Plans ${selId ? maskNationalId(selId) : '—'}`}</SectionTitle>
        {plans.length === 0 ? (
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: colors.textMuted }}>{isFa ? 'رژیمی نیست' : 'No plans'}</Text>
          </View>
        ) : (
          plans.map((p, i, arr) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <IconTile icon="diet" tone={colors.primary} size={24} />
              <View style={{ flex: 1, marginLeft: 7 }}>
                <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{p.titleFa}</Text>
                <Text style={{ fontSize: 8, color: colors.textMuted }}>v{p.version} · {n(p.sizeKb)}KB</Text>
              </View>
              <Pressable onPress={() => view(p)} style={{ width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, marginRight: 4 }}>
                <Icon name="eye" size={11} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => downloadPdf(p.storageKey, p.fileName)} style={{ width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, marginRight: 4 }}>
                <Icon name="download" size={11} color={colors.textSecondary} />
              </Pressable>
              <Pressable onPress={() => deleteDietPlan(p.id)} style={{ width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft }}>
                <Icon name="trash" size={11} color={colors.danger} />
              </Pressable>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}