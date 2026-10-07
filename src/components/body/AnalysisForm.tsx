import { useState } from 'react';
import { Text, View, TextInput, Pressable } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import type { BodyAnalysisRecord, SegmentalValues } from '../../types/bodyAnalysis';

type SegKey =
  | 'ffmRA' | 'ffmLA' | 'ffmTrunk' | 'ffmRL' | 'ffmLL'
  | 'fatRA' | 'fatLA' | 'fatTrunk' | 'fatRL' | 'fatLL';

const initialSegState: Record<SegKey, string> = {
  ffmRA: '', ffmLA: '', ffmTrunk: '', ffmRL: '', ffmLL: '',
  fatRA: '', fatLA: '', fatTrunk: '', fatRL: '', fatLL: '',
};

interface AnalysisFormProps {
  onAnalyzed: (record: BodyAnalysisRecord) => void;
}

export default function AnalysisForm({ onAnalyzed }: AnalysisFormProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';

  const [weightKg, setWeightKg] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [bodyWater, setBodyWater] = useState('');
  const [visceralFat, setVisceralFat] = useState('');
  const [bmr, setBmr] = useState('');
  const [seg, setSeg] = useState<Record<SegKey, string>>(initialSegState);
  const [error, setError] = useState<string | null>(null);

  const updateSeg = (key: SegKey, value: string) => {
    setSeg((prev) => ({ ...prev, [key]: value }));
  };

  const parseSegGroup = (prefix: 'ffm' | 'fat'): SegmentalValues | null => {
    const ra = parseFloat(seg[`${prefix}RA`]);
    const la = parseFloat(seg[`${prefix}LA`]);
    const trunk = parseFloat(seg[`${prefix}Trunk`]);
    const rl = parseFloat(seg[`${prefix}RL`]);
    const ll = parseFloat(seg[`${prefix}LL`]);
    if (!ra || !la || !trunk || !rl || !ll) return null;
    return { rightArm: ra, leftArm: la, trunk, rightLeg: rl, leftLeg: ll };
  };

  const handleSubmit = () => {
    const weight = parseFloat(weightKg);
    const fat = parseFloat(bodyFat);
    const muscle = parseFloat(muscleMass);
    const water = parseFloat(bodyWater);
    const visceral = parseFloat(visceralFat);

    if (!weight || !fat || !muscle || !water || !visceral) {
      setError(isFa ? 'لطفاً تمام فیلدهای اصلی را پر کنید' : 'Please fill all main fields');
      return;
    }

    setError(null);

    onAnalyzed({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      weightKg: weight,
      bodyFatPercent: fat,
      skeletalMuscleMassKg: muscle,
      bodyWaterLiters: water,
      visceralFatAreaCm2: visceral,
      basalMetabolismKcal: parseFloat(bmr) || null,
      segmentalFFM: parseSegGroup('ffm'),
      segmentalFat: parseSegGroup('fat'),
    });
  };

  const inputStyle = {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    color: colors.text,
    borderWidth: 1,
  };

  const field = (
    label: string,
    placeholder: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <View className="flex-1 m-1">
      <Text className="text-xs mb-1" style={{ color: colors.textMuted }}>
        {label}
      </Text>
      <TextInput
        className="rounded-xl px-3 py-3 text-base"
        style={inputStyle}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChange}
      />
    </View>
  );

  const segInput = (key: SegKey, label: string) => (
    <View className="flex-1 mx-0.5">
      <Text className="text-center mb-1" style={{ color: colors.textMuted, fontSize: 10 }}>
        {label}
      </Text>
      <TextInput
        className="rounded-lg px-1 py-2 text-center"
        style={[inputStyle, { fontSize: 13 }]}
        keyboardType="numeric"
        value={seg[key]}
        onChangeText={(v) => updateSeg(key, v)}
      />
    </View>
  );

  return (
    <View
      className="rounded-2xl p-5 mb-4"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}
    >
      <Text className="text-base font-semibold mb-3" style={{ color: colors.text }}>
        {isFa ? 'داده‌های ورودی دستگاه' : 'Analyzer Input Data'}
      </Text>

      <View className="flex-row">
        {field(isFa ? 'وزن (kg)' : 'Weight (kg)', '86.4', weightKg, setWeightKg)}
        {field(isFa ? 'درصد چربی (%)' : 'Body Fat (%)', '38.0', bodyFat, setBodyFat)}
      </View>
      <View className="flex-row">
        {field(isFa ? 'توده عضلانی (kg)' : 'Muscle (kg)', '30.2', muscleMass, setMuscleMass)}
        {field(isFa ? 'آب بدن (L)' : 'Body Water (L)', '39.3', bodyWater, setBodyWater)}
      </View>
      <View className="flex-row">
        {field(isFa ? 'چربی احشایی (cm²)' : 'Visceral (cm²)', '146', visceralFat, setVisceralFat)}
        {field(isFa ? 'متابولیسم پایه' : 'BMR (kcal)', '1529', bmr, setBmr)}
      </View>

      <Text className="text-sm font-semibold mt-3 mb-2" style={{ color: colors.textSecondary }}>
        {isFa ? 'آنالیز قطعه‌ای (اختیاری)' : 'Segmental (optional)'}
      </Text>

      <Text className="text-xs mb-1" style={{ color: colors.textMuted }}>
        {isFa ? 'توده بدون چربی (kg)' : 'Fat-Free Mass (kg)'}
      </Text>
      <View className="flex-row mb-3">
        {segInput('ffmRA', isFa ? 'دست راست' : 'R Arm')}
        {segInput('ffmLA', isFa ? 'دست چپ' : 'L Arm')}
        {segInput('ffmTrunk', isFa ? 'تنه' : 'Trunk')}
        {segInput('ffmRL', isFa ? 'پای راست' : 'R Leg')}
        {segInput('ffmLL', isFa ? 'پای چپ' : 'L Leg')}
      </View>

      <Text className="text-xs mb-1" style={{ color: colors.textMuted }}>
        {isFa ? 'توده چربی (kg)' : 'Fat Mass (kg)'}
      </Text>
      <View className="flex-row mb-4">
        {segInput('fatRA', isFa ? 'دست راست' : 'R Arm')}
        {segInput('fatLA', isFa ? 'دست چپ' : 'L Arm')}
        {segInput('fatTrunk', isFa ? 'تنه' : 'Trunk')}
        {segInput('fatRL', isFa ? 'پای راست' : 'R Leg')}
        {segInput('fatLL', isFa ? 'پای چپ' : 'L Leg')}
      </View>

      {error && (
        <Text className="text-sm mb-3 text-center" style={{ color: colors.danger }}>
          {error}
        </Text>
      )}

      <Pressable
        onPress={handleSubmit}
        className="rounded-xl p-4 items-center"
        style={{ backgroundColor: colors.primary }}
      >
        <Text className="text-base font-semibold text-white">
          {isFa ? '🔬 آنالیز کن' : '🔬 Analyze'}
        </Text>
      </Pressable>
    </View>
  );
}