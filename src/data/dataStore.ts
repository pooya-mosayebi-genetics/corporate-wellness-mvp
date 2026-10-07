/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · لایهٔ DataStore (L-02)
 *  یک اینترفیس واحد + پیاده‌سازی محلی (AsyncStorage).
 *  هدف: جدا کردن UI/Contextها از «محل ذخیره» تا روز هاست فقط
 *  پیاده‌سازی عوض شود (Local → Remote)، نه کل اپ.
 * ─────────────────────────────────────────────────────────────
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Person, FoodItem, FoodLog, SyncQueueEntry, UserGoal, SyncStatus } from './schema';
import type { BodyAnalysisRecord } from './bodyAnalysisTypes';

const NS = 'zdl:v1';
const K = {
  persons: `${NS}:persons`,
  analyses: `${NS}:analyses`,
  foodItems: `${NS}:foodItems`,
  foodLogs: `${NS}:foodLogs`,
  queue: `${NS}:queue`,
  goals: `${NS}:goals`,
};

export interface DataStore {
  // پرسنل
  listPersons(): Promise<Person[]>;
  upsertPerson(p: Person): Promise<void>;
  getPerson(nationalId: string): Promise<Person | undefined>;
  // آنالیز بدن
  listAnalyses(): Promise<BodyAnalysisRecord[]>;
  upsertAnalysis(r: BodyAnalysisRecord): Promise<void>;
  analysesOf(nationalId: string): Promise<BodyAnalysisRecord[]>;
  // غذا
  listFoodItems(): Promise<FoodItem[]>;
  upsertFoodItem(f: FoodItem): Promise<void>;
  listFoodLogs(): Promise<FoodLog[]>;
  addFoodLog(l: FoodLog): Promise<void>;
  updateFoodLog(id: string, patch: Partial<FoodLog>): Promise<void>;
  removeFoodLog(id: string): Promise<void>;
  foodLogsOf(nationalId: string): Promise<FoodLog[]>;
  // صف نوشتن (L-03 روی این می‌نشیند)
  enqueue(e: SyncQueueEntry): Promise<void>;
  pendingQueue(): Promise<SyncQueueEntry[]>;
  setQueueStatus(id: string, status: SyncStatus, lastError?: string): Promise<void>;
  // هدف کاربر
  getGoal(nationalId: string): Promise<UserGoal | undefined>;
  setGoal(g: UserGoal): Promise<void>;
  //_bulk برای بک‌آپ/مهاجرت_
  dumpAll(): Promise<Record<string, string>>;
  restoreAll(entries: Record<string, string>): Promise<void>;
}

/* ── هلپرهای داخلی ── */
async function readArr<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : ((parsed as any)?.items ?? []);
  } catch {
    return [];
  }
}
async function writeArr<T>(key: string, arr: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(arr));
}
function upsertById<T extends { id?: string; nationalId?: string }>(arr: T[], item: T, keyOf: (x: T) => string): T[] {
  const k = keyOf(item);
  const idx = arr.findIndex((x) => keyOf(x) === k);
  if (idx >= 0) arr[idx] = { ...arr[idx], ...item };
  else arr.push(item);
  return arr;
}

/* ── پیاده‌سازی محلی ── */
class LocalDataStore implements DataStore {
  async listPersons() { return readArr<Person>(K.persons); }
  async upsertPerson(p: Person) { const a = upsertById(await this.listPersons(), p, (x) => x.nationalId); await writeArr(K.persons, a); }
  async getPerson(id: string) { return (await this.listPersons()).find((p) => p.nationalId === id); }

  async listAnalyses() { return readArr<BodyAnalysisRecord>(K.analyses); }
  async upsertAnalysis(r: BodyAnalysisRecord) {
    const a = upsertById(await this.listAnalyses(), r, (x) => x.id || `${x.nationalId}|${x.analyzeTime}`);
    await writeArr(K.analyses, a);
  }
  async analysesOf(id: string) {
    return (await this.listAnalyses())
      .filter((r) => r.nationalId === id)
      .sort((a, b) => +new Date(b.analyzeTime) - +new Date(a.analyzeTime));
  }

  async listFoodItems() { return readArr<FoodItem>(K.foodItems); }
  async upsertFoodItem(f: FoodItem) { const a = upsertById(await this.listFoodItems(), f, (x) => x.id); await writeArr(K.foodItems, a); }

  async listFoodLogs() { return readArr<FoodLog>(K.foodLogs); }
  async addFoodLog(l: FoodLog) { const a = await this.listFoodLogs(); a.push(l); await writeArr(K.foodLogs, a); }
  async updateFoodLog(id: string, patch: Partial<FoodLog>) {
    const a = (await this.listFoodLogs()).map((x) => (x.id === id ? { ...x, ...patch } : x));
    await writeArr(K.foodLogs, a);
  }
  async removeFoodLog(id: string) { await writeArr(K.foodLogs, (await this.listFoodLogs()).filter((x) => x.id !== id)); }
  async foodLogsOf(id: string) {
    return (await this.listFoodLogs())
      .filter((l) => l.nationalId === id)
      .sort((a, b) => +new Date(b.dateISO) - +new Date(a.dateISO));
  }

  async enqueue(e: SyncQueueEntry) { const q = await readArr<SyncQueueEntry>(K.queue); q.push(e); await writeArr(K.queue, q); }
  async pendingQueue() { return (await readArr<SyncQueueEntry>(K.queue)).filter((e) => e.status === 'pending'); }
  async setQueueStatus(id: string, status: SyncStatus, lastError?: string) {
    const q = (await readArr<SyncQueueEntry>(K.queue)).map((e) =>
      e.id === id ? { ...e, status, attempts: e.attempts + (status === 'failed' ? 1 : 0), lastError } : e,
    );
    await writeArr(K.queue, q);
  }

  async getGoal(id: string) { return (await readArr<UserGoal>(K.goals)).find((g) => g.nationalId === id); }
  async setGoal(g: UserGoal) { const a = upsertById(await readArr<UserGoal>(K.goals), g, (x) => x.nationalId); await writeArr(K.goals, a); }

  async dumpAll(): Promise<Record<string, string>> {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(NS));
    const pairs = await AsyncStorage.multiGet(keys);
    const out: Record<string, string> = {};
    pairs.forEach(([k, v]) => { if (v != null) out[k] = v; });
    return out;
  }
  async restoreAll(entries: Record<string, string>) {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(NS));
    if (keys.length) await AsyncStorage.multiRemove(keys);
    await AsyncStorage.multiSet(Object.entries(entries));
  }
}

/** singleton سراسری */
export const dataStore: DataStore = new LocalDataStore();

/** هوک تزریق وابستگی (فعلاً همان singleton؛ بعداً می‌تواند Remote شود) */
export function useDataStore(): DataStore {
  return dataStore;
}