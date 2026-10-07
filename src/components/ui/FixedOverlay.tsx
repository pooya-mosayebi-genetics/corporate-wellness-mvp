import { ReactNode, useEffect } from 'react';
import { View, Pressable, Modal, Platform } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  dimColor?: string;
}

/**
 * اورلی ثابت تمام‌صفحه برای همهٔ مودال‌ها:
 * - وب: position fixed داخل درخت اپ → تیرگی کل viewport + ارث‌بری فونت + بدون جابجایی با اسکرول
 * - نیتیو: Modal استاندارد
 * - قفل اسکرول body هنگام باز بودن
 */
export default function FixedOverlay({ visible, onClose, children, dimColor = 'rgba(15,23,42,0.5)' }: Props) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [visible]);

  if (!visible) return null;

  if (Platform.OS === 'web') {
    return (
      <View
        style={{
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          display: 'flex' as any,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: dimColor,
        }}
      >
        <Pressable onPress={onClose} style={{ position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0 }} />
        {children}
      </View>
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: dimColor }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        {children}
      </View>
    </Modal>
  );
}