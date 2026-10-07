import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, type AuthUser, type SubmitCodeResponse, type SessionResponse } from '../lib/api';
import type { Role } from '../types/auth';
import { normalizeNationalId, isValidNationalId } from '../utils/nationalId';
import { updateLoggerContext } from '../utils/logger';

// ─── Types ──────────────────────────────────────────────────────
export interface Session {
  nationalId: string;
  role: Role;
  fullName: string;
  permissions: string[];
  deniedPermissions: string[];
  issuedAt: number;
  lastActivityAt: number;
}

export interface UserAccount {
  nationalId: string;
  role: Role;
  fullName: string;
  active: boolean;
  permissions: string[];
  deniedPermissions: string[];
  hasPassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

interface AuthContextValue {
  session: Session | null;
  isAuthLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  accounts: UserAccount[];
  refreshAccounts: () => Promise<boolean>;

  step: 'code' | 'password' | 'setup';
  pendingCode: string | null;
  isBootstrap: boolean;

  submitCode: (rawCode: string) => Promise<void>;
  submitPassword: (password: string) => Promise<void>;
  completeSetup: (newPassword: string) => Promise<boolean>;
  resetFlow: () => void;
  logout: (reason?: string) => Promise<void>;
  touch: () => void;
  clearError: () => void;

  // Admin Functions connected to API endpoints
  addUserManually: (nationalId: string, role: Role) => Promise<boolean>;
  adminResetPassword: (nationalId: string) => Promise<boolean>;
  setRole: (nationalId: string, newRole: Role) => Promise<void>;
  toggleActive: (nationalId: string) => Promise<void>;
  setUserPermissions: (nationalId: string, perms: string[]) => Promise<void>;
  setUserDenied: (nationalId: string, perms: string[]) => Promise<void>;

  selfProvision: boolean;
  setSelfProvision: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const INACTIVITY_MS = 30 * 60 * 1000; // 30 دقیقه
const TOUCH_THROTHLE_MS = 60 * 1000; // 1 دقیقه

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [selfProvision, setSelfProvisionState] = useState(true);

  const [step, setStep] = useState<'code' | 'password' | 'setup'>('code');
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [isBootstrap, setIsBootstrap] = useState(false);

  const lastTouchRef = useRef(0);

  /* ═══════════ ۱. Initialization ═══════════ */
  useEffect(() => {
    const init = async () => {
      try {
        // Try to restore session from server
        const user = await api.me().catch(() => null);
        if (user) {
          const newSession: Session = {
            nationalId: user.nationalId,
            role: user.role as Role,
            fullName: user.fullName,
            permissions: user.permissions,
            deniedPermissions: user.deniedPermissions,
            issuedAt: Date.now(),
            lastActivityAt: Date.now(),
          };
          setSession(newSession);
          console.log('[Auth] Session restored from server');
        }
      } catch (e) {
        console.error('[Auth] Init failed', e);
      } finally {
        setIsAuthLoaded(true);
      }
    };
    init();
  }, []);

  /* ═══════════ ۲. Auto-Lock Timer ═══════════ */
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setSession((s) => {
        if (!s) return s;
        if (now - s.lastActivityAt > INACTIVITY_MS) {
          api.logout().catch(() => {});
          return null;
        }
        return s;
      });
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  /* ═══════════ ۳. Logger Context Update ═══════════ */
  useEffect(() => {
    updateLoggerContext({
      userId: session?.nationalId,
      role: session?.role,
    });
  }, [session]);

  /* ═══════════ ۴. Core Auth Logic ═══════════ */

  const clearError = useCallback(() => setError(null), []);

  const resetFlow = useCallback(() => {
    setStep('code');
    setPendingCode(null);
    setTicket(null);
    setIsBootstrap(false);
    setError(null);
  }, []);

