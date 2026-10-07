/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · صف نوشتن آفلاین (L-03) + اعتبارسنجی (L-05b)
 *  هر نوشتن = ذخیرهٔ فوری محلی + ثبت در صف با کلید یکتا.
 *  دادهٔ نامعتبر با وضعیت needsReview علامت می‌خورد و خودکار sync نمی‌شود.
 *  خطای شبکه transient است و رکورد را failed نمی‌کند.
 * ─────────────────────────────────────────────────────────────
 */
import { useCallback, useEffect, useState } from 'react';
import { dataStore } from './dataStore';
import { makeIdemKey } from './schema';
import type { FoodLog, SyncQueueEntry, SyncStatus } from './schema';
import { validateFoodLog, validateMeal, validateBodyAnalysis } from '../utils/validate';
import { notifySyncChanged } from '../utils/syncBus';

const QUEUE_KEY = 'zdl:v1:queue';
let seq = 0;
const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const nowISO = () => new Date().toISOString();

const TRANSIENT_STATUS = new Set([0, 408, 425, 429, 500, 502, 503, 504]);

function isTransientError(err: any): boolean {
  if (err?.transient === true) return true;
  const status = Number(err?.status ?? err?.apiError?.status ?? 0);
  return TRANSIENT_STATUS.has(status);
}

async function allQueue(): Promise<SyncQueueEntry[]> {
  try {
    const dump = await dataStore.dumpAll();
    const raw = dump[QUEUE_KEY];
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : (p?.items ?? []);
  } catch {
    return [];
  }
}

async function findByIdem(idem: string): Promise<SyncQueueEntry | undefined> {
  return (await allQueue()).find((e) => e.idempotencyKey === idem);
}

export type Transport = (entry: SyncQueueEntry) => Promise<void>;

