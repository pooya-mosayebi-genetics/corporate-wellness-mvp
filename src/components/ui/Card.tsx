import { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { faNum } from '../../utils/format';
import Icon, { IconName } from './Icon';

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: 14,
        padding: 12,
        ...style,
      }}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{children}</Text>
      {action ? (
        <Pressable onPress={onAction}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function IconTile({ icon, tone, size = 30 }: { icon: IconName; tone: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        backgroundColor: tone + '22',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.45)} color={tone} />
    </View>
  );
}

/** ردیف اطلاعات — مقدار عددی خودکار فارسی می‌شود */
export function InfoRow({ icon, tone, label, value, last }: { icon: IconName; tone: string; label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <IconTile icon={icon} tone={tone} size={26} />
      <Text style={{ flex: 1, fontSize: 11, color: colors.textSecondary, marginLeft: 8 }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{faNum(value, isFa)}</Text>
    </View>
  );
}

export function LinkRow({ icon, tone, label, sub, onPress }: { icon: IconName; tone: string; label: string; sub: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 10, marginBottom: 6 }}
    >
      <IconTile icon={icon} tone={tone} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: 9, color: colors.textMuted }}>{sub}</Text>
      </View>
      <Icon name="chevronForward" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

/** کاشی آماری — مقدار عددی خودکار فارسی می‌شود */
export function StatTile({ icon, tone, label, value, unit, footnote }: { icon: IconName; tone: string; label: string; value: string; unit?: string; footnote?: string }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: 14,
        padding: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <IconTile icon={icon} tone={tone} size={26} />
        <Text numberOfLines={1} style={{ fontSize: 10, color: colors.textMuted, marginLeft: 6, flex: 1 }}>
          {label}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{faNum(value, isFa)}</Text>
        {unit ? <Text style={{ fontSize: 9, color: colors.textMuted, marginLeft: 2 }}>{unit}</Text> : null}
      </View>
      {footnote ? (
        <Text numberOfLines={1} style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.cardBorder,
        marginRight: 6,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#FFFFFF' : colors.textSecondary }}>{label}</Text>
    </Pressable>
  );
}