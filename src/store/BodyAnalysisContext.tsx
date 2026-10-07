import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BodyAnalysisRecord, AnalysisAmendment } from '../data/bodyAnalysisTypes';
import { useAudit } from './AuditContext';
import { useAuth } from './AuthContext';
import { writeQueue } from '../data/writeQueue'; // 🆕 zero-loss
import {
  requirePermission,
  requireAnyPermission,
  PermissionDeniedError,
} from '../utils/contextGuards';

interface BodyAnalysisState {
  records: BodyAnalysisRecord[];
  lastImportedAt: string | null;
}

interface BodyAnalysisCtx {
  records: BodyAnalysisRecord[];
  lastImportedAt: string | null;
  ready: boolean;
  /** دریافت آنالیزهای یک فرد خاص */
  getUserAnalyses: (nationalId: string) => BodyAnalysisRecord[];
  /** دریافت آخرین آنالیز یک فرد */
  getLatestAnalysis: (nationalId: string) => BodyAnalysisRecord | null;
  /** دریافت آنالیزهای قبلی (بدون آخرین) */
  getHistory: (nationalId: string) => BodyAnalysisRecord[];
  importRecords: (records: BodyAnalysisRecord[]) => Promise<{ success: boolean; error?: string }>;
  clearAll: () => Promise<void>;

