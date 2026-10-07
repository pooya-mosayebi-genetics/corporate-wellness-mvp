import { View, Text } from 'react-native';
import { useLanguage } from '../../../store/LanguageContext';
import { faNum } from '../../../utils/format';

/** values = [دست راست, دست چپ, تنه, پای راست, پای چپ] */
export default function HumanFigure({ values, color }: { values: number[]; color: string }) {
  const { language } = useLanguage();
  const n = (v: any) => faNum(v, language === 'fa');
  const max = Math.max(...values, 0.001);
  const op = (v: number) => 0.3 + 0.7 * (v / max);
  const seg = (v: number, w: number, h: number, r: number, fs: number) => (
    <View style={{ width: w, height: h, borderRadius: r, backgroundColor: color, opacity: op(v), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: fs, color: '#fff', fontWeight: '700' }}>{n(v.toFixed(1))}</Text>
    </View>
  );
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: color, opacity: 0.25, marginBottom: 4 }} />
      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 3 }}>
        {seg(values[0], 16, 46, 7, 7)}
        {seg(values[2], 34, 52, 9, 8)}
        {seg(values[1], 16, 46, 7, 7)}
      </View>
      <View style={{ flexDirection: 'row', gap: 3, marginTop: 3 }}>
        {seg(values[3], 16, 40, 7, 7)}
        {seg(values[4], 16, 40, 7, 7)}
      </View>
    </View>
  );
}