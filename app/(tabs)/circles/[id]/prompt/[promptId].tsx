import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, X, Image as ImageIcon } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useSubmitChatResponse } from '../../../../../hooks/useChats';
import { storageService } from '../../../../../services/supabase/storage';
import { toast } from '../../../../../utils/toast';
import * as haptics from '../../../../../utils/haptics';

export default function PromptRespondPage() {
  const { id: chatId, promptId, promptText, creatorName } = useLocalSearchParams<{
    id: string;
    promptId: string;
    promptText?: string;
    creatorName?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  const [responseText, setResponseText] = useState('');
  const [responseMedia, setResponseMedia] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitResponse = useSubmitChatResponse();

  const headerTitle = creatorName ? `${creatorName}'s prompt` : 'Daily prompt';

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Please grant permission to access your photos');
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

  const handleSubmit = async () => {
    if (!responseText.trim() && !responseMedia) {
      toast.error('Add some content to your response');
      return;
    }
    if (!user || !promptId) return;

    setSubmitting(true);
    try {
      let mediaUrl = null;
      let mediaType = null;

      if (responseMedia) {
        mediaUrl = await storageService.uploadResponseMedia(
          { uri: responseMedia, type: 'image/jpeg', name: 'response.jpg' },
          user.id,
          `prompt-${promptId}`
        );
        mediaType = 'image';
      }

      await submitResponse.mutateAsync({
        promptId,
        userId: user.id,
        textContent: responseText.trim(),
        mediaUrl,
        mediaType,
      });

      haptics.success();
      toast.success('Response posted!');
      router.back();
    } catch (error: any) {
      haptics.error();
      toast.error(error.message || 'Failed to post response');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft weight="bold" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 font-heading">{headerTitle}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
          {/* Prompt text */}
          <Text className="text-xl font-bold text-gray-900 text-center mb-8 px-4 font-heading">
            {promptText || ''}
          </Text>

          {/* Text Input */}
          <TextInput
            className="bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3 text-base min-h-32 mb-2"
            placeholder="Share your thoughts..."
            value={responseText}
            onChangeText={setResponseText}
            multiline
            textAlignVertical="top"
            maxLength={500}
            autoFocus
          />
          <Text className="text-xs text-gray-400 mb-4 text-right">{responseText.length}/500</Text>

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
                  <X weight="bold" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <ImageIcon weight="bold" size={32} color="#9ca3af" />
                <Text className="text-gray-600 mt-2">Add Image (Optional)</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Submit */}
        <View className="p-4 border-t border-gray-200">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || (!responseText.trim() && !responseMedia)}
            className={`rounded-full py-4 ${
              submitting || (!responseText.trim() && !responseMedia)
                ? 'bg-gray-300'
                : 'bg-black'
            }`}
          >
            <Text className="text-white text-center font-bold text-base">
              {submitting ? 'Posting...' : 'Post Response'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
