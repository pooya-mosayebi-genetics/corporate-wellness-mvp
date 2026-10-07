import { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import Icon from '../ui/Icon';
import type { BodyAnalysisRecord } from '../../data/bodyAnalysisTypes';

// ⚠️ IMPORTANT: Define fonts based on your CSS variables
// For Persian text -> Vazirmatn is primary
// For English text -> Inter is primary
const FONT_FA = "'Vazirmatn', 'Inter', system-ui, sans-serif";
const FONT_EN = "'Inter', 'Vazirmatn', system-ui, sans-serif";

// ─── Constants for Clinical Thresholds ───
const THRESHOLDS = {
  BFM_NORMAL_MALE_MIN: 8,
  BFM_NORMAL_MALE_MAX: 20, 
  BFM_NORMAL_FEMALE_MIN: 10,
  BFM_NORMAL_FEMALE_MAX: 25, 
  
  VFA_NORMAL_MAX: 9,      
  VFA_WARNING_MAX: 14,    
  
  BMI_NORMAL_MIN: 18.5,
  BMI_NORMAL_MAX: 24.9,
  BMI_OVERWEIGHT_MAX: 29.9,
  BMI_OBESE_I_MAX: 34.9,
  BMI_OBESE_II_MAX: 39.9,
  
  SMM_EXPECTED_MALE_BASE: 36, 
  SMM_EXPECTED_FEMALE_BASE: 27, 
};

interface RiskItem {
  id: string;
  title: string;
  valueDisplay: string;
  status: 'normal' | 'warning' | 'critical';
  explanationFa: string;
  explanationEn: string;
}

export default function RiskCard({ latest }: { latest?: BodyAnalysisRecord }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  
  // ✅ Select correct font family based on current language
  const APP_FONT = isFa ? FONT_FA : FONT_EN;
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskItem | null>(null);

  // 🧠 RISK ENGINE
  const risks = useMemo<RiskItem[]>(() => {
    if (!latest) return [];

    const foundRisks: RiskItem[] = [];
    const gender = (latest.gender?.toLowerCase() === 'female') ? 'female' : 'male';
    
    const bfmVal = Number(latest.bfm ?? 0);
    const smmVal = Number(latest.smm ?? 0);
    const vfaVal = Number(latest.vfa ?? 0);
    const weightVal = Number(latest.weight ?? 0);
    const heightVal = Number(latest.height ?? 0);
    const bmi = weightVal && heightVal ? weightVal / Math.pow(heightVal / 100, 2) : 0;

    // 1. BMI Logic
    let bmiStatus: 'normal' | 'warning' | 'critical' = 'normal';
    let bmiExplainFa = '';
    let bmiExplainEn = '';

    if (bmi < THRESHOLDS.BMI_NORMAL_MIN) {
       bmiStatus = 'warning';
       bmiExplainFa = 'شاخص توده بدنی شما کمتر از حد نرمال است (کمبود وزن). ممکن است نشان‌دهنده سوءتغذیه یا مشکلات متابولیک باشد.';
       bmiExplainEn = 'Your BMI is below the normal range (underweight). This may indicate malnutrition or metabolic issues.';
    } else if (bmi <= THRESHOLDS.BMI_NORMAL_MAX) {
       bmiStatus = 'normal';
       bmiExplainFa = 'شاخص توده بدنی شما در محدوده‌ی نرمال قرار دارد که بیانگر تناسب مطلوب وزن نسبت به قد است.';
       bmiExplainEn = 'Your BMI is within the normal range, indicating an ideal weight-to-height ratio.';
    } else if (bmi <= THRESHOLDS.BMI_OVERWEIGHT_MAX) {
       const expectedMuscle = gender === 'female' ? THRESHOLDS.SMM_EXPECTED_FEMALE_BASE : THRESHOLDS.SMM_EXPECTED_MALE_BASE;
       const isHighMuscle = smmVal > expectedMuscle * 1.1;
       
       if (isHighMuscle) {
          bmiStatus = 'normal';
          bmiExplainFa = 'شاخص توده بدنی شما، در محدوده‌ی اضافه وزن ارزیابی شده است؛ با این حال، بررسی ترکیب بدنی نشان می‌دهد این افزایش، عمدتاََ ناشی از توده عضلانی بالا است. در این شرایط، شاخص BMI معیار درستی تلقی نمی‌شود.';
          bmiExplainEn = 'Your BMI indicates overweight; however, body composition analysis shows this increase is primarily due to high muscle mass. In this case, BMI is not an accurate metric.';
       } else {
          bmiStatus = 'warning';
          bmiExplainFa = 'شاخص توده بدنی شما، در محدوده‌ی اضافه وزن قرار دارد. بررسی ترکیب بدنی شما، نشان می‌دهد که این اضافه وزن عمدتاََ ناشی از درصد چربی بالا می‌باشد و نه توده عضلانی، که در صورت عدم مداخله‌ی به‌موقع می‌تواند خطر ابتلا به بیماری‌های قلبی-عروقی، دیابت نوع دو، اختلالات چربی خون و فشار خون بالا را افزایش دهد.';
          bmiExplainEn = 'Your BMI is in the overweight range. Body composition analysis suggests this excess weight is primarily due to high body fat percentage rather than muscle mass, which can increase the risk of cardiovascular diseases, type 2 diabetes, dyslipidemia, and hypertension if not addressed timely.';
       }
    } else if (bmi <= THRESHOLDS.BMI_OBESE_I_MAX) {
       bmiStatus = 'critical';
       bmiExplainFa = 'شاخص توده بدنی شما در محدوده‌ی چاقی درجه اول قرار دارد. بررسی ترکیب بدنی نشان می‌دهد این افزایش وزن عمدتاََ ناشی درصد چربی بالا می‌باشد. این سطح از چاقی با افزایش قابل‌توجه خطر ابتلا به بیماری‌های قلبی-عروقی، دیابت نوع دو، فشار خون بالا، اختلال چربی خون، سندرم متابولیک و همچنین فشار مضاعف بر مفاصل (به‌ویژه زانو و کمر) همراه است.';
       bmiExplainEn = 'Your BMI falls into Obesity Class I. Body composition analysis shows this weight gain is mainly due to high body fat. This level of obesity significantly increases the risk of cardiovascular diseases, type 2 diabetes, hypertension, dyslipidemia, metabolic syndrome, and joint stress (especially knees and back).';
    } else if (bmi <= THRESHOLDS.BMI_OBESE_II_MAX) {
       bmiStatus = 'critical';
       bmiExplainFa = 'شاخص توده بدنی شما در محدوده‌ی چاقی درجه دوم قرار دارد. بررسی ترکیب بدنی نشان‌دهنده آن است که این افزایش وزن عمدتاََ حاصل از افزایش قابل‌توجه درصد چربی بدن می‌باشد. در این سطح از چاقی، خطر ابتلا به بیماری‌های قلبی-عروقی، دیابت نوع دو، فشار خون بالا، اختلالات چربی خون، سندرم متابولیک، عوارض اسکلتی-مفصلی (به‌ویژه در زانو، لگن و ستون فقرات) به‌طور معناداری افزایش می‌یابد.';
       bmiExplainEn = 'Your BMI falls into Obesity Class II. Analysis shows significant body fat accumulation. At this stage, risks for CVD, T2D, hypertension, dyslipidemia, metabolic syndrome, and skeletal-joint complications (knees, hips, spine) rise dramatically.';
    } else {
       bmiStatus = 'critical';
       bmiExplainFa = 'شاخص توده بدنی شما در محدوده‌ی چاقی درجه سوم قرار دارد. بررسی ترکیب بدنی نشان‌دهنده آن است که این افزایش وزن عمدتاََ حاصل از افزایش قابل‌توجه درصد چربی بدن می‌باشد. در این سطح از چاقی، خطر ابتلا به بیماری‌های قلبی-عروقی، دیابت نوع دو، فشار خون بالا، اختلالات چربی خون، سندرم متابولیک، عوارض اسکلتی-مفصلی (به‌ویژه در زانو، لگن و ستون فقرات) به‌طور معناداری افزایش می‌یابد.';
       bmiExplainEn = 'Your BMI falls into Obesity Class III (Morbid Obesity). Significant body fat accumulation poses severe health risks including advanced CVD, uncontrolled diabetes, organ damage, and mobility issues.';
    }

    if (bmi > 0) {
      foundRisks.push({
        id: 'bmi',
        title: isFa ? 'شاخص توده بدنی (BMI)' : 'Body Mass Index (BMI)',
        valueDisplay: `${bmi.toFixed(1)} kg/m²`,
        status: bmiStatus,
        explanationFa: bmiExplainFa,
        explanationEn: bmiExplainEn,
      });
    }

    // 2. BFM Logic
    let bfmStatus: 'normal' | 'warning' | 'critical' = 'normal';
    let bfmExplainFa = '';
    let bfmExplainEn = '';
    
    const minBfm = gender === 'female' ? THRESHOLDS.BFM_NORMAL_FEMALE_MIN : THRESHOLDS.BFM_NORMAL_MALE_MIN;
    const maxBfm = gender === 'female' ? THRESHOLDS.BFM_NORMAL_FEMALE_MAX : THRESHOLDS.BFM_NORMAL_MALE_MAX;

    if (bfmVal > 0) {
      if (bfmVal < minBfm) {
         bfmStatus = 'warning';
         bfmExplainFa = 'گزارش دستگاه، نشان‌دهنده این است که درصد چربی بدن شما پایین‌تر از محدوده نرمال قرار دارد. کمبود بیش از حد چربی بدن، ممکن است با کاهش ذخایر انرژی، اختلالات هورمونی، کاهش تراکم استخوان، ضعف سیستم ایمنی و افزایش خطر آسیب‌های ورزشی همراه باشد.';
         bfmExplainEn = 'Device report indicates your body fat percentage is lower than the normal range. Excessively low body fat may lead to reduced energy reserves, hormonal imbalances, decreased bone density, weakened immune system, and increased injury risk.';
      } else if (bfmVal <= maxBfm) {
         bfmStatus = 'normal';
         bfmExplainFa = 'درصد چربی بدن شما در محدوده طبیعی قرار دارد. حفظ این وضعیت از طریق رعایت الگوی غذایی متعادل، فعالیت بدنی منظم و سبک زندگی سالم توصیه می‌شود. تداوم این شرایط می‌تواند خطر ابتلا به بیماری‌های متابولیک، قلبی-عروقی و اختلالات مرتبط با اضافه‌وزن را کاهش داده و به حفظ سلامت عمومی بدن کمک کند.';
         bfmExplainEn = 'Your body fat percentage is within the natural range. Maintaining this condition through a balanced diet, regular physical activity, and healthy lifestyle is recommended. Continuity of these conditions reduces the risk of metabolic, cardiovascular diseases, and overweight-related disorders.';
      } else {
         bfmStatus = 'critical';
         bfmExplainFa = 'درصد چربی بدن شما بالاتر از محدوده طبیعی قرار دارد که نشان‌دهنده افزایش ذخایر چربی بدن است. این افزایش درصد چربی، می‌تواند خطر ابتلا به بیماری‌های قلبی-عروقی، دیابت نوع دو، فشار خون بالا، اختلالات چربی خون، کبد چرب غیرالکلی، سندرم متابولیک را افزایش دهد.';
         bfmExplainEn = 'Your body fat percentage is higher than the natural range, indicating increased fat storage. This elevation increases the risk of cardiovascular diseases, type 2 diabetes, hypertension, dyslipidemia, non-alcoholic fatty liver disease, and metabolic syndrome.';
      }

      foundRisks.push({
        id: 'bfm',
        title: isFa ? 'درصد چربی بدن (BFM)' : 'Body Fat Percentage (BFM)',
        valueDisplay: `${Math.round(bfmVal)}%`,
        status: bfmStatus,
        explanationFa: bfmExplainFa,
        explanationEn: bfmExplainEn,
      });
    }

    // 3. VFL Logic
    let vflStatus: 'normal' | 'warning' | 'critical' = 'normal';
    let vflExplainFa = '';
    let vflExplainEn = '';

    if (vfaVal > 0) {
      if (vfaVal <= THRESHOLDS.VFA_NORMAL_MAX) {
         vflStatus = 'normal';
         vflExplainFa = 'سطح چربی احشایی شما در محدوده طبیعی قرار دارد. این وضعیت نشان می‌دهد که میزان تجمع چربی در اطراف اندام‌های داخلی مانند کبد، پانکراس و روده‌ها در حد مطلوب می‌باشد.';
         vflExplainEn = 'Your visceral fat level is within the normal range. This indicates that fat accumulation around internal organs such as the liver, pancreas, and intestines is at an optimal level.';
      } else if (vfaVal <= THRESHOLDS.VFA_WARNING_MAX) {
         vflStatus = 'warning';
         vflExplainFa = 'سطح چربی احشایی شما بالاتر از محدوده طبیعی است. افزایش چربی احشایی، می‌تواند خطر بروز مقاومت به انسولین، اختلالات چربی خون، فشار خون بالا، کبد چرب و بیماری‌های قلبی-عروقی را افزایش دهد.';
         vflExplainEn = 'Your visceral fat level is above the normal range. Increased visceral fat can raise the risk of insulin resistance, dyslipidemia, hypertension, fatty liver, and cardiovascular diseases.';
      } else {
         vflStatus = 'critical';
         vflExplainFa = 'سطح چربی احشایی شما در محدوده بسیار بالا قرار دارد. تجمع زیاد چربی در اطراف اندام‌های داخلی یکی از مهم‌ترین عوامل خطر برای ابتلا به سندرم متابولیک، دیابت نوع ۲، بیماری‌های قلبی-عروقی، کبد چرب و سایر عوارض مرتبط با چاقی محسوب می‌شود.';
         vflExplainEn = 'Your visceral fat level is very high. Excessive fat accumulation around internal organs is one of the most significant risk factors for metabolic syndrome, type 2 diabetes, cardiovascular diseases, fatty liver, and other obesity-related complications.';
      }

      foundRisks.push({
        id: 'vfl',
        title: isFa ? 'چربی احشایی (VFL)' : 'Visceral Fat Level (VFL)',
        valueDisplay: `${vfaVal}`,
        status: vflStatus,
        explanationFa: vflExplainFa,
        explanationEn: vflExplainEn,
      });
    }

    // 4. SMM Logic
    let smmStatus: 'normal' | 'warning' | 'critical' = 'normal';
    let smmExplainFa = '';
    let smmExplainEn = '';

    const expectedBase = gender === 'female' ? THRESHOLDS.SMM_EXPECTED_FEMALE_BASE : THRESHOLDS.SMM_EXPECTED_MALE_BASE;
    
    if (smmVal > 0) {
      if (smmVal < expectedBase * 0.9) { 
         smmStatus = 'warning';
         smmExplainFa = 'میزان توده عضلات اسکلتی شما کمتر از محدوده طبیعی گزارش شده است که می‌تواند نشان‌دهنده کاهش ذخایر عضلانی بدن باشد. کاهش توده عضلانی باعث کاهش قدرت و استقامت جسمانی، کاهش توانایی انجام فعالیت‌های روزمره، افزایش احساس خستگی و کاهش ظرفیت بدن در مصرف انرژی می‌شود. همچنین در بلندمدت، این وضعیت می‌تواند باعث ضعف عملکرد عضلات و بروز سارکوپنیا (تحلیل عضلانی) در سنین بالاتر را افزایش دهد. داشتن فعالیت بدنی، به‌ویژه تمرینات مقاومتی و دریافت کافی پروتئین باکیفیت، می‌تواند باعث افزایش توده عضلانی شود.';
         smmExplainEn = 'Your skeletal muscle mass is reported below the natural range, which may indicate diminished muscle reserves. Reduced muscle mass leads to decreased strength and endurance, limited ability to perform daily activities, increased fatigue, and reduced metabolic capacity. Long-term, this condition can weaken muscle function and increase the risk of sarcopenia (muscle loss) in older age. Physical activity, especially resistance training, and adequate intake of quality protein can help increase muscle mass.';
      } else if (smmVal > expectedBase * 1.1) { 
         smmStatus = 'normal'; 
         smmExplainFa = 'میزان توده عضلات اسکلتی شما بالاتر از محدوده طبیعی گزارش شده است که نشان‌دهنده حجم عضلانی مطلوب می‌باشد.';
         smmExplainEn = 'Your skeletal muscle mass is reported above the natural range, indicating desirable muscle volume.';
      } else {
         smmStatus = 'normal';
         smmExplainFa = 'میزان توده عضلات اسکلتی شما در محدوده نرمال قرار دارد که بیانگر وضعیت مناسب ترکیب بدنی و برخورداری از حجم عضلانی متناسب با وزن و قد شما است. وجود توده عضلانی کافی علاوه بر افزایش قدرت و استقامت عضلانی، در حفظ عملکرد مطلوب سیستم اسکلتی-عضلانی، بهبود آمادگی جسمانی و کاهش خطر آسیب‌های حرکتی نقش مؤثری دارد.';
         smmExplainEn = 'Your skeletal muscle mass is within the normal range, reflecting a favorable body composition and adequate muscle volume relative to your weight and height. Sufficient muscle mass enhances strength and endurance, maintains optimal musculoskeletal function, improves fitness readiness, and reduces the risk of movement injuries.';
      }

      foundRisks.push({
        id: 'smm',
        title: isFa ? 'توده عضلانی اسکلتی (SMM)' : 'Skeletal Muscle Mass (SMM)',
        valueDisplay: `${smmVal.toFixed(1)} kg`,
        status: smmStatus,
        explanationFa: smmExplainFa,
        explanationEn: smmExplainEn,
      });
    }

    return foundRisks;
  }, [latest, isFa]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'critical': return '#DC2626'; // Red
      case 'warning': return '#F59E0B'; // Orange
      default: return '#10B981'; // Green
    }
  };

  const getBgColor = (status: string) => {
     switch(status) {
      case 'critical': return '#FEF2F2'; // Light Red BG
      case 'warning': return '#FFFBEB'; // Light Yellow BG
      default: return '#ECFDF5'; // Light Green BG
    }
  };

  const handlePress = (risk: RiskItem) => {
    setSelectedRisk(risk);
    setModalVisible(true);
  };

  if (!latest) {
    return (
      <View style={{ padding: 16, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', fontFamily: APP_FONT }}>
          {isFa ? 'برای مشاهده شاخص‌ها، ابتدا یک آنالیز بدن ثبت کنید.' : 'Log a body analysis first to see metrics.'}
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* Main Container - White Background */}
      <View style={{ 
        backgroundColor: colors.surface, 
        borderRadius: 16, 
        padding: 16, 
        borderWidth: 1, 
        borderColor: colors.cardBorder,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
      }}>
        
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: 4, fontFamily: APP_FONT }}>
            {isFa ? 'شاخص‌های سلامتی' : 'Health Metrics'}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: APP_FONT }}>
            {isFa ? 'تحلیل شاخص‌های سلامتی' : 'Health Metrics Analysis'}
          </Text>
        </View>

        {/* List of Risks/Metrics */}
        {risks.length === 0 ? (
           <View style={{ alignItems: 'center', paddingVertical: 20 }}>
             <Text style={{ fontSize: 12, color: colors.success, fontWeight: '700', fontFamily: APP_FONT }}>✅ {isFa ? 'همه شاخص‌ها در محدوده نرمال هستند' : 'All metrics are within normal ranges'}</Text>
           </View>
        ) : (
          <View style={{ gap: 10 }}>
            {risks.map((risk) => (
              <Pressable 
                key={risk.id}
                onPress={() => handlePress(risk)}
                style={({ pressed }) => ({
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  backgroundColor: pressed ? colors.surfaceAlt : getBgColor(risk.status), 
                  padding: 14, 
                  borderRadius: 12, 
                  borderWidth: 1, 
                  borderColor: getStatusColor(risk.status) + '40', 
                })}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 4, fontFamily: APP_FONT }}>
                    {risk.title}
                  </Text>
                  
                  {/* Value Display - LTR enforced */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                     <Text style={{ fontSize: 12, color: colors.textSecondary, direction: 'ltr', includeFontPadding: false, fontWeight: '600', fontFamily: APP_FONT }}>
                       {risk.valueDisplay}
                     </Text>
                  </View>
                </View>
                
                {/* Status Badge */}
                <View style={{ 
                  paddingHorizontal: 10, 
                  paddingVertical: 6, 
                  borderRadius: 999, 
                  backgroundColor: '#FFFFFF', 
                  borderWidth: 1,
                  borderColor: getStatusColor(risk.status)
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: getStatusColor(risk.status), fontFamily: APP_FONT }}>
                    {risk.status === 'critical' ? (isFa ? 'بحرانی' : 'CRITICAL') : 
                     risk.status === 'warning' ? (isFa ? 'هشدار' : 'WARNING') : 
                     (isFa ? 'نرمال' : 'NORMAL')}
                  </Text>
                </View>
                
                <Icon name="chevronForward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {/* Footer Note */}
        <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 12, textAlign: 'center', fontStyle: 'italic', fontFamily: APP_FONT }}>
          {isFa 
            ? '⚠️ روی هر مورد کلیک کنید تا توضیحات کامل بالینی را ببینید.' 
            : '⚠️ Tap each item to view full clinical details.'}
        </Text>
      </View>

      {/* Detail Modal */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={[styles.modalView, { backgroundColor: colors.surface }]}>
            
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, width: '100%' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, flex: 1, textAlign: isFa ? 'right' : 'left', fontFamily: APP_FONT }}>
                {selectedRisk?.title}
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 16, color: colors.textSecondary, fontFamily: APP_FONT }}>×</Text>
              </Pressable>
            </View>

            {/* Status Badge in Modal */}
            <View style={{ alignSelf: 'flex-start', marginBottom: 15 }}>
               <View style={{ 
                 paddingHorizontal: 10, 
                 paddingVertical: 5, 
                 borderRadius: 999, 
                 backgroundColor: selectedRisk ? getStatusColor(selectedRisk.status) + '22' : '#eee',
                 borderWidth: 1,
                 borderColor: selectedRisk ? getStatusColor(selectedRisk.status) : '#ccc'
               }}>
                 <Text style={{ fontSize: 11, fontWeight: '800', color: selectedRisk ? getStatusColor(selectedRisk.status) : '#000', fontFamily: APP_FONT }}>
                   {selectedRisk?.status === 'critical' ? (isFa ? 'وضعیت بحرانی' : 'Critical Condition') : 
                    selectedRisk?.status === 'warning' ? (isFa ? 'نیازمند توجه' : 'Needs Attention') : 
                    (isFa ? 'وضعیت مطلوب' : 'Optimal Condition')}
                 </Text>
               </View>
            </View>

            {/* Explanation Scroll Area - Justified Text & Consistent Font */}
            <ScrollView style={{ maxHeight: 300, width: '100%' }}>
              <Text style={{ 
                fontSize: 14, 
                lineHeight: 24, 
                color: colors.textSecondary, 
                textAlign: 'justify', 
                fontFamily: APP_FONT // ✅ FONT FIXED HERE BASED ON LANGUAGE
              }}>
                {isFa ? selectedRisk?.explanationFa : selectedRisk?.explanationEn}
              </Text>
            </ScrollView>

            {/* Close Button */}
            <Pressable
              onPress={() => setModalVisible(false)}
              style={{ ...styles.openButton, backgroundColor: colors.primary, marginTop: 20 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: "#FFFFFF", fontFamily: APP_FONT }}>
                {isFa ? 'متوجه شدم' : 'Got it'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 400,
  },
  openButton: {
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    width: '100%',
    alignItems: 'center',
  },
});