import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useCreateChatPrompt as useCreateCirclePrompt } from '../../hooks/useChats';
import { toast } from '../../utils/toast';

interface CirclePromptModalProps {
  visible: boolean;
  onClose: () => void;
  circleId: string;
}

export function CirclePromptModal({ visible, onClose, circleId }: CirclePromptModalProps) {
  const { user } = useAuth();
  const createPrompt = useCreateCirclePrompt();

  const [promptText, setPromptText] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!promptText.trim()) {
      Alert.alert('Error', 'Please enter a prompt');
      return;
    }

    if (!user) return;

    try {
      setCreating(true);
      await createPrompt.mutateAsync({
        chatId: circleId,
        text: promptText.trim(),
        createdBy: user.id,
      });

      toast.success('Prompt created successfully!');
      setPromptText('');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create prompt');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-black/50 justify-center px-6"
      >
        <View className="bg-white rounded-3xl p-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-2xl font-black text-gray-900">
              Create Prompt
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 items-center justify-center"
            >
              <X size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text className="text-gray-600 mb-6">
            Create a prompt for your circle members to answer. Make it interesting!
          </Text>

          {/* Prompt Input */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Prompt Question
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base min-h-32"
              placeholder="e.g., What's your favorite childhood memory?"
              value={promptText}
              onChangeText={setPromptText}
              multiline
              textAlignVertical="top"
              maxLength={300}
            />
            <Text className="text-xs text-gray-500 mt-1 text-right">
              {promptText.length}/300
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-gray-200 rounded-xl py-3"
            >
              <Text className="text-center font-semibold text-gray-900">
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCreate}
              disabled={creating || !promptText.trim()}
              className={`flex-1 rounded-xl py-3 ${
                creating || !promptText.trim()
                  ? 'bg-gray-300'
                  : 'bg-black'
              }`}
            >
              <Text className="text-center font-semibold text-white">
                {creating ? 'Creating...' : 'Create Prompt'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
