import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useDailyArchive, DailyArchiveItem } from '../../hooks/usePrompt';
import * as haptics from '../../utils/haptics';

interface DailyArchiveProps {
  userId?: string;
  animKey?: number;
}

export function DailyArchive({ userId, animKey = 0 }: DailyArchiveProps) {
  const router = useRouter();
  const { data: archive, isLoading } = useDailyArchive(userId);

  if (isLoading || !archive) return null;

  const handleDayPress = (day: DailyArchiveItem) => {
    if (!day.prompt) return;
    haptics.lightImpact();
    router.push(`/(tabs)/feed/prompts/${day.prompt.id}`);
  };

  return (
    <View className="px-5 mb-4">
      {/* Section header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-[16px] font-extrabold text-ink" style={{ letterSpacing: -0.3 }}>
          Daily Archive
        </Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/feed/prompts')}>
          <Text className="text-[11px] font-extrabold text-ink-soft uppercase tracking-wide">
            See all
          </Text>
        </TouchableOpacity>
      </View>

      {/* Day circles */}
      <View className="flex-row" style={{ gap: 8 }}>
        {archive.map((day) => {
          const hasPrompt = !!day.prompt;

          let bgColor = 'transparent';
          let textColor = '#6B6760';
          let borderWidth = 0;
          let borderColor = 'transparent';

          // Fill follows completion state for every day. Today's only unique trait is the solid black ring.
          if (day.hasAnswered) {
            bgColor = '#F7DA21';
            textColor = '#111111';
          } else {
            textColor = '#6B6B6B';
            borderWidth = 2;
            borderColor = 'rgba(107, 107, 107, 0.25)';
          }
          if (day.isToday) {
            borderWidth = 2;
            borderColor = '#111111';
          }

          const inner = (
            <>
              <Text className="text-[11px] font-bold" style={{ color: textColor }}>
                {day.dayLetter}
              </Text>
              <Text className="text-[14px] font-extrabold -mt-0.5" style={{ color: textColor }}>
                {day.dayNumber}
              </Text>
            </>
          );

          return (
            <TouchableOpacity
              key={day.date}
              onPress={() => handleDayPress(day)}
              disabled={!hasPrompt}
              activeOpacity={hasPrompt ? 0.7 : 1}
              className="flex-1 items-center"
              style={{ opacity: hasPrompt ? 1 : 0.5 }}
            >
              <View
                className="w-full rounded-full items-center justify-center"
                style={{
                  aspectRatio: 1,
                  backgroundColor: bgColor,
                  borderWidth,
                  borderColor,
                }}
              >
                {inner}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
