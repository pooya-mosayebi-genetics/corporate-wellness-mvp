import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface MacroProgress {
  consumed: number;
  target: number;
  label: string;
  color: string;
}

interface CalorieMacroRingProps {
  consumed: number;
  target: number;
  protein: MacroProgress;
  carbs: MacroProgress;
  fat: MacroProgress;
}

export default function CalorieMacroRing({
  consumed,
  target,
  protein,
  carbs,
  fat,
}: CalorieMacroRingProps) {
  // محاسبات دایره اصلی
  const size = 220;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(consumed / target, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const percentage = Math.round(progress * 100);

  const remaining = Math.max(target - consumed, 0);

  return (
    <View className="items-center">
      {/* دایره اصلی کالری */}
      <View style={{ width: size, height: size }} className="items-center justify-center">
        <Svg width={size} height={size}>
          {/* پس‌زمینه دایره */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* حلقه پیشرفت */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1E3A8A"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        {/* متن وسط دایره */}
        <View className="absolute items-center">
          <Text className="text-4xl font-bold text-primary">{consumed}</Text>
          <Text className="text-sm text-slate-500">/ {target} kcal</Text>
          <Text className="text-xs text-accent font-semibold mt-1">
            {remaining} remaining
          </Text>
        </View>
      </View>

      {/* درصد کلی */}
      <View className="mt-4 bg-primary/10 rounded-full px-4 py-1.5">
        <Text className="text-sm font-semibold text-primary">
          {percentage}% of daily goal
        </Text>
      </View>

      {/* ماکروها */}
      <View className="flex-row justify-between w-full mt-6 gap-3">
        <MacroBar {...protein} />
        <MacroBar {...carbs} />
        <MacroBar {...fat} />
      </View>
    </View>
  );
}

// کامپوننت داخلی برای نمایش هر ماکرو
function MacroBar({ consumed, target, label, color }: MacroProgress) {
  const progress = Math.min(consumed / target, 1);
  const percentage = Math.round(progress * 100);

  return (
    <View className="flex-1 bg-surface rounded-xl p-3 items-center">
      <View className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
        <View
          className="h-full rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </View>
      <Text className="text-xs font-semibold text-slate-600">{label}</Text>
      <Text className="text-sm font-bold text-slate-800 mt-1">
        {consumed}g
      </Text>
      <Text className="text-xs text-slate-400">/ {target}g</Text>
    </View>
  );
}