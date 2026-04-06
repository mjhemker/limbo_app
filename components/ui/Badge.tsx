import { View, Text } from 'react-native';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  className?: string;
}

const variantClasses = {
  primary: 'bg-blue-100 text-blue-600',
  secondary: 'bg-gray-100 text-gray-600',
  success: 'bg-green-100 text-green-600',
  warning: 'bg-yellow-100 text-yellow-600',
  danger: 'bg-red-100 text-red-600',
  info: 'bg-cyan-100 text-cyan-600',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  rounded = true,
  className = '',
}: BadgeProps) {
  const variantClass = variantClasses[variant];
  const sizeClass = sizeClasses[size];

  const textColor = variantClass.split(' ')[1]; // Extract text color class

  return (
    <View
      className={`
        ${variantClass.split(' ')[0]}
        ${sizeClass.split(' ').slice(0, 2).join(' ')}
        ${rounded ? 'rounded-full' : 'rounded'}
        items-center
        justify-center
        ${className}
      `}
    >
      <Text className={`${textColor} ${sizeClass.split(' ')[2]} font-semibold`}>
        {children}
      </Text>
    </View>
  );
}
