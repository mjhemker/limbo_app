import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  className?: string;
}

const variantClasses = {
  primary: 'bg-black',
  secondary: 'bg-gray-600',
  outline: 'bg-transparent border-2 border-black',
  danger: 'bg-red-600',
  ghost: 'bg-transparent',
};

const textVariantClasses = {
  primary: 'text-white',
  secondary: 'text-white',
  outline: 'text-black',
  danger: 'text-white',
  ghost: 'text-primary-500',
};

const sizeClasses = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4',
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export default function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  className = '',
}: ButtonProps) {
  const variantClass = variantClasses[variant];
  const textVariantClass = textVariantClasses[variant];
  const sizeClass = sizeClasses[size];
  const textSizeClass = textSizeClasses[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`
        ${variantClass}
        ${sizeClass}
        rounded-lg
        flex-row
        items-center
        justify-center
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50' : ''}
        ${className}
      `}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? '#000000' : 'white'} />
      ) : (
        <>
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={`${textVariantClass} ${textSizeClass} font-semibold`}>
            {children}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
