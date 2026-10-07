import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'themin_food_prefs_v1';

/** ⭐ علاقه‌مندی‌های غذا (ماندگار) */
export function useFoodPrefs() {
  const [favs, setFavs] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try { const raw = await AsyncStorage.getItem(KEY); if (raw) setFavs(JSON.parse(raw)); } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(KEY, JSON.stringify(favs)).catch(() => {});
  }, [favs, loaded]);

  const toggleFav = useCallback((id: string) => {
    setFavs((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }, []);

  const isFav = useCallback((id: string) => favs.includes(id), [favs]);

  return { favs, toggleFav, isFav };
}