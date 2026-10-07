import { Text, View } from 'react-native';

export default function ComplianceBadge() {
  return (
    <View className="bg-green-50 border border-green-300 rounded-xl p-4 mb-4">
      <View className="flex-row items-center">
        <Text className="text-2xl mr-3">🔒</Text>
        <View className="flex-1">
          <Text className="text-sm font-bold text-green-800">
            HIPAA/GDPR Compliant
          </Text>
          <Text className="text-xs text-green-700 mt-0.5">
            No individual data is displayed or shared. Only aggregated insights.
          </Text>
        </View>
        <View className="bg-green-600 rounded-full px-3 py-1">
          <Text className="text-xs font-bold text-white">VERIFIED</Text>
        </View>
      </View>
    </View>
  );
}