import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext';
import { useNotification } from './NotificationContext'; // 🆕 L-10: اتصال به نوتیفیکیشن
import { maskNationalId } from '../utils/nationalId';
import {
  BG_DEFAULT_MINUTES, BG_MAX_MINUTES, BG_MIN_REASON_LEN, BG_MAX_ACTIVE_PER_USER,
  bgAllowedScope, type BreakGlassGrant,
} from '../types/breakGlass';

const KEY = 'themin_breakglass_v1';
const uid = () => `bg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

interface RequestResult { ok: boolean; error?: string; grant?: BreakGlassGrant }

interface Ctx {
  grants: BreakGlassGrant[];
  ready: boolean;
  /** grant معتبرِ فعال برای این pair (actor,target) یا null */
  activeFor: (actorId: string, targetId: string) => BreakGlassGrant | null;
  request: (targetId: string, minutes: number, reason: string) => Promise<RequestResult>;
  revoke: (id: string) => Promise<void>;
  /** ثبت «استفاده» (برای audit) — فراخوانی هنگام باز کردن پرونده */
  markUsed: (id: string) => void;
  cleanupExpired: () => void;
}

const BreakGlassContext = createContext<Ctx | null>(null);

function isValid(g: BreakGlassGrant): boolean {
  return !g.revoked && g.expiresAt > Date.now();
}

export function BreakGlassProvider({ children }: { children: ReactNode }) {
  const { session, accounts } = useAuth(); // 🆕 accounts برای پیدا کردن super_adminها
  const { log } = useAudit();
  const { pushCriticalAlert } = useNotification(); // 🆕 دریافت متد ارسال آلرت
  
  const [grants, setGrants] = useState<BreakGlassGrant[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setGrants(JSON.parse(raw) || []);
      } catch {}
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify(grants)).catch(() => {});
  }, [grants, ready]);

  /* پاک‌سازی خودکار منقضی‌ها + audit انقضا */
  const cleanupExpired = useCallback(() => {
    const now = Date.now();
    setGrants((prev) => {
      const expired = prev.filter((g) => !g.revoked && g.expiresAt <= now);
      expired.forEach((g) => {
        log({
          action: 'breakglass:expire', entity: 'break_glass', entityId: g.targetId,
          severity: 'critical',
          messageFa: `انقضای خودکار دسترسی اضطراری ${maskNationalId(g.actorId)} → ${maskNationalId(g.targetId)} (دلیل: ${g.reason.slice(0, 40)})`,
        });
      });
      if (!expired.length) return prev;
      return prev.map((g) => (!g.revoked && g.expiresAt <= now ? { ...g, revoked: true, revokedAt: now } : g));
    });
  }, [log]);

  // چرخهٔ پاک‌سازی هر ۶۰ ثانیه
  useEffect(() => {
    if (!ready) return;
    cleanupExpired();
    const t = setInterval(cleanupExpired, 60_000);
    return () => clearInterval(t);
  }, [ready, cleanupExpired]);

  const activeFor = useCallback(
    (actorId: string, targetId: string): BreakGlassGrant | null => {
      const list = grants
        .filter((g) => g.actorId === actorId && g.targetId === targetId && isValid(g))
        .sort((a, b) => b.createdAt - a.createdAt);
      return list[0] ?? null;
    },
    [grants],
  );

  const request = useCallback(
    async (targetId: string, minutes: number, reason: string): Promise<RequestResult> => {
      if (!session?.nationalId) return { ok: false, error: 'نشست فعال نیست' };
      const actor = session.nationalId;

      const trimReason = String(reason || '').trim();
      if (trimReason.length < BG_MIN_REASON_LEN) {
        return { ok: false, error: `دلیل باید حداقل ${BG_MIN_REASON_LEN} کاراکتر باشد` };
      }
      if (!targetId) return { ok: false, error: 'مراجع هدف مشخص نیست' };
      if (actor === targetId) return { ok: false, error: 'نمی‌توانید برای خودتان دسترسی اضطراری بگیرید' };

      const mins = Math.min(Math.max(Math.floor(minutes) || BG_DEFAULT_MINUTES, 5), BG_MAX_MINUTES);

      // سقف grant فعال همزمان
      const activeCount = grants.filter((g) => g.actorId === actor && isValid(g)).length;
      if (activeCount >= BG_MAX_ACTIVE_PER_USER) {
        return { ok: false, error: `حداکثر ${BG_MAX_ACTIVE_PER_USER} دسترسی اضطراری همزمان مجاز است` };
      }

      const now = Date.now();
      const grant: BreakGlassGrant = {
        id: uid(), actorId: actor, targetId, reason: trimReason,
        scope: bgAllowedScope(), createdAt: now, expiresAt: now + mins * 60_000,
      };

      setGrants((prev) => [grant, ...prev]);
      log({
        action: 'breakglass:request', entity: 'break_glass', entityId: targetId,
        severity: 'critical',
        messageFa: `درخواست دسترسی اضطراری ${maskNationalId(actor)} → ${maskNationalId(targetId)} (${mins} دقیقه) — دلیل: ${trimReason.slice(0, 80)}`,
      });

      /* 🆕 L-10: ارسال آلرت امنیتی بحرانی به تمام Super Adminهای فعال */
      const superAdmins = accounts.filter(a => a.role === 'super_admin' && a.active);
      
      superAdmins.forEach(admin => {
        pushCriticalAlert({
          targetUserId: admin.nationalId,
          titleFa: '⚠️ درخواست دسترسی اضطراری (Break-glass)',
          titleEn: '⚠️ Emergency Access Request',
          bodyFa: `کاربر ${maskNationalId(actor)} درخواست دسترسی به پرونده ${maskNationalId(targetId)} کرد.\nمدت: ${mins} دقیقه\nدلیل: ${trimReason}`,
          bodyEn: `User ${maskNationalId(actor)} requested access to record ${maskNationalId(targetId)}.\nDuration: ${mins} min\nReason: ${trimReason}`,
        });
      });

      return { ok: true, grant };
    },
    [session, grants, log, pushCriticalAlert, accounts], // 🆕 dependency اضافه شد
  );

  const revoke = useCallback(
    async (id: string) => {
      const g = grants.find((x) => x.id === id);
      if (!g || g.revoked) return;
      const now = Date.now();
      setGrants((prev) => prev.map((x) => (x.id === id ? { ...x, revoked: true, revokedAt: now } : x)));
      log({
        action: 'breakglass:revoke', entity: 'break_glass', entityId: g.targetId,
        severity: 'critical',
        messageFa: `پایان زودهنگام دسترسی اضطراری ${maskNationalId(g.actorId)} → ${maskNationalId(g.targetId)}`,
      });
    },
    [grants, log],
  );

  const markUsed = useCallback(
    (id: string) => {
      const g = grants.find((x) => x.id === id);
      if (!g || g.usedAt || !isValid(g)) return;
      setGrants((prev) => prev.map((x) => (x.id === id ? { ...x, usedAt: Date.now() } : x)));
      log({
        action: 'breakglass:use', entity: 'break_glass', entityId: g.targetId,
        severity: 'critical',
        messageFa: `استفاده از دسترسی اضطراری ${maskNationalId(g.actorId)} → ${maskNationalId(g.targetId)}`,
      });
    },
    [grants, log],
  );

  return (
    <BreakGlassContext.Provider value={{ grants, ready, activeFor, request, revoke, markUsed, cleanupExpired }}>
      {children}
    </BreakGlassContext.Provider>
  );
}

export function useBreakGlass(): Ctx {
  const c = useContext(BreakGlassContext);
  if (!c) throw new Error('useBreakGlass must be used within BreakGlassProvider');
  return c;
}