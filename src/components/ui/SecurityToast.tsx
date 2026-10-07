import { useEffect, useState } from 'react';
import { View, Text, Animated, Easing, Platform } from 'react-native';
import { useTheme } from '../../store/ThemeContext';

export default function SecurityToast() {
  const { colors } = useTheme();
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
  const anim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (Platform.OS !== 'web') return; // فقط روی وب فعال است

    const handler = (e: any) => {
      const { title, body } = e.detail;
      setToast({ title, body });
      
      // انیمیشن ورود
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      // حذف بعد از ۸ ثانیه
      setTimeout(() => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, 8000);
    };

    window.addEventListener('show-security-toast', handler as any);
    return () => window.removeEventListener('show-security-toast', handler as any);
  }, [anim]);

  if (!toast) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        zIndex: 9999,
        backgroundColor: '#DC2626', // قرمز بحرانی
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 24 }}>🚨</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14, marginBottom: 4 }}>{toast.title}</Text>
          <Text style={{ color: '#FEE2E2', fontSize: 12, lineHeight: 18 }}>{toast.body}</Text>
        </View>
      </View>
    </Animated.View>
  );
}