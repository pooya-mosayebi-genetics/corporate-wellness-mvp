import { useEffect, useMemo, useState } from 'react';
import { Text, View, ScrollView, Pressable, TextInput, useWindowDimensions, Switch } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useAuth } from '../src/store/AuthContext';
import { useWellness } from '../src/store/WellnessContext';
import { usePersonnel } from '../src/store/PersonnelContext';
import { useOrganizations } from '../src/store/OrganizationsContext';
import { useAssignments } from '../src/store/AssignmentsContext';
import Icon from '../src/components/ui/Icon';
import FixedOverlay from '../src/components/ui/FixedOverlay';
import { faNum, faDigits } from '../src/utils/format';
import { maskNationalId, normalizeNationalId, isValidNationalId } from '../src/utils/nationalId';
import { buildBackup, downloadBackup, parseBackup } from '../src/services/backup';
import {
  hasPermission,
  groupPermissions,
  ROLE_DEFAULTS,
  ROLE_GRANTS,
  PERMISSIONS,
  type Permission,
} from '../src/utils/permissions';
import {
  APP_ROLES,
  ROLE_META,
  CLINICAL_ROLES,
  normalizeRole,
  type AppRole,
} from '../src/config/roles';
import { canAccess, homeRouteFor } from '../src/utils/access';
import type { Role } from '../src/types/auth';

const Z_RADIUS = { card: 14, inner: 12, control: 10, chip: 999 };
const Z_SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/* 🆕 رنگ/ایموجی هر نقش */
const ROLE_UI: Record<AppRole, { color: string; emoji: string }> = {
  super_admin: { color: '#7c3aed', emoji: '👑' },
  it_admin: { color: '#0ea5e9', emoji: '🛠' },
  org_owner: { color: '#0f766e', emoji: '🏛' },
  org_admin: { color: '#14b8a6', emoji: '🏢' },
  nutritionist: { color: '#16a34a', emoji: '🥗' },
  coach: { color: '#2563eb', emoji: '🎯' },
  doctor_internal: { color: '#dc2626', emoji: '🩺' },
  doctor_sports: { color: '#f97316', emoji: '🏃' },
  doctor_radiology: { color: '#6366f1', emoji: '🩻' },
  doctor_cardiology: { color: '#e11d48', emoji: '❤️' },
  nurse: { color: '#ec4899', emoji: '💉' },
  rad_assistant: { color: '#818cf8', emoji: '📡' },
  cardio_assistant: { color: '#fb7185', emoji: '📈' },
  hr_admin: { color: '#059669', emoji: '🧑‍💼' },
  hr_viewer: { color: '#34d399', emoji: '👁' },
  reception: { color: '#f59e0b', emoji: '🛎' },
  event_manager: { color: '#8b5cf6', emoji: '🎪' },
  data_analyst: { color: '#0891b2', emoji: '📊' },
  user: { color: '#64748b', emoji: '👤' },
};

const SCOPE_FA: Record<string, string> = {
  self: 'خود',
  assigned: 'مراجعین',
  org: 'سازمان',
  event: 'رویداد',
  aggregate: 'تجمیعی',
  global: 'کل',
};

const SCOPE_EN: Record<string, string> = {
  self: 'self',
  assigned: 'assigned',
  org: 'org',
  event: 'event',
  aggregate: 'aggregate',
  global: 'global',
};

