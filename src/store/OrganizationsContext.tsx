import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Organization } from '../data/schema';
import { DEFAULT_ORG } from '../utils/org';

const ORGS_KEY = 'zdl:v1:orgs';

interface OrganizationsContextValue {
  orgs: Organization[];
  isLoaded: boolean;
  upsert: (org: Organization) => void;
  importAll: (orgs: Organization[]) => void;
}

const OrganizationsContext = createContext<OrganizationsContextValue | null>(null);

export function OrganizationsProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrgs] = useState<Organization[]>([DEFAULT_ORG]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ORGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Organization[];
          if (Array.isArray(parsed)) {
            const hasDefault = parsed.some((o) => o.id === DEFAULT_ORG.id);
            setOrgs(hasDefault ? parsed : [DEFAULT_ORG, ...parsed]);
          }
        }
      } catch {}
      setIsLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(ORGS_KEY, JSON.stringify(orgs)).catch(() => {});
  }, [orgs, isLoaded]);

  const upsert = useCallback((org: Organization) => {
    setOrgs((prev) => {
      const idx = prev.findIndex((o) => o.id === org.id);
      if (idx >= 0) return prev.map((o, i) => (i === idx ? org : o));
      return [...prev, org];
    });
  }, []);

  const importAll = useCallback((newOrgs: Organization[]) => {
    setOrgs((prev) => {
      const map = new Map(prev.map((o) => [o.id, o]));
      for (const o of newOrgs) map.set(o.id, o);
      return Array.from(map.values());
    });
  }, []);

  return (
    <OrganizationsContext.Provider value={{ orgs, isLoaded, upsert, importAll }}>
      {children}
    </OrganizationsContext.Provider>
  );
}

export function useOrganizations() {
  const c = useContext(OrganizationsContext);
  if (!c) throw new Error('useOrganizations must be used within OrganizationsProvider');
  return c;
}