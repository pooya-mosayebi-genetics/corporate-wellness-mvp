import '../global.css';
import { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, Pressable, useWindowDimensions, Animated, Easing, Platform } from 'react-native';
import { Stack, usePathname, router } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MobileDrawer from '../src/components/mobile/MobileDrawer';
import { WellnessProvider } from '../src/store/WellnessContext';
import { GamificationProvider } from '../src/store/GamificationContext';
import { AuthProvider, useAuth } from '../src/store/AuthContext';
import { AuditProvider } from '../src/store/AuditContext';
import { BodyAnalysisProvider } from '../src/store/BodyAnalysisContext';
import { FoodDbProvider } from '../src/store/FoodDbContext';
import { PersonnelProvider } from '../src/store/PersonnelContext';
import { OrganizationsProvider } from '../src/store/OrganizationsContext';
import { NotificationProvider } from '../src/store/NotificationContext';
import { ThemeProvider, useTheme } from '../src/store/ThemeContext';
import { LanguageProvider, useLanguage } from '../src/store/LanguageContext';
import { AssignmentsProvider } from '../src/store/AssignmentsContext';
import { BreakGlassProvider } from '../src/store/BreakGlassContext';
import BreakGlassBanner from '../src/components/system/BreakGlassBanner';
import SecurityToast from '../src/components/ui/SecurityToast'; 
import AppSidebar from '../src/components/shell/AppSidebar';
import NotificationBell from '../src/components/shell/NotificationBell';
import Icon from '../src/components/ui/Icon';
import type { SidebarKey } from '../src/components/shell/AppSidebar';
import { canAccess, homeRouteFor, canReachClientDetail } from '../src/utils/access'; 
import ErrorBoundary from '../src/components/shell/ErrorBoundary';
import { setupGlobalErrorHandlers, updateLoggerContext } from '../src/utils/logger';
import LoginScreen from './login';
import SyncCoordinator from '../src/components/SyncCoordinator';

function keyForPath(path: string): SidebarKey | '' {
  if (path === '/' || path === '/index') return 'home';
  if (path === '/my-analysis') return 'my-analysis';
  if (path === '/my-diet') return 'my-diet';
  if (path === '/log-meal') return 'log-meal';
  if (path === '/leaderboard') return 'leaderboard';
  if (path === '/ai-chat') return 'ai-chat';
  if (path === '/tickets') return 'tickets';
  if (path === '/tips') return 'tips';
  if (path === '/profile') return 'profile';
  if (path === '/body-analysis') return 'analysis';
  if (path === '/reports') return 'reports';
  if (path === '/weekly-summary') return 'weekly';
  if (path === '/clients') return 'clients';
  if (path.startsWith('/client-detail')) return 'client-detail';
  if (path === '/coach') return 'coach';
  if (path === '/diet-plans') return 'diet-plans';
  if (path === '/hr') return 'hr';
  if (path === '/personnel') return 'personnel';
  if (path === '/audit') return 'audit';
  if (path === '/import') return 'import';
  if (path === '/food-import') return 'food-import';
  if (path === '/content-studio') return 'content-studio';
  if (path === '/challenge-admin') return 'challenge-admin';
  if (path === '/admin') return 'admin';
  if (path === '/admin-users') return 'user-management'; 
  if (path === '/backup') return 'backup' as SidebarKey;
  if (path === '/logs') return 'logs' as SidebarKey;
  if (path === '/tests') return 'tests' as SidebarKey;
  return '';
}

