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
import { useCreateDebatePrompt } from '../../hooks/useDebates';
import { toast } from '../../utils/toast';

interface DebateCreationModalProps {
  visible: boolean;
  onClose: () => void;
  circleId: string;
}

export function DebateCreationModal({ visible, onClose, circleId }: DebateCreationModalProps) {
  const { user } = useAuth();
  const createDebate = useCreateDebatePrompt();

  const [sideA, setSideA] = useState('');
  const [sideB, setSideB] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!sideA.trim() || !sideB.trim()) {
      Alert.alert('Error', 'Please fill in both sides');
      return;
    }

    if (!user) return;

    try {
      setCreating(true);
      await createDebate.mutateAsync({
        chatId: circleId,
        createdBy: user.id,
        sideA: sideA.trim(),
        sideB: sideB.trim(),
      });

      toast.success('Debate created successfully!');
      setSideA('');
      setSideB('');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create debate');
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
              ⚖️ Create Debate
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
            Create a two-sided debate for your circle. Members will choose a side and
            can react with boosts 🚀 or tomatoes 🍅.
          </Text>

          {/* Side A Input */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Side A Position
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              placeholder="e.g., Pineapple belongs on pizza"
              value={sideA}
              onChangeText={setSideA}
              maxLength={100}
            />
            <Text className="text-xs text-gray-500 mt-1 text-right">
              {sideA.length}/100
            </Text>
          </View>

          {/* VS Divider */}
          <View className="items-center my-3">
            <Text className="text-xl font-black text-gray-400">VS</Text>
          </View>

          {/* Side B Input */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Side B Position
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              placeholder="e.g., Pineapple does NOT belong on pizza"
              value={sideB}
              onChangeText={setSideB}
              maxLength={100}
            />
            <Text className="text-xs text-gray-500 mt-1 text-right">
              {sideB.length}/100
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
              disabled={creating || !sideA.trim() || !sideB.trim()}
              className={`flex-1 rounded-xl py-3 ${
                creating || !sideA.trim() || !sideB.trim()
                  ? 'bg-gray-300'
                  : 'bg-black'
              }`}
            >
              <Text className="text-center font-semibold text-white">
                {creating ? 'Creating...' : 'Create Debate'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