export const writeQueue = {
  /** ثبت وعدهٔ غذایی (FoodLog) — با اعتبارسنجی */
  async submitFoodLog(
    input: Omit<FoodLog, 'id' | 'clientCreatedAt' | 'idempotencyKey' | 'syncStatus'>,
  ): Promise<FoodLog> {
    const clientCreatedAt = nowISO();
    const ref = input.itemId || input.name;
    const idempotencyKey = makeIdemKey(input.nationalId, clientCreatedAt, input.mealType, ref);

    const existing = await findByIdem(idempotencyKey);
    if (existing && existing.status !== 'failed') {
      const logs = await dataStore.foodLogsOf(input.nationalId);
      return logs.find((l) => l.idempotencyKey === idempotencyKey) as FoodLog;
    }

    const log: FoodLog = { ...input, id: uid(), clientCreatedAt, idempotencyKey, syncStatus: 'pending' };

    // ✅ L-05b: اعتبارسنجی قبل از ورود به صف
    const vr = validateFoodLog(log);
    log.syncStatus = vr.ok ? 'pending' : 'needsReview';

    await dataStore.addFoodLog(log);
    await dataStore.enqueue({
      id: uid(),
      entity: 'foodLog',
      payload: log,
      idempotencyKey,
      createdAt: clientCreatedAt,
      attempts: 0,
      status: log.syncStatus,
    });
    notifySyncChanged();
    return log;
  },

  /** ثبت/ویرایش وعدهٔ کاربر (Meal) — با اعتبارسنجی */
  async submitMeal(meal: any): Promise<any> {
    const createdAt = nowISO();
    const idempotencyKey = `meal|${String(meal?.id || uid())}`;

    // ✅ L-05b: اعتبارسنجی وعده
    const vr = validateMeal(meal);
    const qStatus: SyncStatus = vr.ok ? 'pending' : 'needsReview';

    await dataStore.enqueue({
      id: uid(),
      entity: 'meal',
      payload: meal,
      idempotencyKey,
      createdAt,
      attempts: 0,
      status: qStatus,
    });
    notifySyncChanged();
    return meal;
  },

  /** حذف وعده — برای sync آفلاین/آنلاین */
  async deleteMeal(mealId: string): Promise<void> {
    const createdAt = nowISO();
    const idempotencyKey = `meal|${String(mealId)}`;

    await dataStore.enqueue({
      id: uid(),
      entity: 'mealDelete',
      payload: { mealId },
      idempotencyKey,
      createdAt,
      attempts: 0,
      status: 'pending',
    });
    notifySyncChanged();
  },

  /** ثبت/به‌روزرسانی آنالیز بدن — با اعتبارسنجی */
  async submitAnalysis(record: any): Promise<any> {
    const clientCreatedAt = nowISO();
    const idempotencyKey = `analysis|${String(record?.id || record?.analyzeTime || uid())}`;
    const existing = await findByIdem(idempotencyKey);

    await dataStore.upsertAnalysis(record);

    // ✅ L-05b: اعتبارسنجی آنالیز
    const vr = validateBodyAnalysis(record);
    const qStatus: SyncStatus = vr.ok ? 'pending' : 'needsReview';

    if (!existing || existing.status === 'failed') {
      await dataStore.enqueue({
        id: uid(),
        entity: 'bodyAnalysis',
        payload: record,
        idempotencyKey,
        createdAt: clientCreatedAt,
        attempts: 0,
        status: qStatus,
      });
      notifySyncChanged();
    }
    return record;
  },

  async pending(): Promise<SyncQueueEntry[]> {
    return dataStore.pendingQueue();
  },

  async counts(): Promise<Record<SyncStatus, number>> {
    const all = await allQueue();
    const c: any = { pending: 0, synced: 0, failed: 0, needsReview: 0 };
    all.forEach((e) => {
      c[e.status] = (c[e.status] || 0) + 1;
    });
    return c;
  },

  /**
   * replay صف به مقصد.
   * - خطای transient (شبکه/5xx/429) → رکورد pending می‌ماند
   * - خطای دائمی (validation/permission) → failed
   */
  async syncNow(
    transport?: Transport,
  ): Promise<{ sent: number; failed: number; transient: number; pending: number }> {
    const pend = await dataStore.pendingQueue();
    if (!transport) return { sent: 0, failed: 0, transient: 0, pending: pend.length };

    let sent = 0;
    let failed = 0;
    let transient = 0;

    for (const e of pend) {
      try {
        await transport(e);
        await dataStore.setQueueStatus(e.id, 'synced');
        sent++;
        notifySyncChanged();
      } catch (err: any) {
        if (isTransientError(err)) {
          // رکورد را failed نکن؛ بگذار در pending بماند تا بعداً retry شود
          transient++;
        } else {
          await dataStore.setQueueStatus(e.id, 'failed', String(err?.message || err));
          failed++;
          notifySyncChanged();
        }
      }
    }

    return {
      sent,
      failed,
      transient,
      pending: (await dataStore.pendingQueue()).length,
    };
  },

  async retryFailed(transport?: Transport) {
    const all = await allQueue();
    for (const e of all) if (e.status === 'failed') await dataStore.setQueueStatus(e.id, 'pending');
    notifySyncChanged();
    return writeQueue.syncNow(transport);
  },
};

/** هوک واکنش‌گرا — بدون نیاز به Provider */
export function useWriteQueue() {
  const [pending, setPending] = useState(0);
  const [counts, setCounts] = useState<Record<SyncStatus, number> | null>(null);

  const refresh = useCallback(async () => {
    setPending((await writeQueue.pending()).length);
    setCounts(await writeQueue.counts());
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    const unsub = subscribeSyncChanged(() => {
      void refresh();
    });
    return () => {
      clearInterval(t);
      unsub();
    };
  }, [refresh]);

  return {
    pending,
    counts,
    refresh,
    submitFoodLog: async (x: any) => {
      const r = await writeQueue.submitFoodLog(x);
      await refresh();
      return r;
    },
    submitMeal: async (x: any) => {
      const r = await writeQueue.submitMeal(x);
      await refresh();
      return r;
    },
    deleteMeal: async (mealId: string) => {
      await writeQueue.deleteMeal(mealId);
      await refresh();
    },
    submitAnalysis: async (x: any) => {
      const r = await writeQueue.submitAnalysis(x);
      await refresh();
      return r;
    },
    syncNow: async (t?: Transport) => {
      const r = await writeQueue.syncNow(t);
      await refresh();
      return r;
    },
    retryFailed: async (t?: Transport) => {
      const r = await writeQueue.retryFailed(t);
      await refresh();
      return r;
    },
  };
}