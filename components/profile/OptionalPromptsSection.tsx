import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Plus, X, Shuffle } from 'lucide-react-native';
import { useRandomPrompts } from '../../hooks/useOptionalPrompts';
import { useCreateResponse } from '../../hooks/useResponses';
import { useAuth } from '../../contexts/AuthContext';
import * as haptics from '../../utils/haptics';
import { toast } from '../../utils/toast';

interface OptionalPromptsSectionProps {
  isOwnProfile: boolean;
  optionalResponses: any[];  // Responses to optional prompts
  onRefresh?: () => void;
}

export function OptionalPromptsSection({
  isOwnProfile,
  optionalResponses,
  onRefresh,
}: OptionalPromptsSectionProps) {
  const { user } = useAuth();
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [answerText, setAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: randomPrompts, refetch: refetchPrompts } = useRandomPrompts(5);
  const createResponse = useCreateResponse();

  // Filter out prompts that user has already answered
  const answeredPromptIds = new Set(optionalResponses.map((r) => r.optional_prompt_id));
  const availablePrompts = randomPrompts?.filter((p) => !answeredPromptIds.has(p.id)) || [];

  const handleSelectPrompt = (prompt: any) => {
    haptics.lightImpact();
    setSelectedPrompt(prompt);
    setAnswerText('');
    setShowAnswerModal(true);
  };

  const handleShufflePrompts = () => {
    haptics.lightImpact();
    refetchPrompts();
  };

  const handleSubmitAnswer = async () => {
    if (!answerText.trim() || !selectedPrompt || !user) return;

    try {
      setIsSubmitting(true);
      haptics.mediumImpact();

      await createResponse.mutateAsync({
        userId: user.id,
        optionalPromptId: selectedPrompt.id,
        textContent: answerText.trim(),
      });

      haptics.success();
      toast.success('Answer added to your profile!');
      setShowAnswerModal(false);
      setSelectedPrompt(null);
      setAnswerText('');
      onRefresh?.();
    } catch (error: any) {
      haptics.error();
      Alert.alert('Error', error.message || 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't show section if not own profile and no optional responses
  if (!isOwnProfile && optionalResponses.length === 0) {
    return null;
  }

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-bold text-black">About Me</Text>
        {isOwnProfile && (
          <TouchableOpacity
            onPress={handleShufflePrompts}
            className="flex-row items-center"
          >
            <Shuffle size={16} color="#6b7280" />
            <Text className="text-sm text-gray-500 ml-1">Shuffle</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Display existing optional prompt responses */}
      {optionalResponses.length > 0 && (
        <View className="mb-4">
          {optionalResponses.map((response: any) => (
            <View
              key={response.id}
              className="bg-gray-50 rounded-2xl p-4 mb-3 border border-gray-200"
            >
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                {response.optional_prompt?.text || 'Prompt'}
              </Text>
              <Text className="text-base text-black">
                {response.text_content}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Add more prompts - only for own profile */}
      {isOwnProfile && availablePrompts.length > 0 && (
        <View className="bg-white rounded-2xl border border-gray-200 p-4">
          <Text className="text-sm text-gray-600 mb-3">
            Answer a prompt to tell friends more about yourself
          </Text>
          <View className="gap-2">
            {availablePrompts.slice(0, 3).map((prompt) => (
              <TouchableOpacity
                key={prompt.id}
                onPress={() => handleSelectPrompt(prompt)}
                className="flex-row items-center bg-gray-50 rounded-xl p-3"
              >
                <Plus size={18} color="#FFBF00" />
                <Text className="flex-1 text-gray-800 ml-2" numberOfLines={1}>
                  {prompt.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Answer Prompt Modal */}
      <Modal
        visible={showAnswerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAnswerModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-black">Answer Prompt</Text>
              <TouchableOpacity
                onPress={() => setShowAnswerModal(false)}
                className="w-8 h-8 items-center justify-center"
              >
                <X size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Selected Prompt */}
            {selectedPrompt && (
              <View className="bg-primary-50 rounded-xl p-4 mb-4">
                <Text className="text-base font-semibold text-black">
                  {selectedPrompt.text}
                </Text>
              </View>
            )}

            {/* Answer Input */}
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base min-h-24 mb-4"
              placeholder="Write your answer..."
              value={answerText}
              onChangeText={setAnswerText}
              multiline
              textAlignVertical="top"
              maxLength={300}
              autoFocus
            />
            <Text className="text-xs text-gray-500 text-right mb-4">
              {answerText.length}/300
            </Text>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmitAnswer}
              disabled={!answerText.trim() || isSubmitting}
              className={`rounded-full py-4 ${
                !answerText.trim() || isSubmitting
                  ? 'bg-gray-300'
                  : 'bg-black'
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-bold">
                  Add to Profile
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
