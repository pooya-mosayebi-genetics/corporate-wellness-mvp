import { useMemo } from 'react';
import { Text, View, Pressable, ScrollView } from 'react-native';
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
import NotificationBell from './NotificationBell';
import Icon, { IconName } from '../ui/Icon';

// 🆕 L-10: افزودن key جدید به نوع SidebarKey
export type SidebarKey = RouteKey | 'backup' | 'logs' | 'tests' | 'user-management';

interface AppSidebarProps {
  activeKey: SidebarKey | '';
  onNavigate: (key: SidebarKey) => void;
  onToggle?: () => void;
}

function SideItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
        marginBottom: 1,
        backgroundColor: active ? colors.primarySoft : 'transparent',
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 7,
          backgroundColor: active ? colors.primary + '22' : 'transparent',
        }}
      >
        <Icon name={icon} size={13} color={active ? colors.primary : colors.textMuted} />
      </View>

      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 11,
          fontWeight: active ? '700' : '500',
          color: active ? colors.primary : colors.textSecondary,
        }}
      >
        {label}
      </Text>

      {active && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary }} />}
    </Pressable>
  );
}

export default function AppSidebar({ activeKey, onNavigate, onToggle }: AppSidebarProps) {
  const { colors, mode, setMode } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { session, accounts, logout } = useAuth();
  const { getByNationalId } = usePersonnel();
  const isFa = language === 'fa';

  // ✅ PATCH: کاربر جاری برای اعمال permissions / deniedPermissions
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

  const sectionLabel = (text: string) => (
    <Text
      style={{
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 0.7,
        color: colors.textMuted,
        marginTop: 8,
        marginBottom: 2,
        paddingHorizontal: 8,
      }}
    >
      {text}
    </Text>
  );

  // 🛠️ FIX: ساخت لیست آیتم‌ها به صورت ایمن و بدون Spread Operator پیچیده
  // ۱. تعریف آیتم‌های ثابت (بدون شرط)
  const allItems: {
    key: SidebarKey;
    icon: IconName;
    label: string;
    section: 'menu' | 'clients' | 'org';
  }[] = [
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
    
    // --- بخش مراجعین ---
    { key: 'clients', icon: 'users', label: isFa ? 'مراجعین' : 'Clients', section: 'clients' },
    
    // 🆕 L-10: client-detail فقط اگر دسترسی break-glass داشته باشد
    // AND role is NOT 'user' (handled inside canReachClientDetail now)
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
    
    // --- بخش سازمان ---
    { key: 'hr', icon: 'org', label: isFa ? 'داشبورد HR' : 'HR', section: 'org' },
    { key: 'personnel', icon: 'users', label: isFa ? 'پرسنل' : 'Personnel', section: 'org' },
    
    // 🆕 L-10: مدیریت کاربران (فقط Super Admin) - استفاده از Push برای رفع ارور TS
    // به جای Spread، اینجا مستقیم چک می‌کنیم و اضافه می‌کنیم
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

  // ✅ PATCH: گیت سایدبار با Override کاربری
  const allowed = allItems.filter((i) => {
    // 🛑 FIX: حذف استثنا برای client-detail
    // حالا canAccess بررسی می‌کند که آیا کاربر permission لازم را دارد یا خیر.
    // اگر کاربر عادی باشد، canReachClientDetail false برمی‌گرداند و اصلاً به این لیست نمی‌رسد.
    // اگر رسید، canAccess چک می‌کند.
    
    // user-management قبلاً با شرط بالا اضافه شده، پس همیشه مجاز است اگر در لیست باشد
    if (i.key === 'user-management') return true; 

    return canAccess(role, i.key as string, currentUser);
  });

  const menuItems = allowed.filter((i) => i.section === 'menu');
  const clientItems = allowed.filter((i) => i.section === 'clients');
  const orgItems = allowed.filter((i) => i.section === 'org');

  return (
    <View
      style={{
        width: 200,
        flexShrink: 0,
        flexGrow: 0,
        backgroundColor: colors.surface,
        borderEndWidth: 1,
        borderEndColor: colors.cardBorder,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingTop: 10,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <Pressable onPress={() => onNavigate('home')} style={{ borderRadius: 8 }}>
          <BrandLogo size={28} />
        </Pressable>

        <View style={{ marginLeft: 6, marginRight: 6, flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
            {BRAND.title}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <NotificationBell />
          <Pressable
            onPress={onToggle}
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="menu" size={13} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 6, paddingHorizontal: 8, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {menuItems.length > 0 && sectionLabel(isFa ? 'منو' : 'MENU')}
        {menuItems.map((i) => (
          <SideItem
            key={String(i.key)}
            icon={i.icon}
            label={i.label}
            active={activeKey === i.key}
            onPress={() => onNavigate(i.key)}
          />
        ))}

        {clientItems.length > 0 && sectionLabel(isFa ? 'مراجعین' : 'CLIENTS')}
        {clientItems.map((i) => (
          <SideItem
            key={String(i.key)}
            icon={i.icon}
            label={i.label}
            active={activeKey === i.key}
            onPress={() => onNavigate(i.key)}
          />
        ))}

        {orgItems.length > 0 && sectionLabel(isFa ? 'سازمان' : 'ORG')}
        {orgItems.map((i) => (
          <SideItem
            key={String(i.key)}
            icon={i.icon}
            label={i.label}
            active={activeKey === i.key}
            onPress={() => onNavigate(i.key)}
          />
        ))}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 8,
          paddingTop: 6,
          paddingBottom: 10,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
        }}
      >
        <PlanBadge />

        <View style={{ flexDirection: 'row', gap: 3, marginBottom: 6 }}>
          {(['light', 'dark', 'corporate'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={{
                flex: 1,
                height: 24,
                borderRadius: 7,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: mode === m ? colors.primarySoft : colors.surfaceAlt,
                borderWidth: 1,
                borderColor: mode === m ? colors.primary : colors.border,
              }}
            >
              <Text style={{ fontSize: 10 }}>{m === 'light' ? '☀️' : m === 'dark' ? '🌙' : '🏢'}</Text>
            </Pressable>
          ))}

          <Pressable
            onPress={() => setLanguage(language === 'fa' ? 'en' : 'fa')}
            style={{
              flex: 1,
              height: 24,
              borderRadius: 7,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>
              {isFa ? 'EN' : 'FA'}
            </Text>
          </Pressable>
        </View>

        <View style={{ borderRadius: 8, backgroundColor: colors.surfaceAlt }}>
          <Pressable
            onPress={() => onNavigate('profile')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              padding: 6,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="profile" size={12} color={colors.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 9, fontWeight: '700', color: colors.text }}>
                {displayName}
              </Text>
              <Text style={{ fontSize: 7, color: colors.textMuted }}>
                {maskNationalId(session.nationalId)} · {isFa ? roleLabelsFa[role] : roleLabelsEn[role]}
              </Text>
            </View>

            <Icon name="chevronForward" size={10} color={colors.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => logout('manual')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              marginHorizontal: 6,
              marginBottom: 6,
              height: 22,
              borderRadius: 7,
              backgroundColor: colors.dangerSoft,
            }}
          >
            <Icon name="logout" size={10} color={colors.danger} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.danger }}>
              {isFa ? 'خروج' : 'Sign out'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}