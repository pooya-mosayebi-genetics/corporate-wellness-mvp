import { Text, Pressable, ActivityIndicator } from 'react-native';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
}

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: AppButtonProps) {
  const getButtonStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary rounded-xl p-4 items-center';
      case 'secondary':
        return 'bg-slate-200 rounded-xl p-4 items-center';
      case 'outline':
        return 'bg-white border border-primary rounded-xl p-4 items-center';
      default:
        return 'bg-primary rounded-xl p-4 items-center';
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case 'primary':
        return 'text-white';
      case 'secondary':
        return 'text-slate-700';
      case 'outline':
        return 'text-primary';
      default:
        return 'text-white';
    }
  };

  if (loading) {
    return (
      <Pressable className={getButtonStyles()} disabled>
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#1E3A8A'} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className={getButtonStyles()}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Text className={`text-base font-semibold ${getTextStyles()}`}>
        {title}
      </Text>
    </Pressable>
  );
}