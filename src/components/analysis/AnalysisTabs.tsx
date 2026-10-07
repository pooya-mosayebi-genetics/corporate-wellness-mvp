import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { usePermissions } from '../../hooks/usePermissions';

export type AnalysisTabKey =
  | 'overview'
  | 'body'
  | 'food'
  | 'diet'
  | 'exercise'
  | 'training'
  | 'medical'
  | 'radiology'
  | 'cardiology'
  | 'nursing'
  | 'imaging_3d'
  | 'assistant';

interface TabDef {
  key: AnalysisTabKey;
  fa: string;
  en: string;
  permission?: string;
  locked?: boolean;
  soon?: boolean;
  dot?: string;
}

interface GroupDef {
  id: string;
  labelFa: string;
  labelEn: string;
  dot: string;
  tint: string;
  fg: string;
  tabs: TabDef[];
}

export default function AnalysisTabs({
  active,
  onChange,
}: {
  active: AnalysisTabKey;
  onChange: (k: AnalysisTabKey) => void;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const { can } = usePermissions();

  const groups = useMemo<GroupDef[]>(() => {
    const canView = (perm: string) => can(perm as any);

    // تب‌های پایه (همیشه قابل دسترسی)
    const overviewTab: TabDef = { key: 'overview', fa: 'نمای کلی', en: 'Overview' };

    // تب‌های داده‌های ورودی
    const bodyTab: TabDef = {
      key: 'body',
      fa: 'آنالیز بدن',
      en: 'Body Analysis',
      permission: 'section.body_composition.view',
      dot: '#2563eb',
    };

    const foodTab: TabDef = {
      key: 'food',
      fa: 'دادهٔ غذایی',
      en: 'Food Data',
      permission: 'section.nutrition.view',
      dot: '#16a34a',
    };

    const exerciseTab: TabDef = {
      key: 'exercise',
      fa: 'فعالیت‌ها',
      en: 'Activities',
      permission: 'section.exercise.view',
      dot: '#f59e0b',
    };

    // تب‌های طراحی
    const dietTab: TabDef = {
      key: 'diet',
      fa: 'طراحی رژیم',
      en: 'Diet Design',
      permission: 'section.diet_plan.view',
      dot: '#16a34a',
    };

    const trainingTab: TabDef = {
      key: 'training',
      fa: 'طراحی برنامه تمرینی',
      en: 'Training Plan',
      permission: 'section.exercise.edit',
      dot: '#f59e0b',
      soon: true,
    };

    // تب‌های پزشکی
    const medicalTab: TabDef = {
      key: 'medical',
      fa: 'پزشکی داخلی',
      en: 'Internal Medicine',
      permission: 'section.medical_internal.view',
      dot: '#dc2626',
      soon: true,
    };

    const radiologyTab: TabDef = {
      key: 'radiology',
      fa: 'رادیولوژی',
      en: 'Radiology',
      permission: 'section.radiology.view',
      dot: '#6366f1',
      soon: true,
    };

    const cardiologyTab: TabDef = {
      key: 'cardiology',
      fa: 'قلب و ECG',
      en: 'Cardiology',
      permission: 'section.cardiology.view',
      dot: '#e11d48',
      soon: true,
    };

    const nursingTab: TabDef = {
      key: 'nursing',
      fa: 'پرستاری',
      en: 'Nursing',
      permission: 'section.nursing.view',
      dot: '#ec4899',
      soon: true,
    };

    const imagingTab: TabDef = {
      key: 'imaging_3d',
      fa: 'اسکن سه‌بعدی',
      en: '3D Scan',
      permission: 'section.imaging_3d.view',
      dot: '#8b5cf6',
      soon: true,
    };

    // تب هوش مصنوعی
    const assistantTab: TabDef = {
      key: 'assistant',
      fa: 'دستیار هوشمند',
      en: 'Smart Assistant',
      dot: '#9333ea',
    };

    const allGroups: GroupDef[] = [
      {
        id: 'cart',
        labelFa: 'کارتابل',
        labelEn: 'Cartable',
        dot: colors.textMuted,
        tint: colors.surface,
        fg: colors.textSecondary,
        tabs: [overviewTab],
      },
      {
        id: 'input',
        labelFa: 'داده‌های ورودی',
        labelEn: 'Inputs',
        dot: '#2563eb',
        tint: '#dbeafe',
        fg: '#1d4ed8',
        tabs: [bodyTab, foodTab, exerciseTab],
      },
      {
        id: 'design',
        labelFa: 'طراحی',
        labelEn: 'Design',
        dot: '#16a34a',
        tint: '#dcfce7',
        fg: '#15803d',
        tabs: [dietTab, trainingTab],
      },
      {
        id: 'medical',
        labelFa: 'پزشکی',
        labelEn: 'Medical',
        dot: '#dc2626',
        tint: '#fee2e2',
        fg: '#991b1b',
        tabs: [medicalTab, radiologyTab, cardiologyTab, nursingTab, imagingTab],
      },
      {
        id: 'ai',
        labelFa: 'هوش مصنوعی',
        labelEn: 'AI',
        dot: '#9333ea',
        tint: '#f3e8ff',
        fg: '#7e22ce',
        tabs: [assistantTab],
      },
    ];

    // فیلتر تب‌ها بر اساس Permission
    return allGroups
      .map((g) => ({
        ...g,
        tabs: g.tabs.filter((t) => {
          // تب‌های بدون permission همیشه نمایش داده می‌شوند
          if (!t.permission) return true;
          // تب‌های با permission فقط اگر کاربر دسترسی داشته باشد
          return canView(t.permission);
        }),
      }))
      .filter((g) => g.tabs.length > 0); // گروه‌های خالی حذف شوند
  }, [can, colors]);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      {groups.map((g) => (
        <View
          key={g.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: g.tint,
            borderRadius: 12,
            padding: 4,
            gap: 2,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 7,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: g.dot }} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: g.fg }}>
              {isFa ? g.labelFa : g.labelEn}
            </Text>
          </View>
          {g.tabs.map((t) => {
            const isActive = active === t.key;
            return (
              <Pressable
                key={t.key}
                disabled={t.locked}
                onPress={() => onChange(t.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 9,
                  backgroundColor: isActive ? '#fff' : 'transparent',
                  borderWidth: isActive ? 1 : 0,
                  borderColor: g.fg + '55',
                  opacity: t.locked ? 0.55 : 1,
                }}
              >
                {t.dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.dot }} /> : null}
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: isActive ? '800' : '600',
                    color: isActive ? g.fg : g.fg + 'bb',
                  }}
                >
                  {isFa ? t.fa : t.en}
                </Text>
                {t.locked ? <Text style={{ fontSize: 9 }}>🔒</Text> : null}
                {t.soon ? (
                  <View
                    style={{
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 999,
                      backgroundColor: colors.surfaceAlt,
                    }}
                  >
                    <Text style={{ fontSize: 7, color: colors.textMuted }}>
                      {isFa ? 'به‌زودی' : 'Soon'}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}