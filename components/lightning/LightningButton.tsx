import { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Zap, ChevronRight } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import * as haptics from '../../utils/haptics';

const AnimatedView = Animated.createAnimatedComponent(View);

interface LightningButtonProps {
  userId: string;
  variant?: 'card' | 'button';
}

/**
 * LightningButton - CTA to start a lightning round
 */
export default function LightningButton({ userId, variant = 'card' }: LightningButtonProps) {
  const router = useRouter();

  // Spin entrance animation for Lightning icon
  const iconScale = useSharedValue(0);
  const iconRotation = useSharedValue(-180);

  useEffect(() => {
    // Animate icon: scale 0, rotate -180 → scale 1, rotate 0
    iconScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 200 }));
    iconRotation.value = withDelay(200, withSpring(0, { damping: 12, stiffness: 200 }));
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotation.value}deg` },
    ],
  }));

  const handlePress = () => {
    haptics.mediumImpact();
    router.push('/lightning');
  };

  if (variant === 'button') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        className="flex-row items-center bg-ink rounded-full px-4 py-2.5"
        activeOpacity={0.8}
      >
        <AnimatedView style={iconAnimatedStyle}>
          <Zap size={16} color="#F7DA21" fill="#F7DA21" />
        </AnimatedView>
        <Text className="text-white font-bold text-[13px] ml-1.5">Lightning</Text>
      </TouchableOpacity>
    );
  }

  // Card variant
  return (
    <TouchableOpacity
      onPress={handlePress}
      className="bg-ink rounded-[22px] p-4"
      activeOpacity={0.85}
    >
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
          <AnimatedView style={iconAnimatedStyle}>
            <Zap size={24} color="#111111" fill="#F7DA21" />
          </AnimatedView>
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-[16px] font-extrabold text-white" style={{ letterSpacing: -0.3 }}>
            Lightning Round
          </Text>
          <Text className="text-[12px] text-white/60 mt-0.5">
            Quick-fire questions · 60 seconds
          </Text>
        </View>
        <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
      </View>
    </TouchableOpacity>
  );
}
