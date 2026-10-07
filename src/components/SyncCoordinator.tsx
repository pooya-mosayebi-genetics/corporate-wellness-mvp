/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · SyncCoordinator
 *  - flush خودکار صف writeQueue به سرور
 *  - pull خودکار وعده/آنالیز از سرور
 *  - additive merge تا دادهٔ محلیِ sync‌نشده خراب نشود
 * ─────────────────────────────────────────────────────────────
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '../store/AuthContext';
import { useWellness } from '../store/WellnessContext';
import { useBodyAnalysis } from '../store/BodyAnalysisContext';
import { api } from '../lib/api';
import { writeQueue } from '../data/writeQueue';
import { createApiTransport } from '../services/syncTransport';
import { subscribeSyncChanged } from '../utils/syncBus';
import type { MealSlot } from '../types/nutrition';

const PULL_INTERVAL_MS = 45_000;
const SYNC_DEBOUNCE_MS = 1200;

function extractClientId(key?: string | null, prefix?: string): string | null {
  if (!key || !prefix) return null;
  if (!key.startsWith(`${prefix}|`)) return null;
  return key.slice(prefix.length + 1) || null;
}

function serverMealToMeal(sm: any): any {
  const clientId = extractClientId(sm?.idempotencyKey, 'meal') || String(sm?.id || '');
  const type = String(sm?.type || 'lunch') as MealSlot;

  return {
    id: clientId,
    type,
    date: String(sm?.date || new Date().toISOString().slice(0, 10)),
    time: String(sm?.time || '00:00'),
    name: String(sm?.name || ''),
    calories: Number(sm?.calories || 0),
    protein: Number(sm?.protein || 0),
    carbs: Number(sm?.carbs || 0),
    fat: Number(sm?.fat || 0),
    items: Array.isArray(sm?.items) ? sm.items : [],
    loggedAt: String(sm?.loggedAt || new Date().toISOString()),
  };
}

function serverAnalysisToRecord(sm: any): any | null {
  const clientId = extractClientId(sm?.idempotencyKey, 'analysis') || String(sm?.id || '');
  if (!clientId) return null;

  const embedded = sm?.rawData?.__syncRecord;
  if (embedded && typeof embedded === 'object') {
    return {
      ...embedded,
      id: clientId,
      nationalId: sm?.nationalId || embedded.nationalId,
      analyzeTime: sm?.analyzedAt || embedded.analyzeTime || new Date().toISOString(),
    };
  }

  // fallback حداقلی اگر __syncRecord نبود
  return {
    id: clientId,
    nationalId: String(sm?.nationalId || ''),
    analyzeTime: String(sm?.analyzedAt || new Date().toISOString()),
    weight: Number(sm?.weight || 0),
    height: Number(sm?.height || 0),
    bmi: Number(sm?.bmi || 0),
    bodyFatPercentage: Number(sm?.bodyFatPercentage || 0),
    skeletalMuscleMass: Number(sm?.skeletalMuscleMass || 0),
    visceralFatLevel: Number(sm?.visceralFatLevel || 0),
    basalMetabolicRate: Number(sm?.basalMetabolicRate || 0),
    bodyWater: Number(sm?.bodyWater || 0),
    proteinMass: Number(sm?.proteinMass || 0),
    mineralMass: Number(sm?.mineralMass || 0),
    rawData: sm?.rawData || {},
  };
}

export default function SyncCoordinator() {
  const { session } = useAuth();
  const { state, restoreState } = useWellness();
  const body = useBodyAnalysis();

  const nationalIdRef = useRef<string | null>(session?.nationalId ?? null);
  const mealsRef = useRef(state.meals);
  const recordsRef = useRef(body.records);
  const restoreRef = useRef(restoreState);
  const importRef = useRef(body.importRecords);

  const busyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transportRef = useRef(createApiTransport());
  const syncOnceRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    nationalIdRef.current = session?.nationalId ?? null;
  }, [session?.nationalId]);

  useEffect(() => {
    mealsRef.current = state.meals;
  }, [state.meals]);

  useEffect(() => {
    recordsRef.current = body.records;
  }, [body.records]);

  useEffect(() => {
    restoreRef.current = restoreState;
  }, [restoreState]);

  useEffect(() => {
    importRef.current = body.importRecords;
  }, [body.importRecords]);

  const pullMeals = useCallback(async () => {
    if (!nationalIdRef.current) return;

    // اگر حذف pending وجود دارد، pull نکن تا رکورد حذف‌شده دوباره زنده نشود
    const pending = await writeQueue.pending();
    if (pending.some((e) => e.entity === 'mealDelete')) return;

    const res = await api.listMyMeals({ limit: 500 });
    const local = mealsRef.current || [];
    const localIds = new Set(local.map((m: any) => String(m.id)));

    const added = (res.items || [])
      .map(serverMealToMeal)
      .filter((m: any) => m?.id && !localIds.has(String(m.id)));

    if (added.length > 0) {
      restoreRef.current({ meals: [...local, ...added] });
    }
  }, []);

  const pullAnalyses = useCallback(async () => {
    if (!nationalIdRef.current) return;

    const res = await api.listMyAnalyses({ limit: 500 });
    const local = recordsRef.current || [];
    const localIds = new Set(local.map((r: any) => String(r.id)));

    const added = (res.items || [])
      .map(serverAnalysisToRecord)
      .filter((r: any) => r?.id && !localIds.has(String(r.id)));

    if (added.length > 0) {
      await importRef.current(added as any);
    }
  }, []);

  const pullAll = useCallback(async () => {
    try {
      await pullMeals();
    } catch (e) {
      console.warn('[SyncCoordinator] pullMeals failed', e);
    }

    try {
      await pullAnalyses();
    } catch (e) {
      console.warn('[SyncCoordinator] pullAnalyses failed', e);
    }
  }, [pullMeals, pullAnalyses]);

  const syncOnce = useCallback(async () => {
    if (busyRef.current) return;
    if (!nationalIdRef.current) return;

    busyRef.current = true;
    try {
      const result = await writeQueue.syncNow(transportRef.current);

      // بعد از هر flush موفق یا حتی وقتی چیزی برای ارسال نبود، pull هم انجام بده
      await pullAll();

      if (result.sent > 0 || result.failed > 0) {
        console.log('[SyncCoordinator]', result);
      }
    } catch (e) {
      console.warn('[SyncCoordinator] syncOnce failed', e);
    } finally {
      busyRef.current = false;
    }
  }, [pullAll]);

  useEffect(() => {
    syncOnceRef.current = syncOnce;
  }, [syncOnce]);

  const scheduleSync = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void syncOnceRef.current();
    }, SYNC_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (!session?.nationalId) return;

    transportRef.current = createApiTransport();

    // اجرای اولیه
    void syncOnceRef.current();

    // دوره‌ای
    const interval = setInterval(() => {
      void syncOnceRef.current();
    }, PULL_INTERVAL_MS);

    // وقتی اپ از background می‌آید foreground
    const appSub = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        scheduleSync();
      }
    });

    // وقتی صف تغییر کرد
    const syncSub = subscribeSyncChanged(() => {
      scheduleSync();
    });

    // وب: online/offline
    let onlineHandler: (() => void) | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      onlineHandler = () => scheduleSync();
      window.addEventListener('online', onlineHandler);
    }

    return () => {
      clearInterval(interval);
      appSub.remove();
      syncSub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (onlineHandler && typeof window !== 'undefined') {
        window.removeEventListener('online', onlineHandler);
      }
    };
  }, [scheduleSync, session?.nationalId]);

  return null;
}