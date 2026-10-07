import { useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useTheme } from '../../store/ThemeContext';
import { useLanguage } from '../../store/LanguageContext';
import { useWellness } from '../../store/WellnessContext';
import MetricRangeCard from './MetricRangeCard';
import type { BodyAnalysisDerived, BodyAnalysisRecord } from '../../types/bodyAnalysis';
import { getStatus } from '../../utils/bodyAnalysis';
import { SMI_RANGES } from '../../constants/bodyRanges';

interface BodyReportDashboardProps {
  record: BodyAnalysisRecord;
  derived: BodyAnalysisDerived;
}

function ReportStatCard({
  icon,
  label,
  value,
  unit,
  footnote,
}: {
  icon: string;
  label: string;
  value: string;
  unit?: string;
  footnote: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      className="flex-1 rounded-2xl p-4 m-1.5"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}
    >
      <View className="flex-row items-center mb-3">
        <View
          className="w-8 h-8 rounded-lg items-center justify-center ml-2"
          style={{ backgroundColor: colors.primarySoft }}
        >
          <Text style={{ fontSize: 14 }}>{icon}</Text>
        </View>
        <Text
          className="text-xs font-semibold flex-1"
          style={{ color: colors.textSecondary }}
        >
          {label}
        </Text>
      </View>
      <View className="flex-row items-baseline">
        <Text className="text-xl font-bold" style={{ color: colors.text }}>
          {value}
        </Text>
        {unit ? (
          <Text className="text-xs ml-1" style={{ color: colors.textMuted }}>
            {unit}
          </Text>
        ) : null}
      </View>
      <Text className="mt-1" style={{ fontSize: 10, color: colors.textMuted }}>
        {footnote}
      </Text>
    </View>
  );
}

