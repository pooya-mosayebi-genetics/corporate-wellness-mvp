import { View, ViewProps } from 'react-native';

interface AppCardProps extends ViewProps {
  className?: string;
}

export default function AppCard({ className = '', children, ...props }: AppCardProps) {
  return (
    <View
      className={`bg-white rounded-2xl p-6 shadow-lg ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}