import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useWellness } from './WellnessContext';
import { CURRENT_ORG } from '../config/org';
import { maskNationalId } from '../utils/nationalId';
import { roleLabelsFa, type Role } from '../types/auth';

export type Severity = 'info' | 'warn' | 'critical';
export interface AuditChange { field: string; old?: string; new?: string; }
export interface AuditEntry {
  id: string; at: string; orgId: string;
  actorId: string; actorRole: string;
  action: string; entity: string; entityId?: string;
  severity: Severity;
  messageFa: string;
  changes?: AuditChange[];
  ticketClosed?: boolean;
}

const KEY = 'themin_audit_v2';
const SEEN_KEY = 'themin_audit_seen_v1';
const CAP = 500;

/** نام فارسی فیلدهای غذای قابل‌ویرایش */
export const FIELD_FA: Record<string, string> = {
  nameFa: 'نام', group: 'دسته', unitFa: 'واحد رایج', gramsPerUnit: 'گرم هر واحد',
  kcalPer100g: 'کالری هر ۱۰۰گرم', proteinPer100g: 'پروتئین هر ۱۰۰گرم',
  carbPer100g: 'کربوهیدرات هر ۱۰۰گرم', fatPer100g: 'چربی هر ۱۰۰گرم',
  fiberPer100g: 'فیبر هر ۱۰۰گرم', sugarPer100g: 'قند هر ۱۰۰گرم',
};

/** 📖 کاتالوگ اقدام‌ها: تشریح فارسی + سطح اهمیت */
const CATALOG: Record<string, { severity: Severity; fa: (d?: string) => string }> = {
  'food:update': { severity: 'warn', fa: (d) => `ویرایش دیتابیس غذا${d ? ` (${d})` : ''}` },
  'food:reset': { severity: 'warn', fa: (d) => `بازنشانی غذا به مقادیر اصلی${d ? ` (${d})` : ''}` },
  'personnel:import': { severity: 'warn', fa: (d) => `واردسازی دیتابیس پرسنل${d ? ` — ${d}` : ''}` },
  'personnel:clear': { severity: 'critical', fa: () => 'پاک‌کردن کامل دیتابیس پرسنل' },
  'audit:clear': { severity: 'critical', fa: () => 'پاک‌کردن لاگ ممیزی امنیتی' },
  'audit:view': { severity: 'info', fa: () => 'مشاهدهٔ لاگ ممیزی' },
  'auth:login': { severity: 'info', fa: () => 'ورود به سامانه' },
  'auth:logout': { severity: 'info', fa: () => 'خروج از سامانه' },
  'access:change': { severity: 'critical', fa: (d) => `تغییر نقش/دسترسی کاربر${d ? ` — ${d}` : ''}` },
  'settings:security': { severity: 'critical', fa: (d) => `تغییر تنظیمات امنیتی${d ? ` — ${d}` : ''}` },
};

/* 🆕 رویداد خام AuthContext */
interface AuthAuditEvent {
  id: string;
  type: string;
  actorId: string;
  targetId?: string;
  at: number;
  meta?: string;
}

/** 🆕 نگاشت رویدادهای Auth به پیام فارسی + سطح اهمیت */
const AUTH_EVENT_MAP: Record<string, { severity: Severity; fa: (e: AuthAuditEvent) => string }> = {
  bootstrap_admin: { severity: 'critical', fa: () => 'ساخت حساب مدیر ارشد اولیه (bootstrap)' },
  account_auto_provision: { severity: 'warn', fa: (e) => `ساخت خودکار حساب (self-provision)${e.meta ? ` — ${e.meta}` : ''}` },
  account_add: {
    severity: 'warn',
    fa: (e) => `افزودن حساب جدید${e.meta ? ` با نقش «${roleLabelsFa[e.meta as Role] || e.meta}»` : ''}${e.targetId ? ` برای ${maskNationalId(e.targetId)}` : ''}`,
  },
  account_toggle: { severity: 'warn', fa: (e) => `فعال/غیرفعال کردن حساب ${e.targetId ? maskNationalId(e.targetId) : ''}` },
  role_change: {
    severity: 'critical',
    fa: (e) => `تغییر نقش کاربر ${e.targetId ? maskNationalId(e.targetId) : ''}${e.meta ? ` به «${roleLabelsFa[e.meta as Role] || e.meta}»` : ''}`,
  },
  permissions_change: {
    severity: 'critical',
    fa: (e) => `تغییر دسترسی‌های جزئی کاربر ${e.targetId ? maskNationalId(e.targetId) : ''}${e.meta ? ` (${e.meta})` : ''}`,
  },
  password_set: { severity: 'info', fa: (e) => `تنظیم/بازنشانی رمز عبور${e.meta ? ` (${e.meta})` : ''}` },
  login_success: { severity: 'info', fa: () => 'ورود موفق به سامانه' },
  login_fail: { severity: 'warn', fa: (e) => `تلاش ورود ناموفق${e.meta ? ` (${e.meta})` : ''}` },
  lockout: { severity: 'critical', fa: () => 'قفل موقت حساب پس از تلاش‌های ناموفق متوالی' },
  logout: { severity: 'info', fa: (e) => `خروج از سامانه${e.meta ? ` (${e.meta})` : ''}` },
  settings_change: { severity: 'critical', fa: (e) => `تغییر تنظیمات امنیتی${e.meta ? ` (${e.meta})` : ''}` },
};

