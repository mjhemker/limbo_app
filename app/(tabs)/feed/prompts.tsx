import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, Check } from 'lucide-react-native';
import { useDailyPrompts } from '../../../hooks/usePrompt';
import { useAnsweredPromptIds } from '../../../hooks/useResponses';
import { useAuth } from '../../../contexts/AuthContext';

export default function PromptsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: prompts, isLoading } = useDailyPrompts();
  const { data: answeredPromptIds } = useAnsweredPromptIds(user?.id);

  const answeredSet = new Set(answeredPromptIds || []);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FFBF00" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-2xl font-bold text-gray-900 mb-6">
            Recent Daily Prompts
          </Text>

          {prompts && prompts.length > 0 ? (
            <View className="gap-3">
              {prompts.map((prompt: any) => {
                const isAnswered = answeredSet.has(prompt.id);

                return (
                  <TouchableOpacity
                    key={prompt.id}
                    className={`bg-white border rounded-xl p-4 ${
                      isAnswered ? 'border-green-300 bg-green-50' : 'border-gray-200'
                    }`}
                    onPress={() => router.push(`/(tabs)/feed/prompts/${prompt.id}`)}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1 mr-2">
                        <Text className="text-lg font-semibold text-gray-900">
                          {prompt.text}
                        </Text>
                      </View>
                      {isAnswered ? (
                        <View className="bg-green-500 rounded-full p-1.5">
                          <Check size={14} color="white" strokeWidth={3} />
                        </View>
                      ) : (
                        <View className="bg-primary-50 rounded-lg px-2 py-1">
                          <Calendar size={16} color="#FFBF00" />
                        </View>
                      )}
                    </View>
                    <View className="flex-row items-center justify-between">
                      {prompt.active_date && (
                        <Text className="text-sm text-gray-500">
                          {new Date(prompt.active_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      )}
                      {isAnswered && (
                        <Text className="text-xs text-green-600 font-medium">
                          Answered
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="bg-gray-50 rounded-lg p-8 items-center">
              <Text className="text-gray-600 text-center">
                No recent prompts available
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
