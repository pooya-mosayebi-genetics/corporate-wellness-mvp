import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Assignment {
  id: string;
  orgId: string;
  clientId: string;      // nationalId مراجع
  providerId: string;    // nationalId ارائه‌دهنده (کوچ/متخصص/پزشک…)
  providerRole: string;  // نقش ارائه‌دهنده در این رابطه
  createdAt: string;
  createdBy: string;
}

interface Ctx {
  assignments: Assignment[];
  ready: boolean;
  assign: (a: Omit<Assignment, 'id' | 'createdAt'>) => void;
  unassign: (id: string) => void;
  forProvider: (providerId: string) => Assignment[];
  forClient: (clientId: string) => Assignment[];
  clientIdsFor: (providerId: string) => string[];
}

const KEY = 'zdl:v1:assignments';
const AssignmentsContext = createContext<Ctx | null>(null);

export function AssignmentsProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setAssignments(JSON.parse(raw) || []);
      } catch {}
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify(assignments)).catch(() => {});
  }, [assignments, ready]);

  const assign = useCallback((a: Omit<Assignment, 'id' | 'createdAt'>) => {
    setAssignments((prev) => {
      if (prev.some((x) => x.clientId === a.clientId && x.providerId === a.providerId && x.providerRole === a.providerRole)) return prev;
      return [{ ...a, id: 'as-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), createdAt: new Date().toISOString() }, ...prev];
    });
  }, []);

  const unassign = useCallback((id: string) => setAssignments((p) => p.filter((x) => x.id !== id)), []);
  const forProvider = useCallback((pid: string) => assignments.filter((a) => a.providerId === pid), [assignments]);
  const forClient = useCallback((cid: string) => assignments.filter((a) => a.clientId === cid), [assignments]);
  const clientIdsFor = useCallback((pid: string) => Array.from(new Set(assignments.filter((a) => a.providerId === pid).map((a) => a.clientId))), [assignments]);

  return (
    <AssignmentsContext.Provider value={{ assignments, ready, assign, unassign, forProvider, forClient, clientIdsFor }}>
      {children}
    </AssignmentsContext.Provider>
  );
}

export function useAssignments(): Ctx {
  const c = useContext(AssignmentsContext);
  if (!c) throw new Error('useAssignments must be used within AssignmentsProvider');
  return c;
}