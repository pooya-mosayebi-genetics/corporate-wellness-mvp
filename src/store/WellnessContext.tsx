import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import type { UserProfileInput, DailyTargets } from '../types/wellness';
import type { Meal } from '../types/nutrition';
import type { BodyAnalysisRecord } from '../types/bodyAnalysis';
import type { ClientRecord, ClientAnalysisSnapshot } from '../types/clients';
import type { DietPlan, Ticket, TicketMessage, TicketStatus } from '../types/support';
import { computeTargets } from '../utils/bmr';
import { writeQueue } from '../data/writeQueue';
// 🆕 L-04: گارد لایهٔ داده
import { requirePermission, PermissionDeniedError } from '../utils/contextGuards';

// --- Types ---

export interface WaterEntry {
  id: string;
  ml: number;
  time: string;
  loggedAt: string;
}

interface CheckInState {
  stressLevel: number;
  sleepQuality: number;
  lastUpdated: string | null;
}

export interface PersonalState {
  profile: UserProfileInput | null;
  targets: DailyTargets | null;
  checkIn: CheckInState;
  waterMl: number;
  waterEntries: WaterEntry[];
  meals: Meal[];
  isOnboardingComplete: boolean;
}

export interface GlobalState {
  bodyAnalyses: BodyAnalysisRecord[];
  clients: ClientRecord[];
  clientAnalyses: ClientAnalysisSnapshot[];
  customFoods: unknown[];
  customPosts: unknown[];
  dietPlans: DietPlan[];
  tickets: Ticket[];
}

export type WellnessState = PersonalState & GlobalState;

// --- Keys ---
const LEGACY_KEY = 'wellness_app_state';
const GLOBAL_KEY = 'wellness_global_v1';
const MIGRATION_FLAG = 'wellness_migration_v1_done';
export const personalKey = (nid: string) => `wellness_personal_${nid}`;

const PERSONAL_UPDATED_EVENT = 'wellness:personal-updated';

const MAX_BODY_ANALYSES = 500;
const MAX_CLIENT_ANALYSES = 2000;
const MAX_CLIENTS = 3000;
const MAX_TICKETS = 500;
const MAX_DIET_PLANS = 500;
const MAX_CUSTOM_FOODS = 5000;

const defaultPersonal: PersonalState = {
  profile: null,
  targets: null,
  checkIn: { stressLevel: 5, sleepQuality: 5, lastUpdated: null },
  waterMl: 0,
  waterEntries: [],
  meals: [],
  isOnboardingComplete: false,
};

const defaultGlobal: GlobalState = {
  bodyAnalyses: [],
  clients: [],
  clientAnalyses: [],
  customFoods: [],
  customPosts: [],
  dietPlans: [],
  tickets: [],
};

// --- Helpers ---

function latestDeviceBmr(analyses: BodyAnalysisRecord[]): number | null {
  if (analyses.length === 0) return null;
  const sorted = [...analyses].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = sorted.length - 1; i >= 0; i--) {
    const bmr = sorted[i].basalMetabolismKcal;
    if (bmr && bmr > 0) return bmr;
  }
  return null;
}

function recomputeTargets(
  profile: UserProfileInput | null,
  analyses: BodyAnalysisRecord[],
): DailyTargets | null {
  if (!profile) return null;
  return computeTargets(profile, latestDeviceBmr(analyses));
}

function compactObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) {
    const arr = obj.map(compactObject).filter((v) => v !== undefined);
    return arr.length === 0 ? undefined : arr;
  }
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const cv = compactObject(v);
      if (cv === undefined) continue;
      if (cv === '' || (typeof cv === 'number' && !isFinite(cv))) continue;
      out[k] = cv;
    }
    return Object.keys(out).length === 0 ? undefined : out;
  }
  return obj;
}

function prepareForStorage(g: GlobalState): GlobalState {
  const sortedBA = [...g.bodyAnalyses].sort((a, b) => b.date.localeCompare(a.date));
  const sortedCA = [...g.clientAnalyses].sort((a, b) => b.date.localeCompare(a.date));
  const trimmed: GlobalState = {
    bodyAnalyses: sortedBA.slice(0, MAX_BODY_ANALYSES) as BodyAnalysisRecord[],
    clients: g.clients.slice(0, MAX_CLIENTS),
    clientAnalyses: sortedCA.slice(0, MAX_CLIENT_ANALYSES),
    customFoods: (g.customFoods || []).slice(0, MAX_CUSTOM_FOODS),
    customPosts: g.customPosts || [],
    dietPlans: g.dietPlans.slice(0, MAX_DIET_PLANS),
    tickets: g.tickets.slice(0, MAX_TICKETS),
  };
  const compacted = compactObject(trimmed) as GlobalState | undefined;
  return compacted || defaultGlobal;
}

