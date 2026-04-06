import { View, TouchableOpacity, ViewProps } from 'react-native';
import { ReactNode } from 'react';

interface CardProps extends ViewProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClasses = {
  default: 'bg-white',
  outlined: 'bg-white border border-gray-200',
  elevated: 'bg-white shadow-md',
};

const paddingClasses = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

export default function Card({
  children,
  onPress,
  variant = 'outlined',
  padding = 'md',
  className = '',
  ...viewProps
}: CardProps) {
  const variantClass = variantClasses[variant];
  const paddingClass = paddingClasses[padding];

  const content = (
    <View
      className={`rounded-lg ${variantClass} ${paddingClass} ${className}`}
      {...viewProps}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
