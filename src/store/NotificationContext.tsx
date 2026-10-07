import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications'; // 🆕 L-10: OS Notifications
import { Platform } from 'react-native'; // 🆕 برای تشخیص پلتفرم
import { useWellness } from './WellnessContext';
import { useGamification } from './GamificationContext';
import { useAuth } from './AuthContext';

const KEY = 'themin_notifications_v2';

export interface Notif {
  id: string; 
  key: string; 
  type: 'water' | 'meal' | 'checkin' | 'streak' | 'challenge' | 'diet' | 'security_alert'; // 🆕 security_alert
  titleFa: string; 
  titleEn: string; 
  bodyFa: string; 
  bodyEn: string; 
  at: string; 
  read: boolean;
  userId?: string; 
  action?: string;
  severity?: 'info' | 'warn' | 'critical'; // 🆕 برای رنگ‌بندی UI
}

export interface SmsLog { id: string; to: string; text: string; at: string; status: string; }
export interface NotifSettings { water: boolean; meals: boolean; checkin: boolean; streak: boolean; challenges: boolean; }
interface NotifState { notifications: Notif[]; settings: NotifSettings; smsLog: SmsLog[]; }

const initial: NotifState = { notifications: [], settings: { water: true, meals: true, checkin: true, streak: true, challenges: true }, smsLog: [] };

interface NotifValue {
  state: NotifState;
  unread: number;
  pushNotif: (n: Omit<Notif, 'id' | 'at' | 'read'>) => void;
  /** 🆕 L-10: ارسال آلرت بحرانی به همه کاربران super_admin + OS Notification */
  pushCriticalAlert: (params: { targetUserId: string; titleFa: string; titleEn: string; bodyFa: string; bodyEn: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  setSetting: (k: keyof NotifSettings, v: boolean) => void;
  sendSms: (to: string, text: string) => void;
}

const NotifContext = createContext<NotifValue | null>(null);
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

// 🆕 تنظیم Handler سراسری برای نمایش نوتیفیکیشن در Foreground (فقط Native)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NotifState>(initial);
  const [loaded, setLoaded] = useState(false);
  const { state: well } = useWellness();
  const { state: gam } = useGamification();
  const { session, accounts } = useAuth(); // 🆕 accounts برای پیدا کردن super_adminها
  
  const ref = useRef({ state, well, gam, session, accounts });
  ref.current = { state, well, gam, session, accounts };

  // بارگذاری اولیه
  useEffect(() => { 
    (async () => { 
      try { 
        const raw = await AsyncStorage.getItem(KEY); 
        if (raw) setState({ ...initial, ...JSON.parse(raw) }); 
        
        // درخواست Permission برای OS Notifications (فقط Native)
        if (Platform.OS !== 'web') {
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            await Notifications.requestPermissionsAsync();
          }
        }
      } catch {} 
      setLoaded(true); 
    })(); 
  }, []);

