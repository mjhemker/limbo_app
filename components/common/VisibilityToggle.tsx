import { View, Text, TouchableOpacity } from 'react-native';
import { Lock, Users } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as haptics from '../../utils/haptics';

interface VisibilityToggleProps {
  isVisible: boolean;
  onToggle: (newValue: boolean) => void;
  variant?: 'compact' | 'full';
  disabled?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function VisibilityToggle({
  isVisible,
  onToggle,
  variant = 'compact',
  disabled = false,
}: VisibilityToggleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    haptics.lightImpact();
    scale.value = withSpring(0.9, { damping: 15 }, () => {
      scale.value = withSpring(1);
    });
    onToggle(!isVisible);
  };

  if (variant === 'full') {
    return (
      <View className="flex-row gap-2">
        {/* Private Option */}
        <TouchableOpacity
          onPress={() => {
            if (!disabled && isVisible) {
              haptics.lightImpact();
              onToggle(false);
            }
          }}
          disabled={disabled}
          className={`flex-1 flex-row items-center justify-center py-3 rounded-full border-2 ${
            !isVisible
              ? 'bg-ink border-ink'
              : 'bg-card border-rule'
          }`}
          activeOpacity={0.7}
        >
          <Lock
            size={16}
            color={!isVisible ? '#FFFFFF' : '#6B6760'}
            strokeWidth={2.5}
          />
          <Text
            className={`font-bold text-[13px] ml-2 ${
              !isVisible ? 'text-white' : 'text-ink-soft'
            }`}
          >
            Private
          </Text>
        </TouchableOpacity>

        {/* Friends Option */}
        <TouchableOpacity
          onPress={() => {
            if (!disabled && !isVisible) {
              haptics.lightImpact();
              onToggle(true);
            }
          }}
          disabled={disabled}
          className={`flex-1 flex-row items-center justify-center py-3 rounded-full border-2 ${
            isVisible
              ? 'bg-ink border-ink'
              : 'bg-card border-rule'
          }`}
          activeOpacity={0.7}
        >
          <Users
            size={16}
            color={isVisible ? '#FFFFFF' : '#6B6760'}
            strokeWidth={2.5}
          />
          <Text
            className={`font-bold text-[13px] ml-2 ${
              isVisible ? 'text-white' : 'text-ink-soft'
            }`}
          >
            Friends
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Compact variant - single toggle button
  return (
    <AnimatedView style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        className={`flex-row items-center px-3 py-1.5 rounded-full ${
          isVisible ? 'bg-green/15' : 'bg-sand'
        }`}
        activeOpacity={0.7}
      >
        {isVisible ? (
          <>
            <Users size={14} color="#6AAA64" strokeWidth={2.5} />
            <Text className="text-[11px] font-bold text-green ml-1.5">
              Friends
            </Text>
          </>
        ) : (
          <>
            <Lock size={14} color="#6B6760" strokeWidth={2.5} />
            <Text className="text-[11px] font-bold text-ink-soft ml-1.5">
              Private
            </Text>
          </>
        )}
      </TouchableOpacity>
    </AnimatedView>
  );
}

// Blurred card component for private items on other profiles
interface BlurredPrivateCardProps {
  ownerName?: string;
}

export function BlurredPrivateCard({ ownerName = 'This user' }: BlurredPrivateCardProps) {
  return (
    <View className="bg-sand/80 rounded-[18px] p-6 items-center justify-center min-h-[120px]">
      <View className="bg-card rounded-full p-3 mb-3">
        <Lock size={24} color="#6B6760" strokeWidth={2} />
      </View>
      <Text className="text-ink font-bold text-[15px] text-center mb-1">
        Private Response
      </Text>
      <Text className="text-ink-soft text-[13px] text-center">
        {ownerName} has kept this response private
      </Text>
    </View>
  );
}
