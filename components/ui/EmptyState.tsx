import { View, Text, TouchableOpacity } from 'react-native';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <View className={`bg-gray-50 rounded-lg p-8 items-center ${className}`}>
      {icon && <View className="mb-4">{icon}</View>}

      <Text className="text-gray-900 font-semibold text-lg text-center mb-2">
        {title}
      </Text>

      {description && (
        <Text className="text-gray-600 text-center text-sm mb-4">
          {description}
        </Text>
      )}

      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          className="bg-blue-600 rounded-lg px-6 py-3 mt-2"
        >
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