async function saveGlobalWithRetry(g: GlobalState): Promise<void> {
  const prepared = prepareForStorage(g);
  const payload = JSON.stringify(prepared);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await AsyncStorage.setItem(GLOBAL_KEY, payload);
      return;
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('Quota') || msg.includes('quota') || attempt === 2) {
        if (attempt === 2) {
          console.error('global save failed after retries', e);
          return;
        }
        const smaller: GlobalState = {
          bodyAnalyses: prepared.bodyAnalyses.slice(0, Math.max(50, Math.floor(prepared.bodyAnalyses.length / 2))),
          clients: prepared.clients.slice(0, Math.max(500, Math.floor(prepared.clients.length / 2))),
          clientAnalyses: prepared.clientAnalyses.slice(0, Math.max(200, Math.floor(prepared.clientAnalyses.length / 2))),
          customFoods: prepared.customFoods.slice(0, Math.max(500, Math.floor(prepared.customFoods.length / 2))),
          customPosts: [],
          dietPlans: prepared.dietPlans.slice(0, Math.max(20, Math.floor(prepared.dietPlans.length / 2))),
          tickets: prepared.tickets.slice(0, Math.max(20, Math.floor(prepared.tickets.length / 2))),
        };
        try {
          await AsyncStorage.setItem(GLOBAL_KEY, JSON.stringify(smaller));
          console.warn('global saved after aggressive trim');
          return;
        } catch (e2) {
          console.error('global save failed even after trim', e2);
          return;
        }
      }
    }
  }
}

async function readPersonalFromStorage(nid: string): Promise<PersonalState> {
  try {
    const raw = await AsyncStorage.getItem(personalKey(nid));
    if (!raw) return defaultPersonal;
    const p = JSON.parse(raw);
    return {
      ...defaultPersonal,
      ...p,
      checkIn: { ...defaultPersonal.checkIn, ...(p?.checkIn || {}) },
      waterEntries: Array.isArray(p?.waterEntries) ? p.waterEntries : [],
      meals: Array.isArray(p?.meals) ? p.meals : [],
    };
  } catch {
    return defaultPersonal;
  }
}

async function savePersonal(nid: string, p: PersonalState): Promise<void> {
  try {
    const compacted = compactObject(p) as PersonalState;
    await AsyncStorage.setItem(personalKey(nid), JSON.stringify(compacted || defaultPersonal));
  } catch (e) {
    console.error('personal save failed', e);
  }
}

function emitPersonalUpdated(nationalId: string) {
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(PERSONAL_UPDATED_EVENT, { detail: { nationalId } }));
    } catch {
      // ignore
    }
  }
}

export function usePersonalOf(nationalId: string | null) {
  const [personal, setPersonal] = useState<PersonalState>(defaultPersonal);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!nationalId) {
      setPersonal(defaultPersonal);
      setLoaded(true);
      return;
    }
    const p = await readPersonalFromStorage(nationalId);
    setPersonal(p);
    setLoaded(true);
  }, [nationalId]);

  useEffect(() => {
    setLoaded(false);
    refresh();
    const t = setInterval(refresh, 5000);

    if (typeof window !== 'undefined') {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent)?.detail;
        if (detail?.nationalId === nationalId) {
          refresh();
        }
      };
      window.addEventListener(PERSONAL_UPDATED_EVENT, handler);
      return () => {
        clearInterval(t);
        window.removeEventListener(PERSONAL_UPDATED_EVENT, handler);
      };
    }

    return () => clearInterval(t);
  }, [refresh, nationalId]);

  return { personal, loaded, refresh };
}

// --- Context ---

interface WellnessContextValue {
  state: WellnessState;
  isLoaded: boolean;
  setProfile: (profile: UserProfileInput) => void;
  updateStress: (level: number) => void;
  updateSleep: (quality: number) => void;
  resetCheckIn: () => void;
  addWater: (entry: WaterEntry) => void;
  removeWater: (entryId: string) => void;
  addMeal: (meal: Meal) => void;
  updateMeal: (meal: Meal) => void;
  removeMeal: (mealId: string) => void;
  addMealFor: (nationalId: string | null, meal: Meal) => Promise<void>;
  addBodyAnalysis: (record: BodyAnalysisRecord) => void;
  removeBodyAnalysis: (id: string) => void;
  importClients: (clients: ClientRecord[]) => void;
  addClientAnalyses: (snaps: ClientAnalysisSnapshot[]) => void;
  addDietPlan: (plan: DietPlan) => void;
  deleteDietPlan: (id: string) => void;
  addTicket: (ticket: Ticket) => void;
  addTicketMessage: (ticketId: string, message: TicketMessage) => void;
  setTicketStatus: (ticketId: string, status: TicketStatus) => void;
  resetApp: () => void;
  restoreState: (payload: Record<string, unknown>) => void;
}