  // 🆕 L-08: Finalize / Amendment
  finalizeAnalysis: (
    id: string,
    actorId?: string,
    reason?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  amendAnalysis: (
    id: string,
    changes: Partial<BodyAnalysisRecord>,
    actorId?: string,
    reason?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updateAnalysis: (
    id: string,
    changes: Partial<BodyAnalysisRecord>,
    actorId?: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

const BodyAnalysisContext = createContext<BodyAnalysisCtx | null>(null);
const STORAGE_KEY = 'themin_body_analysis_v1';

// 🆕 فیلدهایی که نباید مستقیم از طریق amendment/update تغییر کنند
const PROTECTED_FIELDS = new Set([
  'id',
  'nationalId',
  'mobileNumber',
  'fullName',
  'analyzeTime',
  'finalized',
  'finalizedAt',
  'finalizedBy',
  'finalizeReason',
  'amendments',
]);

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function BodyAnalysisProvider({ children }: { children: ReactNode }) {
  const { log } = useAudit();
  const { session, accounts } = useAuth();

  const [records, setRecords] = useState<BodyAnalysisRecord[]>([]);
  const [lastImportedAt, setLastImportedAt] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const account = useMemo(
    () => (accounts || []).find((a) => a.nationalId === session?.nationalId) ?? null,
    [accounts, session],
  );

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setRecords(parsed.records || []);
          setLastImportedAt(parsed.lastImportedAt || null);
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ records, lastImportedAt }),
    ).catch(() => {});
  }, [records, lastImportedAt, ready]);

  const getUserAnalyses = useCallback(
    (nationalId: string): BodyAnalysisRecord[] => {
      return records
        .filter((r) => r.nationalId === nationalId)
        .sort((a, b) => new Date(b.analyzeTime).getTime() - new Date(a.analyzeTime).getTime());
    },
    [records],
  );

  const getLatestAnalysis = useCallback(
    (nationalId: string): BodyAnalysisRecord | null => {
      const analyses = getUserAnalyses(nationalId);
      return analyses.length > 0 ? analyses[0] : null;
    },
    [getUserAnalyses],
  );

  const getHistory = useCallback(
    (nationalId: string): BodyAnalysisRecord[] => {
      return getUserAnalyses(nationalId).slice(1);
    },
    [getUserAnalyses],
  );

  const importRecords = useCallback(
    async (newRecords: BodyAnalysisRecord[]): Promise<{ success: boolean; error?: string }> => {
      // 🆕 L-04: گارد لایهٔ داده
      try {
        requirePermission(
          session,
          account,
          'analysis.upload',
          'دسترسی آپلود آنالیز بدن ندارید',
          'You do not have permission to upload body analysis',
        );
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          log({
            action: 'analysis:import_denied',
            entity: 'body_analysis',
            severity: 'critical',
            messageFa: `تلاش ناموفق برای آپلود ${newRecords.length} رکورد بادی آنالیز (دسترسی رد شد)`,
          });
          return { success: false, error: err.messageFa };
        }
        throw err;
      }

      setRecords((prev) => {
        const map = new Map<string, BodyAnalysisRecord>();
        prev.forEach((r) => map.set(r.id, r));
        newRecords.forEach((r) => map.set(r.id, r));
        return Array.from(map.values());
      });
      setLastImportedAt(new Date().toISOString());

      // 🆕 zero-loss: هر رکورد وارداتی را idempotent در صف sync هم بگذار
      // (کلید analysis|<id> جلوی duplicate محلی و سروری را می‌گیرد)
      for (const r of newRecords) {
        writeQueue
          .submitAnalysis(r)
          .catch((e) => console.warn('[BodyAnalysis] enqueue failed', e));
      }

      log({
        action: 'analysis:import',
        entity: 'body_analysis',
        severity: 'warn',
        messageFa: `واردسازی ${newRecords.length} رکورد بادی آنالیز`,
      });
      return { success: true };
    },
    [log, session, account],
  );

  const clearAll = useCallback(async () => {
    // 🆕 L-04: گارد لایهٔ داده
    try {
      requirePermission(
        session,
        account,
        'access.manage',
        'دسترسی پاک‌سازی کامل داده‌ها را ندارید',
        'You do not have permission to clear all data',
      );
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        log({
          action: 'analysis:clear_denied',
          entity: 'body_analysis',
          severity: 'critical',
          messageFa: 'تلاش ناموفق برای پاک‌سازی کامل بادی آنالیز (دسترسی رد شد)',
        });
        return;
      }
      throw err;
    }

    setRecords([]);
    setLastImportedAt(null);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    log({
      action: 'analysis:clear',
      entity: 'body_analysis',
      severity: 'critical',
      messageFa: 'پاک‌سازی کامل دیتای بادی آنالیز',
    });
  }, [log, session, account]);

  /**
   * 🆕 L-08: Finalize
   * فقط نقش‌های دارای radiology.finalize یا cardiology.finalize
   */
  const finalizeAnalysis = useCallback(
    async (
      id: string,
      actorId?: string,
      reason?: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!session?.nationalId) {
        return { success: false, error: 'نشست فعال نیست' };
      }

      const actor = actorId || session.nationalId;

      // اگر کسی برای دیگری finalize می‌کند، باید access.manage داشته باشد
      if (actor !== session.nationalId) {
        try {
          requirePermission(
            session,
            account,
            'access.manage',
            'دسترسی finalize برای دیگران را ندارید',
            'You do not have permission to finalize on behalf of others',
          );
        } catch (err) {
          if (err instanceof PermissionDeniedError) {
            log({
              action: 'analysis:finalize_denied',
              entity: 'body_analysis',
              severity: 'critical',
              messageFa: `تلاش ناموفق finalize آنالیز ${id} توسط ${session.nationalId} برای ${actor}`,
            });
            return { success: false, error: err.messageFa };
          }
          throw err;
        }
      }

      const rec = records.find((r) => r.id === id);
      if (!rec) {
        return { success: false, error: 'رکورد یافت نشد' };
      }

      if (rec.finalized) {
        return { success: false, error: 'این رکورد قبلاً نهایی‌سازی شده است' };
      }

      const trimReason = String(reason || '').trim();
      if (!trimReason) {
        return { success: false, error: 'دلیل نهایی‌سازی الزامی است' };
      }

      try {
        requireAnyPermission(
          session,
          account,
          ['radiology.finalize', 'cardiology.finalize'],
          'دسترسی نهایی‌سازی گزارش تخصصی را ندارید',
          'You do not have permission to finalize specialist report',
        );
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          log({
            action: 'analysis:finalize_denied',
            entity: 'body_analysis',
            severity: 'critical',
            messageFa: `تلاش ناموفق finalize آنالیز ${id} توسط ${actor}`,
          });
          return { success: false, error: err.messageFa };
        }
        throw err;
      }

      const now = new Date().toISOString();

      setRecords((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                finalized: true,
                finalizedAt: now,
                finalizedBy: actor,
                finalizeReason: trimReason,
                amendments: r.amendments || [],
              }
            : r,
        ),
      );

      log({
        action: 'analysis:finalize',
        entity: 'body_analysis',
        severity: 'warn',
        messageFa: `نهایی‌سازی آنالیز ${id} توسط ${actor}: ${trimReason}`,
      });

      return { success: true };
    },
    [records, session, account, log],
  );

  /**
   * 🆕 L-08: Amendment
   * فقط روی رکوردهای finalize شده مجاز است.
   */
  const amendAnalysis = useCallback(
    async (
      id: string,
      changes: Partial<BodyAnalysisRecord>,
      actorId?: string,
      reason?: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!session?.nationalId) {
        return { success: false, error: 'نشست فعال نیست' };
      }

      const actor = actorId || session.nationalId;

      if (actor !== session.nationalId) {
        try {
          requirePermission(
            session,
            account,
            'access.manage',
            'دسترسی ثبت اصلاحیه برای دیگران را ندارید',
            'You do not have permission to amend on behalf of others',
          );
        } catch (err) {
          if (err instanceof PermissionDeniedError) {
            log({
              action: 'analysis:amend_denied',
              entity: 'body_analysis',
              severity: 'critical',
              messageFa: `تلاش ناموفق amend آنالیز ${id} توسط ${session.nationalId} برای ${actor}`,
            });
            return { success: false, error: err.messageFa };
          }
          throw err;
        }
      }

      const rec = records.find((r) => r.id === id);
      if (!rec) {
        return { success: false, error: 'رکورد یافت نشد' };
      }

      if (!rec.finalized) {
        return {
          success: false,
          error: 'فقط رکوردهای نهایی‌سازی‌شده قابل اصلاحیه هستند',
        };
      }

      const trimReason = String(reason || '').trim();
      if (!trimReason) {
        return { success: false, error: 'دلیل اصلاحیه الزامی است' };
      }

      try {
        requireAnyPermission(
          session,
          account,
          ['section.radiology.edit', 'section.cardiology.edit', 'analysis.upload'],
          'دسترسی ثبت اصلاحیه برای این رکورد را ندارید',
          'You do not have permission to amend this record',
        );
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          log({
            action: 'analysis:amend_denied',
            entity: 'body_analysis',
            severity: 'critical',
            messageFa: `تلاش ناموفق amend آنالیز ${id} توسط ${actor}`,
          });
          return { success: false, error: err.messageFa };
        }
        throw err;
      }

      const now = new Date().toISOString();
      const entries: AnalysisAmendment[] = [];

      for (const [field, newValue] of Object.entries(changes)) {
        if (PROTECTED_FIELDS.has(field)) continue;
        if (newValue === undefined) continue;

        const oldValue = (rec as any)[field];
        if (oldValue === newValue) continue;

        entries.push({
          id: `amd-${uid()}`,
          field,
          oldValue: oldValue ?? null,
          newValue: newValue ?? null,
          reason: trimReason,
          actorId: actor,
          actorRole: session.role,
          createdAt: now,
        });
      }

      if (entries.length === 0) {
        return { success: false, error: 'تغییر معتبری برای ثبت وجود ندارد' };
      }

      const patch = Object.fromEntries(
        entries.map((e) => [e.field, e.newValue]),
      ) as Partial<BodyAnalysisRecord>;

      setRecords((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...patch,
                amendments: [...(r.amendments || []), ...entries],
              }
            : r,
        ),
      );

      log({
        action: 'analysis:amend',
        entity: 'body_analysis',
        severity: 'warn',
        messageFa: `اصلاحیه آنالیز ${id} توسط ${actor}: ${entries
          .map((e) => e.field)
          .join('، ')} — دلیل: ${trimReason}`,
      });

      return { success: true };
    },
    [records, session, account, log],
  );

  /**
   * 🆕 L-08: Update مستقیم
   * فقط برای رکوردهای chưa finalize شده مجاز است.
   */
  const updateAnalysis = useCallback(
    async (
      id: string,
      changes: Partial<BodyAnalysisRecord>,
      actorId?: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!session?.nationalId) {
        return { success: false, error: 'نشست فعال نیست' };
      }

      const actor = actorId || session.nationalId;

      if (actor !== session.nationalId) {
        try {
          requirePermission(
            session,
            account,
            'access.manage',
            'دسترسی ویرایش برای دیگران را ندارید',
            'You do not have permission to edit on behalf of others',
          );
        } catch (err) {
          if (err instanceof PermissionDeniedError) {
            log({
              action: 'analysis:update_denied',
              entity: 'body_analysis',
              severity: 'critical',
              messageFa: `تلاش ناموفق update آنالیز ${id} توسط ${session.nationalId} برای ${actor}`,
            });
            return { success: false, error: err.messageFa };
          }
          throw err;
        }
      }

      const rec = records.find((r) => r.id === id);
      if (!rec) {
        return { success: false, error: 'رکورد یافت نشد' };
      }

      if (rec.finalized) {
        return {
          success: false,
          error: 'رکورد نهایی‌سازی شده است؛ فقط از طریق اصلاحیه تغییر دهید',
        };
      }

      try {
        requirePermission(
          session,
          account,
          'analysis.upload',
          'دسترسی ویرایش آنالیز بدن را ندارید',
          'You do not have permission to edit body analysis',
        );
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          log({
            action: 'analysis:update_denied',
            entity: 'body_analysis',
            severity: 'critical',
            messageFa: `تلاش ناموفق update آنالیز ${id} توسط ${actor}`,
          });
          return { success: false, error: err.messageFa };
        }
        throw err;
      }

      const safeChanges: Partial<BodyAnalysisRecord> = {};
      for (const [field, value] of Object.entries(changes)) {
        if (PROTECTED_FIELDS.has(field)) continue;
        if (value === undefined) continue;
        (safeChanges as any)[field] = value;
      }

      if (Object.keys(safeChanges).length === 0) {
        return { success: false, error: 'تغییر معتبری وجود ندارد' };
      }

      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...safeChanges } : r)),
      );

      log({
        action: 'analysis:update',
        entity: 'body_analysis',
        severity: 'info',
        messageFa: `ویرایش آنالیز ${id} توسط ${actor}: ${Object.keys(safeChanges).join('، ')}`,
      });

      return { success: true };
    },
    [records, session, account, log],
  );

  return (
    <BodyAnalysisContext.Provider
      value={{
        records,
        lastImportedAt,
        ready,
        getUserAnalyses,
        getLatestAnalysis,
        getHistory,
        importRecords,
        clearAll,
        finalizeAnalysis,
        amendAnalysis,
        updateAnalysis,
      }}
    >
      {children}
    </BodyAnalysisContext.Provider>
  );
}

export function useBodyAnalysis(): BodyAnalysisCtx {
  const ctx = useContext(BodyAnalysisContext);
  if (!ctx) throw new Error('useBodyAnalysis must be used within BodyAnalysisProvider');
  return ctx;
}