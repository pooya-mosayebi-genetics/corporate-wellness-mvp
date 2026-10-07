import { Text, View, Modal, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { FONT, tx } from '../../styles/text';

export interface PreviewRow {
  label: string;
  value: string;
  color?: string;
}

/** ✅ تبدیل اعداد لاتین داخل متن به فارسی */
const faDigits = (s: any, isFa: boolean) => {
  const str = typeof s === 'string' ? s : s == null ? '' : String(s);
  return isFa ? str.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]) : str;
};

/** 🧾 مودال پیش‌نمایش با فونت یکدست وزیرمتن */
export default function ChartPreviewModal({ visible, onClose, title, subtitle, rows }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  rows: PreviewRow[];
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 400, maxHeight: '75%', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, fontFamily: FONT }}>
          {/* هدر مودال */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={[tx(13, colors.text, '800', 20), { flex: 1, marginRight: 8 }]}>
              {faDigits(title, isFa)}
            </Text>
            <Pressable onPress={onClose} style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
              <Text style={tx(12, colors.textSecondary)}>✕</Text>
            </Pressable>
          </View>

          {/* توضیح */}
          {subtitle ? (
            <Text style={[tx(10, colors.textMuted, '400', 17), { marginBottom: 10 }]}>
              {faDigits(subtitle, isFa)}
            </Text>
          ) : null}

          {/* ردیف‌ها */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {rows.length === 0 ? (
              <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 14, alignItems: 'center' }}>
                <Text style={tx(10, colors.textMuted)}>{isFa ? 'داده‌ای برای نمایش نیست' : 'No data to show'}</Text>
              </View>
            ) : (
              rows.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                  <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: r.color ?? colors.primary, marginRight: 8 }} />
                  <Text style={[tx(10, colors.textSecondary, '400', 16), { flex: 1 }]}>
                    {faDigits(r.label, isFa)}
                  </Text>
                  <Text style={tx(10, colors.text, '700', 16)}>
                    {faDigits(r.value, isFa)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* دکمه بستن */}
          <Pressable onPress={onClose} style={{ marginTop: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' }}>
            <Text style={tx(11, '#FFFFFF', '700', 16)}>{isFa ? 'بستن' : 'Close'}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}