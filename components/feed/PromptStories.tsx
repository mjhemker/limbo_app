import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Plus } from 'lucide-react-native';
import { useDailyPrompts } from '../../hooks/usePrompt';
import { useAuth } from '../../contexts/AuthContext';
import * as haptics from '../../utils/haptics';

interface PromptStoriesProps {
  userResponsePromptIds: string[];  // Array of prompt IDs user has responded to
  todaysPromptId?: string;
}

export function PromptStories({ userResponsePromptIds, todaysPromptId }: PromptStoriesProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: dailyPrompts, isLoading } = useDailyPrompts();

  if (isLoading || !dailyPrompts || dailyPrompts.length === 0) {
    return null;
  }

  // Create a Set for fast lookup
  const respondedPromptIds = new Set(userResponsePromptIds);

  // Format the date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const promptDate = new Date(date);
    promptDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - promptDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handlePromptPress = (prompt: any) => {
    haptics.lightImpact();

    // Navigate to prompt detail/response page
    if (prompt.id === todaysPromptId) {
      // Today's prompt - go to compose or feed
      router.push('/compose');
    } else {
      // Past prompt - go to prompt detail page
      router.push(`/(tabs)/feed/prompts/${prompt.id}`);
    }
  };

  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-5"
        contentContainerStyle={{ paddingRight: 20 }}
      >
        <View className="flex-row gap-3">
          {dailyPrompts.map((prompt, index) => {
            const isToday = prompt.id === todaysPromptId;
            const hasResponded = respondedPromptIds.has(prompt.id);
            const isViewed = hasResponded;  // Mark as viewed if responded

            return (
              <TouchableOpacity
                key={prompt.id}
                onPress={() => handlePromptPress(prompt)}
                className="items-center"
                style={{ width: 72 }}
              >
                {/* Story Ring */}
                <View
                  className={`w-16 h-16 rounded-full p-0.5 ${
                    isToday
                      ? 'bg-gradient-to-tr from-primary-500 to-orange-500'
                      : hasResponded
                      ? 'bg-gray-300'
                      : 'bg-gradient-to-tr from-primary-400 to-primary-600'
                  }`}
                  style={{
                    borderWidth: isToday && !hasResponded ? 3 : 2,
                    borderColor: isToday
                      ? '#FFBF00'
                      : hasResponded
                      ? '#d1d5db'
                      : '#FFBF00',
                  }}
                >
                  <View
                    className={`flex-1 rounded-full items-center justify-center ${
                      hasResponded ? 'bg-gray-100' : 'bg-white'
                    }`}
                  >
                    {hasResponded ? (
                      <Check size={24} color="#10B981" strokeWidth={3} />
                    ) : (
                      <Plus size={24} color="#FFBF00" strokeWidth={2} />
                    )}
                  </View>
                </View>

                {/* Label */}
                <Text
                  className={`text-xs mt-1.5 text-center ${
                    isToday ? 'font-bold text-black' : 'text-gray-600'
                  }`}
                  numberOfLines={1}
                >
                  {formatDate(prompt.active_date)}
                </Text>

                {/* Answered indicator dot */}
                {hasResponded && (
                  <View className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
