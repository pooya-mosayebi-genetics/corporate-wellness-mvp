/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · لاگر محلی کاربر-آگاه (L-07)
 *  هر رکورد شامل: کاربر/نقش/سازمان/صفحه + زمان/سطح/پیام/جزئیات
 * ─────────────────────────────────────────────────────────────
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  role?: string;
  orgId?: string;
  screen?: string;
}

export interface LogEntry extends LogContext {
  id: string;
  at: number;
  level: LogLevel;
  message: string;
  meta?: string;
}

const LOG_KEY = 'zdl:v1:logs';
const MAX_ENTRIES = 400;

let buffer: LogEntry[] = [];
let ctx: LogContext = {};
let loaded = false;
const listeners = new Set<() => void>();

/** 🆕 به‌روزرسانی کانتکست (کاربر/نقش/سازمان/صفحه) */
export function updateLoggerContext(partial: Partial<LogContext>) {
  ctx = { ...ctx, ...partial };
}

async function persist() {
  try {
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(buffer.slice(0, MAX_ENTRIES)));
  } catch {
    // quota پر → بی‌صدا رد شو
  }
}

async function ensureLoaded() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    if (raw) buffer = JSON.parse(raw);
  } catch {}
  loaded = true;
}

function notify() {
  listeners.forEach((fn) => fn());
}

export const logger = {
  async log(level: LogLevel, message: string, meta?: string, screen?: string) {
    await ensureLoaded();
    const entry: LogEntry = {
      id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: Date.now(),
      level,
      message: String(message).slice(0, 500),
      meta: meta ? String(meta).slice(0, 800) : undefined,
      ...ctx,                      // 🆕 کاربر/نقش/سازمان/صفحهٔ فعلی
      screen: screen ?? ctx.screen,
    };
    buffer = [entry, ...buffer].slice(0, MAX_ENTRIES);
    notify();
    persist();
  },
  info(message: string, meta?: string, screen?: string) {
    return this.log('info', message, meta, screen);
  },
  warn(message: string, meta?: string, screen?: string) {
    return this.log('warn', message, meta, screen);
  },
  error(message: string, meta?: string, screen?: string) {
    return this.log('error', message, meta, screen);
  },
  async getLogs(): Promise<LogEntry[]> {
    await ensureLoaded();
    return [...buffer];
  },
  async clear() {
    buffer = [];
    notify();
    await persist();
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  async exportJson(): Promise<string> {
    const logs = await this.getLogs();
    return JSON.stringify(
      { app: 'zharfa-wellness', exportedAt: new Date().toISOString(), count: logs.length, logs },
      null,
      2,
    );
  },
  setContext: updateLoggerContext,
};

/** هندلرهای سراسری خطا (وب) */
export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    logger.error('window.onerror', `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`);
  });
  window.addEventListener('unhandledrejection', (e: any) => {
    logger.error('unhandledrejection', String(e?.reason?.message || e?.reason || ''));
  });
}