interface LogInput {
  action: string; entity: string; entityId?: string;
  severity?: Severity; messageFa?: string; details?: string; changes?: AuditChange[];
}
interface Ctx {
  entries: AuditEntry[];
  log: (e: LogInput) => void;
  clear: () => void;
  ready: boolean;
  alerts: AuditEntry[];
  unseenAlerts: AuditEntry[];
  markAlertsSeen: () => void;
  securityTickets: AuditEntry[];
  closeTicket: (id: string) => void;
}

const AuditContext = createContext<Ctx | null>(null);

export function AuditProvider({ children }: { children: ReactNode }) {
  const { session, audit: authAudit } = useAuth();
  const wellness = useWellness() as any;
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const lastAuthIdRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY); if (raw) setEntries(JSON.parse(raw));
        const s = await AsyncStorage.getItem(SEEN_KEY); if (s) setSeenAt(s);
      } catch {}
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify(entries.slice(0, CAP))).catch(() => {});
  }, [entries, ready]);

  /** 🚨 اگر اقدام حساس بود، در صورت وجود سیستم تیکت، تیکت امنیتی هم بساز */
  const tryCreateTicket = useCallback((entry: AuditEntry) => {
    const fn = wellness?.createTicket ?? wellness?.addTicket;
    if (typeof fn !== 'function') return;
    try {
      fn({
        id: `t-sec-${entry.id}`,
        title: `🚨 آلرت امنیتی: ${entry.messageFa}`,
        subject: `🚨 آلرت امنیتی: ${entry.messageFa}`,
        body: `${entry.messageFa}${entry.entityId ? ` (${entry.entityId})` : ''} — انجام‌دهنده: ${entry.actorId} — زمان: ${entry.at}`,
        message: entry.messageFa,
        priority: 'high', category: 'security', status: 'open',
        createdBy: entry.actorId, createdAt: entry.at,
      });
    } catch {}
  }, [wellness]);

  const pushEntry = useCallback((entry: AuditEntry) => {
    setEntries((p) => [entry, ...p].slice(0, CAP));
    if (entry.severity === 'critical') tryCreateTicket(entry);
  }, [tryCreateTicket]);

  const log = useCallback((e: LogInput) => {
    const cat = CATALOG[e.action];
    const severity = e.severity ?? cat?.severity ?? 'info';
    const messageFa = e.messageFa ?? cat?.fa(e.details ?? e.entityId) ?? e.action;
    pushEntry({
      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      orgId: CURRENT_ORG.id,
      actorId: session?.nationalId ?? 'system',
      actorRole: session?.role ?? 'system',
      action: e.action, entity: e.entity, entityId: e.entityId,
      severity, messageFa, changes: e.changes,
    });
  }, [session, pushEntry]);

  /* 🆕 پل رویدادهای AuthContext → AuditContext تا صفحهٔ /audit همه را ببیند */
  useEffect(() => {
    if (!ready) return;
    if (!authAudit || authAudit.length === 0) return;

    const newest = authAudit[0];

    if (lastAuthIdRef.current === null) {
      lastAuthIdRef.current = newest.id;
      return;
    }
    if (newest.id === lastAuthIdRef.current) return;

    const idx = authAudit.findIndex((x) => x.id === lastAuthIdRef.current);
    const fresh = idx === -1 ? [newest] : authAudit.slice(0, idx);
    lastAuthIdRef.current = newest.id;

    [...fresh].reverse().forEach((ev) => {
      const map = AUTH_EVENT_MAP[ev.type];
      if (!map) return;
      pushEntry({
        id: `auth-${ev.id}`,
        at: new Date(ev.at).toISOString(),
        orgId: CURRENT_ORG.id,
        actorId: ev.actorId,
        actorRole: session?.role ?? 'system',
        action: `auth:${ev.type}`,
        entity: 'auth',
        entityId: ev.targetId,
        severity: map.severity,
        messageFa: map.fa(ev),
      });
    });
  }, [authAudit, ready, pushEntry, session]);

  const clear = useCallback(() => {
    const entry: AuditEntry = {
      id: `a-${Date.now()}-clr`, at: new Date().toISOString(), orgId: CURRENT_ORG.id,
      actorId: session?.nationalId ?? 'system', actorRole: session?.role ?? 'system',
      action: 'audit:clear', entity: 'audit', severity: 'critical',
      messageFa: CATALOG['audit:clear'].fa(),
    };
    setEntries([entry]);
    tryCreateTicket(entry);
  }, [session, tryCreateTicket]);

  const markAlertsSeen = useCallback(() => {
    const now = new Date().toISOString();
    setSeenAt(now);
    AsyncStorage.setItem(SEEN_KEY, now).catch(() => {});
  }, []);

  const closeTicket = useCallback((id: string) => {
    setEntries((p) => p.map((e) => (e.id === id ? { ...e, ticketClosed: true } : e)));
  }, []);

  const alerts = entries.filter((e) => e.severity !== 'info');
  const unseenAlerts = alerts.filter((e) => !seenAt || e.at > seenAt);
  const securityTickets = entries.filter((e) => e.severity === 'critical');

  return (
    <AuditContext.Provider value={{ entries, log, clear, ready, alerts, unseenAlerts, markAlertsSeen, securityTickets, closeTicket }}>
      {children}
    </AuditContext.Provider>
  );
}

export function useAudit(): Ctx {
  const c = useContext(AuditContext);
  if (!c) throw new Error('useAudit must be used within AuditProvider');
  return c;
}