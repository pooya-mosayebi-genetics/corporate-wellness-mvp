import { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../store/ThemeContext';

/**
 * کارت مربعی فشرده به سبک داشبورد مرجع:
 * مربع با گوشهٔ نرم، محتوای وسط‌چین، بدون فضای خالی اضافه.
 */
export default function NeuCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          aspectRatio: 1,
          borderRadius: 20,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 10,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}