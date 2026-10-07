import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { useAuth } from '../../store/AuthContext';
import { usePersonnel } from '../../store/PersonnelContext';
import { canAccess, canReachClientDetail } from '../../utils/access';
import type { RouteKey } from '../../utils/access';
import { maskNationalId } from '../../utils/nationalId';
import { roleLabelsFa, roleLabelsEn, type Role } from '../../types/auth';
import { normalizeRole } from '../../config/roles';
import { BRAND } from '../../config/brand';
import BrandLogo from '../ui/BrandLogo';
import PlanBadge from '../ui/PlanBadge';
import NotificationBell from '../shell/NotificationBell';
import Icon, { IconName } from '../ui/Icon';

export type SidebarKey = RouteKey | 'backup' | 'logs' | 'tests' | 'user-management';

interface MenuItem {
  key: SidebarKey;
  icon: IconName;
  label: string;
  section: 'menu' | 'clients' | 'org';
}

interface MobileDrawerProps {
  activeKey: SidebarKey | '';
  onNavigate: (key: SidebarKey) => void;
  onClose: () => void;
}

const SideItem = ({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onPress: () => void;
}) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.itemContainer,
        {
          backgroundColor: active ? colors.primarySoft : pressed ? colors.surfaceAlt : 'transparent',
          borderRightWidth: active ? 3 : 0,
          borderRightColor: active ? colors.primary : 'transparent',
        },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: active ? colors.primary + '22' : 'transparent' }]}>
        <Icon name={icon} size={20} color={active ? colors.primary : colors.textMuted} />
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.itemLabel,
          {
            color: active ? colors.primary : colors.textSecondary,
            fontWeight: active ? '700' : '500',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export default function MobileDrawer({ activeKey, onNavigate, onClose }: MobileDrawerProps) {
  const { colors, mode, setMode } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { session, accounts, logout } = useAuth();
  const { getByNationalId } = usePersonnel();
  
  const insets = useSafeAreaInsets();
  const isFa = language === 'fa';

  const currentUser = useMemo(() => {
    if (!session) return null;
    const account = accounts.find((a) => a.nationalId === session.nationalId);
    if (!account) return null;
    return {
      permissions: account.permissions as any,
      deniedPermissions: account.deniedPermissions as any,
    };
  }, [session, accounts]);

  if (!session) return null;

  const role = normalizeRole(session.role) as Role;
  const rec = getByNationalId(session.nationalId);
  const displayName = rec
    ? rec.fullNamePrefixed || rec.fullName
    : isFa
    ? roleLabelsFa[role]
    : roleLabelsEn[role];

  const allItems: MenuItem[] = [
    { key: 'home', icon: 'home', label: isFa ? 'داشبورد' : 'Dashboard', section: 'menu' },
    { key: 'my-analysis', icon: 'analysis', label: isFa ? 'آنالیز من' : 'My Analysis', section: 'menu' },
    { key: 'my-diet', icon: 'diet', label: isFa ? 'رژیم من' : 'My Diet', section: 'menu' },
    { key: 'log-meal', icon: 'meal', label: isFa ? 'ثبت وعده' : 'Log Meal', section: 'menu' },
    { key: 'leaderboard', icon: 'trend', label: isFa ? 'لیدربورد' : 'Leaderboard', section: 'menu' },
    { key: 'ai-chat', icon: 'tips', label: isFa ? 'دستیار AI' : 'AI Coach', section: 'menu' },
    { key: 'tickets', icon: 'ticket', label: isFa ? 'تیکت‌ها' : 'Tickets', section: 'menu' },
    { key: 'tips', icon: 'tips', label: isFa ? 'نکات تغذیه' : 'Tips', section: 'menu' },
    { key: 'analysis', icon: 'analysis', label: isFa ? 'بادی آنالیز' : 'Body Analysis', section: 'menu' },
    { key: 'reports', icon: 'reports', label: isFa ? 'گزارش‌ها' : 'Reports', section: 'menu' },
    { key: 'clients', icon: 'users', label: isFa ? 'مراجعین' : 'Clients', section: 'clients' },
    ...(canReachClientDetail(role, currentUser)
      ? [{ 
          key: 'client-detail' as SidebarKey, 
          icon: 'profile' as IconName, 
          label: isFa ? 'پروندهٔ مراجع' : 'Client Record', 
          section: 'clients' as const 
        }]
      : []),
    { key: 'coach', icon: 'coach', label: isFa ? 'داشبورد کوچ' : 'Coach', section: 'clients' },
    { key: 'diet-plans', icon: 'diet', label: isFa ? 'رژیم‌های درمانی' : 'Diet Plans', section: 'clients' },
    { key: 'hr', icon: 'org', label: isFa ? 'داشبورد HR' : 'HR', section: 'org' },
    { key: 'personnel', icon: 'users', label: isFa ? 'پرسنل' : 'Personnel', section: 'org' },
    ...(() => {
      if (session.role === 'super_admin') {
        return [{ 
          key: 'user-management' as SidebarKey, 
          icon: 'shield' as IconName, 
          label: isFa ? 'مدیریت کاربران' : 'User Mgmt', 
          section: 'org' as const 
        }];
      }
      return [];
    })(),
    { key: 'audit', icon: 'shield', label: isFa ? 'لاگ ممیزی' : 'Audit Log', section: 'org' },
    { key: 'backup', icon: 'shield', label: isFa ? 'پشتیبان‌گیری' : 'Backup', section: 'org' },
    { key: 'logs', icon: 'file-text', label: isFa ? 'لاگ‌های سیستم' : 'System Logs', section: 'org' },
    { key: 'tests', icon: 'shield', label: isFa ? 'تست‌های واحد' : 'Unit Tests', section: 'org' },
    { key: 'import', icon: 'import', label: isFa ? 'مرکز واردات' : 'Import', section: 'org' },
    { key: 'food-import', icon: 'food', label: isFa ? 'دیتابیس غذا' : 'Food DB', section: 'org' },
    { key: 'content-studio', icon: 'studio', label: isFa ? 'استودیو محتوا' : 'Studio', section: 'org' },
    { key: 'challenge-admin', icon: 'shield', label: isFa ? 'چالش و بج' : 'Challenges', section: 'org' },
    { key: 'admin', icon: 'shield', label: isFa ? 'دسترسی‌ها' : 'Access', section: 'org' },
  ];

  const allowed = allItems.filter((i) => {
    if (i.key === 'user-management') return true; 
    return canAccess(role, i.key as string, currentUser);
  });

  const menuItems = allowed.filter((i) => i.section === 'menu');
  const clientItems = allowed.filter((i) => i.section === 'clients');
  const orgItems = allowed.filter((i) => i.section === 'org');

  const handleNav = (key: SidebarKey) => {
    onNavigate(key);
    onClose();
  };

  return (
    <View style={[
      styles.container, 
      { 
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        backgroundColor: colors.surface 
      }
    ]}>
      
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <Pressable onPress={() => handleNav('home')} style={{ borderRadius: 8 }}>
          <BrandLogo size={36} />
        </Pressable>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>
            {BRAND.title}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
            {isFa ? 'سامانه سلامت سازمانی' : 'Corporate Wellness'}
          </Text>
        </View>
        <NotificationBell floating={false} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 12 }}>
        
        {menuItems.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {isFa ? 'منوی اصلی' : 'MAIN MENU'}
            </Text>
            {menuItems.map((i) => (
              <SideItem
                key={String(i.key)}
                icon={i.icon}
                label={i.label}
                active={activeKey === i.key}
                onPress={() => handleNav(i.key)}
              />
            ))}
          </>
        )}

        {clientItems.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 20 }]}>
              {isFa ? 'مراجعین و درمان' : 'CLIENTS & CARE'}
            </Text>
            {clientItems.map((i) => (
              <SideItem
                key={String(i.key)}
                icon={i.icon}
                label={i.label}
                active={activeKey === i.key}
                onPress={() => handleNav(i.key)}
              />
            ))}
          </>
        )}

        {orgItems.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 20 }]}>
              {isFa ? 'مدیریت سازمان' : 'ORGANIZATION ADMIN'}
            </Text>
            {orgItems.map((i) => (
              <SideItem
                key={String(i.key)}
                icon={i.icon}
                label={i.label}
                active={activeKey === i.key}
                onPress={() => handleNav(i.key)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <View style={[
        styles.footer, 
        { 
          borderTopColor: colors.cardBorder, 
          backgroundColor: colors.surfaceAlt,
          paddingBottom: Math.max(insets.bottom, 12)
        }
      ]}>
        <PlanBadge />
        
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
          {(['light', 'dark', 'corporate'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: mode === m ? colors.primarySoft : 'transparent',
                borderWidth: 1,
                borderColor: mode === m ? colors.primary : colors.border,
              }}
            >
              <Text style={{ fontSize: 16 }}>{m === 'light' ? '☀️' : m === 'dark' ? '🌙' : '🏢'}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setLanguage(language === 'fa' ? 'en' : 'fa')}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
              {isFa ? 'EN' : 'FA'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => handleNav('profile')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            marginBottom: 10,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2
          }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="profile" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
              {displayName}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 11, color: colors.textMuted }}>
              {maskNationalId(session.nationalId)} · {isFa ? roleLabelsFa[role] : roleLabelsEn[role]}
            </Text>
          </View>
          <Icon name="chevronForward" size={16} color={colors.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => {
            logout('manual');
            onClose();
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: 44,
            borderRadius: 12,
            backgroundColor: colors.dangerSoft,
            borderWidth: 1,
            borderColor: colors.danger + '33',
          }}
        >
          <Icon name="logout" size={18} color={colors.danger} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.danger }}>
            {isFa ? 'خروج از حساب' : 'Sign Out'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: 280,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 4,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});