import React from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { Z_RADIUS, Z_SPACE, Z_STATUS, Z_TYPE, zc } from '../../theme/zharfa';

/** کارت پایهٔ ژرفا */
export function ZCard({ children, style, pad }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  const { colors } = useTheme();
  return <View style={[zc.card(colors, pad), style]}>{children}</View>;
}

/** عنوان بخش */
export function ZTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: Z_SPACE.sm }}>
      <Text style={[zc.sectionTitle(colors)]}>{children}</Text>
      {!!sub && <Text style={{ fontSize: Z_TYPE.size.caption, color: colors.textMuted, marginTop: 2 }}>{sub}</Text>}
    </View>
  );
}

/** چیپ قابل کلیک */
export function ZChip({ label, active, onPress, accent, dot, locked }: {
  label: string; active?: boolean; onPress?: () => void; accent?: string; dot?: string; locked?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable disabled={locked} onPress={onPress} style={[zc.chip(colors, active, accent), locked && { opacity: 0.55 }]}>
      {!!dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />}
      <Text style={{ fontSize: Z_TYPE.size.caption, fontWeight: active ? Z_TYPE.weight.extrabold : Z_TYPE.weight.semibold, color: active ? accent || colors.text : colors.textSecondary }}>
        {label}
      </Text>
      {locked && <Text style={{ fontSize: Z_TYPE.size.caption }}>🔒</Text>}
    </Pressable>
  );
}

/** بج وضعیت */
export function ZBadge({ children, tone = Z_STATUS.info, bg }: { children: React.ReactNode; tone?: string; bg?: string }) {
  return (
    <View style={zc.badge(tone, bg)}>
      <Text style={{ fontSize: Z_TYPE.size.micro, color: tone }}>{children}</Text>
    </View>
  );
}

/** دکمه */
export function ZButton({ label, onPress, variant = 'primary', icon }: { label: string; onPress?: () => void; variant?: 'primary' | 'outline' | 'ghost'; icon?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={zc.button(colors, variant)}>
      {!!icon && <Text style={{ fontSize: Z_TYPE.size.caption }}>{icon}</Text>}
      <Text style={{ fontSize: Z_TYPE.size.body2, fontWeight: Z_TYPE.weight.extrabold, color: variant === 'primary' ? '#fff' : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** کارت آماری کوچک */
export function ZStat({ label, value, unit, ok }: { label: string; value: string; unit?: string; ok?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[zc.card(colors, Z_SPACE.md), { flexGrow: 1, flexBasis: '30%' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Z_SPACE.xs, marginBottom: Z_SPACE.xs }}>
        {ok !== undefined && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ok ? Z_STATUS.normal : Z_STATUS.low }} />}
        <Text style={{ fontSize: Z_TYPE.size.caption, color: colors.textMuted }}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end' }}>
        <Text style={zc.statValue(colors)}>{value}</Text>
        {!!unit && <Text style={{ fontSize: Z_TYPE.size.caption, color: colors.textMuted, marginLeft: 3 }}>{unit}</Text>}
      </View>
    </View>
  );
}

/** اسلایدر بازهٔ سالم */
export function ZSlider({ value, min, max, zoneMin, zoneMax, color }: {
  value: number; min: number; max: number; zoneMin: number; zoneMax: number; color: string;
}) {
  const { colors } = useTheme();
  const span = max - min || 1;
  const clamp = (v: number) => Math.max(0, Math.min(1, (v - min) / span));
  const pos = clamp(value);
  const z1 = clamp(zoneMin);
  const z2 = clamp(zoneMax);
  return (
    <View style={zc.sliderTrack(colors)}>
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: `${z1 * 100}%`, width: `${Math.max(2, (z2 - z1) * 100)}%`, borderRadius: 3, backgroundColor: color + '55' }} />
      <View style={{ position: 'absolute', top: -2, left: `${pos * 100}%`, marginLeft: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
}

/** بنر رنگی */
export function ZBanner({ title, sub, actionLabel, onAction, tint }: {
  title: string; sub?: string; actionLabel?: string; onAction?: () => void; tint: { bg: string; fg: string };
}) {
  return (
    <View style={[zc.banner(tint), { flexDirection: 'row', alignItems: 'center' }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: Z_TYPE.size.label, fontWeight: Z_TYPE.weight.extrabold, color: tint.fg }}>{title}</Text>
        {!!sub && <Text style={{ fontSize: Z_TYPE.size.caption, color: tint.fg + 'cc', marginTop: 2 }}>{sub}</Text>}
      </View>
      {!!actionLabel && <ZButton label={actionLabel} onPress={onAction} />}
    </View>
  );
}

/** حالت خالی */
export function ZEmpty({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View style={[zc.card(colors, Z_SPACE.xl), { alignItems: 'center' }]}>
      <Text style={{ fontSize: Z_TYPE.size.body2, color: colors.textMuted }}>{message}</Text>
    </View>
  );
}