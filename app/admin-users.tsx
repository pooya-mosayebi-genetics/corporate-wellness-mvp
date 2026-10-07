import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useAuth, type UserAccount } from '../src/store/AuthContext';
import { normalizeNationalId } from '../src/utils/nationalId';
import { api } from '../src/lib/api';

interface RoleCatalogItem {
  key: string;
  fa?: string;
  en?: string;
  category?: string;
  categoryFa?: string;
  desc?: string;
  defaultPermissions?: string[];
}

interface PermissionDef {
  key: string;
  fa: string;
  en: string;
  group: string;
  groupFa: string;
  dangerous?: boolean;
}

export default function AdminUsersScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';

  const {
    session,
    accounts,
    addUserManually,
    adminResetPassword,
    refreshAccounts,
  } = useAuth();

  const safeAccounts = useMemo(
    () => (Array.isArray(accounts) ? accounts : []),
    [accounts]
  );

  const [newId, setNewId] = useState('');
  const [newRole, setNewRole] = useState<string>('user');
  const [actionLoading, setActionLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [roles, setRoles] = useState<RoleCatalogItem[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  const [permissionDefs, setPermissionDefs] = useState<PermissionDef[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<'role' | 'perms' | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [draftRole, setDraftRole] = useState<string>('user');
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [denied, setDenied] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadRoles = async () => {
      if (!session) return;

      setRolesLoading(true);
      setRolesError(null);

      try {
        const res = await api.getRolesCatalog();
        const list = Array.isArray((res as any)?.roles) ? (res as any).roles : [];
        if (!cancelled) setRoles(list);
      } catch (e: any) {
        if (!cancelled) {
          setRolesError(
            e?.message ||
              (isFa ? 'خطا در دریافت فهرست نقش‌ها' : 'Failed to load roles')
          );
        }
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    };

    loadRoles();

    return () => {
      cancelled = true;
    };
  }, [session, isFa]);

  useEffect(() => {
    let cancelled = false;

    const loadPermissions = async () => {
      if (!session) return;

      setPermissionsLoading(true);
      setPermissionsError(null);

      try {
        const res = await api.getPermissionsCatalog();
        const list = Array.isArray((res as any)?.permissions)
          ? (res as any).permissions
          : [];
        if (!cancelled) setPermissionDefs(list);
      } catch (e: any) {
        if (!cancelled) {
          setPermissionsError(
            e?.message ||
              (isFa ? 'خطا در دریافت فهرست دسترسی‌ها' : 'Failed to load permissions')
          );
        }
      } finally {
        if (!cancelled) setPermissionsLoading(false);
      }
    };

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [session, isFa]);

  const selected = useMemo(
    () => safeAccounts.find((a) => a.nationalId === selectedId) || null,
    [safeAccounts, selectedId]
  );

  const isSelf = !!selected && !!session && selected.nationalId === session.nationalId;

  const closeModal = useCallback(() => {
    setModal(null);
    setSelectedId(null);
    setModalError(null);
    setSaving(false);
  }, []);

  const openRoleModal = useCallback((acc: UserAccount) => {
    setSelectedId(acc.nationalId);
    setDraftRole(String(acc.role || 'user'));
    setModal('role');
    setModalError(null);
  }, []);

  const openPermsModal = useCallback((acc: UserAccount) => {
    setSelectedId(acc.nationalId);
    setGranted(new Set(acc.permissions || []));
    setDenied(new Set(acc.deniedPermissions || []));
    setModal('perms');
    setModalError(null);
  }, []);

  const getRoleLabel = useCallback(
    (roleKey: string) => {
      const r = roles.find((x) => x.key === roleKey);
      if (isFa) return r?.fa || roleKey;
      return r?.en || roleKey;
    },
    [roles, isFa]
  );

  const roleGroups = useMemo(() => {
    const map = new Map<string, { label: string; items: RoleCatalogItem[] }>();

    roles.forEach((r) => {
      const key = String(r.category || 'other');
      const label = isFa ? r.categoryFa || key : key;

      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(r);
    });

    return Array.from(map.entries()).map(([group, value]) => ({
      group,
      label: value.label,
      items: value.items,
    }));
  }, [roles, isFa]);

  const permissionGroups = useMemo(() => {
    const map = new Map<string, { label: string; items: PermissionDef[] }>();

    permissionDefs.forEach((p) => {
      const key = String(p.group || 'other');
      const label = isFa ? p.groupFa || key : key;

      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(p);
    });

    return Array.from(map.entries()).map(([group, value]) => ({
      group,
      label: value.label,
      items: value.items,
    }));
  }, [permissionDefs, isFa]);

  const toggleGranted = useCallback(
    (key: string) => {
      const willGrant = !granted.has(key);

      setGranted((prev) => {
        const next = new Set(prev);
        if (willGrant) next.add(key);
        else next.delete(key);
        return next;
      });

      if (willGrant) {
        setDenied((prev) => {
          if (!prev.has(key)) return prev;
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [granted]
  );

  const toggleDenied = useCallback(
    (key: string) => {
      const willDeny = !denied.has(key);

      setDenied((prev) => {
        const next = new Set(prev);
        if (willDeny) next.add(key);
        else next.delete(key);
        return next;
      });

      if (willDeny) {
        setGranted((prev) => {
          if (!prev.has(key)) return prev;
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [denied]
  );

  const saveRole = useCallback(async () => {
    if (!selected) return;

    setSaving(true);
    setModalError(null);

    try {
      await api.setUserRole(selected.nationalId, draftRole);
      const ok = await refreshAccounts();
      if (!ok) throw new Error(isFa ? 'بروزرسانی لیست کاربران ناموفق بود' : 'Failed to refresh users');

      Alert.alert(
        isFa ? 'موفق' : 'Success',
        isFa ? 'نقش کاربر تغییر کرد.' : 'User role updated.'
      );
      closeModal();
    } catch (e: any) {
      setModalError(e?.message || (isFa ? 'تغییر نقش ناموفق بود.' : 'Role update failed.'));
    } finally {
      setSaving(false);
    }
  }, [selected, draftRole, refreshAccounts, isFa, closeModal]);

  const savePermissions = useCallback(async () => {
    if (!selected) return;

    setSaving(true);
    setModalError(null);

    try {
      await api.setUserPermissions(
        selected.nationalId,
        Array.from(granted),
        Array.from(denied)
      );

      const ok = await refreshAccounts();
      if (!ok) throw new Error(isFa ? 'بروزرسانی لیست کاربران ناموفق بود' : 'Failed to refresh users');

      Alert.alert(
        isFa ? 'موفق' : 'Success',
        isFa ? 'دسترسی‌های کاربر ذخیره شد.' : 'User permissions saved.'
      );
      closeModal();
    } catch (e: any) {
      setModalError(e?.message || (isFa ? 'ذخیره دسترسی‌ها ناموفق بود.' : 'Saving permissions failed.'));
    } finally {
      setSaving(false);
    }
  }, [selected, granted, denied, refreshAccounts, isFa, closeModal]);

  const handleToggleActive = useCallback(
    async (acc: UserAccount) => {
      if (!session) return;

      if (acc.nationalId === session.nationalId) {
        Alert.alert(
          isFa ? 'غیرمجاز' : 'Not allowed',
          isFa ? 'نمی‌توانید حساب خود را غیرفعال کنید.' : 'You cannot deactivate your own account.'
        );
        return;
      }

      setBusyId(acc.nationalId);

      try {
        await api.setUserActive(acc.nationalId, !acc.active);
        const ok = await refreshAccounts();
        if (!ok) throw new Error(isFa ? 'بروزرسانی لیست کاربران ناموفق بود' : 'Failed to refresh users');

        Alert.alert(
          isFa ? 'انجام شد' : 'Done',
          acc.active
            ? (isFa ? 'کاربر غیرفعال شد.' : 'User deactivated.')
            : (isFa ? 'کاربر فعال شد.' : 'User activated.')
        );
      } catch (e: any) {
        Alert.alert(
          isFa ? 'خطا' : 'Error',
          e?.message || (isFa ? 'تغییر وضعیت ناموفق بود.' : 'Status change failed.')
        );
      } finally {
        setBusyId(null);
      }
    },
    [session, refreshAccounts, isFa]
  );

  const ALLOWED_ROLES = ['super_admin', 'admin', 'it_admin', 'org_admin', 'org_owner'];

  if (!session || !ALLOWED_ROLES.includes(String(session.role))) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 40, marginBottom: 10 }}>⛔</Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '800',
            color: colors.danger,
            textAlign: 'center',
          }}
        >
          {isFa ? 'دسترسی غیرمجاز' : 'Access Denied'}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.textMuted,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          {isFa
            ? 'این بخش فقط برای مدیران سیستم است.'
            : 'This section is restricted to system administrators.'}
        </Text>
        <Pressable
          onPress={() => router.replace('/')}
          style={{
            marginTop: 20,
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: colors.primary,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '700' }}>
            {isFa ? 'بازگشت به خانه' : 'Go Home'}
          </Text>
        </Pressable>
      </View>
    );
  }

  const handleAddUser = async () => {
    const cleanId = normalizeNationalId(newId);

    if (cleanId.length !== 10) {
      Alert.alert(
        isFa ? 'خطا' : 'Error',
        isFa ? 'کد ملی باید دقیقاً ۱۰ رقم باشد.' : 'ID must be exactly 10 digits.'
      );
      return;
    }

    if (safeAccounts.some((a) => a.nationalId === cleanId)) {
      Alert.alert(
        isFa ? 'تکراری' : 'Duplicate',
        isFa ? 'این کد ملی قبلاً ثبت شده است.' : 'User already exists.'
      );
      return;
    }

    setActionLoading(true);

    try {
      const success = await addUserManually(cleanId, newRole as any);

      if (success) {
        Alert.alert(
          isFa ? 'موفق' : 'Success',
          isFa
            ? 'کاربر اضافه شد.\nاو باید در اولین ورود، رمز عبور خود را تعیین کند.'
            : 'User added.\nThey must set their password on first login.'
        );
        setNewId('');
      } else {
        throw new Error('Failed to add user');
      }
    } catch (e: any) {
      Alert.alert(
        isFa ? 'خطا' : 'Error',
        e?.message || (isFa ? 'عملیات ناموفق بود.' : 'Operation failed.')
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPass = async (id: string) => {
    Alert.alert(
      isFa ? 'ریست رمز عبور' : 'Reset Password',
      isFa
        ? `آیا مطمئن هستید؟\nرمز کاربر ${id} پاک می‌شود و او باید مجدداً رمز بسازد.`
        : `Are you sure?\nPassword for ${id} will be cleared and they must reset it.`,
      [
        { text: isFa ? 'انصراف' : 'Cancel', style: 'cancel' },
        {
          text: isFa ? 'تایید و ریست' : 'Confirm Reset',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const ok = await adminResetPassword(id);
            setActionLoading(false);

            if (ok) {
              Alert.alert(
                isFa ? 'انجام شد' : 'Done',
                isFa ? 'رمز پاک شد.' : 'Password cleared.'
              );
            } else {
              Alert.alert(
                isFa ? 'خطا' : 'Error',
                isFa ? 'ریست ناموفق بود.' : 'Reset failed.'
              );
            }
          },
        },
      ]
    );
  };

  const smallBtn = (disabled: boolean) => ({
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: disabled ? colors.border : colors.primary,
    backgroundColor: disabled ? colors.surfaceAlt : colors.primarySoft,
    opacity: disabled ? 0.55 : 1,
  });

  const smallBtnText = (disabled: boolean) => ({
    fontSize: 10,
    fontWeight: '700',
    color: disabled ? colors.textMuted : colors.primary,
  });

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>
            👥 {isFa ? 'مدیریت کاربران' : 'User Management'}
          </Text>

          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: colors.successSoft,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success }}>
              {safeAccounts.length} {isFa ? 'کاربر' : 'Users'}
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            marginBottom: 24,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 12 }}>
            ➕ {isFa ? 'ثبت کاربر جدید' : 'Register New User'}
          </Text>

          <TextInput
            placeholder={isFa ? 'کد ملی ۱۰ رقمی...' : 'Enter 10-digit National ID...'}
            value={newId}
            onChangeText={(t) => setNewId(normalizeNationalId(t))}
            keyboardType="number-pad"
            maxLength={10}
            style={{
              backgroundColor: colors.surfaceAlt,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: 12,
              color: colors.text,
              borderWidth: 1,
              borderColor: colors.border,
              fontSize: 14,
              letterSpacing: 1,
            }}
          />

          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
            {isFa ? 'نقش کاربر:' : 'Assign Role:'}
          </Text>

          {rolesLoading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                {isFa ? 'در حال دریافت نقش‌ها...' : 'Loading roles...'}
              </Text>
            </View>
          )}

          {rolesError && (
            <Text style={{ fontSize: 11, color: colors.danger, marginBottom: 10 }}>
              {rolesError}
            </Text>
          )}

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {(roles.length > 0 ? roles : [{ key: 'user', fa: 'کارمند', en: 'Staff' }]).map((r) => {
              const active = newRole === r.key;
              const label = isFa ? r.fa || r.key : r.en || r.key;

              return (
                <Pressable
                  key={r.key}
                  onPress={() => setNewRole(r.key)}
                  style={{
                    minWidth: 92,
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: active ? colors.primary : colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: active ? '#FFF' : colors.textSecondary,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleAddUser}
            disabled={actionLoading || newId.length !== 10}
            style={{
              backgroundColor:
                actionLoading || newId.length !== 10 ? colors.border : colors.success,
              borderRadius: 10,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: actionLoading || newId.length !== 10 ? 0.6 : 1,
            }}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>
                {isFa ? 'ثبت و ارسال دعوت‌نامه' : 'Create & Invite User'}
              </Text>
            )}
          </Pressable>
        </View>

        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 12 }}>
          📋 {isFa ? 'لیست حساب‌های فعال' : 'Active Accounts'}
        </Text>

        {safeAccounts.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {isFa ? 'هیچ کاربری ثبت نشده است.' : 'No users registered yet.'}
            </Text>
          </View>
        ) : (
          safeAccounts.map((acc) => {
            const self = acc.nationalId === session.nationalId;
            const busy = busyId === acc.nationalId;

            return (
              <View
                key={acc.nationalId}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>
                      {acc.fullName || acc.nationalId}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                      {acc.nationalId}
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <View
                        style={{
                          paddingHorizontal: 7,
                          paddingVertical: 3,
                          borderRadius: 999,
                          backgroundColor:
                            acc.role === 'super_admin' ? colors.danger + '22' : colors.primarySoft,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: acc.role === 'super_admin' ? colors.danger : colors.primary,
                          }}
                        >
                          {getRoleLabel(acc.role)}
                        </Text>
                      </View>

                      <View
                        style={{
                          paddingHorizontal: 7,
                          paddingVertical: 3,
                          borderRadius: 999,
                          backgroundColor: acc.active ? colors.successSoft : colors.surfaceAlt,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: acc.active ? colors.success : colors.textMuted,
                          }}
                        >
                          {acc.active ? (isFa ? 'فعال' : 'Active') : (isFa ? 'غیرفعال' : 'Disabled')}
                        </Text>
                      </View>

                      {!acc.hasPassword && (
                        <View
                          style={{
                            paddingHorizontal: 7,
                            paddingVertical: 3,
                            borderRadius: 999,
                            backgroundColor: colors.warningSoft,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.warning }}>
                            {isFa ? 'نیاز به تنظیم رمز' : 'Needs Setup'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {self && (
                    <View
                      style={{
                        marginRight: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: colors.surfaceAlt,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted }}>
                        {isFa ? 'شما' : 'You'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                  <Pressable
                    onPress={() => openRoleModal(acc)}
                    disabled={self}
                    style={smallBtn(self)}
                  >
                    <Text style={smallBtnText(self)}>
                      {isFa ? 'تغییر نقش' : 'Change Role'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => openPermsModal(acc)}
                    disabled={self}
                    style={smallBtn(self)}
                  >
                    <Text style={smallBtnText(self)}>
                      {isFa ? 'دسترسی‌های جزئی' : 'Fine-grained'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleToggleActive(acc)}
                    disabled={self || busy}
                    style={smallBtn(self || busy)}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={smallBtnText(self || busy)}>
                        {acc.active ? (isFa ? 'غیرفعال' : 'Deactivate') : (isFa ? 'فعال' : 'Activate')}
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => handleResetPass(acc.nationalId)}
                    disabled={!acc.hasPassword || busy}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: acc.hasPassword ? colors.danger : colors.border,
                      backgroundColor: acc.hasPassword ? colors.danger + '18' : colors.surfaceAlt,
                      opacity: acc.hasPassword ? 1 : 0.55,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: acc.hasPassword ? colors.danger : colors.textMuted,
                      }}
                    >
                      🔑 {isFa ? 'ریست رمز' : 'Reset'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={!!selected && modal !== null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: '86%',
              backgroundColor: colors.surface,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>
                {modal === 'role'
                  ? (isFa ? 'تغییر نقش کاربر' : 'Change User Role')
                  : (isFa ? 'دسترسی‌های جزئی' : 'Fine-grained Permissions')}
              </Text>

              <Pressable
                onPress={closeModal}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '900' }}>×</Text>
              </Pressable>
            </View>

            {selected && (
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>
                {selected.fullName || selected.nationalId} • {selected.nationalId}
              </Text>
            )}

            {isSelf && (
              <View
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: colors.warningSoft,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.warning }}>
                  {isFa
                    ? 'برای جلوگیری از قفل شدن سیستم، تغییر نقش/دسترسی/وضعیت حساب خودتان غیرفعال است.'
                    : 'To avoid locking yourself out, changing your own role/permissions/status is disabled.'}
                </Text>
              </View>
            )}

            {modalError && (
              <View
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: colors.danger + '18',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.danger }}>
                  {modalError}
                </Text>
              </View>
            )}

            {modal === 'role' && selected && (
              <View style={{ flex: 1 }}>
                {rolesLoading ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : roles.length === 0 ? (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {rolesError || (isFa ? 'نقشی موجود نیست.' : 'No roles available.')}
                  </Text>
                ) : (
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
                    {roleGroups.map((group) => (
                      <View key={group.group} style={{ marginBottom: 14 }}>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '900',
                            color: colors.textMuted,
                            marginBottom: 8,
                            letterSpacing: 0.4,
                          }}
                        >
                          {group.label.toUpperCase()}
                        </Text>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {group.items.map((r) => {
                            const active = draftRole === r.key;
                            const label = isFa ? r.fa || r.key : r.en || r.key;

                            return (
                              <Pressable
                                key={r.key}
                                onPress={() => setDraftRole(r.key)}
                                disabled={isSelf || saving}
                                style={{
                                  minWidth: 110,
                                  paddingVertical: 10,
                                  paddingHorizontal: 10,
                                  borderRadius: 10,
                                  alignItems: 'center',
                                  backgroundColor: active ? colors.primary : colors.surfaceAlt,
                                  borderWidth: 1,
                                  borderColor: active ? colors.primary : colors.border,
                                  opacity: isSelf || saving ? 0.6 : 1,
                                }}
                              >
                                <Text
                                  numberOfLines={1}
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '800',
                                    color: active ? '#FFF' : colors.textSecondary,
                                  }}
                                >
                                  {label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <Pressable
                  onPress={saveRole}
                  disabled={saving || isSelf || roles.length === 0}
                  style={{
                    marginTop: 12,
                    backgroundColor: saving || isSelf ? colors.border : colors.primary,
                    borderRadius: 12,
                    paddingVertical: 13,
                    alignItems: 'center',
                    opacity: saving || isSelf ? 0.6 : 1,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>
                      {isFa ? 'ذخیره نقش' : 'Save Role'}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}

            {modal === 'perms' && selected && (
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    marginBottom: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: colors.successSoft,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '900', color: colors.success }}>
                      {isFa ? 'مجاز: ' : 'Allowed: '}
                      {granted.size}
                    </Text>
                  </View>

                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: colors.danger + '18',
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '900', color: colors.danger }}>
                      {isFa ? 'ممنوع: ' : 'Denied: '}
                      {denied.size}
                    </Text>
                  </View>
                </View>

                {permissionsLoading ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : permissionDefs.length === 0 ? (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {permissionsError || (isFa ? 'دسترسی‌ای موجود نیست.' : 'No permissions available.')}
                  </Text>
                ) : (
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
                    {permissionGroups.map((group) => (
                      <View key={group.group} style={{ marginBottom: 16 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '900',
                            color: colors.text,
                            marginBottom: 8,
                          }}
                        >
                          {group.label}
                        </Text>

                        {group.items.map((p) => {
                          const isGranted = granted.has(p.key);
                          const isDenied = denied.has(p.key);

                          return (
                            <View
                              key={p.key}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingVertical: 9,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                              }}
                            >
                              <View style={{ flex: 1, marginRight: 10 }}>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: '800',
                                    color: p.dangerous ? colors.danger : colors.text,
                                  }}
                                >
                                  {isFa ? p.fa : p.en}
                                  {p.dangerous ? ' ⚠️' : ''}
                                </Text>
                                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                                  {p.key}
                                </Text>
                              </View>

                              <View style={{ flexDirection: 'row', gap: 6 }}>
                                <Pressable
                                  onPress={() => toggleGranted(p.key)}
                                  disabled={isSelf || saving}
                                  style={{
                                    paddingHorizontal: 9,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: isGranted ? colors.success : colors.border,
                                    backgroundColor: isGranted ? colors.success : colors.surfaceAlt,
                                    opacity: isSelf || saving ? 0.55 : 1,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontWeight: '900',
                                      color: isGranted ? '#FFF' : colors.textSecondary,
                                    }}
                                  >
                                    {isFa ? 'مجاز' : 'Allow'}
                                  </Text>
                                </Pressable>

                                <Pressable
                                  onPress={() => toggleDenied(p.key)}
                                  disabled={isSelf || saving}
                                  style={{
                                    paddingHorizontal: 9,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: isDenied ? colors.danger : colors.border,
                                    backgroundColor: isDenied ? colors.danger : colors.surfaceAlt,
                                    opacity: isSelf || saving ? 0.55 : 1,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontWeight: '900',
                                      color: isDenied ? '#FFF' : colors.textSecondary,
                                    }}
                                  >
                                    {isFa ? 'ممنوع' : 'Deny'}
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </ScrollView>
                )}

                <Pressable
                  onPress={savePermissions}
                  disabled={saving || isSelf || permissionDefs.length === 0}
                  style={{
                    marginTop: 12,
                    backgroundColor: saving || isSelf ? colors.border : colors.primary,
                    borderRadius: 12,
                    paddingVertical: 13,
                    alignItems: 'center',
                    opacity: saving || isSelf ? 0.6 : 1,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>
                      {isFa ? 'ذخیره دسترسی‌ها' : 'Save Permissions'}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}