import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface TypingIndicatorProps {
  displayName?: string;
}

export function TypingIndicator({ displayName }: TypingIndicatorProps) {
  // Animated values for the three dots
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  useEffect(() => {
    // Animate dots in sequence
    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );

    dot2Opacity.value = withRepeat(
      withSequence(
        withDelay(133, withTiming(1, { duration: 400 })),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );

    dot3Opacity.value = withRepeat(
      withSequence(
        withDelay(266, withTiming(1, { duration: 400 })),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  return (
    <View className="flex-row items-center px-4 py-2">
      <View className="bg-gray-200 rounded-2xl px-4 py-3 flex-row items-center">
        <Animated.View
          style={dot1Style}
          className="w-2 h-2 rounded-full bg-gray-600 mr-1"
        />
        <Animated.View
          style={dot2Style}
          className="w-2 h-2 rounded-full bg-gray-600 mr-1"
        />
        <Animated.View
          style={dot3Style}
          className="w-2 h-2 rounded-full bg-gray-600"
        />
      </View>
      {displayName && (
        <Text className="text-xs text-gray-500 ml-2">
          {displayName} is typing...
        </Text>
      )}
    </View>
  );
}
