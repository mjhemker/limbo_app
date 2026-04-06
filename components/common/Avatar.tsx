import { View, Image, Text } from 'react-native';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const textSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
};

export default function Avatar({ uri, name, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = sizeClasses[size];
  const textSizeClass = textSizeClasses[size];
  const initial = name?.[0]?.toUpperCase() || '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        className={`${sizeClass} rounded-full bg-gray-300 ${className}`}
      />
    );
  }

  return (
    <View className={`${sizeClass} rounded-full bg-gray-300 items-center justify-center ${className}`}>
      <Text className={`${textSizeClass} text-gray-600 font-semibold`}>
        {initial}
      </Text>
    </View>
  );
}
