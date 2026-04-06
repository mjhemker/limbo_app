import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, X, Image as ImageIcon, Share } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useCirclePromptResponses, useSubmitCircleResponse } from '../../../../../hooks/useCircles';
import { storageService } from '../../../../../services/supabase/storage';
import { toast } from '../../../../../utils/toast';
import * as haptics from '../../../../../utils/haptics';
import { HashtagText } from '../../../../../components/HashtagText';
import { shareResponse } from '../../../../../utils/sharing';

export default function CirclePromptDetailPage() {
  const { id: circleId, promptId } = useLocalSearchParams<{ id: string; promptId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseMedia, setResponseMedia] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: responses, isLoading } = useCirclePromptResponses(promptId);
  const submitResponse = useSubmitCircleResponse();

  // Get the prompt text from the first response's prompt data or fallback
  const promptText = responses?.[0]?.circle_prompts?.text || 'Circle Prompt';

  // Find user's existing response
  const myResponse = responses?.find((r: any) => r.user_id === user?.id);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setResponseMedia(result.assets[0].uri);
    }
  };

  const handleSubmitResponse = async () => {
    if (!responseText.trim() && !responseMedia) {
      toast.error('Please add some content to your response');
      return;
    }

    if (!user || !circleId || !promptId) return;

    setSubmitting(true);
    try {
      let mediaUrl = null;
      let mediaType = null;

      // Upload media if present
      if (responseMedia) {
        const file = {
          uri: responseMedia,
          type: 'image/jpeg',
          name: 'response.jpg',
        };
        mediaUrl = await storageService.uploadResponseMedia(
          file,
          user.id,
          `circle-${promptId}`
        );
        mediaType = 'image';
      }

      await submitResponse.mutateAsync({
        circleId,
        circlePromptId: promptId,
        userId: user.id,
        textContent: responseText.trim(),
        mediaUrl,
        mediaType,
      });

      haptics.success();
      toast.success('Response posted!');
      setShowResponseModal(false);
      setResponseText('');
      setResponseMedia(null);
    } catch (error: any) {
      haptics.error();
      toast.error(error.message || 'Failed to post response');
    } finally {
      setSubmitting(false);
    }
  };

  const openResponseModal = () => {
    if (myResponse) {
      setResponseText(myResponse.text_content || '');
      setResponseMedia(myResponse.media_url || null);
    }
    setShowResponseModal(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#FFBF00" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900 ml-3">
          Circle Prompt
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Prompt Card */}
        <View className="p-4">
          <View className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-6 border-2 border-primary-200">
            <Text className="text-2xl font-black text-gray-900 mb-2">
              {promptText}
            </Text>
            <Text className="text-sm text-gray-600">
              {responses?.length || 0} {responses?.length === 1 ? 'response' : 'responses'}
            </Text>
          </View>
        </View>

        {/* Add/Edit Response Button */}
        <View className="px-4 mb-4">
          <TouchableOpacity
            onPress={openResponseModal}
            className="bg-black rounded-full py-4"
            activeOpacity={0.7}
          >
            <Text className="text-white text-center font-bold">
              {myResponse ? '✏️ Edit My Response' : '✨ Add Response'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Responses Grid */}
        <View className="px-4">
          <Text className="text-lg font-bold text-gray-900 mb-3">Responses</Text>
          {responses && responses.length > 0 ? (
            <View className="flex-row flex-wrap -mx-1.5">
              {responses.map((response: any) => (
                <View key={response.id} className="w-1/2 px-1.5 mb-3">
                  <View className="relative">
                    <View
                      className="bg-gray-100 rounded-3xl overflow-hidden"
                      style={{ aspectRatio: 9 / 11 }}
                    >
                    {response.media_url ? (
                      <Image
                        source={{ uri: response.media_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="flex-1 p-4 justify-between">
                        <HashtagText className="text-black text-sm" numberOfLines={6}>
                          {response.text_content}
                        </HashtagText>
                        <View>
                          <View className="flex-row items-center mt-2">
                            {response.user?.avatar_url ? (
                              <Image
                                source={{ uri: response.user.avatar_url }}
                                className="w-6 h-6 rounded-full bg-gray-300 mr-2"
                              />
                            ) : (
                              <View className="w-6 h-6 rounded-full bg-gray-300 items-center justify-center mr-2">
                                <Text className="text-gray-600 text-xs font-semibold">
                                  {response.user?.display_name?.[0]?.toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <Text className="text-xs font-semibold text-gray-900 flex-1" numberOfLines={1}>
                              {response.user?.display_name}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                    {response.media_url && response.text_content && (
                      <View className="absolute bottom-0 left-0 right-0 bg-black/60 p-3">
                        <View className="flex-row items-center mb-1">
                          {response.user?.avatar_url ? (
                            <Image
                              source={{ uri: response.user.avatar_url }}
                              className="w-5 h-5 rounded-full bg-gray-300 mr-2"
                            />
                          ) : (
                            <View className="w-5 h-5 rounded-full bg-gray-300 items-center justify-center mr-2">
                              <Text className="text-gray-600 text-xs font-semibold">
                                {response.user?.display_name?.[0]?.toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <Text className="text-xs font-semibold text-white flex-1" numberOfLines={1}>
                            {response.user?.display_name}
                          </Text>
                        </View>
                        <HashtagText className="text-white text-xs" numberOfLines={2}>
                          {response.text_content}
                        </HashtagText>
                      </View>
                    )}
                    </View>
                    {/* Share Button */}
                    <TouchableOpacity
                      onPress={() => {
                        haptics.lightImpact();
                        shareResponse({
                          text: response.text_content,
                          mediaUrl: response.media_url,
                          promptText: promptText,
                          userName: response.user?.display_name,
                        });
                      }}
                      className="absolute top-2 right-2 bg-white/90 rounded-full p-2 shadow-sm"
                    >
                      <Share size={14} color="#FFBF00" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-gray-50 rounded-3xl p-12 items-center">
              <Text className="text-gray-600 text-center">No responses yet</Text>
              <Text className="text-gray-500 text-center text-sm mt-2">
                Be the first to respond!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Response Modal */}
      <Modal
        visible={showResponseModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResponseModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-900">
                {myResponse ? 'Edit Response' : 'Your Response'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowResponseModal(false);
                  if (!myResponse) {
                    setResponseText('');
                    setResponseMedia(null);
                  }
                }}
              >
                <X size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-4">
              {/* Prompt reminder */}
              <View className="bg-primary-50 rounded-2xl p-4 mb-4">
                <Text className="text-sm text-gray-600 mb-1">Prompt:</Text>
                <Text className="font-semibold text-gray-900">{promptText}</Text>
              </View>

              {/* Text Input */}
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3 text-base min-h-32 mb-4"
                placeholder="Share your thoughts..."
                value={responseText}
                onChangeText={setResponseText}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <Text className="text-xs text-gray-500 mb-4 text-right">
                {responseText.length}/500
              </Text>

              {/* Image Picker */}
              <TouchableOpacity
                onPress={pickImage}
                className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-6 items-center mb-4"
              >
                {responseMedia ? (
                  <View className="relative w-full">
                    <Image
                      source={{ uri: responseMedia }}
                      className="w-full h-48 rounded-2xl"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => setResponseMedia(null)}
                      className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                    >
                      <X size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <ImageIcon size={32} color="#9ca3af" />
                    <Text className="text-gray-600 mt-2">Add Image (Optional)</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>

            {/* Submit Button */}
            <View className="p-4 border-t border-gray-200">
              <TouchableOpacity
                onPress={handleSubmitResponse}
                disabled={submitting || (!responseText.trim() && !responseMedia)}
                className={`rounded-full py-4 ${
                  submitting || (!responseText.trim() && !responseMedia)
                    ? 'bg-gray-300'
                    : 'bg-black'
                }`}
              >
                <Text className="text-white text-center font-bold">
                  {submitting ? 'Posting...' : myResponse ? 'Update Response' : 'Post Response'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