export default function AdminScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: any) => faNum(v, isFa);
  const { width: winW } = useWindowDimensions();
  const isWide = winW >= 900;

  const {
    session,
    accounts,
    audit,
    setRole,
    addAccount,
    toggleActive,
    setUserPermissions,
    setUserDenied,
    selfProvision,
    setSelfProvision,
  } = useAuth();
  const { state, restoreState } = useWellness();
  const { records: personsRaw } = usePersonnel();
  const { orgs: orgsRaw } = useOrganizations();
  const { assignments: assignmentsRaw, assign, unassign } = useAssignments();

  // ✅ SAFETY GUARDS: Ensure arrays are never undefined to prevent crashes
  const safeAccounts = useMemo(() => Array.isArray(accounts) ? accounts : [], [accounts]);
  const safePersons = useMemo(() => Array.isArray(personsRaw) ? personsRaw : [], [personsRaw]);
  const safeOrgs = useMemo(() => Array.isArray(orgsRaw) ? orgsRaw : [], [orgsRaw]);
  const safeAssignments = useMemo(() => Array.isArray(assignmentsRaw) ? assignmentsRaw : [], [assignmentsRaw]);
  const safeAudit = useMemo(() => Array.isArray(audit) ? audit : [], [audit]);

  const [newId, setNewId] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('user');
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [permissionsUser, setPermissionsUser] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [rolePickerFor, setRolePickerFor] = useState<string | null>(null);
  const [matrixRole, setMatrixRole] = useState<AppRole>('nutritionist');
  const [provId, setProvId] = useState('');
  const [clientQuery, setClientQuery] = useState('');

  // ✅ PATCH: کاربر جاری برای اعمال permissions / deniedPermissions
  const currentUser = useMemo(() => {
    if (!session) return null;
    const account = safeAccounts.find((a) => a.nationalId === session.nationalId);
    if (!account) return null;
    return {
      permissions: (account.permissions ?? []) as Permission[],
      deniedPermissions: (account.deniedPermissions ?? []) as Permission[],
    };
  }, [session, safeAccounts]);

  // ✅ PATCH: گیت محلی /admin با Override کاربری
  const canAdmin = useMemo(
    () => canAccess(session?.role, 'admin', currentUser),
    [session?.role, currentUser],
  );

  useEffect(() => {
    if (session && !canAdmin) {
      router.replace(homeRouteFor(session.role));
    }
  }, [session, canAdmin]);

  const permsByGroup = useMemo(() => groupPermissions(), []);

  const stats = useMemo(() => {
    const byRole: Record<string, number> = {};
    let active = 0;
    let disabled = 0;
    safeAccounts.forEach((a) => {
      byRole[a.role] = (byRole[a.role] || 0) + 1;
      if (a.active) active++;
      else disabled++;
    });
    return { total: safeAccounts.length, active, disabled, byRole, orgs: safeOrgs.length };
  }, [safeAccounts, safeOrgs]);

  const getCardStyle = (extra: any = {}) => ({
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: Z_RADIUS.card,
    padding: Z_SPACE.md,
    ...extra,
  });

  const inp = {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Z_RADIUS.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Z_SPACE.sm,
    paddingVertical: 10,
    fontSize: 11,
    color: colors.text,
  };

  const newIdNorm = normalizeNationalId(newId);
  const newIdPerson = newIdNorm ? safePersons.find((p) => p.nationalId === newIdNorm) : undefined;
  const newIdOrg = newIdPerson ? safeOrgs.find((o) => o.id === newIdPerson.orgId) : undefined;
  const newIdValid = isValidNationalId(newIdNorm);
  const newIdDup = newIdNorm ? safeAccounts.some((a) => a.nationalId === newIdNorm) : false;

  const add = () => {
    if (!newIdValid) {
      setMessage({ kind: 'error', text: isFa ? 'کد ملی معتبر نیست (۱۰ رقم)' : 'Invalid national ID' });
      return;
    }
    if (newIdDup) {
      setMessage({ kind: 'error', text: isFa ? 'این کد ملی قبلاً ثبت شده' : 'Duplicate ID' });
      return;
    }
    const ok = addAccount(newIdNorm, newRole as Role);
    setMessage(
      ok
        ? { kind: 'success', text: isFa ? `✓ ${maskNationalId(newIdNorm)} اضافه شد` : '✓ Added' }
        : { kind: 'error', text: isFa ? 'خطا' : 'Error' },
    );
    if (ok) {
      setNewId('');
      setNewRole('user');
    }
  };

  const doExport = () => {
    downloadBackup(`themin-backup-${new Date().toISOString().slice(0, 10)}.json`, buildBackup(state));
    setBackupMsg(isFa ? '✓ فایل پشتیبان دانلود شد' : '✓ Backup downloaded');
  };

  const doRestore = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: false });
      if (res.canceled || !res.assets?.length) return;
      const text = await fetch(res.assets[0].uri).then((r) => r.text());
      restoreState(parseBackup(text));
      setBackupMsg(isFa ? '✓ داده‌ها بازیابی شد' : '✓ Restored');
    } catch {
      setBackupMsg(isFa ? '❌ فایل نامعتبر' : '❌ Invalid file');
    }
  };

  const filteredAccounts = useMemo(() => {
    return safeAccounts
      .filter((a) => roleFilter === 'all' || a.role === roleFilter)
      .filter((a) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const person = safePersons.find((p) => p.nationalId === a.nationalId);
        return (
          a.nationalId.includes(q) ||
          (person?.fullName || '').toLowerCase().includes(q) ||
          (person?.fullNamePrefixed || '').toLowerCase().includes(q)
        );
      });
  }, [safeAccounts, roleFilter, search, safePersons]);

  const permUser = permissionsUser ? safeAccounts.find((a) => a.nationalId === permissionsUser) : null;
  const pickerUser = rolePickerFor ? safeAccounts.find((a) => a.nationalId === rolePickerFor) : null;

  const togglePerm = (perm: Permission, mode: 'grant' | 'deny') => {
    if (!permUser) return;
    const currentGrants = (permUser.permissions || []) as Permission[];
    const currentDenied = (permUser.deniedPermissions || []) as Permission[];

    if (mode === 'grant') {
      const has = currentGrants.includes(perm);
      setUserPermissions(
        permUser.nationalId,
        has ? currentGrants.filter((p) => p !== perm) : [...currentGrants, perm],
      );
      if (currentDenied.includes(perm)) {
        setUserDenied(permUser.nationalId, currentDenied.filter((p) => p !== perm));
      }
    } else {
      const has = currentDenied.includes(perm);
      setUserDenied(
        permUser.nationalId,
        has ? currentDenied.filter((p) => p !== perm) : [...currentDenied, perm],
      );
      if (currentGrants.includes(perm)) {
        setUserPermissions(permUser.nationalId, currentGrants.filter((p) => p !== perm));
      }
    }
  };

  /* 🆕 Assignmentها */
  const providers = useMemo(
    () => safeAccounts.filter((a) => (CLINICAL_ROLES as string[]).includes(a.role)),
    [safeAccounts],
  );

  // ✅ PATCH: نرمال‌سازی query تا ارقام فارسی هم match شوند
  const clientHits = useMemo(() => {
    const raw = clientQuery.trim();
    if (!raw) return [];
    const q = raw.toLowerCase();
    const qNorm = normalizeNationalId(raw);
    return safePersons
      .filter(
        (p) =>
          (p.fullName || '').toLowerCase().includes(q) ||
          p.nationalId.includes(q) ||
          (qNorm.length > 0 && p.nationalId.includes(qNorm)),
      )
      .slice(0, 6);
  }, [clientQuery, safePersons]);

  const personName = (id: string) => safePersons.find((p) => p.nationalId === id)?.fullName || maskNationalId(id);

  // ✅ PATCH: roleChip با chipKey و label اختیاری تا duplicate key رفع شود
  const roleChip = (
    r: AppRole,
    active: boolean,
    onPress: () => void,
    small?: boolean,
    chipKey?: string,
    label?: string,
  ) => (
    <Pressable
      key={chipKey ?? r}
      onPress={onPress}
      style={{
        paddingHorizontal: small ? 8 : 12,
        paddingVertical: small ? 4 : 6,
        borderRadius: Z_RADIUS.chip,
        backgroundColor: active ? ROLE_UI[r].color : colors.surfaceAlt,
        borderWidth: 1,
        borderColor: active ? ROLE_UI[r].color : colors.border,
        marginRight: 4,
        marginBottom: 4,
      }}
    >
      <Text
        style={{
          fontSize: small ? 8 : 9,
          fontWeight: '700',
          color: active ? '#fff' : colors.textSecondary,
        }}
        numberOfLines={1}
      >
        {label ?? `${ROLE_UI[r].emoji} ${isFa ? ROLE_META[r].fa : ROLE_META[r].en}`}
      </Text>
    </Pressable>
  );

  if (!canAdmin) return null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: Z_SPACE.md, paddingBottom: 60 }}
    >
      {/* هدر */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.sm, marginBottom: Z_SPACE.md }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: Z_RADIUS.control,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 14, color: colors.text }}>{isFa ? '→' : '←'}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
            👑 {isFa ? 'مدیریت دسترسی‌ها' : 'Access Management'}
          </Text>
          <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
            {isFa
              ? 'حساب‌ها، ۱۹ نقش، سازمان‌ها، Assignmentها و دسترسی‌های جزئی'
              : 'Accounts, 19 roles, orgs, assignments and granular permissions'}
          </Text>
        </View>
      </View>

      {/* KPI */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Z_SPACE.sm, marginBottom: Z_SPACE.lg }}>
        {[
          { label: isFa ? 'کل حساب‌ها' : 'Accounts', value: stats.total, color: colors.primary, emoji: '👥' },
          { label: isFa ? 'فعال' : 'Active', value: stats.active, color: colors.success, emoji: '✅' },
          { label: isFa ? 'غیرفعال' : 'Disabled', value: stats.disabled, color: colors.danger, emoji: '⛔' },
          { label: isFa ? 'سازمان‌ها' : 'Orgs', value: stats.orgs, color: colors.accent, emoji: '🏢' },
          { label: isFa ? 'Assignmentها' : 'Assignments', value: safeAssignments.length, color: colors.warning, emoji: '🔗' },
        ].map((s) => (
          <View key={s.label} style={getCardStyle({ flex: 1, minWidth: isWide ? 120 : 100 })}>
            <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: s.color, marginTop: Z_SPACE.xs }}>
              {n(s.value)}
            </Text>
            <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Z_SPACE.md, marginBottom: Z_SPACE.lg }}>
        {/* افزودن حساب */}
        <View style={getCardStyle({ flex: 1, minWidth: isWide ? 340 : '100%' })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.sm, marginBottom: Z_SPACE.md }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: Z_RADIUS.control,
                backgroundColor: colors.primary + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="profile" size={13} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
              {isFa ? 'افزودن حساب جدید' : 'Add New Account'}
            </Text>
          </View>

          <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: Z_SPACE.xs }}>
            {isFa ? 'کد ملی (۱۰ رقم)' : 'National ID (10 digits)'}
          </Text>
          <TextInput
            style={inp}
            keyboardType="numeric"
            placeholder={isFa ? 'مثلاً ۰۰۱۳۴۵۶۷۸' : 'e.g. 0012345678'}
            placeholderTextColor={colors.textMuted}
            value={newId}
            onChangeText={(t) => setNewId(t)}
          />
          {newIdValid && !!newIdPerson && (
            <View
              style={{
                marginTop: Z_SPACE.xs,
                padding: Z_SPACE.sm,
                borderRadius: Z_RADIUS.inner,
                backgroundColor: colors.success + '18',
                borderLeftWidth: 3,
                borderLeftColor: colors.success,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.success, marginBottom: 2 }}>
                ✓ {isFa ? 'یافت شد در پرسنل:' : 'Found in personnel:'}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.text }}>{newIdPerson.fullName}</Text>
              <Text style={{ fontSize: 8, color: colors.textSecondary, marginTop: 2 }}>
                🏢{' '}
                {newIdOrg
                  ? isFa
                    ? newIdOrg.nameFa || newIdOrg.name
                    : newIdOrg.name
                  : isFa
                  ? 'بانک سامان'
                  : 'Saman Bank'}
              </Text>
            </View>
          )}
          {newIdNorm.length > 0 && !newIdValid && (
            <Text style={{ fontSize: 8, color: colors.warning, marginTop: Z_SPACE.xs }}>
              ⚠ {isFa ? 'باید ۱۰ رقم باشد' : 'Must be 10 digits'} ({n(newIdNorm.length)}/۱۰)
            </Text>
          )}
          {newIdValid && !newIdPerson && (
            <Text style={{ fontSize: 8, color: colors.warning, marginTop: Z_SPACE.xs }}>
              ⚠ {isFa ? 'در پرسنل پیدا نشد (می‌توانید اضافه کنید)' : 'Not in personnel (you can still add)'}
            </Text>
          )}
          {newIdDup && (
            <Text style={{ fontSize: 8, color: colors.danger, marginTop: Z_SPACE.xs }}>
              ✕ {isFa ? 'تکراری' : 'Duplicate'}
            </Text>
          )}

          <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: Z_SPACE.md, marginBottom: Z_SPACE.xs }}>
            {isFa ? 'نقش اولیه' : 'Initial role'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Z_SPACE.sm }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {APP_ROLES.map((r) => roleChip(r, newRole === r, () => setNewRole(r), true))}
            </View>
          </ScrollView>
          <Text style={{ fontSize: 8, color: colors.textSecondary, marginBottom: Z_SPACE.sm }}>
            {ROLE_UI[newRole].emoji} {isFa ? ROLE_META[newRole].fa : ROLE_META[newRole].en} —{' '}
            {isFa ? ROLE_META[newRole].desc : ROLE_META[newRole].category}
          </Text>

          {!!message && (
            <View
              style={{
                marginTop: Z_SPACE.sm,
                padding: Z_SPACE.sm,
                borderRadius: Z_RADIUS.inner,
                backgroundColor: message.kind === 'success' ? colors.success + '18' : colors.danger + '18',
                borderLeftWidth: 3,
                borderLeftColor: message.kind === 'success' ? colors.success : colors.danger,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '700',
                  color: message.kind === 'success' ? colors.success : colors.danger,
                }}
              >
                {message.text}
              </Text>
            </View>
          )}

          <Pressable
            onPress={add}
            disabled={!newIdValid || newIdDup}
            style={{
              marginTop: Z_SPACE.md,
              backgroundColor: !newIdValid || newIdDup ? colors.border : colors.primary,
              borderRadius: Z_RADIUS.control,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
              ＋ {isFa ? 'افزودن حساب' : 'Add Account'}
            </Text>
          </Pressable>
        </View>

        {/* سازمان‌ها */}
        <View style={getCardStyle({ flex: 1, minWidth: isWide ? 280 : '100%' })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.sm, marginBottom: Z_SPACE.md }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: Z_RADIUS.control,
                backgroundColor: colors.accent + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 13 }}>🏢</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
              {isFa ? 'سازمان‌های ثبت‌شده' : 'Organizations'}
            </Text>
          </View>
          {safeOrgs.map((o) => {
            const count = safePersons.filter((p) => (p.orgId || 'org-saman') === o.id).length;
            const accCount = safeAccounts.filter((a) => {
              const p = safePersons.find((x) => x.nationalId === a.nationalId);
              return (p?.orgId || 'org-saman') === o.id;
            }).length;
            return (
              <View
                key={o.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: Z_SPACE.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: Z_RADIUS.control,
                    backgroundColor: o.id === 'org-saman' ? colors.primary + '18' : colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16 }}>🏢</Text>
                </View>
                <View style={{ flex: 1, marginHorizontal: Z_SPACE.sm }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                    {isFa ? o.nameFa || o.name : o.name}
                  </Text>
                  <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>
                    {n(count)} {isFa ? 'پرسنل' : 'personnel'} · {n(accCount)} {isFa ? 'حساب' : 'accounts'}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: Z_RADIUS.chip,
                    backgroundColor: o.active ? colors.success + '18' : colors.danger + '18',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: '700',
                      color: o.active ? colors.success : colors.danger,
                    }}
                  >
                    {o.active ? (isFa ? 'فعال' : 'Active') : isFa ? 'غیرفعال' : 'Inactive'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* 🆕 کارت Assignment مراجع ↔ ارائه‌دهنده */}
      <View style={getCardStyle({ marginBottom: Z_SPACE.lg })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.sm, marginBottom: Z_SPACE.md }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: Z_RADIUS.control,
              backgroundColor: colors.warning + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 13 }}>🔗</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: colors.text }}>
            {isFa ? 'ارجاع مراجع به ارائه‌دهنده (Assignment)' : 'Client → Provider Assignments'}
          </Text>
        </View>
        <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: Z_SPACE.sm }}>
          {isFa
            ? 'داده‌های «Assigned» هر نقش درمانی فقط شامل همین مراجعین می‌شود.'
            : 'Assigned-scope data of clinical roles is limited to these clients.'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Z_SPACE.sm }}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: Z_SPACE.xs }}>
              {isFa ? 'ارائه‌دهنده (نقش درمانی)' : 'Provider (clinical role)'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                {providers.map((p) => {
                  const r = normalizeRole(p.role);
                  return roleChip(
                    r,
                    provId === p.nationalId,
                    () => setProvId(p.nationalId),
                    true,
                    `prov-${p.nationalId}`,
                    `${ROLE_UI[r].emoji} ${personName(p.nationalId)}`,
                  );
                })}
              </View>
            </ScrollView>
            {provId ? (
  (() => {
    const provAcc = safeAccounts.find((a) => a.nationalId === provId);
    const pr = normalizeRole(provAcc?.role);
    const prUi = ROLE_UI[pr] || ROLE_UI.user;
    const prMeta = ROLE_META[pr];
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.xs, marginTop: Z_SPACE.xs }}>
        <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text }}>👤 {personName(provId)}</Text>
        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: Z_RADIUS.chip, backgroundColor: prUi.color + '22' }}>
          <Text style={{ fontSize: 7, fontWeight: '700', color: prUi.color }}>
            {prUi.emoji} {isFa ? prMeta.fa : prMeta.en}
          </Text>
        </View>
      </View>
    );
  })()
) : (
              <Text style={{ fontSize: 8, color: colors.warning, marginTop: Z_SPACE.xs }}>
                ⚠ {isFa ? 'ابتدا یک حساب با نقش درمانی بسازید' : 'Create a clinical-role account first'}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 200 }}>
            <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: Z_SPACE.xs }}>
              {isFa ? 'جستجوی مراجع' : 'Search client'}
            </Text>
            <TextInput
              style={inp}
              placeholder={isFa ? 'نام یا کد ملی...' : 'Name or ID...'}
              placeholderTextColor={colors.textMuted}
              value={clientQuery}
              onChangeText={setClientQuery}
            />
            {clientHits.map((p) => (
              <Pressable
                key={p.nationalId}
                disabled={!provId}
                onPress={() => {
                  const provAccount = safeAccounts.find((a) => a.nationalId === provId);
                  if (!provAccount) return;
                  if (!(CLINICAL_ROLES as string[]).includes(provAccount.role)) return;

                  assign({
                    orgId: p.orgId || 'org-saman',
                    clientId: p.nationalId,
                    providerId: provId,
                    providerRole: normalizeRole(provAccount.role),
                    createdBy: session?.nationalId || 'system',
                  });
                  setClientQuery('');
                  setMessage({ kind: 'success', text: isFa ? '✓ ارجاع ثبت شد' : '✓ Assigned' });
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: Z_SPACE.xs,
                  padding: Z_SPACE.sm,
                  borderRadius: Z_RADIUS.inner,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: provId ? 1 : 0.5,
                }}
              >
                <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text }}>{p.fullName}</Text>
                <Text style={{ fontSize: 7, color: colors.textMuted, marginTop: 1 }}>{faDigits(p.nationalId)}</Text>
                </View>
                <Text style={{ fontSize: 9, color: colors.primary }}>＋ {isFa ? 'ارجاع' : 'Assign'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ marginTop: Z_SPACE.md }}>
          {safeAssignments.slice(0, 10).map((a) => {
            const pr = normalizeRole(a.providerRole);
            const prUi = ROLE_UI[pr];
            const prMeta = ROLE_META[pr];
            return (
              <View
                key={a.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: Z_SPACE.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ flex: 1, fontSize: 9, color: colors.text }}>
                  👤 {personName(a.clientId)} ← {personName(a.providerId)}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: Z_RADIUS.chip,
                    backgroundColor: prUi.color + '22',
                  }}
                >
                  <Text style={{ fontSize: 7, fontWeight: '700', color: colors.textSecondary }}>
                    {isFa ? prMeta.fa : prMeta.en}
                  </Text>
                </View>
                <Pressable
                  onPress={() => unassign(a.id)}
                  style={{
                    marginLeft: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: Z_RADIUS.control,
                    backgroundColor: colors.dangerSoft,
                  }}
                >
                  <Text style={{ fontSize: 8, fontWeight: '700', color: colors.danger }}>✕</Text>
                </Pressable>
              </View>
            );
          })}
          {safeAssignments.length === 0 && (
            <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center', paddingVertical: Z_SPACE.md }}>
              {isFa ? 'هنوز ارجاعی ثبت نشده' : 'No assignments yet'}
            </Text>
          )}
        </View>
      </View>

      {/* حساب‌ها */}
      <View style={getCardStyle({ marginBottom: Z_SPACE.lg })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.sm, marginBottom: Z_SPACE.md }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: Z_RADIUS.control,
              backgroundColor: colors.primary + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="users" size={13} color={colors.primary} />
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: colors.text }}>
            {isFa ? 'حساب‌های کاربران' : 'User Accounts'} ({n(filteredAccounts.length)} / {n(safeAccounts.length)})
          </Text>
        </View>

        <TextInput
          style={{ ...inp, marginBottom: Z_SPACE.sm }}
          placeholder={isFa ? '🔍 جستجو با نام یا کد ملی...' : '🔍 Search by name or ID...'}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Z_SPACE.md }}>
          <View style={{ flexDirection: 'row' }}>
            <Pressable
              onPress={() => setRoleFilter('all')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: Z_RADIUS.chip,
                backgroundColor: roleFilter === 'all' ? colors.primary : colors.surfaceAlt,
                borderWidth: 1,
                borderColor: roleFilter === 'all' ? colors.primary : colors.border,
                marginRight: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '700',
                  color: roleFilter === 'all' ? '#fff' : colors.textSecondary,
                }}
              >
                {isFa ? 'همه' : 'All'}
              </Text>
            </Pressable>
            {APP_ROLES.map((r) => roleChip(r, roleFilter === r, () => setRoleFilter(r), true))}
          </View>
        </ScrollView>

        {filteredAccounts.length === 0 ? (
          <View
            style={{
              padding: Z_SPACE.xl,
              alignItems: 'center',
              backgroundColor: colors.surfaceAlt,
              borderRadius: Z_RADIUS.inner,
            }}
          >
            <Text style={{ fontSize: 24 }}>🔍</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: Z_SPACE.sm }}>
              {isFa ? 'حسابی پیدا نشد' : 'No accounts found'}
            </Text>
          </View>
        ) : (
          filteredAccounts.map((a) => {
            const person = safePersons.find((p) => p.nationalId === a.nationalId);
            const personOrg = safeOrgs.find((o) => o.id === (person?.orgId || 'org-saman'));
            const isSelf = a.nationalId === session?.nationalId;
            const ar = normalizeRole(a.role);
            const ui = ROLE_UI[ar] || ROLE_UI.user;
            const meta = ROLE_META[ar];
            const customPerms = (a.permissions?.length || 0) + (a.deniedPermissions?.length || 0);
            return (
              <View
                key={a.nationalId}
                style={{
                  paddingVertical: Z_SPACE.md,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: Z_RADIUS.inner,
                      backgroundColor: ui.color + '18',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{ui.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, marginHorizontal: Z_SPACE.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.xs }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>
                        {person?.fullName || maskNationalId(a.nationalId)}
                      </Text>
                      {isSelf && (
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: Z_RADIUS.chip,
                            backgroundColor: colors.primary + '22',
                          }}
                        >
                          <Text style={{ fontSize: 7, fontWeight: '700', color: colors.primary }}>
                            {isFa ? 'شما' : 'You'}
                          </Text>
                        </View>
                      )}
                      <View
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: Z_RADIUS.chip,
                          backgroundColor: ui.color + '22',
                        }}
                      >
                        <Text style={{ fontSize: 7, fontWeight: '700', color: ui.color }}>
                          {isFa ? meta.fa : meta.en}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2 }}>
                      {faDigits(a.nationalId)} · 🏢{' '}
                      {personOrg ? (isFa ? personOrg.nameFa || personOrg.name : personOrg.name) : '—'}
                    </Text>
                    {customPerms > 0 && (
                      <View style={{ flexDirection: 'row', gap: Z_SPACE.xs, marginTop: Z_SPACE.xs }}>
                        {(a.permissions?.length || 0) > 0 && (
                          <View
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: Z_RADIUS.chip,
                              backgroundColor: colors.success + '22',
                            }}
                          >
                            <Text style={{ fontSize: 7, fontWeight: '700', color: colors.success }}>
                              +{n(a.permissions?.length || 0)} {isFa ? 'دسترسی ویژه' : 'granted'}
                            </Text>
                          </View>
                        )}
                        {(a.deniedPermissions?.length || 0) > 0 && (
                          <View
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: Z_RADIUS.chip,
                              backgroundColor: colors.danger + '22',
                            }}
                          >
                            <Text style={{ fontSize: 7, fontWeight: '700', color: colors.danger }}>
                              −{n(a.deniedPermissions?.length || 0)} {isFa ? 'ممنوع' : 'denied'}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: 'center', gap: Z_SPACE.xs }}>
                    <Text
                      style={{
                        fontSize: 8,
                        color: a.active ? colors.success : colors.danger,
                        fontWeight: '700',
                      }}
                    >
                      {a.active ? (isFa ? 'فعال' : 'Active') : isFa ? 'غیرفعال' : 'Off'}
                    </Text>
                    <Switch
                      value={a.active}
                      onValueChange={() => !isSelf && toggleActive(a.nationalId)}
                      disabled={isSelf}
                      trackColor={{ false: colors.border, true: colors.success + '88' }}
                      thumbColor={a.active ? colors.success : colors.surfaceAlt}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: Z_SPACE.xs, marginTop: Z_SPACE.sm }}>
                  <Pressable
                    onPress={() => !isSelf && setRolePickerFor(a.nationalId)}
                    disabled={isSelf}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 9,
                      borderRadius: Z_RADIUS.control,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: isSelf ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 11 }}>🎭</Text>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>
                      {isFa ? 'تغییر نقش' : 'Change role'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPermissionsUser(a.nationalId)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: Z_SPACE.xs,
                      paddingVertical: 9,
                      borderRadius: Z_RADIUS.control,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 11 }}>🔐</Text>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>
                      {isFa ? 'دسترسی‌های جزئی' : 'Granular permissions'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* تنظیمات امنیت ورود */}
      <View style={getCardStyle({ marginBottom: Z_SPACE.lg })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.sm, marginBottom: Z_SPACE.md }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: Z_RADIUS.control,
              backgroundColor: colors.danger + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="shield" size={13} color={colors.danger} />
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: colors.text }}>
            {isFa ? 'تنظیمات امنیت ورود' : 'Login Security Settings'}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: Z_SPACE.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
              {isFa ? 'خودثبت‌نامی از پرسنل (Self-Provision)' : 'Self-provision from personnel'}
            </Text>
            <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>
              {isFa
                ? 'روشن: هر کد ملی موجود در پرسنل با نقش «کاربر» وارد می‌شود. خاموش: فقط حساب‌های دستی.'
                : 'On: personnel IDs register as “user”. Off: manual accounts only.'}
            </Text>
          </View>
          <Switch
            value={selfProvision}
            onValueChange={setSelfProvision}
            trackColor={{ false: colors.border, true: colors.success + '88' }}
            thumbColor={selfProvision ? colors.success : colors.surfaceAlt}
          />
        </View>

        <View
          style={{
            marginTop: Z_SPACE.sm,
            padding: Z_SPACE.sm,
            borderRadius: Z_RADIUS.inner,
            backgroundColor: colors.warning + '12',
            borderLeftWidth: 3,
            borderLeftColor: colors.warning,
          }}
        >
          <Text style={{ fontSize: 8, color: colors.warning, lineHeight: 14 }}>
            {isFa
              ? '⚠ توصیه: پیش از رفتن روی هاست عمومی، این گزینه را خاموش کنید یا فقط برای دورهٔ تست روشن نگه دارید.'
              : '⚠ Recommended: disable before public host, or keep on only during testing.'}
          </Text>
        </View>
      </View>

      {/* 🆕 ماتریس نقش‌ها با Scope */}
      <View style={getCardStyle({ marginBottom: Z_SPACE.lg })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.sm, marginBottom: Z_SPACE.md }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: Z_RADIUS.control,
              backgroundColor: colors.accent + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 13 }}>📊</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: colors.text }}>
            {isFa ? 'ماتریس دسترسی پیش‌فرض نقش‌ها (با Scope)' : 'Role Default Matrix (with Scope)'}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Z_SPACE.sm }}>
          <View style={{ flexDirection: 'row' }}>
            {APP_ROLES.map((r) => roleChip(r, matrixRole === r, () => setMatrixRole(r), true))}
          </View>
        </ScrollView>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: Z_SPACE.sm,
            padding: Z_SPACE.sm,
            borderRadius: Z_RADIUS.inner,
            backgroundColor: ROLE_UI[matrixRole].color + '12',
          }}
        >
          <Text style={{ fontSize: 14 }}>{ROLE_UI[matrixRole].emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.text }}>
              {isFa ? ROLE_META[matrixRole].fa : ROLE_META[matrixRole].en}
            </Text>
            <Text style={{ fontSize: 8, color: colors.textSecondary, marginTop: 1 }}>
              {isFa ? ROLE_META[matrixRole].desc : ROLE_META[matrixRole].category}
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ minWidth: 520 }}>
            <View
              style={{
                flexDirection: 'row',
                borderBottomWidth: 2,
                borderBottomColor: colors.border,
                paddingBottom: Z_SPACE.xs,
                marginBottom: Z_SPACE.xs,
              }}
            >
              <Text style={{ flex: 2, fontSize: 9, fontWeight: '800', color: colors.text }}>
                {isFa ? 'دسترسی' : 'Permission'}
              </Text>
              <Text
                style={{
                  flex: 1,
                  fontSize: 9,
                  fontWeight: '800',
                  color: colors.text,
                  textAlign: 'center',
                }}
              >
                {isFa ? 'وضعیت / Scope' : 'Status / Scope'}
              </Text>
            </View>
            {PERMISSIONS.map((p) => {
              const grant = ROLE_GRANTS[matrixRole]?.find((x) => x.p === p.key);
              return (
                <View
                  key={p.key}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 4,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ flex: 2, fontSize: 8, color: colors.text }} numberOfLines={1}>
                    {p.dangerous ? '⚠ ' : ''}
                    {isFa ? p.fa : p.en}
                  </Text>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    {grant ? (
                      <View
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: Z_RADIUS.chip,
                          backgroundColor: colors.success + '18',
                        }}
                      >
                        <Text style={{ fontSize: 7, fontWeight: '700', color: colors.success }}>
                          ✅ {isFa ? SCOPE_FA[grant.s] : SCOPE_EN[grant.s]}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 9, color: colors.textMuted }}>—</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* لاگ ممیزی */}
      <View style={getCardStyle({ marginBottom: Z_SPACE.lg })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.sm, marginBottom: Z_SPACE.md }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: Z_RADIUS.control,
              backgroundColor: colors.warning + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="shield" size={13} color={colors.warning} />
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: colors.text }}>
            {isFa ? 'لاگ ممیزی' : 'Audit Log'} ({n(safeAudit.length)})
          </Text>
        </View>
        {safeAudit.slice(0, 12).map((e) => (
          <View
            key={e.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: Z_SPACE.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: Z_RADIUS.control,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 12 }}>📝</Text>
            </View>
            <View style={{ flex: 1, marginHorizontal: Z_SPACE.sm }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>{e.type}</Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>
                👤 {maskNationalId(e.actorId)} {e.targetId ? `→ ${maskNationalId(e.targetId)}` : ''}{' '}
                {e.meta ? `· ${e.meta}` : ''}
              </Text>
            </View>
            <Text style={{ fontSize: 8, color: colors.textMuted }}>
              {new Date(e.at).toLocaleTimeString(isFa ? 'fa-IR' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        ))}
      </View>

      {/* پشتیبان‌گیری */}
      <View style={getCardStyle()}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.sm, marginBottom: Z_SPACE.md }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: Z_RADIUS.control,
              backgroundColor: colors.success + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 13 }}>💾</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: colors.text }}>
            {isFa ? 'پشتیبان‌گیری و بازیابی' : 'Backup & Restore'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: Z_SPACE.sm }}>
          <Pressable
            onPress={doExport}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Z_SPACE.xs,
              backgroundColor: colors.primary,
              borderRadius: Z_RADIUS.control,
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 12 }}>⬇️</Text>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
              {isFa ? 'دانلود پشتیبان' : 'Export'}
            </Text>
          </Pressable>
          <Pressable
            onPress={doRestore}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Z_SPACE.xs,
              backgroundColor: colors.surfaceAlt,
              borderRadius: Z_RADIUS.control,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12 }}>⬆️</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800' }}>
              {isFa ? 'بازیابی' : 'Restore'}
            </Text>
          </Pressable>
        </View>
        {!!backupMsg && (
          <View
            style={{
              marginTop: Z_SPACE.sm,
              padding: Z_SPACE.sm,
              borderRadius: Z_RADIUS.inner,
              backgroundColor: colors.success + '18',
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.success }}>{backupMsg}</Text>
          </View>
        )}
      </View>

      {/* 🆕 مودال انتخاب نقش */}
      <FixedOverlay visible={!!pickerUser} onClose={() => setRolePickerFor(null)}>
        {pickerUser ? (
          <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
            <View
              style={{
                width: '100%',
                maxWidth: 480,
                backgroundColor: colors.surface,
                borderRadius: Z_RADIUS.card,
                padding: Z_SPACE.lg,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Z_SPACE.md }}>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: colors.text }}>
                  🎭 {isFa ? 'انتخاب نقش:' : 'Select role:'} {personName(pickerUser.nationalId)}
                </Text>
                <Pressable
                  onPress={() => setRolePickerFor(null)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: Z_RADIUS.control,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.surfaceAlt,
                  }}
                >
                  <Text style={{ color: colors.textMuted }}>✕</Text>
                </Pressable>
              </View>
              {(['platform', 'org', 'clinical', 'ops', 'participant'] as const).map((cat) => {
                const rolesInCat = APP_ROLES.filter((r) => ROLE_META[r].category === cat);
                const first = rolesInCat[0];
                // ✅ PATCH: نرمال‌سازی نقش pickerUser
                const currentRole = normalizeRole(pickerUser.role);
                return (
                  <View key={cat} style={{ marginBottom: Z_SPACE.md }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textMuted, marginBottom: Z_SPACE.xs }}>
                      {first ? (isFa ? ROLE_META[first].categoryFa : cat) : cat}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {rolesInCat.map((r) =>
                        roleChip(
                          r,
                          currentRole === r,
                          () => {
                            setRole(pickerUser.nationalId, r as Role);
                            setRolePickerFor(null);
                          },
                          false,
                          `picker-${pickerUser.nationalId}-${r}`,
                        ),
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : null}
      </FixedOverlay>

      {/* مودال دسترسی جزئی */}
      <FixedOverlay visible={!!permUser} onClose={() => setPermissionsUser(null)}>
        {permUser ? (
          <ScrollView style={{ maxHeight: '85%' }} showsVerticalScrollIndicator={false}>
            <View
              style={{
                width: '100%',
                maxWidth: 600,
                backgroundColor: colors.surface,
                borderRadius: Z_RADIUS.card,
                padding: Z_SPACE.lg,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Z_SPACE.md }}>
                {/* ✅ PATCH: نرمال‌سازی نقش permUser */}
                {(() => {
                  const ar = normalizeRole(permUser.role);
                  const ui = ROLE_UI[ar] || ROLE_UI.user;
                  const meta = ROLE_META[ar];
                  return (
                    <>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: Z_RADIUS.inner,
                          backgroundColor: ui.color + '18',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>{ui.emoji}</Text>
                      </View>
                      <View style={{ flex: 1, marginHorizontal: Z_SPACE.sm }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                          {safePersons.find((p) => p.nationalId === permUser.nationalId)?.fullName ||
                            maskNationalId(permUser.nationalId)}
                        </Text>
                        <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
                          {faDigits(permUser.nationalId)} · {isFa ? meta.fa : meta.en}
                        </Text>
                      </View>
                    </>
                  );
                })()}
                <Pressable
                  onPress={() => setPermissionsUser(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: Z_RADIUS.control,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 14 }}>✕</Text>
                </Pressable>
              </View>

              <View
                style={{
                  backgroundColor: colors.primary + '0a',
                  borderRadius: Z_RADIUS.inner,
                  padding: Z_SPACE.md,
                  marginBottom: Z_SPACE.lg,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.primary,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary, marginBottom: Z_SPACE.xs }}>
                  💡 {isFa ? 'قوانین دسترسی:' : 'Permission rules:'}
                </Text>
                <Text style={{ fontSize: 9, color: colors.primary + 'cc', lineHeight: 16 }}>
                  {isFa
                    ? '✅ سبز = دسترسی فعال · ❌ قرمز = ممنوع (بالاترین اولویت) · ⬜ سفید = پیش‌فرض نقش'
                    : '✅ Green = granted · ❌ Red = denied (highest) · ⬜ White = role default'}
                </Text>
              </View>

              {Array.from(permsByGroup.entries()).map(([group, { fa, items }]) => {
                const expanded = expandedGroups[group] ?? true;
                return (
                  <View key={group} style={{ marginBottom: Z_SPACE.md }}>
                    <Pressable
                      onPress={() => setExpandedGroups((p) => ({ ...p, [group]: !expanded }))}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: Z_SPACE.sm,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: colors.text }}>{fa}</Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>{expanded ? '▾' : '▸'}</Text>
                    </Pressable>
                    {expanded && (
                      <View style={{ marginTop: Z_SPACE.xs, gap: Z_SPACE.xs }}>
                        {items.map((p) => {
                          const granted = ((permUser.permissions || []) as Permission[]).includes(p.key);
                          const denied = ((permUser.deniedPermissions || []) as Permission[]).includes(p.key);
                          const defaultOn = (ROLE_DEFAULTS[permUser.role] || []).includes(p.key);
                          const st: 'granted' | 'denied' | 'default' = denied
                            ? 'denied'
                            : granted
                            ? 'granted'
                            : 'default';
                          const effective = hasPermission(
                            permUser.permissions as Permission[] | null,
                            permUser.deniedPermissions as Permission[] | null,
                            permUser.role,
                            p.key,
                          );
                          return (
                            <View
                              key={p.key}
                              style={{
                                backgroundColor:
                                  st === 'denied'
                                    ? colors.danger + '0a'
                                    : st === 'granted'
                                    ? colors.success + '0a'
                                    : colors.surfaceAlt,
                                borderRadius: Z_RADIUS.inner,
                                padding: Z_SPACE.sm,
                                borderWidth: 1,
                                borderColor:
                                  st === 'denied'
                                    ? colors.danger + '33'
                                    : st === 'granted'
                                    ? colors.success + '33'
                                    : colors.border,
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 32, alignItems: 'center' }}>
                                  <Text style={{ fontSize: 16 }}>
                                    {effective ? (st === 'denied' ? '❌' : '✅') : '—'}
                                  </Text>
                                </View>
                                <View style={{ flex: 1, marginHorizontal: Z_SPACE.sm }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.xs }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>
                                      {isFa ? p.fa : p.en}
                                    </Text>
                                    {p.dangerous && (
                                      <View
                                        style={{
                                          paddingHorizontal: 5,
                                          paddingVertical: 1,
                                          borderRadius: Z_RADIUS.chip,
                                          backgroundColor: colors.danger + '22',
                                        }}
                                      >
                                        <Text style={{ fontSize: 7, fontWeight: '700', color: colors.danger }}>
                                          ⚠ {isFa ? 'حساس' : 'sensitive'}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text style={{ fontSize: 7, color: colors.textMuted, marginTop: 2 }}>
                                    {isFa ? 'پیش‌فرض نقش: ' : 'Role default: '}
                                    {defaultOn ? (isFa ? '✅ فعال' : '✅ on') : isFa ? '— خاموش' : '— off'}
                                  </Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: Z_SPACE.xs }}>
                                  <Pressable
                                    onPress={() => togglePerm(p.key, 'grant')}
                                    style={{
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: Z_RADIUS.control,
                                      backgroundColor: granted ? colors.success : colors.surfaceAlt,
                                      borderWidth: 1,
                                      borderColor: granted ? colors.success : colors.border,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 9,
                                        fontWeight: '700',
                                        color: granted ? '#fff' : colors.textMuted,
                                      }}
                                    >
                                      ✓
                                    </Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => togglePerm(p.key, 'deny')}
                                    style={{
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: Z_RADIUS.control,
                                      backgroundColor: denied ? colors.danger : colors.surfaceAlt,
                                      borderWidth: 1,
                                      borderColor: denied ? colors.danger : colors.border,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 9,
                                        fontWeight: '700',
                                        color: denied ? '#fff' : colors.textMuted,
                                      }}
                                    >
                                      ✕
                                    </Text>
                                  </Pressable>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}

              <Pressable
                onPress={() => setPermissionsUser(null)}
                style={{
                  marginTop: Z_SPACE.lg,
                  backgroundColor: colors.primary,
                  borderRadius: Z_RADIUS.control,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>
                  {isFa ? 'بستن' : 'Close'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : null}
      </FixedOverlay>
    </ScrollView>
  );
}