const SCREENS = [
  <Stack.Screen key="index" name="index" options={{ headerShown: false }} />,
  <Stack.Screen key="profile" name="profile" options={{ headerShown: false }} />,
  <Stack.Screen key="tips" name="tips" options={{ headerShown: false }} />,
  <Stack.Screen key="onboarding" name="onboarding" options={{ title: 'Setup Profile' }} />,
  <Stack.Screen key="coach" name="coach" options={{ title: 'Coach Dashboard' }} />,
  <Stack.Screen key="hr" name="hr" options={{ headerShown: false }} />,
  <Stack.Screen key="log-meal" name="log-meal" options={{ headerShown: false }} />,
  <Stack.Screen key="reports" name="reports" options={{ title: 'Reports' }} />,
  <Stack.Screen key="weekly" name="weekly-summary" options={{ headerShown: false }} />,
  <Stack.Screen key="body-analysis" name="body-analysis" options={{ headerShown: false }} />,
  <Stack.Screen key="my-analysis" name="my-analysis" options={{ headerShown: false }} />,
  <Stack.Screen key="my-diet" name="my-diet" options={{ headerShown: false }} />,
  <Stack.Screen key="diet-plans" name="diet-plans" options={{ headerShown: false }} />,
  <Stack.Screen key="clients" name="clients" options={{ headerShown: false }} />,
  <Stack.Screen key="client-detail" name="client-detail" options={{ headerShown: false }} />,
  <Stack.Screen key="personnel" name="personnel" options={{ headerShown: false }} />,
  <Stack.Screen key="audit" name="audit" options={{ headerShown: false }} />,
  <Stack.Screen key="import" name="import" options={{ headerShown: false }} />,
  <Stack.Screen key="food-import" name="food-import" options={{ headerShown: false }} />,
  <Stack.Screen key="content-studio" name="content-studio" options={{ headerShown: false }} />,
  <Stack.Screen key="tickets" name="tickets" options={{ headerShown: false }} />,
  <Stack.Screen key="ai-chat" name="ai-chat" options={{ headerShown: false }} />,
  <Stack.Screen key="leaderboard" name="leaderboard" options={{ headerShown: false }} />,
  <Stack.Screen key="challenge-admin" name="challenge-admin" options={{ headerShown: false }} />,
  <Stack.Screen key="admin" name="admin" options={{ headerShown: false }} />,
  <Stack.Screen key="admin-users" name="admin-users" options={{ headerShown: false }} />,
  <Stack.Screen key="backup" name="backup" options={{ headerShown: false }} />,
  <Stack.Screen key="logs" name="logs" options={{ headerShown: false }} />,
  <Stack.Screen key="tests" name="tests" options={{ headerShown: false }} />,
];

export const DESKTOP_BREAKPOINT = 900;

