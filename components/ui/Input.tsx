import { View, TextInput, Text, TextInputProps } from 'react-native';
import { ReactNode } from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerClassName?: string;
}

export default function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerClassName = '',
  className = '',
  ...textInputProps
}: InputProps) {
  return (
    <View className={`mb-4 ${containerClassName}`}>
      {/* Label */}
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>
      )}

      {/* Input container */}
      <View
        className={`
          flex-row
          items-center
          border
          rounded-lg
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${textInputProps.editable === false ? 'bg-gray-100' : 'bg-white'}
        `}
      >
        {/* Left icon */}
        {leftIcon && <View className="pl-3">{leftIcon}</View>}

        {/* Text input */}
        <TextInput
          className={`flex-1 px-4 py-3 text-base text-gray-900 ${className}`}
          placeholderTextColor="#9ca3af"
          {...textInputProps}
        />

        {/* Right icon */}
        {rightIcon && <View className="pr-3">{rightIcon}</View>}
      </View>

      {/* Error message */}
      {error && (
        <Text className="text-xs text-red-600 mt-1">{error}</Text>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <Text className="text-xs text-gray-500 mt-1">{helperText}</Text>
      )}
    </View>
  );
}
