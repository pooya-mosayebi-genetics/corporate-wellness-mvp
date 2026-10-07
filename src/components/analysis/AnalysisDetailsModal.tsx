import { useEffect } from 'react';
import { Modal, View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import type { BodyAnalysisRecord } from '../../data/bodyAnalysisTypes';

interface Props {
  record: BodyAnalysisRecord | null;
  onClose: () => void;
}

/** مودال جزئیات آنالیز — scrim تمام‌صفحه + مرکز ثابت + قفل اسکرول پس‌زمینه */
export default function AnalysisDetailsModal({ record, onClose }: Props) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const visible = !!record;

  // 🔒 قفل اسکرول پس‌زمینه وقتی مودال باز است (وب)
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

  const bmi = record && record.height ? record.weight / Math.pow(record.height / 100, 2) : null;

  const rows = record
    ? [
        { c: '#1e3a8a', l: isFa ? 'وزن' : 'Weight', v: `${record.weight} kg` },
        { c: '#f97316', l: 'BMI', v: bmi !== null ? bmi.toFixed(1) : '—' },
        { c: '#fbbf24', l: isFa ? 'چربی' : 'Fat', v: `${record.bfm}%` },
        { c: '#ef4444', l: isFa ? 'عضله' : 'Muscle', v: `${record.smm} kg` },
        { c: '#14b8a6', l: isFa ? 'احشایی' : 'Visceral', v: String(record.vfa) },
        { c: '#38bdf8', l: isFa ? 'آب بدن' : 'Water', v: `${record.tbw} L` },
        { c: '#a855f7', l: isFa ? 'سن بیولوژیک' : 'Bio Age', v: String(record.biologicalAge) },
      ]
    : [];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      {/* Scrim تمام‌صفحه */}
      <View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.55)',
          justifyContent: 'center', alignItems: 'center', padding: 20,
        }}
      >
        {/* دیالوگ مرکزی — حداکثر ارتفاع + اسکرول داخلی */}
        <View style={{ width: '100%', maxWidth: 420, maxHeight: '85%', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: colors.text }}>
              {record ? new Date(record.analyzeTime).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            </Text>
            <Pressable onPress={onClose} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>✕</Text>
            </Pressable>
          </View>
          <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 6 }}>{isFa ? 'جزئیات نسخه' : 'Version details'}</Text>

          {/* محتوای قابل اسکرول داخلی */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {rows.map((r, i) => (
              <View key={r.l} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: r.c, marginLeft: 8, marginRight: 8 }} />
                <Text style={{ flex: 1, fontSize: 11, color: colors.textSecondary }}>{r.l}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{r.v}</Text>
              </View>
            ))}
          </ScrollView>

          <Pressable onPress={onClose} style={{ marginTop: 12, paddingVertical: 11, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>{isFa ? 'بستن' : 'Close'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}