  /**
   * گام ۱: بررسی کد ملی و وضعیت حساب (API call)
   */
  const submitCode = useCallback(async (rawCode: string) => {
    const code = normalizeNationalId(rawCode);

    if (!isValidNationalId(code)) {
      setError('کد ملی نامعتبر است');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.submitCode(code);

      setPendingCode(code);
      setTicket(response.ticket);
      setIsBootstrap(response.bootstrap);

      if (response.status === 'password') {
        setStep('password');
      } else if (response.status === 'setup') {
        setStep('setup');
      }
    } catch (err: any) {
      const apiError = err.apiError;
      if (apiError) {
        const lang = Platform.OS === 'web' ? 'en' : 'fa';
        setError(apiError[lang] || apiError.fa || apiError.en || apiError.error);
      } else {
        setError(err.message || 'خطای شبکه');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * گام ۲: تأیید رمز عبور موجود (API call)
   */
  const submitPassword = useCallback(
    async (password: string) => {
      if (!ticket || !pendingCode) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.submitPassword(ticket, password);

        const newSession: Session = {
          nationalId: response.user.nationalId,
          role: response.user.role as Role,
          fullName: response.user.fullName,
          permissions: response.user.permissions,
          deniedPermissions: response.user.deniedPermissions,
          issuedAt: Date.now(),
          lastActivityAt: Date.now(),
        };

        setSession(newSession);
        resetFlow();
      } catch (err: any) {
        const apiError = err.apiError;
        if (apiError) {
          const lang = Platform.OS === 'web' ? 'en' : 'fa';
          setError(apiError[lang] || apiError.fa || apiError.en || apiError.error);
        } else {
          setError(err.message || 'خطای شبکه');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [ticket, pendingCode, resetFlow]
  );

  /**
   * گام ۳: تنظیم رمز جدید (Bootstrap یا Reset) (API call)
   */
  const completeSetup = useCallback(
    async (newPassword: string): Promise<boolean> => {
      if (!ticket || !pendingCode) return false;

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.completeSetup(ticket, newPassword);

        const newSession: Session = {
          nationalId: response.user.nationalId,
          role: response.user.role as Role,
          fullName: response.user.fullName,
          permissions: response.user.permissions,
          deniedPermissions: response.user.deniedPermissions,
          issuedAt: Date.now(),
          lastActivityAt: Date.now(),
        };

        setSession(newSession);
        resetFlow();
        return true;
      } catch (err: any) {
        const apiError = err.apiError;
        if (apiError) {
          const lang = Platform.OS === 'web' ? 'en' : 'fa';
          setError(apiError[lang] || apiError.fa || apiError.en || apiError.error);
        } else {
          setError(err.message || 'خطا در ثبت رمز');
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [ticket, pendingCode, resetFlow]
  );

  /* ═══════════ ۵. Admin Functions (wired to API) ═══════════ */

  const refreshAccounts = useCallback(async (): Promise<boolean> => {
    try {
      const res: any = await api.listUsers({ limit: 200, offset: 0 });
      const items: any[] = res.items || [];
      const mapped: UserAccount[] = items.map((u) => ({
        nationalId: u.nationalId,
        role: u.role as Role,
        fullName: u.fullName,
        active: u.isActive ?? true,
        permissions: u.permissions || [],
        deniedPermissions: u.deniedPermissions || [],
        hasPassword: Boolean(u.hasPassword),
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));
      setAccounts(mapped);
      return true;
    } catch (e) {
      console.error('[Auth] refreshAccounts failed', e);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const r = String(session.role || '');
    if (
      r === 'super_admin' ||
      r === 'admin' ||
      r === 'it_admin' ||
      r === 'org_admin' ||
      r === 'org_owner'
    ) {
      refreshAccounts();
    }
  }, [session, refreshAccounts]);

  const addUserManually = useCallback(
    async (nationalId: string, role: Role): Promise<boolean> => {
      try {
        await api.createUser(nationalId, role);
        await refreshAccounts();
        return true;
      } catch (e) {
        console.error('[Auth] addUserManually failed', e);
        return false;
      }
    },
    [refreshAccounts]
  );

  const adminResetPassword = useCallback(
    async (nationalId: string): Promise<boolean> => {
      try {
        await api.resetUserPassword(nationalId);
        await refreshAccounts();
        return true;
      } catch (e) {
        console.error('[Auth] adminResetPassword failed', e);
        return false;
      }
    },
    [refreshAccounts]
  );

  const setRole = useCallback(
    async (nationalId: string, newRole: Role) => {
      try {
        await api.setUserRole(nationalId, newRole);
        await refreshAccounts();
      } catch (e) {
        console.error('[Auth] setRole failed', e);
      }
    },
    [refreshAccounts]
  );

  const toggleActive = useCallback(
    async (nationalId: string) => {
      try {
        const acc = accounts.find((a) => a.nationalId === nationalId);
        await api.setUserActive(nationalId, !(acc?.active ?? true));
        await refreshAccounts();
      } catch (e) {
        console.error('[Auth] toggleActive failed', e);
      }
    },
    [accounts, refreshAccounts]
  );

  const setUserPermissions = useCallback(
    async (nationalId: string, perms: string[]) => {
      try {
        const acc = accounts.find((a) => a.nationalId === nationalId);
        await api.setUserPermissions(nationalId, perms, acc?.deniedPermissions || []);
        await refreshAccounts();
      } catch (e) {
        console.error('[Auth] setUserPermissions failed', e);
      }
    },
    [accounts, refreshAccounts]
  );

  const setUserDenied = useCallback(
    async (nationalId: string, perms: string[]) => {
      try {
        const acc = accounts.find((a) => a.nationalId === nationalId);
        await api.setUserPermissions(nationalId, acc?.permissions || [], perms);
        await refreshAccounts();
      } catch (e) {
        console.error('[Auth] setUserDenied failed', e);
      }
    },
    [accounts, refreshAccounts]
  );

  const setSelfProvision = useCallback((val: boolean) => {
    setSelfProvisionState(val);
  }, []);

  /* ═══════════ ۶. Session Management ═══════════ */

  const logout = useCallback(
    async (reason?: string) => {
      try {
        await api.logout();
      } catch (e) {
        console.error('[Auth] Logout API call failed', e);
      }
      setSession(null);
      resetFlow();
      console.log('[Auth] Logged out:', reason);
    },
    [resetFlow]
  );

  const touch = useCallback(() => {
    const now = Date.now();
    if (now - lastTouchRef.current < TOUCH_THROTHLE_MS) return;
    lastTouchRef.current = now;
    setSession((s) => (s ? { ...s, lastActivityAt: now } : s));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthLoaded,
        isLoading,
        error,
        accounts,
        refreshAccounts,
        step,
        pendingCode,
        isBootstrap,
        submitCode,
        submitPassword,
        completeSetup,
        resetFlow,
        logout,
        touch,
        clearError,
        addUserManually,
        adminResetPassword,
        setRole,
        toggleActive,
        setUserPermissions,
        setUserDenied,
        selfProvision,
        setSelfProvision,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}