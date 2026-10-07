import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAudit } from './AuditContext';
import { notifyPersonnelChanged } from '../utils/personnelBus';
import { api } from '../lib/api'; 
import { useAuth } from './AuthContext'; // 🆕 Import Auth to wait for login

export interface PersonnelRecord {
  nationalId: string;
  firstName: string;
  lastName: string;
  fullNamePrefixed: string;
  fullName: string;
  birthDate: string;
  gender: 'male' | 'female';
  mobile: string;
  orgId?: string;
}

interface Meta { importedAt: string; count: number; }

interface Ctx {
  records: PersonnelRecord[];
  meta: Meta | null;
  ready: boolean;
  loading: boolean;
  error: string | null;
  
  // For backward compatibility with clients.tsx
  personnel: PersonnelRecord[];
  list: PersonnelRecord[];
  items: PersonnelRecord[];
  
  importRecords: (recs: PersonnelRecord[]) => Promise<void>;
  getByNationalId: (id: string) => PersonnelRecord | undefined;
  clearAll: () => Promise<void>;
  reload: () => Promise<void>;
}

const PersonnelContext = createContext<Ctx | null>(null);

// Helper to normalize gender from API (Man/Woman) to internal (male/female)
function normalizeGender(g: string): 'male' | 'female' {
  const lower = String(g || '').toLowerCase();
  if (lower === 'man' || lower === 'male') return 'male';
  if (lower === 'woman' || lower === 'female') return 'female';
  return 'male'; // Default fallback
}

// Map API response item to our internal record structure
function mapApiToRecord(item: any): PersonnelRecord {
  return {
    nationalId: item.nationalId,
    firstName: '', 
    lastName: '',
    fullNamePrefixed: item.fullNamePrefixed || item.fullName,
    fullName: item.fullName,
    birthDate: item.birthDate,
    gender: normalizeGender(item.gender),
    mobile: item.mobile,
    orgId: item.organizationId,
  };
}

const DEFAULT_CTX: Ctx = {
  records: [],
  meta: null,
  ready: false,
  loading: false,
  error: null,
  personnel: [],
  list: [],
  items: [],
  importRecords: async () => {},
  getByNationalId: () => undefined,
  clearAll: async () => {},
  reload: async () => {},
};

export function PersonnelProvider({ children }: { children: ReactNode }) {
  console.log("🚀 [PersonnelProvider] Component Rendered"); // 👈 DEBUG LOG 1
  
  const { log } = useAudit();
  const { session, isAuthLoaded } = useAuth(); // 🆕 Get Session State
  
  const [records, setRecords] = useState<PersonnelRecord[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all personnel with pagination
  const fetchAllPersonnel = useCallback(async () => {
    console.log("🔄 [Personnel] Starting fetchAllPersonnel..."); // 👈 DEBUG LOG 2
    
    setLoading(true);
    setError(null);
    
    try {
      let allItems: any[] = [];
      let offset = 0;
      const limit = 200; // Max allowed by backend
      let total = Infinity;
      
      while (offset < total) {
        console.log(`📡 [Personnel] Fetching batch: offset=${offset}, limit=${limit}`); // 👈 DEBUG LOG 3
        
        const res: any = await api.listPersonnel({ limit, offset });
        
        if (!res || !Array.isArray(res.items)) {
          throw new Error('Invalid API response');
        }
        
        total = res.total ?? 0;
        allItems = [...allItems, ...res.items];
        offset += limit;
        
        console.log(`✅ [Personnel] Batch received. Total so far: ${allItems.length}/${total}`); // 👈 DEBUG LOG 4
        
        // Safety break to prevent infinite loops
        if (res.items.length === 0) break;
      }
      
      const mappedRecords = allItems.map(mapApiToRecord);
      
      setRecords(mappedRecords);
      setMeta({
        importedAt: new Date().toISOString(),
        count: mappedRecords.length,
      });
      
      log({ 
        action: 'personnel:sync_from_api', 
        entity: 'personnel', 
        messageFa: `همگام‌سازی پرسنل از API — ${mappedRecords.length} رکورد`, 
        severity: 'info' 
      });
      
      notifyPersonnelChanged();
      console.log("✨ [Personnel] Fetch completed successfully."); // 👈 DEBUG LOG 5
      
    } catch (e: any) {
      console.error("❌ [Personnel] Failed to fetch from API", e); // 👈 DEBUG LOG ERROR
      setError(e.message || 'Failed to load personnel');
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [log]);

  // CRITICAL FIX: Only fetch when User is Logged In AND Auth is Loaded
  useEffect(() => {
    console.log("⏳ [Personnel] Checking Auth Status...", { isAuthLoaded, hasSession: !!session }); // 👈 DEBUG LOG STATUS

    // If auth hasn't finished checking tokens yet, do nothing
    if (!isAuthLoaded) return;

    // If user is NOT logged in, reset state and stop fetching
    if (!session) {
      console.warn("🛑 [Personnel] No active session. Clearing data."); // 👈 DEBUG LOG NO SESSION
      setRecords([]);
      setMeta(null);
      setReady(false);
      return;
    }

    // Now we have a valid session, so tokens should be available in memory/storage
    console.log("🟢 [Personnel] Session detected. Triggering fetch..."); // 👈 DEBUG LOG TRIGGER
    fetchAllPersonnel();
  }, [session, isAuthLoaded, fetchAllPersonnel]);

  const importRecords = useCallback(async (recs: PersonnelRecord[]) => {
    setRecords((prev) => {
      const map = new Map<string, PersonnelRecord>();
      prev.forEach((r) => map.set(r.nationalId, r));
      recs.forEach((r) => {
        if (r.nationalId && r.nationalId !== '-') {
          map.set(r.nationalId, r);
        }
      });
      const next = Array.from(map.values());
      setMeta({ importedAt: new Date().toISOString(), count: next.length });
      return next;
    });
    log({ action: 'personnel:manual_import', entity: 'personnel', messageFa: `واردسازی دستی — ${recs.length} رکورد`, severity: 'warn' });
    notifyPersonnelChanged();
  }, [log]);

  const clearAll = useCallback(async () => {
    setRecords([]);
    setMeta(null);
    setReady(false);
    // Do not auto-refetch immediately unless session exists
    if (session) {
       await fetchAllPersonnel();
    }
  }, [fetchAllPersonnel, session]);

  const getByNationalId = useCallback((id: string) => records.find((r) => r.nationalId === id), [records]);

  const value: Ctx = {
    records,
    meta,
    ready,
    loading,
    error,
    personnel: records,
    list: records,
    items: records,
    importRecords,
    getByNationalId,
    clearAll,
    reload: fetchAllPersonnel,
  };

  return (
    <PersonnelContext.Provider value={value}>
      {children}
    </PersonnelContext.Provider>
  );
}

export function usePersonnel(): Ctx {
  return useContext(PersonnelContext) ?? DEFAULT_CTX;
}