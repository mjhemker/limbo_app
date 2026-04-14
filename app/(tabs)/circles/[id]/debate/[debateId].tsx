import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useSubmitChatResponse } from '../../../../../hooks/useChats';
import { toast } from '../../../../../utils/toast';
import * as haptics from '../../../../../utils/haptics';

export default function DebateRespondPage() {
  const { id: chatId, debateId, promptText, creatorName, sideA, sideB } = useLocalSearchParams<{
    id: string;
    debateId: string;
    promptText?: string;
    creatorName?: string;
    sideA?: string;
    sideB?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  const [selectedSide, setSelectedSide] = useState<'side_a' | 'side_b' | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitResponse = useSubmitChatResponse();

  const headerTitle = creatorName ? `${creatorName}'s prompt` : 'Daily prompt';

  const handleSubmit = async () => {
    if (!selectedSide) {
      toast.error('Pick a side!');
      return;
    }
    if (!user || !debateId) return;

    setSubmitting(true);
    try {
      await submitResponse.mutateAsync({
        promptId: debateId,
        userId: user.id,
        textContent: responseText.trim(),
        debateSide: selectedSide,
      });

      haptics.success();
      toast.success('Vote submitted!');
      router.back();
    } catch (error: any) {
      haptics.error();
      toast.error(error.message || 'Failed to submit');
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
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">{headerTitle}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
          {/* Prompt text */}
          <Text className="text-xl font-bold text-gray-900 text-center mb-8 px-4">
            {promptText || ''}
          </Text>

          {/* Side Selection */}
          <Text className="text-base font-bold text-gray-900 mb-3">Pick a side</Text>

          <TouchableOpacity
            onPress={() => { haptics.lightImpact(); setSelectedSide('side_a'); }}
            className={`flex-row items-center p-4 rounded-2xl mb-3 border-2 ${
              selectedSide === 'side_a' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
            }`}
            activeOpacity={0.7}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
              selectedSide === 'side_a' ? 'bg-blue-500' : 'bg-gray-200'
            }`}>
              {selectedSide === 'side_a' ? (
                <Check size={16} color="white" strokeWidth={3} />
              ) : (
                <Text className="text-sm font-bold text-gray-500">A</Text>
              )}
            </View>
            <Text className={`text-base flex-1 ${
              selectedSide === 'side_a' ? 'font-semibold text-blue-900' : 'text-gray-700'
            }`}>{sideA || 'Side A'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { haptics.lightImpact(); setSelectedSide('side_b'); }}
            className={`flex-row items-center p-4 rounded-2xl mb-6 border-2 ${
              selectedSide === 'side_b' ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'
            }`}
            activeOpacity={0.7}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
              selectedSide === 'side_b' ? 'bg-red-500' : 'bg-gray-200'
            }`}>
              {selectedSide === 'side_b' ? (
                <Check size={16} color="white" strokeWidth={3} />
              ) : (
                <Text className="text-sm font-bold text-gray-500">B</Text>
              )}
            </View>
            <Text className={`text-base flex-1 ${
              selectedSide === 'side_b' ? 'font-semibold text-red-900' : 'text-gray-700'
            }`}>{sideB || 'Side B'}</Text>
          </TouchableOpacity>

          {/* Optional text */}
          {selectedSide && (
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">Add your take (optional)</Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3 text-base min-h-24"
                placeholder="Why this side?"
                value={responseText}
                onChangeText={setResponseText}
                multiline
                textAlignVertical="top"
                maxLength={300}
              />
              <Text className="text-xs text-gray-400 mt-1 text-right">{responseText.length}/300</Text>
            </View>
          )}
        </ScrollView>

        {/* Submit */}
        <View className="p-4 border-t border-gray-200">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || !selectedSide}
            className={`rounded-full py-4 ${
              submitting || !selectedSide ? 'bg-gray-300' : 'bg-black'
            }`}
          >
            <Text className="text-white text-center font-bold text-base">
              {submitting ? 'Submitting...' : 'Submit Vote'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
