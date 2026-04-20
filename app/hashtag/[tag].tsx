import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';
import { formatHashtag } from '../../utils/hashtags';

export default function HashtagPage() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const router = useRouter();

  // Decode the tag from URL
  const decodedTag = decodeURIComponent(tag || '');

  // TODO: Implement hashtag search in backend
  // For now, show a coming soon message
  // In production, you would query responses/prompts that contain this hashtag

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft weight="bold" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900 ml-3 font-heading">
          #{formatHashtag(decodedTag)}
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Coming Soon Message */}
        <View className="flex-1 items-center justify-center p-12">
          <Text className="text-6xl mb-4">#️⃣</Text>
          <Text className="text-xl font-bold text-gray-900 mb-2 text-center font-heading">
            Hashtag Search
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            Search for responses and prompts with #{formatHashtag(decodedTag)} coming soon!
          </Text>
          <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 w-full">
            <Text className="text-sm text-gray-700 mb-2">
              <Text className="font-semibold">How to use hashtags:</Text>
            </Text>
            <Text className="text-sm text-gray-600 mb-1">
              • Add hashtags to your responses with # (e.g., #motivation)
            </Text>
            <Text className="text-sm text-gray-600 mb-1">
              • Tap any hashtag to see all related content
            </Text>
            <Text className="text-sm text-gray-600">
              • Use hashtags to categorize and discover content
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
