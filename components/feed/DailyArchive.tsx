import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useDailyArchive, DailyArchiveItem } from '../../hooks/usePrompt';
import * as haptics from '../../utils/haptics';

// Colors for completed days (cycling through) - matches webapp spec
const DAY_COLORS = ['#5B8A3F', '#F26E5E', '#F7DA21', '#7B68EE', '#E8F1E0', '#FFB366', '#5DADE2'];

interface DailyArchiveProps {
  userId?: string;
  animKey?: number;
}

export function DailyArchive({ userId, animKey = 0 }: DailyArchiveProps) {
  const router = useRouter();
  const { data: archive, isLoading } = useDailyArchive(userId);

  if (isLoading || !archive) {
    return null;
  }

  // Count answered days
  const answeredCount = archive.filter((day) => day.hasAnswered).length;

  const handleDayPress = (day: DailyArchiveItem) => {
    if (!day.prompt) return;
    haptics.lightImpact();
    router.push(`/(tabs)/feed/prompts/${day.prompt.id}`);
  };

  return (
    <Animated.View
      key={`archive-${animKey}`}
      entering={FadeInDown.delay(200).duration(400).springify()}
      className="px-5 mb-4"
    >
      {/* Section header */}
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text className="text-[16px] font-extrabold text-ink" style={{ letterSpacing: -0.3 }}>
            Daily Archive
          </Text>
          <Text className="text-[12px] text-ink-soft font-medium">
            Last 7 days · {answeredCount} of 7 done
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/feed/prompts')}>
          <Text className="text-[11px] font-extrabold text-ink-soft uppercase tracking-wide">
            See all
          </Text>
        </TouchableOpacity>
      </View>

      {/* Day circles - horizontal row */}
      <View className="flex-row justify-between">
        {archive.map((day, index) => {
          const hasPrompt = !!day.prompt;
          const bgColor = day.hasAnswered
            ? DAY_COLORS[index % DAY_COLORS.length]
            : '#E8E4DE';
          const textColor = day.hasAnswered ? '#FFFFFF' : '#6B6760';

          return (
            <TouchableOpacity
              key={day.date}
              onPress={() => handleDayPress(day)}
              disabled={!hasPrompt}
              activeOpacity={hasPrompt ? 0.7 : 1}
              className="items-center"
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center mb-1"
                style={{ backgroundColor: bgColor, opacity: hasPrompt ? 1 : 0.5 }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: textColor }}
                >
                  {day.dayLetter}
                </Text>
                <Text
                  className="text-[12px] font-extrabold -mt-0.5"
                  style={{ color: textColor }}
                >
                  {day.dayNumber}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}
