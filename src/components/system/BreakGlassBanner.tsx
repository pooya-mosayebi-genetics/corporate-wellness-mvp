import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { useAuth } from '../../store/AuthContext';
import { useBreakGlass } from '../../store/BreakGlassContext';
import { maskNationalId } from '../../utils/nationalId';

/** شمارش معکوس mm:ss */
function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

export default function BreakGlassBanner() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const { session } = useAuth();
  const { grants, revoke } = useBreakGlass();
  const [, tick] = useState(0);

  // re-render هر ثانیه برای شمارش معکوس
  useEffect(() => {
    const t = setInterval(() => tick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const active = grants.filter(
    (g) => g.actorId === session?.nationalId && !g.revoked && g.expiresAt > Date.now(),
  );

  if (!active.length) return null;

  return (
    <View style={{ backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900', flexShrink: 0 }}>⚠️</Text>
      <View style={{ flex: 1, minWidth: 180 }}>
        {active.map((g) => (
          <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2, flexWrap: 'wrap' }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
              {isFa ? 'دسترسی اضطراری:' : 'Break-glass:'} {maskNationalId(g.targetId)}
            </Text>
            <Text style={{ color: '#fecaca', fontSize: 9 }}>
              {fmt(g.expiresAt - Date.now())} {isFa ? 'باقی‌مانده' : 'left'}
            </Text>
            <Pressable
              onPress={() => revoke(g.id)}
              style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dc2626' }}
            >
              <Text style={{ color: '#dc2626', fontSize: 9, fontWeight: '800' }}>
                {isFa ? '🛑 پایان' : '🛑 End'}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}