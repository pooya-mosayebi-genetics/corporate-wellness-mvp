import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { usePersonnel } from '../src/store/PersonnelContext';
import { useBodyAnalysis } from '../src/store/BodyAnalysisContext';
import { useAuth } from '../src/store/AuthContext';
import { useBreakGlass } from '../src/store/BreakGlassContext';
import AnalysisDashboard from '../src/components/analysis/AnalysisDashboard';
import CompareReportOverlay from '../src/components/reports/CompareReportOverlay';
import BreakGlassRequestModal from '../src/components/system/BreakGlassRequestModal';
import { faNum } from '../src/utils/format';
import { usePermissions } from '../src/hooks/usePermissions';
import { canViewClientRecord } from '../src/utils/access';
import { maskNationalId } from '../src/utils/nationalId';

const toFaDigits = (s: string) => s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

/* 🆕 L-10 fix: normalize صحیح برای جستجو */
function normalizeSearchId(raw: string): string {
  return String(raw || '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))) // فارسی → انگلیسی (کامل!)
    .replace(/\D/g, ''); // فقط ارقام
}

export default function ClientDetailScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: any) => faNum(v, isFa);

  const { nationalId, mobile, id } = useLocalSearchParams<{
    nationalId?: string; mobile?: string; id?: string;
  }>();
  const urlSearchId = String(mobile || nationalId || id || '');

  const { getByNationalId } = usePersonnel();
  const { getUserAnalyses } = useBodyAnalysis();
  const { session, accounts } = useAuth();
  const { activeFor, markUsed, revoke } = useBreakGlass();

  const { can } = usePermissions();
  const canReport = can('reports.view');

  const [compareOpen, setCompareOpen] = useState(false);
  const [bgModal, setBgModal] = useState(false);
  const [, forceTick] = useState(0);
  
  // 🆕 L-10 fix: دو state جداگانه
  const [searchInput, setSearchInput] = useState('');       
  const [submittedId, setSubmittedId] = useState(urlSearchId); 

  /* 🆕 L-10: اگر از URL نیامد، از submittedId استفاده کن */
  const effectiveSearchId = urlSearchId || submittedId;

  // 🆕 L-10 fix: normalize قبل از lookup
  const normalizedId = normalizeSearchId(effectiveSearchId);
  
  // 🆕 L-10 Perf: Memoize lookups to avoid redundant calculations during unrelated re-renders
  const person = useMemo(() => normalizedId ? getByNationalId(normalizedId) : undefined, [normalizedId, getByNationalId]);
  const records = useMemo(() => normalizedId ? getUserAnalyses(normalizedId) : [], [normalizedId, getUserAnalyses]);

  const name = isFa
    ? person?.fullNamePrefixed || person?.fullName || records[0]?.fullName || effectiveSearchId
    : records[0]?.fullName || person?.fullName || effectiveSearchId;

  /* 🆕 L-10: grant break-glass معتبر؟ */
  const grant = normalizedId ? activeFor(session?.nationalId ?? '', normalizedId) : null;
  const hasBreakGlass = !!grant;

  const account = accounts.find((a) => a.nationalId === session?.nationalId) ?? null;
  const allowed = normalizedId
    ? canViewClientRecord({
        role: session?.role,
        user: account ? { permissions: account.permissions as any, deniedPermissions: account.deniedPermissions as any } : null,
        targetId: normalizedId,
        actorId: session?.nationalId,
        breakGlassGrant: grant,
      })
    : false;

  // refresh هر ۱۰ ثانیه تا انقضا اعمال شود
  useEffect(() => {
    const t = setInterval(() => forceTick((v) => v + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  // ثبت «استفاده» هنگام نمایش موفق
  useEffect(() => {
    if (grant && !grant.usedAt) markUsed(grant.id);
  }, [grant, markUsed]);

  // 🆕 تغییر مهم: فقط وقتی نه دسترسی عادی دارد نه break-glass، صفحه قفل نمایش بده (نه redirect)
  const showLockScreen = !!normalizedId && !allowed && !hasBreakGlass;

  /* ── تابع submit جستجو (Stable Reference) ── */
  const handleSearchSubmit = useCallback(() => {
    const clean = normalizeSearchId(searchInput);
    if (clean.length >= 10) {
      setSubmittedId(clean);
    }
  }, [searchInput]);

  /* ── ناوبری بازگشت (Stable Reference) ── */
  const goBack = useCallback(() => router.back(), []);

  // 🛑 HARD BLOCK FOR REGULAR USERS (If they try to access via URL directly)
  // اگر کاربر عادی است و سعی کرد پرونده دیگری را باز کند (و grant ندارد)، صفحه قفل سرسخت نشان بده.
  if (session?.role === 'user' && !hasBreakGlass && normalizedId && normalizedId !== session.nationalId) {
     return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontSize: 40, marginBottom: 10 }}>🔒</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.danger, textAlign: 'center' }}>
          {isFa ? 'دسترسی غیرمجاز' : 'Access Denied'}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8, textAlign: 'center', maxWidth: 300 }}>
          {isFa 
            ? 'کاربران عادی مجاز به مشاهدهٔ پرونده سایر کارکنان نیستند.' 
            : 'Regular staff members are not authorized to view other employees\' records.'}
        </Text>
        <Pressable 
          onPress={() => router.replace('/')} 
          style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 10 }}
        >
          <Text style={{ color: '#FFF', fontWeight: '700' }}>{isFa ? 'بازگشت به خانه' : 'Go Home'}</Text>
        </Pressable>
      </View>
    );
  }

  /* ── صفحه ورودی جستجو (وقتی neither URL nor submitted) ── */
  if (!effectiveSearchId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 16 }}>
          🔍 {isFa ? 'جستجوی پروندهٔ مراجع' : 'Search Client Record'}
        </Text>
        
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>
            {isFa ? 'کد ملی یا شماره تماس مراجع:' : 'National ID or mobile number:'}
          </Text>
          
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={isFa ? 'مثال: 0012345678' : 'e.g. 0012345678'}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            maxLength={15}
            onSubmitEditing={handleSearchSubmit}
            blurOnSubmit={false}
            style={{
              backgroundColor: colors.surfaceAlt,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 13,
              color: colors.text,
            }}
          />
          
          <Pressable
            onPress={handleSearchSubmit}
            disabled={!searchInput.trim()}
            style={{
              marginTop: 12,
              backgroundColor: searchInput.trim() ? colors.primary : colors.surfaceAlt,
              borderRadius: 10,
              paddingVertical: 12,
              alignItems: 'center',
              opacity: searchInput.trim() ? 1 : 0.5,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>
              {isFa ? '🔓 مشاهدهٔ پرونده' : '🔓 Open Record'}
            </Text>
          </Pressable>
        </View>

        <View style={{ backgroundColor: colors.warningSoft, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.warning }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.warning, marginBottom: 6 }}>
            ⚠️ {isFa ? 'توجه امنیتی:' : 'Security note:'}
          </Text>
          <Text style={{ fontSize: 9, color: colors.textSecondary, lineHeight: 15 }}>
            {isFa
              ? 'اگر دسترسی عادی ندارید، پس از جستجو، صفحهٔ قفل break-glass نمایش داده می‌شود و باید دلیل ثبت کنید.'
              : 'If you lack standard access, a break-glass lock screen will appear after search and require justification.'}
          </Text>
        </View>
      </View>
    );
  }

  /* ── صفحه قفل break-glass ── */
  if (showLockScreen) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* هدر ساده */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
          <Pressable
            onPress={goBack}
            style={{ width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ fontSize: 14, color: colors.text }}>{isFa ? '→' : '←'}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{name}</Text>
            <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
              {isFa ? `شناسه: ${maskNationalId(normalizedId)}` : `ID: ${maskNationalId(normalizedId)}`}
            </Text>
          </View>
        </View>

        {/* محتوای قفل */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={{ backgroundColor: '#fef2f2', borderRadius: 16, borderWidth: 2, borderColor: '#dc2626', padding: 20, marginBottom: 16 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🔒</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#b91c1c', textAlign: 'center' }}>
                {isFa ? 'این پرونده محافظت‌شده است' : 'This record is protected'}
              </Text>
            </View>

            <Text style={{ fontSize: 11, color: '#7f1d1d', lineHeight: 18, marginBottom: 12 }}>
              {isFa
                ? `شما دسترسی عادی برای مشاهدهٔ این پرونده ندارید. اگر نیاز فنی/عملیاتی دارید، می‌توانید با ثبت دلیل، دسترسی اضطراری موقت (break-glass) بگیرید.`
                : `You do not have standard access to view this record. If you have a genuine technical/operational need, you can request temporary emergency access (break-glass) by providing a reason.`}
            </Text>

            <View style={{ backgroundColor: '#fee2e2', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#b91c1c', marginBottom: 6 }}>
                {isFa ? '⚠️ هشدار امنیتی:' : '⚠️ Security warning:'}
              </Text>
              <Text style={{ fontSize: 9, color: '#7f1d1d', lineHeight: 15 }}>
                {isFa
                  ? 'تمام فعالیت‌های break-glass به‌صورت بحرانی ممیزی می‌شوند و آلرت امنیتی برای مدیر ارشد ایجاد می‌کنند.'
                  : 'All break-glass activities are critically audited and raise security alerts for the super admin.'}
              </Text>
            </View>

            <Pressable
              onPress={() => setBgModal(true)}
              style={{ backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 14, alignItems: 'center', shadowColor: '#dc2626', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>
                🔓 {isFa ? 'درخواست دسترسی اضطراری' : 'Request break-glass access'}
              </Text>
            </Pressable>
          </View>

          {/* اطلاعات عمومی (بدون دادهٔ بالینی) */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, padding: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, marginBottom: 12 }}>
              {isFa ? 'اطلاعات عمومی' : 'General info'}
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>{isFa ? 'نام' : 'Name'}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{name}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>{isFa ? 'شناسه' : 'ID'}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{maskNationalId(normalizedId)}</Text>
            </View>
            
            {person?.gender && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{isFa ? 'جنسیت' : 'Gender'}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>
                  {person.gender === 'male' ? (isFa ? 'مرد' : 'Male') : isFa ? 'زن' : 'Female'}
                </Text>
              </View>
            )}
            
            {person?.birthDate && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{isFa ? 'تاریخ تولد' : 'Birth date'}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{person.birthDate}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <BreakGlassRequestModal
          visible={bgModal}
          onClose={() => setBgModal(false)}
          targetId={normalizedId}
          targetName={name}
          onSuccess={() => forceTick((v) => v + 1)}
        />
      </View>
    );
  }

  /* ── حالت عادی (بدون break-glass): نمایش مستقیم ── */
  if (!hasBreakGlass) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <HeaderBar
          colors={colors} isFa={isFa} name={name} searchId={normalizedId}
          recordsCount={records.length} canReport={canReport}
          onBack={goBack} onCompare={() => setCompareOpen(true)}
        />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 30 }}>
          {records.length > 0 ? (
            <AnalysisDashboard records={records} />
          ) : (
            <EmptyState colors={colors} isFa={isFa} />
          )}
        </ScrollView>
        {canReport && (
          <CompareReportOverlay visible={compareOpen} onClose={() => setCompareOpen(false)} records={records} />
        )}
      </View>
    );
  }

  /* ── حالت break-glass: بنر هشدار + دکمه پایان + مودال درخواست ── */
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* بنر داخلی break-glass */}
      <View style={{ backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900', flexShrink: 0 }}>⚠️</Text>
          <Text style={{ flex: 1, color: '#fff', fontSize: 10, lineHeight: 15 }}>
            {isFa
              ? `این پرونده با دسترسی اضطراری باز شده است. تمام فعالیت‌ها ممیزی می‌شوند.`
              : `This record is opened via break-glass access. All activity is audited.`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 20 }}>
          <Text style={{ color: '#fecaca', fontSize: 9 }}>
            {isFa ? 'انقضا:' : 'Expires:'}{' '}
            {new Date(grant!.expiresAt).toLocaleTimeString(isFa ? 'fa-IR' : 'en-US')}
          </Text>
          {/* 🆕 اصلاح: revoke واقعی */}
          <Pressable
            onPress={() => {
              if (grant) revoke(grant.id);
              forceTick((v) => v + 1);
            }}
            style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#fff' }}
          >
            <Text style={{ color: '#dc2626', fontSize: 9, fontWeight: '800' }}>
              {isFa ? '🛑 پایان دسترسی' : '🛑 End access'}
            </Text>
          </Pressable>
        </View>
      </View>

      <HeaderBar
        colors={colors} isFa={isFa} name={name} searchId={normalizedId}
        recordsCount={records.length} canReport={canReport}
        onBack={goBack} onCompare={() => setCompareOpen(true)}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 30 }}>
        {records.length > 0 ? (
          <AnalysisDashboard records={records} />
        ) : (
          <EmptyState colors={colors} isFa={isFa} />
        )}
      </ScrollView>
      {canReport && (
        <CompareReportOverlay visible={compareOpen} onClose={() => setCompareOpen(false)} records={records} />
      )}

      <BreakGlassRequestModal
        visible={bgModal}
        onClose={() => setBgModal(false)}
        targetId={normalizedId}
        targetName={name}
        onSuccess={() => forceTick((v) => v + 1)}
      />
    </View>
  );
}

/* ── هلپرهای UI داخلی (Memoized) ── */
const HeaderBar = memo(function HeaderBar({ colors, isFa, name, searchId, recordsCount, canReport, onBack, onCompare }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
      <Pressable
        onPress={onBack}
        style={{ width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}
      >
        <Text style={{ fontSize: 14, color: colors.text }}>{isFa ? '→' : '←'}</Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{name}</Text>
        <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
          {isFa ? `شماره تماس: ${toFaDigits(searchId)}` : `Mobile: ${searchId}`} {'  ·  '}
          {faNum(recordsCount, isFa)} {isFa ? 'آنالیز ثبت‌شده' : 'analyses recorded'}
        </Text>
      </View>
      {canReport && (
        <Pressable
          onPress={onCompare}
          style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#2563eb' }}
        >
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
            {isFa ? '📊 گزارش مقایسه‌ای' : '📊 Compare Report'}
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const EmptyState = memo(function EmptyState({ colors, isFa }: any) {
  return (
    <View style={{ padding: 30, alignItems: 'center' }}>
      <Text style={{ color: colors.textMuted }}>
        {isFa ? 'داده‌ای برای این کاربر یافت نشد' : 'No data found for this user'}
      </Text>
    </View>
  );
});