  // ذخیره خودکار
  useEffect(() => { 
    if (!loaded) return; 
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}); 
  }, [state, loaded]);

  // منطق نوتیفیکیشن‌های معمولی (آب، وعده و...)
  useEffect(() => {
    if (!loaded) return;
    const evaluate = () => {
      const { state: cur, well: w, gam: g, session: ses } = ref.current;
      const myId = ses?.nationalId ?? '';
      const now = new Date(); const date = dayKey(now); const hour = now.getHours();
      const has = (k: string) => cur.notifications.some((n) => n.key === k);
      const due: Omit<Notif, 'id' | 'at' | 'read'>[] = [];
      
      const waterToday = w.waterEntries.filter((e) => e.loggedAt.slice(0, 10) === date).reduce((s, e) => s + e.ml, 0);
      const mealsToday = w.meals.filter((m) => m.date === date);
      const activeToday = mealsToday.length > 0 || waterToday > 0;

      if (cur.settings.water && hour >= 10 && waterToday < 2500 && !has(`water-${date}-${Math.floor(hour / 3)}`))
        due.push({ key: `water-${date}-${Math.floor(hour / 3)}`, type: 'water', userId: myId, titleFa: 'یادآوری آب', titleEn: 'Hydration', bodyFa: `هنوز ${2500 - waterToday} میلی‌لیتر تا هدف آب امروز داری.`, bodyEn: `${2500 - waterToday} ml left today.` });
      
      if (cur.settings.meals) {
        const slots: [string, number, string, string][] = [['breakfast', 9, 'صبحانه', 'Breakfast'], ['lunch', 14, 'ناهار', 'Lunch'], ['dinner', 21, 'شام', 'Dinner']];
        for (const [slot, h, fa, en] of slots)
          if (hour >= h && !mealsToday.some((m) => m.type === slot) && !has(`meal-${date}-${slot}`))
            due.push({ key: `meal-${date}-${slot}`, type: 'meal', userId: myId, titleFa: `ثبت ${fa}`, titleEn: `Log ${en}`, bodyFa: `وعدهٔ ${fa} امروز ثبت نشده.`, bodyEn: `${en} not logged.` });
      }
      
      if (cur.settings.checkin && hour >= 20 && (w.checkIn.lastUpdated ?? '').slice(0, 10) !== date && !has(`checkin-${date}`))
        due.push({ key: `checkin-${date}`, type: 'checkin', userId: myId, titleFa: 'چک‌این روزانه', titleEn: 'Check-in', bodyFa: 'استرس و خواب امروزت را ثبت کن.', bodyEn: 'Log stress & sleep.' });
      
      if (cur.settings.streak && hour >= 18 && !activeToday && !has(`streak-${date}`))
        due.push({ key: `streak-${date}`, type: 'streak', userId: myId, titleFa: 'استریک در خطر!', titleEn: 'Streak at risk', bodyFa: 'یک ثبت کوچک استریکت را نجات می‌دهد.', bodyEn: 'A small log saves your streak.' });
      
      if (cur.settings.challenges)
        for (const c of g.challenges) {
          if (!c.active) continue;
          const dl = Math.ceil((new Date(c.end).getTime() - now.getTime()) / 864e5);
          if (dl >= 0 && dl <= 2 && !has(`ch-${c.id}-${date}`))
            due.push({ key: `ch-${c.id}-${date}`, type: 'challenge', userId: myId, titleFa: 'ددلاین چالش', titleEn: 'Deadline', bodyFa: `چالش «${c.titleFa}» تا ${dl} روز دیگر؛ +${c.points} امتیاز.`, bodyEn: `Challenge ends in ${dl}d.` });
        }
        
      if (due.length) {
        const iso = now.toISOString();
        setState((p) => ({ ...p, notifications: [...due.map((d, i) => ({ ...d, id: `nt-${Date.now()}-${i}`, at: iso, read: false })), ...p.notifications].slice(0, 100) }));
      }
    };
    evaluate();
    const t = setInterval(evaluate, 60000);
    return () => clearInterval(t);
  }, [loaded]);

  const pushNotif = useCallback((n: Omit<Notif, 'id' | 'at' | 'read'>) => {
    setState((p) => ({ ...p, notifications: [{ ...n, id: `nt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), read: false }, ...p.notifications].slice(0, 100) }));
  }, []);

  /* 🆕 L-10: ارسال آلرت امنیتی بحرانی (Dual Mode: Toast for Web, OS Push for Native) */
  const pushCriticalAlert = useCallback(({ targetUserId, titleFa, titleEn, bodyFa, bodyEn }: any) => {
    const newNotif: Notif = {
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      key: `security-${Date.now()}`,
      type: 'security_alert',
      severity: 'critical',
      titleFa, titleEn, bodyFa, bodyEn,
      at: new Date().toISOString(),
      read: false,
      userId: targetUserId,
    };

    // ۱. افزودن به لیست In-App (برای Badge و زنگوله)
    setState((p) => ({ ...p, notifications: [newNotif, ...p.notifications].slice(0, 100) }));

    // ۲. تشخیص پلتفرم و ارسال مناسب
    if (Platform.OS === 'web') {
      // 🔴 روی Web: نمایش Toast شناور (چون OS Notification نیاز به Interaction دارد)
      window.dispatchEvent(new CustomEvent('show-security-toast', { 
        detail: { title: titleFa, body: bodyFa, duration: 8000 } 
      }));
    } else {
      // 📱 روی Mobile: ارسال واقعی به سیستم‌عامل (Sound + Vibration + Banner)
      Notifications.scheduleNotificationAsync({
        content: {
          title: `🚨 ${titleFa}`,
          body: bodyFa,
          sound: true,
          vibrate: [200, 100, 200],
          data: { type: 'security_alert', notifId: newNotif.id },
        },
        trigger: null, // فوری
      }).catch(err => console.warn('OS Notification failed:', err));
    }

  }, []);

  const sendSms = useCallback((to: string, text: string) => {
    setState((p) => ({ ...p, smsLog: [{ id: `sms-${Date.now()}`, to, text, at: new Date().toISOString(), status: 'sent (demo)' }, ...p.smsLog].slice(0, 50) }));
  }, []);

  const markRead = useCallback((id: string) => setState((p) => ({ ...p, notifications: p.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })), []);
  const markAllRead = useCallback(() => setState((p) => ({ ...p, notifications: p.notifications.map((n) => ({ ...n, read: true })) })), []);
  const clearAll = useCallback(() => setState((p) => ({ ...p, notifications: [] })), []);
  const setSetting = useCallback((k: keyof NotifSettings, v: boolean) => setState((p) => ({ ...p, settings: { ...p.settings, [k]: v } })), []);

  const myId = session?.nationalId ?? '';
  const unread = state.notifications.filter((n) => !n.read && (!n.userId || n.userId === myId)).length;

  return (
    <NotifContext.Provider value={{ state, unread, pushNotif, pushCriticalAlert, markRead, markAllRead, clearAll, setSetting, sendSms }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotification() { 
  const c = useContext(NotifContext); 
  if (!c) throw new Error('useNotification must be within NotificationProvider'); 
  return c; 
}