export default function BodyReportDashboard({ record, derived }: BodyReportDashboardProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { state } = useWellness();
  const isFa = language === 'fa';
  const { profile, targets, bodyAnalyses } = state;

  const [periodCount, setPeriodCount] = useState<number>(10);

  if (!profile) return null;

  const heightM2 = (profile.heightCm / 100) * (profile.heightCm / 100);

  // وضعیت وزن بر اساس محدوده سالم
  const weightStatus = getStatus(record.weightKg, {
    min: derived.healthyWeightMin,
    max: derived.healthyWeightMax,
    unit: 'kg',
  });

  // بازه توده عضلانی از SMI
  const muscleZone = {
    min: Math.round(SMI_RANGES[profile.gender].min * heightM2 * 10) / 10,
    max: Math.round(SMI_RANGES[profile.gender].max * heightM2 * 10) / 10,
  };
  const muscleStatus = getStatus(record.skeletalMuscleMassKg, {
    ...muscleZone,
    unit: 'kg',
  });

  // داده روند چربی
  const fatHistory = [...bodyAnalyses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(periodCount === 0 ? 0 : -periodCount);

  const trendWidth = 300;
  const trendHeight = 150;
  const tPadT = 16;
  const tPadB = 20;
  const tChartH = trendHeight - tPadT - tPadB;

  const fatValues = fatHistory.map((a) => a.bodyFatPercent);
  let fMin = Math.min(...fatValues, record.bodyFatPercent);
  let fMax = Math.max(...fatValues, record.bodyFatPercent);
  if (fMax - fMin < 2) {
    fMin -= 1;
    fMax += 1;
  }
  const allPoints = [...fatHistory.map((a) => a.bodyFatPercent), record.bodyFatPercent];
  const tx = (i: number) =>
    allPoints.length > 1 ? 20 + (i / (allPoints.length - 1)) * (trendWidth - 40) : trendWidth / 2;
  const ty = (v: number) => tPadT + tChartH - ((v - fMin) / (fMax - fMin)) * tChartH;
  const trendLine = allPoints.map((v, i) => `${tx(i)},${ty(v)}`).join(' ');

  const rec = derived.recommendation;

  const goalLabel =
    profile.goal === 'lose_fat'
      ? isFa ? 'کاهش وزن' : 'Weight Loss'
      : profile.goal === 'maintain'
      ? isFa ? 'ثبات وزن' : 'Maintain'
      : isFa ? 'افزایش عضله' : 'Muscle Gain';

  const symmetryBadge = (balanced: boolean) => (
    <View
      className="px-3 py-1 rounded-full"
      style={{ backgroundColor: balanced ? colors.accentSoft : colors.warningSoft }}
    >
      <Text
        className="text-xs font-bold"
        style={{ color: balanced ? colors.success : colors.warning }}
      >
        {balanced ? isFa ? 'تقارن مطلوب' : 'Balanced' : isFa ? 'عدم تقارن' : 'Imbalanced'}
      </Text>
    </View>
  );

  return (
    <View>
      {/* بنر گزارش */}
      <View
        className="rounded-2xl p-4 mb-4 flex-row items-center"
        style={{ backgroundColor: colors.primarySoft }}
      >
        <View
          className="w-10 h-10 rounded-xl items-center justify-center ml-3"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-lg text-white">📋</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold" style={{ color: colors.text }}>
            {isFa ? 'گزارش آنالیز ترکیب بدنی' : 'Body Composition Report'}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
            {isFa
              ? 'گزارش کامل از دادهٔ آنالایزر — آمادهٔ چاپ با داشبورد'
              : 'Full analyzer report — print-ready with dashboard'}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            if (typeof window !== 'undefined') window.print();
          }}
          className="px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-xs font-bold text-white">
            {isFa ? 'گزارش آخرین آنالیز' : 'Latest Report'}
          </Text>
        </Pressable>
      </View>

      {/* ۴ کارت آماری */}
      <View className="flex-row">
        <ReportStatCard
          icon="🔥"
          label={isFa ? 'متابولیسم پایه' : 'Basal Metabolism'}
          value={record.basalMetabolismKcal ? `${record.basalMetabolismKcal}` : '—'}
          unit="kcal/day"
          footnote={isFa ? 'انرژی پایهٔ موردنیاز بدن' : 'Base energy need of the body'}
        />
        <ReportStatCard
          icon="🍽️"
          label={isFa ? 'نیاز کالری روزانه' : 'Daily Calorie Need'}
          value={targets ? `${targets.calories}` : '—'}
          unit="kcal/day"
          footnote={isFa ? 'تخمین با فعالیت انتخابی' : 'Estimated with activity level'}
        />
      </View>
      <View className="flex-row mb-2">
        <ReportStatCard
          icon="🎯"
          label={isFa ? 'وزن هدف' : 'Target Weight'}
          value={`${derived.targetWeight}`}
          unit="kg"
          footnote={
            isFa
              ? `${Math.round((record.weightKg - derived.targetWeight) * 10) / 10} kg تا هدف`
              : `${Math.round((record.weightKg - derived.targetWeight) * 10) / 10} kg to goal`}
        />
        <ReportStatCard
          icon="✅"
          label={isFa ? 'محدودهٔ وزن سالم' : 'Healthy Weight Range'}
          value={`${derived.healthyWeightMin}–${derived.healthyWeightMax}`}
          unit="kg"
          footnote={isFa ? 'بر اساس تودهٔ بدون چربی (FFM)' : 'Based on fat-free mass (FFM)'}
        />
      </View>

      {/* روند درصد چربی */}
      <View
        className="rounded-2xl p-5 mb-4"
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-bold" style={{ color: colors.text }}>
            {isFa ? 'روند درصد چربی بدن' : 'Body Fat Trend'}
          </Text>
          <View className="flex-row rounded-lg overflow-hidden" style={{ backgroundColor: colors.surfaceAlt }}>
            {[10, 20, 0].map((count) => (
              <Pressable
                key={count}
                onPress={() => setPeriodCount(count)}
                className="px-3 py-1.5"
                style={{
                  backgroundColor: periodCount === count ? colors.surface : 'transparent',
                  borderWidth: 1,
                  borderColor: periodCount === count ? colors.border : 'transparent',
                  borderRadius: 8,
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{
                    color: periodCount === count ? colors.text : colors.textMuted,
                  }}
                >
                  {count === 0 ? (isFa ? 'همه' : 'All') : `${count}`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="flex-row items-baseline mb-2">
          <Text className="text-3xl font-bold" style={{ color: colors.warning }}>
            {record.bodyFatPercent}
          </Text>
          <Text className="text-sm ml-1" style={{ color: colors.textMuted }}>
            %
          </Text>
        </View>

        <Svg width={trendWidth} height={trendHeight}>
          <Line
            x1={20}
            x2={trendWidth - 20}
            y1={tPadT + tChartH / 2}
            y2={tPadT + tChartH / 2}
            stroke={colors.border}
            strokeDasharray="4,4"
          />
          {allPoints.length > 1 && (
            <Polyline
              points={trendLine}
              stroke={colors.warning}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
          )}
          {allPoints.length > 1 &&
            allPoints.map((v, i) => (
              <Circle
                key={i}
                cx={tx(i)}
                cy={ty(v)}
                r={i === allPoints.length - 1 ? 5 : 3}
                fill={colors.warning}
              />
            ))}
          {allPoints.length === 1 && (
            <>
              <Line
                x1={trendWidth / 2}
                x2={trendWidth / 2}
                y1={tPadT}
                y2={tPadT + tChartH}
                stroke={colors.warning}
                strokeDasharray="3,4"
                opacity={0.5}
              />
              <Circle cx={trendWidth / 2} cy={ty(allPoints[0])} r={5} fill={colors.warning} />
            </>
          )}
        </Svg>
      </View>

      {/* شبکه سنجه‌ها */}
      <View className="flex-row">
        <MetricRangeCard
          label={isFa ? 'وزن' : 'Weight'}
          value={record.weightKg}
          unit="kg"
          status={weightStatus}
          zoneMin={derived.healthyWeightMin}
          zoneMax={derived.healthyWeightMax}
          zoneColor={colors.metricZone.weight}
        />
        <MetricRangeCard
          label={isFa ? 'شاخص تودهٔ بدنی' : 'BMI'}
          value={derived.metrics.bmi.value}
          unit="kg/m²"
          status={derived.metrics.bmi.status}
          zoneMin={derived.metrics.bmi.range.min}
          zoneMax={derived.metrics.bmi.range.max}
          zoneColor={colors.metricZone.bmi}
        />
      </View>
      <View className="flex-row">
        <MetricRangeCard
          label={isFa ? 'درصد چربی بدن' : 'Body Fat'}
          value={record.bodyFatPercent}
          unit="%"
          status={derived.metrics.bodyFat.status}
          zoneMin={derived.metrics.bodyFat.range.min}
          zoneMax={derived.metrics.bodyFat.range.max}
          zoneColor={colors.metricZone.bodyFat}
        />
        <MetricRangeCard
          label={isFa ? 'تودهٔ عضلانی' : 'Muscle Mass'}
          value={record.skeletalMuscleMassKg}
          unit="kg"
          status={muscleStatus}
          zoneMin={muscleZone.min}
          zoneMax={muscleZone.max}
          zoneColor={colors.metricZone.muscle}
        />
      </View>
      <View className="flex-row mb-2">
        <MetricRangeCard
          label={isFa ? 'چربی احشایی' : 'Visceral Fat'}
          value={record.visceralFatAreaCm2}
          unit="cm²"
          status={derived.metrics.visceralFat.status}
          zoneMin={derived.metrics.visceralFat.range.min}
          zoneMax={derived.metrics.visceralFat.range.max}
          zoneColor={colors.metricZone.visceral}
        />
        <MetricRangeCard
          label={isFa ? 'آب بدن' : 'Body Water'}
          value={record.bodyWaterLiters}
          unit="L"
          status={derived.metrics.bodyWater.status}
          zoneMin={Math.round(derived.metrics.bodyWater.range.min * 10) / 10}
          zoneMax={Math.round(derived.metrics.bodyWater.range.max * 10) / 10}
          zoneColor={colors.metricZone.water}
        />
      </View>

      {/* تحلیل پیشرفته */}
      {derived.segmental && (
        <>
          <Text className="text-sm font-bold mb-2 mt-2" style={{ color: colors.text }}>
            {isFa ? 'تحلیل پیشرفته' : 'Advanced Analysis'}
          </Text>
          <View className="flex-row">
            <View
              className="flex-1 rounded-2xl p-4 m-1.5"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}
            >
              <Text className="text-xs mb-2" style={{ color: colors.textSecondary }}>
                {isFa ? 'تودهٔ بدون چربی قطعه‌ای · kg' : 'Segmental FFM · kg'}
              </Text>
              {symmetryBadge(derived.segmental.ffmSymmetry === 'balanced')}
            </View>
            <View
              className="flex-1 rounded-2xl p-4 m-1.5"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}
            >
              <Text className="text-xs mb-2" style={{ color: colors.textSecondary }}>
                {isFa ? 'تودهٔ چربی قطعه‌ای · kg' : 'Segmental Fat · kg'}
              </Text>
              {symmetryBadge(derived.segmental.fatSymmetry === 'balanced')}
            </View>
          </View>
          <View
            className="rounded-2xl p-4 m-1.5 mb-2"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                {isFa
                  ? 'شاخص عضلهٔ اسکلتی (SMI) — شاخص سارکوپنی'
                  : 'Skeletal Muscle Index (SMI) — Sarcopenia marker'}
              </Text>
              <View
                className="px-3 py-1 rounded-full"
                style={{
                  backgroundColor:
                    derived.segmental.smiStatus === 'normal'
                      ? colors.accentSoft
                      : colors.warningSoft,
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color:
                      derived.segmental.smiStatus === 'normal'
                        ? colors.success
                        : colors.warning,
                  }}
                >
                  {derived.segmental.smiStatus === 'normal'
                    ? isFa ? 'طبیعی' : 'Normal'
                    : isFa ? 'غیرطبیعی' : 'Abnormal'}
                </Text>
              </View>
            </View>
            <Text className="text-2xl font-bold mt-2" style={{ color: colors.text }}>
              {derived.segmental.smi}
              <Text className="text-xs" style={{ color: colors.textMuted }}> kg/m²</Text>
            </Text>
          </View>
        </>
      )}

      {/* توصیه کنترل وزن */}
      <View
        className="rounded-2xl p-5 mb-4"
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <Text className="text-sm font-bold mb-3" style={{ color: colors.text }}>
          {isFa ? 'توصیهٔ کنترل وزن' : 'Weight Control Recommendation'}
        </Text>

        <View className="flex-row mb-3">
          <View
            className="flex-1 rounded-xl p-4 mr-1.5 items-center"
            style={{ backgroundColor: colors.warningSoft }}
          >
            <Text className="text-xs mb-1" style={{ color: colors.textMuted }}>
              {isFa ? 'کاهش چربی' : 'Fat Reduction'}
            </Text>
            <Text className="text-xl font-bold" style={{ color: colors.warning }}>
              {rec.fatToLoseKg} kg
            </Text>
            <Text className="text-xs mt-1 font-bold" style={{ color: colors.warning }}>
              {rec.fatToLoseKg > 0 ? (isFa ? '● تمرکز' : '● Focus') : isFa ? '✓ در حد مطلوب' : '✓ At goal'}
            </Text>
          </View>
          <View
            className="flex-1 rounded-xl p-4 ml-1.5 items-center"
            style={{ backgroundColor: colors.accentSoft }}
          >
            <Text className="text-xs mb-1" style={{ color: colors.textMuted }}>
              {isFa ? 'افزایش عضله' : 'Muscle Gain'}
            </Text>
            <Text className="text-xl font-bold" style={{ color: colors.success }}>
              {rec.muscleToGainKg > 0 ? `${rec.muscleToGainKg} kg` : '—'}
            </Text>
            <Text className="text-xs mt-1 font-bold" style={{ color: colors.success }}>
              {rec.muscleToGainKg > 0 ? (isFa ? '● تمرکز' : '● Focus') : isFa ? '✓ در حد مطلوب' : '✓ At goal'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
            {isFa ? 'هدف غذایی' : 'Nutrition Goal'}
          </Text>
          <View className="px-3 py-1 rounded-full" style={{ backgroundColor: colors.primarySoft }}>
            <Text className="text-xs font-bold" style={{ color: colors.primary }}>
              {goalLabel}
            </Text>
          </View>
        </View>

        {rec.weeksEstimate !== null && rec.dailyDeficitKcal !== null && (
          <View className="rounded-xl p-3" style={{ backgroundColor: colors.surfaceAlt }}>
            <Text className="text-center" style={{ fontSize: 10, color: colors.textMuted }}>
              {isFa
                ? `با کسری روزانهٔ ${rec.dailyDeficitKcal} kcal، کاهش ${rec.fatToLoseKg} kg چربی حدود ${rec.weeksEstimate} هفته برآورد می‌شود.`
                : `With a ${rec.dailyDeficitKcal} kcal daily deficit, losing ${rec.fatToLoseKg} kg fat ≈ ${rec.weeksEstimate} weeks.`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}