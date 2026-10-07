/**
 * ─────────────────────────────────────────────────────────────
 *  زبان طراحی ژرفا (Zharfa Design Language — ZDL) · نسخهٔ ۱.۰
 *  استخراج‌شده از صفحهٔ «پروندهٔ مراجع»؛ منبع واحد زیبایی اپ.
 *  استفاده:  import { Z_RADIUS, Z_SPACE, Z_STATUS, zc } from '../../theme/zharfa';
 * ─────────────────────────────────────────────────────────────
 */

/** ۱) شعاع‌ها */
export const Z_RADIUS = {
  card: 14,
  inner: 12,
  control: 10,
  chip: 999,
} as const;

/** ۲) مقیاس فاصله */
export const Z_SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

/** ۳) سایه‌ها */
export const Z_SHADOW = {
  card: { shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  pop: { shadowColor: '#0f172a', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
} as const;

/** ۴) تایپوگرافی */
export const Z_TYPE = {
  family: 'Vazirmatn',
  size: { micro: 7, tiny: 8, caption: 9, body: 10, body2: 11, label: 12, title: 14, heading: 16, display: 22, hero: 26 },
  weight: { medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900' },
} as const;

/** ۵) رنگ‌های وضعیت (ثابت، مستقل از تم) */
export const Z_STATUS = {
  low: '#f59e0b',
  normal: '#22c55e',
  high: '#ef4444',
  info: '#3b82f6',
} as const;

/** ۶) رنگ دسته‌ها (گروه‌های تب) */
export const Z_CATEGORY = {
  gray: { bg: '#eef1f5', fg: '#475569' },
  blue: { bg: '#dbeafe', fg: '#1d4ed8' },
  green: { bg: '#dcfce7', fg: '#15803d' },
  purple: { bg: '#f3e8ff', fg: '#7e22ce' },
  orange: { bg: '#ffedd5', fg: '#c2410c' },
} as const;

/** ۷) توکن‌های نمودار */
export const Z_CHART = {
  lineWidth: 2,
  dot: 10,
  dotActive: 13,
  dotBorder: 2,
  hit: 28,
  tooltipW: 170,
  palette: ['#2563eb', '#3b82f6', '#f97316', '#22c55e', '#a855f7', '#f59e0b'],
} as const;

/** ۸) کارخانهٔ استایل‌ها — colors را از ThemeContext بگیر و استایل آماده تحویل بگیر */
export const zc = {
  card: (colors: any, pad: number = Z_SPACE.md): any => ({
    backgroundColor: colors.surface,
    borderRadius: Z_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: pad,
    ...Z_SHADOW.card,
  }),

  innerBox: (colors: any): any => ({
    backgroundColor: colors.surfaceAlt,
    borderRadius: Z_RADIUS.inner,
    padding: Z_SPACE.md,
  }),

  chip: (colors: any, active = false, accent?: string): any => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: Z_SPACE.xs,
    paddingHorizontal: Z_SPACE.md,
    paddingVertical: 6,
    borderRadius: Z_RADIUS.chip,
    backgroundColor: active ? colors.surface : colors.surfaceAlt,
    borderWidth: 1,
    borderColor: active ? accent || colors.primary : colors.border,
  }),

  badge: (tone: string, bg?: string): any => ({
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Z_RADIUS.chip,
    backgroundColor: bg || tone + '22',
  }),

  button: (colors: any, variant: 'primary' | 'outline' | 'ghost' = 'primary'): any => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Z_SPACE.xs,
    paddingHorizontal: Z_SPACE.lg,
    paddingVertical: 10,
    borderRadius: Z_RADIUS.control,
    backgroundColor: variant === 'primary' ? colors.primary : variant === 'outline' ? 'transparent' : colors.surfaceAlt,
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: colors.border,
  }),

  input: (colors: any): any => ({
    backgroundColor: colors.surface,
    borderRadius: Z_RADIUS.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Z_SPACE.md,
    paddingVertical: 9,
    fontSize: Z_TYPE.size.body2,
    color: colors.text,
  }),

  sectionTitle: (colors: any): any => ({
    fontSize: Z_TYPE.size.title,
    fontWeight: Z_TYPE.weight.extrabold,
    color: colors.text,
  }),

  statValue: (colors: any): any => ({
    fontSize: Z_TYPE.size.display,
    fontWeight: Z_TYPE.weight.extrabold,
    color: colors.text,
  }),

  sliderTrack: (colors: any): any => ({
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
  }),

  tooltip: (colors: any): any => ({
    backgroundColor: colors.surface,
    borderRadius: Z_RADIUS.inner,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Z_SPACE.sm,
    ...Z_SHADOW.pop,
  }),

  banner: (tint: { bg: string; fg: string }): any => ({
    backgroundColor: tint.bg,
    borderRadius: Z_RADIUS.card,
    borderWidth: 1,
    borderColor: tint.fg + '33',
    padding: Z_SPACE.md,
  }),
};