function RootShell() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const { session, accounts, isAuthLoaded, touch } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;

  const [winW, setWinW] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : width,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isWide = Math.max(width, winW) >= DESKTOP_BREAKPOINT;

  // 🆕 Smart Animation Handler for Drawer (Fixes Web Warning)
  const toggleDrawer = () => {
    const toValue = mobileDrawerOpen ? 0 : 1;
    
    // Determine if we should use native driver based on platform
    // On Web, native animations are not supported, so we fallback to JS animation
    const useNative = Platform.OS !== 'web'; 

    Animated.timing(drawerAnim, {
      toValue,
      duration: 250,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: useNative, // ✅ Conditional flag
    }).start(() => setMobileDrawerOpen(!mobileDrawerOpen));
  };

  useEffect(() => {
    if (mobileDrawerOpen) {
      toggleDrawer();
    }
  }, [pathname]);

  useEffect(() => {
    updateLoggerContext({ screen: pathname });
  }, [pathname]);

  const sessionId = session?.nationalId ?? null;
  const sessionRole = session?.role ?? null;

  const currentUser = useMemo(() => {
    if (!session) return null;
    const account = accounts.find((a) => a.nationalId === session.nationalId);
    if (!account) return null;
    return {
      permissions: account.permissions as any,
      deniedPermissions: account.deniedPermissions as any,
    };
  }, [session, accounts]);

  useEffect(() => {
    if (!sessionId || !sessionRole) return;
    touch();
    const key = keyForPath(pathname);
    if (!key) return;
    const blocked = key === 'client-detail'
      ? !canReachClientDetail(sessionRole, currentUser)
      : !canAccess(sessionRole, key as any, currentUser);
    if (blocked) {
      router.replace(homeRouteFor(sessionRole));
    }
  }, [pathname, sessionId, sessionRole, touch, currentUser]);

  // ✅ FIX: Ensure loading state has proper Text wrapper
  if (!isAuthLoaded) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Text className="text-sm" style={{ color: colors.textMuted }}>Loading...</Text>
      </View>
    );
  }

  if (!session) return <LoginScreen />;

  const handleNavigate = (key: SidebarKey) => {
    if (key === 'home') router.push('/');
    else if (key === 'my-analysis') router.push('/my-analysis');
    else if (key === 'my-diet') router.push('/my-diet');
    else if (key === 'log-meal') router.push('/log-meal');
    else if (key === 'leaderboard') router.push('/leaderboard');
    else if (key === 'ai-chat') router.push('/ai-chat');
    else if (key === 'tickets') router.push('/tickets');
    else if (key === 'tips') router.push('/tips');
    else if (key === 'profile') router.push('/profile');
    else if (key === 'analysis') router.push('/body-analysis');
    else if (key === 'reports') router.push('/reports');
    else if (key === 'weekly') router.push('/weekly-summary');
    else if (key === 'clients') router.push('/clients');
    else if (key === 'client-detail') router.push('/client-detail'); 
    else if (key === 'coach') router.push('/coach');
    else if (key === 'diet-plans') router.push('/diet-plans');
    else if (key === 'hr') router.push('/hr');
    else if (key === 'personnel') router.push('/personnel');
    else if (key === 'audit') router.push('/audit');
    else if (key === 'import') router.push('/import');
    else if (key === 'food-import') router.push('/food-import');
    else if (key === 'content-studio') router.push('/content-studio');
    else if (key === 'challenge-admin') router.push('/challenge-admin');
    else if (key === 'admin') router.push('/admin');
    else if (key === 'user-management') router.push('/admin-users');
    else if ((key as string) === 'backup') router.push('/backup');
    else if ((key as string) === 'logs') router.push('/logs');
    else if ((key as string) === 'tests') router.push('/tests');
  };

  // 📱 MOBILE VIEW
  if (!isWide) {
    const translateX = drawerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-280, 0], 
    });
    const opacity = drawerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {mobileDrawerOpen && (
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  zIndex: 998,
                  opacity,
                }}
                onStartShouldSetResponder={() => true}
                onResponderRelease={toggleDrawer}
              />
            )}

            <Animated.View
              style={{
                position: 'absolute',
                top: 0, bottom: 0, left: 0,
                width: 280,
                zIndex: 999,
                transform: [{ translateX }],
                shadowColor: '#000',
                shadowOffset: { width: 2, height: 0 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 10,
              }}
            >
              <MobileDrawer
                activeKey={keyForPath(pathname)}
                onNavigate={handleNavigate}
                onClose={toggleDrawer}
              />
            </Animated.View>

            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
               <View style={{
                 flexDirection: 'row',
                 alignItems: 'center',
                 paddingHorizontal: 12,
                 paddingVertical: 8,
                 backgroundColor: colors.surface,
                 borderBottomWidth: 1,
                 borderBottomColor: colors.cardBorder,
               }}>
                 <Pressable
                   onPress={toggleDrawer}
                   style={{
                     width: 40,
                     height: 40,
                     borderRadius: 10,
                     alignItems: 'center',
                     justifyContent: 'center',
                     backgroundColor: colors.surfaceAlt,
                     borderWidth: 1,
                     borderColor: colors.border,
                     marginRight: 10,
                   }}
                 >
                   <Icon name="menu" size={20} color={colors.textSecondary} />
                 </Pressable>
                 
                 <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 }}>
                   {isFa ? 'منو' : 'Menu'}
                 </Text>
                 
                 <NotificationBell floating={false} />
               </View>

               <View style={{ flex: 1 }}>
                 <BreakGlassBanner />
                 <Stack>{SCREENS}</Stack>
               </View>
            </SafeAreaView>
            
            <SecurityToast /> 
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // 💻 DESKTOP VIEW
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background, position: 'relative' }}>
        <SecurityToast /> 

        {sidebarOpen && (
          <AppSidebar
            activeKey={keyForPath(pathname)}
            onNavigate={handleNavigate}
            onToggle={() => setSidebarOpen(false)}
          />
        )}

        <View style={{ flex: 1 }}>
          <BreakGlassBanner />
          {!sidebarOpen && (
            <View
              style={{
                height: 48,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                backgroundColor: colors.background,
              }}
            >
              <Pressable
                onPress={() => setSidebarOpen(true)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                }}
              >
                <Icon name="menu" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}
          <Stack>{SCREENS}</Stack>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <WellnessProvider>
            <AuditProvider>
              <GamificationProvider>
                <AssignmentsProvider>
                  <NotificationProvider>
                    <BreakGlassProvider>
                      <BodyAnalysisProvider>
                        <FoodDbProvider>
                          {/* 
                             IMPORTANT: PersonnelProvider MUST be inside AuthProvider 
                             because it calls useAuth(). 
                             The order below ensures that when PersonnelProvider mounts,
                             AuthProvider is already available in the context tree.
                          */}
                          <PersonnelProvider>
                            <OrganizationsProvider>
                              <ErrorBoundary>
                                <SyncCoordinator />
                                <RootShell />
                              </ErrorBoundary>
                            </OrganizationsProvider>
                          </PersonnelProvider>
                        </FoodDbProvider>
                      </BodyAnalysisProvider>
                    </BreakGlassProvider>
                  </NotificationProvider>
                </AssignmentsProvider>
              </GamificationProvider>
            </AuditProvider>
          </WellnessProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}