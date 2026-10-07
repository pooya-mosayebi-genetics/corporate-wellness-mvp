import { View, Text } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import type { BodyAnalysisRecord } from '../../data/bodyAnalysisTypes';

interface MetricProps {
  label: string;
  value: number;
  unit?: string;
  lower?: number;
  upper?: number;
  colors: any;
  n: (v: string | number) => string;
}

function Metric({ label, value, unit, lower, upper, colors, n }: MetricProps) {
  const num = Number(value);
  const hasRange = lower !== undefined && upper !== undefined && Number(lower) > 0 && Number(upper) > 0;
  let valueColor = colors.text;
  if (hasRange && !isNaN(num)) {
    const lo = Number(lower), up = Number(upper);
    valueColor = (num < lo || num > up) ? colors.warning : colors.success;
  }
  return (
    <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 12, flexGrow: 1, flexBasis: '47%', marginBottom: 6 }}>
      <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: valueColor }}>{isNaN(num) ? '—' : n(num)}</Text>
        {unit ? <Text style={{ fontSize: 8, color: colors.textMuted, marginLeft: 3 }}>{unit}</Text> : null}
      </View>
      {hasRange && (
        <Text style={{ fontSize: 7, color: colors.textMuted, marginTop: 3 }}>
          {n(Number(lower))} - {n(Number(upper))}
        </Text>
      )}
    </View>
  );
}

interface Props { record: BodyAnalysisRecord; showHeader?: boolean; }

