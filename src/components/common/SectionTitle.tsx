import { Text, View } from 'react-native';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export default function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <View className="mb-4">
      <Text className="text-lg font-semibold text-slate-800">{title}</Text>
      {subtitle && (
        <Text className="text-sm text-slate-500 mt-1">{subtitle}</Text>
      )}
    </View>
  );
}