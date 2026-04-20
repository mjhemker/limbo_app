import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Heart } from 'phosphor-react-native';
import { useAuth } from '../../../../contexts/AuthContext';
import { usePromptById } from '../../../../hooks/usePrompt';
import { useFriendsResponses } from '../../../../hooks/useResponses';

export default function PromptDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: prompt, isLoading: promptLoading } = usePromptById(id);
  const { data: responses, isLoading: responsesLoading } = useFriendsResponses(id, user?.id);

  if (promptLoading || responsesLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FFBF00" />
      </SafeAreaView>
    );
  }

  if (!prompt) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-xl font-semibold text-gray-900 text-center mb-2 font-heading">
          Prompt not found
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft weight="bold" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900 ml-3 font-heading">
          Prompt Responses
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Prompt Header */}
        <View className="bg-primary-50 p-6 border-b border-primary-100">
          <Text className="text-sm text-primary-600 font-medium mb-2">
            {prompt.active_date &&
              new Date(prompt.active_date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
          </Text>
          <Text className="text-xl font-bold text-gray-900 font-heading">
            {prompt.text}
          </Text>
        </View>

        {/* Responses Grid */}
        <View className="p-4">
          {responses && responses.length > 0 ? (
            <View className="gap-4">
              {responses.map((response: any) => (
                <View
                  key={response.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                >
                  {/* User Info */}
                  <View className="flex-row items-center mb-3">
                    {response.user?.avatar_url ? (
                      <Image
                        source={{ uri: response.user.avatar_url }}
                        className="w-10 h-10 rounded-full bg-gray-300"
                      />
                    ) : (
                      <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center">
                        <Text className="text-gray-600 font-semibold">
                          {response.user?.display_name?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="ml-3">
                      <Text className="font-semibold text-gray-900">
                        {response.user?.display_name}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        @{response.user?.username}
                      </Text>
                    </View>
                  </View>

                  {/* Response Content */}
                  {response.text_content && (
                    <Text className="text-gray-700 mb-3">
                      {response.text_content}
                    </Text>
                  )}

                  {/* Media */}
                  {response.media_url && response.media_type === 'image' && (
                    <Image
                      source={{ uri: response.media_url }}
                      className="w-full h-64 rounded-lg bg-gray-100 mb-3"
                      resizeMode="cover"
                    />
                  )}

                  {response.media_url && response.media_type === 'video' && (
                    <View className="w-full h-64 rounded-lg bg-gray-900 items-center justify-center mb-3">
                      <Text className="text-white">Video</Text>
                    </View>
                  )}

                  {/* Reactions Placeholder */}
                  <View className="flex-row items-center pt-3 border-t border-gray-100">
                    <TouchableOpacity className="flex-row items-center">
                      <Heart weight="bold" size={20} color="#ef4444" />
                      <Text className="ml-2 text-sm text-gray-600">React</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-gray-50 rounded-lg p-8 items-center">
              <Text className="text-gray-600 text-center">
                No responses yet for this prompt
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