export default function AnalysisDetail({ record, showHeader = true }: Props) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const n = (v: string | number) => isFa ? String(v) : String(v);

  if (!record) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>{isFa ? 'داده‌ای موجود نیست' : 'No data'}</Text>
      </View>
    );
  }

  const bmi = (record.weight && record.height) ? (record.weight / Math.pow(record.height / 100, 2)).toFixed(1) : null;

  return (
    <View>
      {showHeader && (
        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 14, marginBottom: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{record.fullName}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            <Text style={{ fontSize: 9, color: colors.textMuted }}>{isFa ? 'تاریخ' : 'Date'}: {record.analyzeTime ? new Date(record.analyzeTime).toLocaleDateString(isFa ? 'fa-IR' : 'en-US') : '—'}</Text>
            {record.analyzeTag ? <Text style={{ fontSize: 9, color: colors.textMuted }}>{isFa ? 'برچسب' : 'Tag'}: {record.analyzeTag}</Text> : null}
            <Text style={{ fontSize: 9, color: colors.textMuted }}>{isFa ? 'سن' : 'Age'}: {record.age}</Text>
            <Text style={{ fontSize: 9, color: colors.textMuted }}>{record.gender === 'female' ? (isFa ? 'زن' : 'F') : isFa ? 'مرد' : 'M'}</Text>
          </View>
        </View>
      )}

      {/* خلاصه */}
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 6 }}>{isFa ? 'خلاصه' : 'Summary'}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <Metric label={isFa ? 'وزن' : 'Weight'} value={record.weight} unit="kg" colors={colors} n={n} />
        <Metric label={isFa ? 'قد' : 'Height'} value={record.height} unit="cm" colors={colors} n={n} />
        <Metric label={isFa ? 'وزن هدف' : 'Target Weight'} value={record.targetWeight} unit="kg" colors={colors} n={n} />
        <Metric label={isFa ? 'کنترل وزن' : 'Weight Control'} value={record.weightControl} unit="kg" colors={colors} n={n} />
        {bmi !== null && <Metric label="BMI" value={Number(bmi)} colors={colors} n={n} />}
        <Metric label="Anea Score" value={record.aneaScore} colors={colors} n={n} />
        <Metric label={isFa ? 'سن بیولوژیک' : 'Biological Age'} value={record.biologicalAge} colors={colors} n={n} />
      </View>

      {/* ترکیب بدنی */}
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 6 }}>{isFa ? 'ترکیب بدنی' : 'Body Composition'}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <Metric label={isFa ? 'عضله اسکلتی (SMM)' : 'SMM'} value={record.smm} unit="kg" lower={record.smmLower} upper={record.smmUpper} colors={colors} n={n} />
        <Metric label={isFa ? 'توده چربی (BFM)' : 'BFM'} value={record.bfm} unit="kg" lower={record.bfmLower} upper={record.bfmUpper} colors={colors} n={n} />
        <Metric label={isFa ? 'توده بدون چربی (FFM)' : 'FFM'} value={record.ffm} unit="kg" lower={record.ffmLower} upper={record.ffmUpper} colors={colors} n={n} />
        <Metric label={isFa ? 'آب کل (TBW)' : 'TBW'} value={record.tbw} unit="L" lower={record.tbwLower} upper={record.tbwUpper} colors={colors} n={n} />
        <Metric label={isFa ? 'آب خارج سلولی (ECW)' : 'ECW'} value={record.ecw} unit="L" lower={record.ecwLower} upper={record.ecwUpper} colors={colors} n={n} />
        <Metric label={isFa ? 'آب داخل سلولی (ICW)' : 'ICW'} value={record.icw} unit="L" lower={record.icwLower} upper={record.icwUpper} colors={colors} n={n} />
        <Metric label={isFa ? 'پروتئین (PRO)' : 'PRO'} value={record.pro} unit="kg" lower={record.proLower} upper={record.proUpper} colors={colors} n={n} />
        <Metric label={isFa ? 'چربی احشایی (VFA)' : 'VFA'} value={record.vfa} colors={colors} n={n} />
        <Metric label={isFa ? 'مواد معدنی' : 'Minerals'} value={record.minerals} unit="kg" lower={record.mineralsLower} upper={record.mineralsUpper} colors={colors} n={n} />
        <Metric label={isFa ? 'توده بدون چربی نرم' : 'Soft Lean Mass'} value={record.softLeanMass} unit="kg" lower={record.softLeanMassLower} upper={record.softLeanMassUpper} colors={colors} n={n} />
        <Metric label={isFa ? 'متابولیسم پایه (BMR)' : 'BMR'} value={record.bmr} unit="kcal" colors={colors} n={n} />
      </View>

      {/* عضله تفکیکی */}
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 6 }}>{isFa ? 'عضله تفکیکی' : 'Segmental Lean'}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <Metric label={isFa ? 'تنه' : 'Torso'} value={record.torsoLean} unit="kg" colors={colors} n={n} />
        <Metric label={isFa ? 'پای چپ' : 'Left Leg'} value={record.leftLegLean} unit="kg" colors={colors} n={n} />
        <Metric label={isFa ? 'پای راست' : 'Right Leg'} value={record.rightLegLean} unit="kg" colors={colors} n={n} />
        <Metric label={isFa ? 'بازوی چپ' : 'Left Arm'} value={record.leftArmLean} unit="kg" colors={colors} n={n} />
        <Metric label={isFa ? 'بازوی راست' : 'Right Arm'} value={record.rightArmLean} unit="kg" colors={colors} n={n} />
      </View>

      {/* چربی تفکیکی */}
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 6 }}>{isFa ? 'چربی تفکیکی' : 'Segmental Fat'}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <Metric label={isFa ? 'تنه' : 'Torso'} value={record.torsoFat} unit="kg" colors={colors} n={n} />
        <Metric label={isFa ? 'پای چپ' : 'Left Leg'} value={record.leftLegFat} unit="kg" colors={colors} n={n} />
        <Metric label={isFa ? 'پای راست' : 'Right Leg'} value={record.rightLegFat} unit="kg" colors={colors} n={n} />
        <Metric label={isFa ? 'بازوی چپ' : 'Left Arm'} value={record.leftArmFat} unit="kg" colors={colors} n={n} />
        <Metric label={isFa ? 'بازوی راست' : 'Right Arm'} value={record.rightArmFat} unit="kg" colors={colors} n={n} />
      </View>
    </View>
  );
}