const WellnessContext = createContext<WellnessContextValue | null>(null);

export function WellnessProvider({ children }: { children: ReactNode }) {
  const { session, accounts } = useAuth(); // 🆕 accounts اضافه شد
  const nationalId = session?.nationalId ?? null;

  const [personal, setPersonal] = useState<PersonalState>(defaultPersonal);
  const [global, setGlobal] = useState<GlobalState>(defaultGlobal);
  const [personalReady, setPersonalReady] = useState(false);
  const [globalReady, setGlobalReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const flag = await AsyncStorage.getItem(MIGRATION_FLAG);
        if (!flag) {
          const legacyRaw = await AsyncStorage.getItem(LEGACY_KEY);
          if (legacyRaw) {
            const legacy = JSON.parse(legacyRaw) as Partial<WellnessState>;
            const ba = Array.isArray(legacy.bodyAnalyses)
              ? [...legacy.bodyAnalyses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_BODY_ANALYSES)
              : [];
            setGlobal((g) => ({
              bodyAnalyses: ba as BodyAnalysisRecord[],
              clients: Array.isArray(legacy.clients) && legacy.clients.length ? (legacy.clients.slice(0, MAX_CLIENTS)) : g.clients,
              clientAnalyses: Array.isArray(legacy.clientAnalyses) ? (legacy.clientAnalyses.slice(0, MAX_CLIENT_ANALYSES)) : g.clientAnalyses,
              customFoods: Array.isArray(legacy.customFoods) ? (legacy.customFoods.slice(0, MAX_CUSTOM_FOODS)) : g.customFoods,
              customPosts: Array.isArray(legacy.customPosts) ? legacy.customPosts : g.customPosts,
              dietPlans: Array.isArray(legacy.dietPlans) ? (legacy.dietPlans.slice(0, MAX_DIET_PLANS)) : g.dietPlans,
              tickets: Array.isArray(legacy.tickets) ? (legacy.tickets.slice(0, MAX_TICKETS)) : g.tickets,
            }));
          }
          await AsyncStorage.setItem(MIGRATION_FLAG, '1');
        }
        const raw = await AsyncStorage.getItem(GLOBAL_KEY);
        if (raw) {
          const p = JSON.parse(raw);
          setGlobal((g) => ({ ...g, ...p }));
        }
      } catch (e) {
        console.error('global load failed', e);
      }
      setGlobalReady(true);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPersonalReady(false);
    (async () => {
      if (!nationalId) {
        if (!cancelled) {
          setPersonal(defaultPersonal);
          setPersonalReady(true);
        }
        return;
      }
      const p = await readPersonalFromStorage(nationalId);
      if (!cancelled) {
        setPersonal(p);
        setPersonalReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nationalId]);

  useEffect(() => {
    if (!globalReady) return;
    saveGlobalWithRetry(global);
  }, [global, globalReady]);

  useEffect(() => {
    if (!personalReady || !nationalId) return;
    savePersonal(nationalId, personal);
  }, [personal, personalReady, nationalId]);

  const state = useMemo<WellnessState>(() => ({ ...global, ...personal }), [global, personal]);
  const isLoaded = personalReady && globalReady;

  const setProfile = useCallback((profile: UserProfileInput) => {
    setPersonal((p) => ({
      ...p,
      profile,
      isOnboardingComplete: true,
      targets: recomputeTargets(profile, global.bodyAnalyses),
    }));
  }, [global.bodyAnalyses]);

  const updateStress = useCallback((level: number) => {
    const clamped = Math.min(Math.max(level, 1), 10);
    setPersonal((p) => ({ ...p, checkIn: { ...p.checkIn, stressLevel: clamped, lastUpdated: new Date().toISOString() } }));
  }, []);

  const updateSleep = useCallback((quality: number) => {
    const clamped = Math.min(Math.max(quality, 1), 10);
    setPersonal((p) => ({ ...p, checkIn: { ...p.checkIn, sleepQuality: clamped, lastUpdated: new Date().toISOString() } }));
  }, []);

  const resetCheckIn = useCallback(() => {
    setPersonal((p) => ({ ...p, checkIn: defaultPersonal.checkIn }));
  }, []);

  const addWater = useCallback((entry: WaterEntry) => {
    setPersonal((p) => ({ ...p, waterMl: p.waterMl + entry.ml, waterEntries: [...p.waterEntries, entry] }));
  }, []);

  const removeWater = useCallback((entryId: string) => {
    setPersonal((p) => {
      const entry = p.waterEntries.find((e) => e.id === entryId);
      if (!entry) return p;
      return {
        ...p,
        waterMl: Math.max(p.waterMl - entry.ml, 0),
        waterEntries: p.waterEntries.filter((e) => e.id !== entryId),
      };
    });
  }, []);

  const addMeal = useCallback((meal: Meal) => {
    setPersonal((p) => ({ ...p, meals: [...p.meals, meal] }));
    writeQueue.submitMeal(meal).catch((e) => console.warn('submitMeal failed', e));
  }, []);

  const updateMeal = useCallback((meal: Meal) => {
    setPersonal((p) => ({ ...p, meals: p.meals.map((m) => (m.id === meal.id ? meal : m)) }));
    writeQueue.submitMeal(meal).catch((e) => console.warn('submitMeal failed', e));
  }, []);

  const removeMeal = useCallback((mealId: string) => {
  setPersonal((p) => ({ ...p, meals: p.meals.filter((m) => m.id !== mealId) }));
  writeQueue.deleteMeal(mealId).catch((e) => console.warn('deleteMeal enqueue failed', e));
  }, []);

  /** 🆕 L-04: گارد لایهٔ داده — چک permission قبل از ثبت وعده */
  const addMealFor = useCallback(
    async (targetNid: string | null, meal: Meal) => {
      if (!targetNid) return;

      const account = accounts.find((a) => a.nationalId === nationalId) ?? null;
      const isSelf = targetNid === nationalId;
      const requiredPerm = isSelf ? 'meal.self.log' : 'meal.others.log';
      const messageFa = isSelf
        ? 'دسترسی ثبت وعدهٔ خود را ندارید'
        : 'دسترسی ثبت/ویرایش وعدهٔ دیگران را ندارید';
      const messageEn = isSelf
        ? 'You do not have permission to log your own meals'
        : 'You do not have permission to log meals for others';

      try {
        requirePermission(session, account, requiredPerm as any, messageFa, messageEn);
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          console.warn('addMealFor denied:', err.messageFa);
          return;
        }
        throw err;
      }

      if (isSelf) {
        addMeal(meal);
        return;
      }

      try {
        const current = await readPersonalFromStorage(targetNid);
        const updated: PersonalState = {
          ...current,
          meals: [...(current.meals || []), meal],
        };
        await savePersonal(targetNid, updated);
        writeQueue.submitMeal(meal).catch((e) => console.warn('submitMeal failed', e));
        emitPersonalUpdated(targetNid);
      } catch (e) {
        console.error('addMealFor failed', e);
      }
    },
    [nationalId, session, accounts, addMeal],
  );

  /** 🆕 L-04: گارد لایهٔ داده — چک permission قبل از آپلود آنالیز */
  const addBodyAnalysis = useCallback((record: BodyAnalysisRecord) => {
    const account = accounts.find((a) => a.nationalId === nationalId) ?? null;
    try {
      requirePermission(
        session,
        account,
        'analysis.upload',
        'دسترسی آپلود آنالیز بدن را ندارید',
        'You do not have permission to upload body analysis',
      );
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        console.warn('addBodyAnalysis denied:', err.messageFa);
        return;
      }
      throw err;
    }

    setGlobal((g) => ({ ...g, bodyAnalyses: [...g.bodyAnalyses, record] }));
    setPersonal((p) => ({
      ...p,
      targets: recomputeTargets(p.profile, [...global.bodyAnalyses, record]),
    }));
    writeQueue.submitAnalysis(record).catch((e) => console.warn('submitAnalysis failed', e));
  }, [session, accounts, nationalId, global.bodyAnalyses]);

  const removeBodyAnalysis = useCallback((id: string) => {
    setGlobal((g) => ({ ...g, bodyAnalyses: g.bodyAnalyses.filter((a) => a.id !== id) }));
  }, []);

  /** 🆕 L-04: گارد لایهٔ داده — چک permission قبل از ایمپورت پرسنل */
  const importClients = useCallback((clients: ClientRecord[]) => {
    const account = accounts.find((a) => a.nationalId === nationalId) ?? null;
    try {
      requirePermission(
        session,
        account,
        'personnel.import',
        'دسترسی ایمپورت پرسنل را ندارید',
        'You do not have permission to import personnel',
      );
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        console.warn('importClients denied:', err.messageFa);
        return;
      }
      throw err;
    }

    setGlobal((g) => {
      const map = new Map(g.clients.map((c) => [c.nationalId, c]));
      for (const client of clients) map.set(client.nationalId, client);
      return { ...g, clients: Array.from(map.values()) };
    });
  }, [session, accounts, nationalId]);

  const addClientAnalyses = useCallback((snaps: ClientAnalysisSnapshot[]) => {
    setGlobal((g) => {
      const map = new Map(g.clientAnalyses.map((s) => [`${s.nationalId}|${s.date}`, s]));
      for (const snap of snaps) map.set(`${snap.nationalId}|${snap.date}`, snap);
      return { ...g, clientAnalyses: Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)) };
    });
  }, []);

  /** 🆕 L-04: گارد لایهٔ داده — چک permission قبل از طراحی رژیم */
  const addDietPlan = useCallback((plan: DietPlan) => {
    const account = accounts.find((a) => a.nationalId === nationalId) ?? null;
    try {
      requirePermission(
        session,
        account,
        'diet.design',
        'دسترسی طراحی رژیم برای دیگران را ندارید',
        'You do not have permission to design diets for others',
      );
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        console.warn('addDietPlan denied:', err.messageFa);
        return;
      }
      throw err;
    }

    setGlobal((g) => ({ ...g, dietPlans: [plan, ...g.dietPlans] }));
  }, [session, accounts, nationalId]);

  const deleteDietPlan = useCallback((id: string) => {
    setGlobal((g) => ({ ...g, dietPlans: g.dietPlans.filter((p) => p.id !== id) }));
  }, []);

  const addTicket = useCallback((ticket: Ticket) => {
    setGlobal((g) => ({ ...g, tickets: [ticket, ...g.tickets] }));
  }, []);

  const addTicketMessage = useCallback((ticketId: string, message: TicketMessage) => {
    setGlobal((g) => ({
      ...g,
      tickets: g.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              messages: [...t.messages, message],
              status: message.authorRole === 'coach' ? 'answered' : 'open',
              updatedAt: message.at,
            }
          : t,
      ),
    }));
  }, []);

  const setTicketStatus = useCallback((ticketId: string, status: TicketStatus) => {
    setGlobal((g) => ({
      ...g,
      tickets: g.tickets.map((t) => (t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t)),
    }));
  }, []);

  const resetApp = useCallback(() => {
    setPersonal(defaultPersonal);
    if (nationalId) AsyncStorage.removeItem(personalKey(nationalId)).catch(() => {});
  }, [nationalId]);

  const restoreState = useCallback((payload: Record<string, unknown>) => {
    const p = payload as Partial<WellnessState>;
    setPersonal((prev) => ({
      profile: p.profile ?? prev.profile,
      targets: p.targets ?? prev.targets,
      checkIn: p.checkIn ?? prev.checkIn,
      waterMl: p.waterMl ?? prev.waterMl,
      waterEntries: Array.isArray(p.waterEntries) ? p.waterEntries : prev.waterEntries,
      meals: Array.isArray(p.meals) ? p.meals : prev.meals,
      isOnboardingComplete: p.isOnboardingComplete ?? prev.isOnboardingComplete,
    }));
    setGlobal((prev) => ({
      bodyAnalyses: Array.isArray(p.bodyAnalyses) ? p.bodyAnalyses : prev.bodyAnalyses,
      clients: Array.isArray(p.clients) ? p.clients : prev.clients,
      clientAnalyses: Array.isArray(p.clientAnalyses) ? p.clientAnalyses : prev.clientAnalyses,
      customFoods: Array.isArray(p.customFoods) ? p.customFoods : prev.customFoods,
      customPosts: Array.isArray(p.customPosts) ? p.customPosts : prev.customPosts,
      dietPlans: Array.isArray(p.dietPlans) ? p.dietPlans : prev.dietPlans,
      tickets: Array.isArray(p.tickets) ? p.tickets : prev.tickets,
    }));
  }, []);

  return (
    <WellnessContext.Provider
      value={{
        state,
        isLoaded,
        setProfile,
        updateStress,
        updateSleep,
        resetCheckIn,
        addWater,
        removeWater,
        addMeal,
        updateMeal,
        removeMeal,
        addMealFor,
        addBodyAnalysis,
        removeBodyAnalysis,
        importClients,
        addClientAnalyses,
        addDietPlan,
        deleteDietPlan,
        addTicket,
        addTicketMessage,
        setTicketStatus,
        resetApp,
        restoreState,
      }}
    >
      {children}
    </WellnessContext.Provider>
  );
}

export function useWellness() {
  const context = useContext(WellnessContext);
  if (!context) throw new Error('useWellness must be used within WellnessProvider');
  return context;
}