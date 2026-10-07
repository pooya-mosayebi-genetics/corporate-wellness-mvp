import { useState } from 'react';
import { Text, View, Modal, Pressable, TextInput } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { faNum } from '../../utils/format';
import Icon from './Icon';

const pad2 = (x: number) => String(x).padStart(2, '0');

export default function TimePickerModal({ visible, initial, onConfirm, onClose }: {
  visible: boolean; initial: string; onConfirm: (v: string) => void; onClose: () => void;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => faNum(v, isFa);

  const parts = (initial || '12:00').split(':');
  const ih = parseInt(parts[0], 10) || 12;
  const im = parseInt(parts[1], 10) || 0;

  const [mode, setMode] = useState<'clock' | 'input'>('clock');
  const [sel, setSel] = useState<'hour' | 'minute'>('hour');
  const [h12, setH12] = useState(ih % 12 === 0 ? 12 : ih % 12);
  const [min, setMin] = useState(im);
  const [ap, setAp] = useState<'AM' | 'PM'>(ih < 12 ? 'AM' : 'PM');
  const [inH, setInH] = useState(String(ih % 12 === 0 ? 12 : ih % 12));
  const [inM, setInM] = useState(pad2(im));

  const SIZE = 220; const C = SIZE / 2; const R = 82;
  const hourVals = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minVals = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const vals = sel === 'hour' ? hourVals : minVals;
  const selVal = sel === 'hour' ? h12 : (Math.round(min / 5) * 5) % 60;
  const selIdx = Math.max(vals.indexOf(selVal), 0);
  const selAngle = (selIdx * 30 - 90) * (Math.PI / 180);

  /** ✅ برچسب فارسی برای AM/PM */
  const apLabel = (p: 'AM' | 'PM') => (isFa ? (p === 'AM' ? 'قبل از ظهر' : 'بعد از ظهر') : p);

  const pick = (v: number) => {
    if (sel === 'hour') { setH12(v); setSel('minute'); }
    else setMin(v);
  };

  const confirm = () => {
    let hh: number; let mm: number;
    if (mode === 'clock') { hh = h12; mm = min; }
    else { hh = parseInt(inH, 10) || 12; mm = parseInt(inM, 10) || 0; }
    if (ap === 'PM' && hh !== 12) hh += 12;
    if (ap === 'AM' && hh === 12) hh = 0;
    onConfirm(`${pad2(hh)}:${pad2(mm)}`);
    onClose();
  };

  const box = (active: boolean) => ({
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: active ? colors.primary : colors.surfaceAlt,
    borderWidth: active ? 0 : 1, borderColor: colors.border,
  });
  const boxText = (active: boolean) => ({ fontSize: 28, fontWeight: '800' as const, color: active ? '#FFFFFF' : colors.text });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Pressable onPress={() => {}} style={{ width: 330, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>
              {isFa ? 'انتخاب زمان' : 'SELECT TIME'}
            </Text>
            <Pressable onPress={() => setMode(mode === 'clock' ? 'input' : 'clock')} style={{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
              <Icon name={mode === 'clock' ? 'meal' : 'trend'} size={14} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* ✅ ردیف نمایش زمان: جهت LTR تا در فارسی جای ساعت و دقیقه برعکس نشود */}
          <View style={{ flexDirection: 'row', direction: 'ltr', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <Pressable onPress={() => setSel('hour')} style={box(sel === 'hour')}>
              <Text style={boxText(sel === 'hour')}>{n(mode === 'clock' ? h12 : inH)}</Text>
            </Pressable>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textMuted }}>:</Text>
            <Pressable onPress={() => setSel('minute')} style={box(sel === 'minute')}>
              <Text style={boxText(sel === 'minute')}>{n(mode === 'clock' ? pad2(min) : inM)}</Text>
            </Pressable>
            <View style={{ marginLeft: 8, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
              {(['AM', 'PM'] as const).map((p) => (
                <Pressable key={p} onPress={() => setAp(p)} style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: ap === p ? colors.primary : colors.surfaceAlt }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: ap === p ? '#FFFFFF' : colors.textSecondary }}>
                    {apLabel(p)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {mode === 'clock' ? (
            <View style={{ alignItems: 'center', marginBottom: 10 }}>
              <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: colors.surfaceAlt, position: 'relative' }}>
                <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
                  <Line x1={C} y1={C} x2={C + R * 0.72 * Math.cos(selAngle)} y2={C + R * 0.72 * Math.sin(selAngle)} stroke={colors.primary} strokeWidth={2.5} />
                  <Circle cx={C + R * 0.72 * Math.cos(selAngle)} cy={C + R * 0.72 * Math.sin(selAngle)} r={17} fill={colors.primary} />
                  <Circle cx={C} cy={C} r={3.5} fill={colors.primary} />
                </Svg>
                {vals.map((v, i) => {
                  const a = (i * 30 - 90) * (Math.PI / 180);
                  const x = C + R * Math.cos(a); const y = C + R * Math.sin(a);
                  const isSel = v === selVal;
                  return (
                    <Pressable key={`${sel}-${v}`} onPress={() => pick(v)} style={{ position: 'absolute', left: x - 17, top: y - 17, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 14, fontWeight: isSel ? '800' : '600', color: isSel ? '#FFFFFF' : colors.text }}>
                        {n(sel === 'hour' ? v : pad2(v))}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 6 }}>
                {sel === 'hour' ? (isFa ? 'ساعت را انتخاب کنید' : 'Pick hour') : isFa ? 'دقیقه را انتخاب کنید' : 'Pick minute'}
              </Text>
            </View>
          ) : (
            /* ✅ حالت ورودی: همین‌طور LTR تا ساعت/دقیقه جابه‌جا نشوند */
            <View style={{ flexDirection: 'row', direction: 'ltr', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
              <View style={{ alignItems: 'center' }}>
                <TextInput style={{ width: 76, textAlign: 'center', fontSize: 24, fontWeight: '800', color: colors.text, borderWidth: 2, borderColor: colors.primary, borderRadius: 10, paddingVertical: 8, backgroundColor: colors.surfaceAlt }} keyboardType="numeric" value={inH} onChangeText={(t) => setInH(t.replace(/\D/g, '').slice(0, 2))} />
                <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 4 }}>{isFa ? 'ساعت' : 'Hour'}</Text>
              </View>
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textMuted }}>:</Text>
              <View style={{ alignItems: 'center' }}>
                <TextInput style={{ width: 76, textAlign: 'center', fontSize: 24, fontWeight: '800', color: colors.text, borderWidth: 2, borderColor: colors.primary, borderRadius: 10, paddingVertical: 8, backgroundColor: colors.surfaceAlt }} keyboardType="numeric" value={inM} onChangeText={(t) => setInM(t.replace(/\D/g, '').slice(0, 2))} />
                <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 4 }}>{isFa ? 'دقیقه' : 'Minute'}</Text>
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>
              {n(`${mode === 'clock' ? h12 : inH}:${mode === 'clock' ? pad2(min) : inM}`)} · {apLabel(ap)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={onClose} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>{isFa ? 'انصراف' : 'CANCEL'}</Text>
              </Pressable>
              <Pressable onPress={confirm} style={{ paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.primary }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{isFa ? 'تأیید' : 'OK'}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}