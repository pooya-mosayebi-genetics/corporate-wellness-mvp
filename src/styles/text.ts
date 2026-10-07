/** 🎨 سبک متن یکپارچه: فونت فارسی + متریک خط کنترل‌شده برای تراز کامل با آیکون‌ها */
export const FONT = 'Vazirmatn, Vazir, Tahoma, sans-serif';

export const tx = (size: number, color: string, weight?: string, lineHeight?: number) => ({
  fontSize: size,
  color,
  fontWeight: (weight ?? '400') as any,
  fontFamily: FONT,
  includeFontPadding: false,
  textAlignVertical: 'center' as const,
  lineHeight: lineHeight ?? Math.round(size * 1.55),
});

/** مرکزسازی محتوای داخل کاشی آیکون (ایموجی یا SVG) */
export const tileCenter = (size: number) => ({
  width: size,
  height: size,
  borderRadius: Math.round(size * 0.28),
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
});

/** سبک متن ایموجی داخل کاشی تا دقیقاً وسط بایستد */
export const emojiInTile = (size: number) => ({
  fontSize: Math.round(size * 0.55),
  lineHeight: size,
  textAlign: 'center' as const,
  includeFontPadding: false,
  fontFamily: FONT,
});