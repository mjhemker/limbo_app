import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Rocket, TomatoIcon as Tomato } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../../../contexts/AuthContext';
import {
  useDebateStats,
  useDebateResponses,
  useToggleDebateReaction,
  useSubmitDebateResponse,
} from '../../../../../hooks/useDebates';
import { useCirclePrompts } from '../../../../../hooks/useCircles';
import { toast } from '../../../../../utils/toast';

export default function DebatePage() {
  const { id: circleId, debateId } = useLocalSearchParams<{ id: string; debateId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [selectedSide, setSelectedSide] = useState<'side_a' | 'side_b' | null>(null);
  const [responseText, setResponseText] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: prompts } = useCirclePrompts(circleId);
  const { data: stats, refetch: refetchStats } = useDebateStats(debateId);
  const { data: responses, isLoading, refetch: refetchResponses } = useDebateResponses(debateId);
  const toggleReaction = useToggleDebateReaction();
  const submitResponse = useSubmitDebateResponse();

  const debatePrompt = prompts?.find((p: any) => p.id === debateId && p.is_debate);

  // Find user's existing response
  const myResponse = responses?.sideA.find((r: any) => r.user_id === user?.id) ||
    responses?.sideB.find((r: any) => r.user_id === user?.id);

  // Set selected side based on user's existing response
  useEffect(() => {
    if (myResponse && !selectedSide) {
      setSelectedSide(myResponse.debate_side);
    }
  }, [myResponse, selectedSide]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchResponses()]);
    setRefreshing(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setMediaType(asset.type === 'video' ? 'video' : 'image');
    }
  };

  const handleSubmitResponse = async () => {
    if (!responseText.trim() && !mediaUri) {
      Alert.alert('Error', 'Please add some text or media');
      return;
    }

    if (!selectedSide) {
      Alert.alert('Error', 'Please select a side first');
      return;
    }

    if (!user || !circleId || !debateId) return;

    const mediaFile = mediaUri
      ? {
          uri: mediaUri,
          type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
          name: mediaType === 'video' ? 'video.mp4' : 'image.jpg',
        }
      : undefined;

    try {
      setSubmitting(true);
      await submitResponse.mutateAsync({
        circleId,
        promptId: debateId,
        userId: user.id,
        side: selectedSide,
        textContent: responseText.trim(),
        mediaFile,
      });

      setResponseText('');
      setMediaUri(null);
      setMediaType(null);
      setShowResponseForm(false);
      toast.success('Your response has been posted!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (responseId: string, reactionType: 'tomato' | 'boost') => {
    if (!user) return;

    try {
      await toggleReaction.mutateAsync({
        responseId,
        userId: user.id,
        reactionType,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to add reaction');
    }
  };

  const renderResponse = (response: any, side: 'a' | 'b') => {
    const boostCount = response.reactions?.filter((r: any) => r.reaction_type === 'boost').length || 0;
    const tomatoCount = response.reactions?.filter((r: any) => r.reaction_type === 'tomato').length || 0;
    const userReaction = response.reactions?.find((r: any) => r.user_id === user?.id);

    return (
      <View
        key={response.id}
        className={`rounded-2xl p-4 mb-3 ${side === 'a' ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}
      >
        {/* User info */}
        <View className="flex-row items-center mb-3">
          {response.user?.avatar_url ? (
            <Image
              source={{ uri: response.user.avatar_url }}
              className="w-8 h-8 rounded-full bg-gray-300"
            />
          ) : (
            <View className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center">
              <Text className="text-gray-600 text-xs font-semibold">
                {response.user?.display_name?.[0]?.toUpperCase()}
              </Text>
            </View>
          )}
          <Text className="ml-2 font-semibold text-gray-900">
            {response.user?.display_name}
          </Text>
        </View>

        {/* Media */}
        {response.media_url && response.media_type === 'image' && (
          <Image
            source={{ uri: response.media_url }}
            className="w-full h-48 rounded-lg mb-3"
            resizeMode="cover"
          />
        )}

        {/* Text content */}
        {response.text_content && (
          <Text className="text-gray-900 mb-3">{response.text_content}</Text>
        )}

        {/* Reactions */}
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => handleReaction(response.id, 'boost')}
            className={`flex-row items-center px-3 py-2 rounded-full ${
              userReaction?.reaction_type === 'boost' ? 'bg-green-100' : 'bg-white'
            }`}
          >
            <Text className="mr-1">🚀</Text>
            <Text className="font-semibold text-gray-900">{boostCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleReaction(response.id, 'tomato')}
            className={`flex-row items-center px-3 py-2 rounded-full ${
              userReaction?.reaction_type === 'tomato' ? 'bg-red-100' : 'bg-white'
            }`}
          >
            <Text className="mr-1">🍅</Text>
            <Text className="font-semibold text-gray-900">{tomatoCount}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  if (!debatePrompt) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-semibold text-gray-900 text-center mb-2">
            Debate not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1 ml-3">
            <Text className="text-lg font-semibold text-gray-900">Debate</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Debate Header */}
        <View className="px-4 py-6 bg-gradient-to-r from-blue-50 to-red-50">
          <Text className="text-2xl font-bold text-center text-gray-900 mb-6">
            ⚖️ Debate Mode
          </Text>

          {/* Stats */}
          {stats && (
            <View className="flex-row justify-between mb-6">
              <View className="flex-1 items-center">
                <Text className="text-4xl font-black text-blue-600">
                  {stats.side_a.stats.boost_count}
                </Text>
                <Text className="text-sm text-gray-600">Side A Boosts</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-4xl font-black text-red-600">
                  {stats.side_b.stats.boost_count}
                </Text>
                <Text className="text-sm text-gray-600">Side B Boosts</Text>
              </View>
            </View>
          )}

          {/* Side Selection */}
          {!myResponse && (
            <View className="mb-4">
              <Text className="text-center font-semibold text-gray-900 mb-3">
                Choose Your Side
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setSelectedSide('side_a');
                    setShowResponseForm(true);
                  }}
                  className={`flex-1 py-4 rounded-xl border-2 ${
                    selectedSide === 'side_a'
                      ? 'bg-blue-100 border-blue-600'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-center font-bold ${
                      selectedSide === 'side_a' ? 'text-blue-900' : 'text-gray-700'
                    }`}
                    numberOfLines={2}
                  >
                    {debatePrompt.debate_side_a}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setSelectedSide('side_b');
                    setShowResponseForm(true);
                  }}
                  className={`flex-1 py-4 rounded-xl border-2 ${
                    selectedSide === 'side_b'
                      ? 'bg-red-100 border-red-600'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-center font-bold ${
                      selectedSide === 'side_b' ? 'text-red-900' : 'text-gray-700'
                    }`}
                    numberOfLines={2}
                  >
                    {debatePrompt.debate_side_b}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Response Form */}
        {showResponseForm && selectedSide && (
          <View className="px-4 py-4 bg-gray-50 border-t border-b border-gray-200">
            <Text className="font-semibold text-gray-900 mb-3">
              Your Argument for {selectedSide === 'side_a' ? debatePrompt.debate_side_a : debatePrompt.debate_side_b}
            </Text>

            <TextInput
              className="bg-white border border-gray-300 rounded-lg p-3 mb-3 min-h-24"
              placeholder="Share your thoughts..."
              value={responseText}
              onChangeText={setResponseText}
              multiline
              textAlignVertical="top"
            />

            {mediaUri && (
              <View className="mb-3">
                <Image
                  source={{ uri: mediaUri }}
                  className="w-full h-48 rounded-lg"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => {
                    setMediaUri(null);
                    setMediaType(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 rounded-full w-8 h-8 items-center justify-center"
                >
                  <Text className="text-white font-bold">×</Text>
                </TouchableOpacity>
              </View>
            )}

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={pickImage}
                className="flex-1 bg-gray-200 rounded-lg py-3"
              >
                <Text className="text-center font-semibold text-gray-900">Add Media</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmitResponse}
                disabled={submitting || (!responseText.trim() && !mediaUri)}
                className={`flex-1 rounded-lg py-3 ${
                  submitting || (!responseText.trim() && !mediaUri)
                    ? 'bg-gray-300'
                    : selectedSide === 'side_a'
                    ? 'bg-blue-600'
                    : 'bg-red-600'
                }`}
              >
                <Text className="text-center font-semibold text-white">
                  {submitting ? 'Posting...' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Responses */}
        <View className="px-4 py-6">
          <View className="flex-row gap-3">
            {/* Side A Responses */}
            <View className="flex-1">
              <Text className="font-bold text-blue-900 mb-3">
                {debatePrompt.debate_side_a}
              </Text>
              {responses?.sideA.map((response: any) => renderResponse(response, 'a'))}
            </View>

            {/* Side B Responses */}
            <View className="flex-1">
              <Text className="font-bold text-red-900 mb-3">
                {debatePrompt.debate_side_b}
              </Text>
              {responses?.sideB.map((response: any) => renderResponse(response, 'b'))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
