import { useMemo, useState } from 'react';
import { Text, View, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useWellness } from '../src/store/WellnessContext';
import { useAuth } from '../src/store/AuthContext';
import { Card, SectionTitle, IconTile } from '../src/components/ui/Card';
import Icon from '../src/components/ui/Icon';
import ChartPreviewModal from '../src/components/charts/ChartPreviewModal';
import type { PreviewRow } from '../src/components/charts/ChartPreviewModal';
import { loadPdfBlob, downloadPdf } from '../src/services/pdfStore';
import { maskNationalId } from '../src/utils/nationalId';

export default function MyDietScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const { state } = useWellness();
  const { session } = useAuth();
  const [preview, setPreview] = useState<{ title: string; subtitle?: string; rows: PreviewRow[] } | null>(null);

  const plans = useMemo(
    () =>
      state.dietPlans
        .filter((p) => p.clientNationalId === session?.nationalId)
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [state.dietPlans, session],
  );

  const view = async (p: any) => {
    const blob = await loadPdfBlob(p.storageKey);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    if (typeof window !== 'undefined') window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const openPlan = (p: any) => {
    const rows: PreviewRow[] = [
      { label: isFa ? 'نسخه' : 'Version', value: `v${p.version}`, color: colors.primary },
      { label: isFa ? 'کارشناس' : 'Coach', value: maskNationalId(p.uploadedBy), color: colors.chart[3] },
      { label: isFa ? 'تاریخ' : 'Date', value: new Date(p.uploadedAt).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { day: 'numeric', month: 'long' }), color: colors.chart[4] },
      { label: isFa ? 'حجم فایل' : 'File size', value: `${p.sizeKb} KB`, color: colors.chart[2] },
    ];
    setPreview({ title: p.titleFa || p.titleEn, subtitle: p.noteFa || p.noteEn || undefined, rows });
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background, flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 90 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{isFa ? 'رژیم من' : 'My Diet'}</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>{plans.length} {isFa ? 'رژیم فعال' : 'active plans'}</Text>
        </View>
      </View>

      {plans.length === 0 ? (
        <Card style={{ alignItems: 'center', padding: 32 }}>
          <IconTile icon="diet" tone={colors.primary} size={56} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 12 }}>{isFa ? 'هنوز رژیمی ندارید' : 'No diet plan yet'}</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 6 }}>
            {isFa ? 'وقتی کارشناس رژیمی برایتان آپلود کند اینجا ظاهر می‌شود' : 'When your coach uploads a plan it will appear here'}
          </Text>
        </Card>
      ) : (
        plans.map((p) => (
          <Card key={p.id} style={{ marginBottom: 8 }}>
            <Pressable onPress={() => openPlan(p)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconTile icon="diet" tone={colors.primary} size={38} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{p.titleFa || p.titleEn}</Text>
                <Text style={{ fontSize: 9, color: colors.textMuted }}>
                  {maskNationalId(p.uploadedBy)} · {new Date(p.uploadedAt).toLocaleDateString(isFa ? 'fa-IR' : 'en-US', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.primarySoft }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>v{p.version}</Text>
              </View>
            </Pressable>
            {p.noteFa ? (
              <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 8, marginTop: 8 }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{p.noteFa}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              <Pressable onPress={() => view(p)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: 10, paddingVertical: 9 }}>
                <Icon name="eye" size={13} color={colors.primary} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{isFa ? 'مشاهده' : 'View'}</Text>
              </Pressable>
              <Pressable onPress={() => downloadPdf(p.storageKey, p.fileName)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingVertical: 9, borderWidth: 1, borderColor: colors.border }}>
                <Icon name="download" size={13} color={colors.textSecondary} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>{isFa ? 'دانلود' : 'Download'}</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}

      <ChartPreviewModal visible={preview !== null} onClose={() => setPreview(null)} title={preview?.title ?? ''} subtitle={preview?.subtitle} rows={preview?.rows ?? []} />
    </ScrollView>
  );
}