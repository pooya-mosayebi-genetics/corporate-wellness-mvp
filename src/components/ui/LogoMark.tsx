import Svg, { Rect } from 'react-native-svg';
import { BRAND } from '../../config/brand';

/**
 * 🏢 نشان The Min — صلیب پزشکیِ دوبخشی:
 * بازوی بالایی فیروزه‌ای، بدنه سرمه‌ای (مطابق لوگوی شرکت)
 */
export default function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* بازوی بالایی — فیروزه‌ای */}
      <Rect x={24} y={4} width={16} height={26} rx={8} fill={BRAND.teal} />
      {/* بازوی چپ — سرمه‌ای */}
      <Rect x={4} y={24} width={26} height={16} rx={8} fill={BRAND.navy} />
      {/* بازوی راست — سرمه‌ای */}
      <Rect x={34} y={24} width={26} height={16} rx={8} fill={BRAND.navy} />
      {/* بازوی پایینی — سرمه‌ای */}
      <Rect x={24} y={34} width={16} height={26} rx={8} fill={BRAND.navy} />
      {/* مرکز پیوند — سرمه‌ای */}
      <Rect x={24} y={24} width={16} height={16} fill={BRAND.navy} />
    </Svg>
  );
}