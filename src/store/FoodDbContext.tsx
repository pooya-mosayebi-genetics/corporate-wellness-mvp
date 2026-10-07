import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FoodEntry } from '../data/foodTypes';
import { useAudit, FIELD_FA } from './AuditContext';

const KEY = 'themin_food_overrides_v1';

interface Ctx {
  overrides: Record<string, Partial<FoodEntry>>;
  updateFood: (id: string, patch: Partial<FoodEntry>) => void;
  resetFood: (id: string) => void;
}
const FoodDbContext = createContext<Ctx | null>(null);

export function FoodDbProvider({ children }: { children: ReactNode }) {
  const { log } = useAudit();
  const [overrides, setOverrides] = useState<Record<string, Partial<FoodEntry>>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try { const raw = await AsyncStorage.getItem(KEY); if (raw) setOverrides(JSON.parse(raw)); } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(KEY, JSON.stringify(overrides)).catch(() => {});
  }, [overrides, loaded]);

  /** ✅ ثبت تغییرات به‌صورت «فیلد: قبلی ← جدید» با تشریح فارسی */
  const updateFood = useCallback((id: string, patch: Partial<FoodEntry>) => {
    const prev = overrides[id] ?? {};
    const changes = Object.entries(patch).map(([f, v]) => ({
      field: FIELD_FA[f] ?? f,
      old: (prev as any)[f] !== undefined ? String((prev as any)[f]) : 'پیش‌فرض',
      new: String(v),
    }));
    setOverrides((p) => ({ ...p, [id]: { ...(p[id] || {}), ...patch } }));
    log({ action: 'food:update', entity: 'food', entityId: id, changes });
  }, [overrides, log]);

  const resetFood = useCallback((id: string) => {
    setOverrides((p) => { const n = { ...p }; delete n[id]; return n; });
    log({ action: 'food:reset', entity: 'food', entityId: id });
  }, [log]);

  return <FoodDbContext.Provider value={{ overrides, updateFood, resetFood }}>{children}</FoodDbContext.Provider>;
}

export function useFoodDb() {
  const c = useContext(FoodDbContext);
  if (!c) throw new Error('useFoodDb must be used within FoodDbProvider');
  return c;
}