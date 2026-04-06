import { View, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { ReactNode } from 'react';

interface ScreenContainerProps {
  children: ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  safeArea?: boolean;
  backgroundColor?: string;
  padding?: boolean;
  className?: string;
}

export default function ScreenContainer({
  children,
  scrollable = false,
  keyboardAvoiding = false,
  safeArea = true,
  backgroundColor = 'bg-white',
  padding = true,
  className = '',
}: ScreenContainerProps) {
  const paddingClass = padding ? 'p-4' : '';
  const containerClass = `flex-1 ${backgroundColor} ${paddingClass} ${className}`;

  let content = <View className={containerClass}>{children}</View>;

  if (scrollable) {
    content = (
      <ScrollView className={`flex-1 ${backgroundColor}`}>
        <View className={paddingClass}>{children}</View>
      </ScrollView>
    );
  }

  if (keyboardAvoiding) {
    content = (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  if (safeArea) {
    content = <SafeAreaView className="flex-1">{content}</SafeAreaView>;
  }

  return content;
}
