import { createContext, useContext, useEffect, useReducer, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'themin_gamification_v1';

export interface Challenge {
  id: string; titleFa: string; titleEn: string;
  metric: 'meals' | 'water' | 'checkin' | 'score';
  target: number; points: number; start: string; end: string;
  active: boolean; createdBy: string; createdAt: string;
}
export interface BadgeAward {
  id: string; userId: string; titleFa: string; reason: string;
  icon: string; tone: string; awardedBy: string; awardedAt: string;
}
interface GamState { challenges: Challenge[]; badgeAwards: BadgeAward[]; manualPoints: Record<string, number>; }

const initial: GamState = { challenges: [], badgeAwards: [], manualPoints: {} };
type Act = { type: string; payload?: any };

function reducer(s: GamState, a: Act): GamState {
  switch (a.type) {
    case 'LOAD': return { ...s, ...a.payload };
    case 'ADD_CHALLENGE': return { ...s, challenges: [a.payload, ...s.challenges] };
    case 'DELETE_CHALLENGE': return { ...s, challenges: s.challenges.filter((c) => c.id !== a.payload) };
    case 'TOGGLE_CHALLENGE': return { ...s, challenges: s.challenges.map((c) => (c.id === a.payload ? { ...c, active: !c.active } : c)) };
    case 'AWARD_BADGE': return { ...s, badgeAwards: [a.payload, ...s.badgeAwards] };
    case 'REVOKE_BADGE': return { ...s, badgeAwards: s.badgeAwards.filter((b) => b.id !== a.payload) };
    case 'ADD_POINTS': return { ...s, manualPoints: { ...s.manualPoints, [a.payload.userId]: (s.manualPoints[a.payload.userId] || 0) + a.payload.amount } };
    default: return s;
  }
}

interface GamValue {
  state: GamState;
  addChallenge: (c: Challenge) => void;
  deleteChallenge: (id: string) => void;
  toggleChallenge: (id: string) => void;
  awardBadge: (b: BadgeAward) => void;
  revokeBadge: (id: string) => void;
  addPoints: (userId: string, amount: number) => void;
}
const GamContext = createContext<GamValue | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { (async () => { try { const raw = await AsyncStorage.getItem(KEY); if (raw) dispatch({ type: 'LOAD', payload: JSON.parse(raw) }); } catch {} setLoaded(true); })(); }, []);
  useEffect(() => { if (!loaded) return; AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}); }, [state, loaded]);

  const value: GamValue = {
    state,
    addChallenge: (c) => dispatch({ type: 'ADD_CHALLENGE', payload: c }),
    deleteChallenge: (id) => dispatch({ type: 'DELETE_CHALLENGE', payload: id }),
    toggleChallenge: (id) => dispatch({ type: 'TOGGLE_CHALLENGE', payload: id }),
    awardBadge: (b) => dispatch({ type: 'AWARD_BADGE', payload: b }),
    revokeBadge: (id) => dispatch({ type: 'REVOKE_BADGE', payload: id }),
    addPoints: (userId, amount) => dispatch({ type: 'ADD_POINTS', payload: { userId, amount } }),
  };
  return <GamContext.Provider value={value}>{children}</GamContext.Provider>;
}
export function useGamification() { const c = useContext(GamContext); if (!c) throw new Error('useGamification must be used within GamificationProvider'); return c; }