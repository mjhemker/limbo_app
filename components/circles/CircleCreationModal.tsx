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
  Image,
  ScrollView,
} from 'react-native';
import { X, Camera, Check } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useCreateGroupChat as useCreateCircle } from '../../hooks/useChats';
import { toast } from '../../utils/toast';
import { COLORS } from '../../lib/constants';

const CIRCLE_THEME_OPTIONS = [
  { name: 'Black', color: COLORS.circleThemes.black },
  { name: 'Blue', color: COLORS.circleThemes.blue },
  { name: 'Purple', color: COLORS.circleThemes.purple },
  { name: 'Pink', color: COLORS.circleThemes.pink },
  { name: 'Red', color: COLORS.circleThemes.red },
  { name: 'Orange', color: COLORS.circleThemes.orange },
  { name: 'Green', color: COLORS.circleThemes.green },
  { name: 'Teal', color: COLORS.circleThemes.teal },
];

interface CircleCreationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CircleCreationModal({ visible, onClose }: CircleCreationModalProps) {
  const { user } = useAuth();
  const createCircle = useCreateCircle();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState(COLORS.circleThemes.black);
  const [creating, setCreating] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a circle name');
      return;
    }

    if (!user) return;

    try {
      setCreating(true);
      await createCircle.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        themeColor,
      });

      toast.success('Circle created successfully!');
      setName('');
      setDescription('');
      setAvatarUri(null);
      setThemeColor(COLORS.circleThemes.black);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create circle');
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
            <Text className="text-2xl font-black text-gray-900 font-heading">
              Create Circle
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 items-center justify-center"
            >
              <X weight="bold" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Circle Avatar */}
          <View className="items-center mb-6">
            <TouchableOpacity
              onPress={pickImage}
              className="relative"
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  className="w-24 h-24 rounded-full bg-gray-200"
                />
              ) : (
                <View
                  className="w-24 h-24 rounded-full items-center justify-center"
                  style={{ backgroundColor: themeColor }}
                >
                  {name.trim() ? (
                    <Text className="text-white font-bold text-3xl">
                      {name.trim()[0].toUpperCase()}
                    </Text>
                  ) : (
                    <Camera weight="bold" size={32} color="white" />
                  )}
                </View>
              )}
              <View className="absolute bottom-0 right-0 bg-black rounded-full p-2">
                <Camera weight="bold" size={16} color="white" />
              </View>
            </TouchableOpacity>
            <Text className="text-xs text-gray-500 mt-2">
              Tap to add circle photo
            </Text>
          </View>

          {/* Circle Name */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Circle Name *
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              placeholder="e.g., College Friends"
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
            <Text className="text-xs text-gray-500 mt-1 text-right">
              {name.length}/50
            </Text>
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Description (optional)
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base min-h-24"
              placeholder="What's this circle about?"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={200}
            />
            <Text className="text-xs text-gray-500 mt-1 text-right">
              {description.length}/200
            </Text>
          </View>

          {/* Theme Color */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Theme Color
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {CIRCLE_THEME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.name}
                  onPress={() => setThemeColor(option.color)}
                  className="items-center"
                >
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center ${
                      themeColor === option.color ? 'border-2 border-gray-400' : ''
                    }`}
                    style={{ backgroundColor: option.color }}
                  >
                    {themeColor === option.color && (
                      <Check weight="bold" size={20} color="white" />
                    )}
                  </View>
                  <Text className="text-xs text-gray-600 mt-1">{option.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
              disabled={creating || !name.trim()}
              className={`flex-1 rounded-xl py-3 ${
                creating || !name.trim()
                  ? 'bg-gray-300'
                  : 'bg-black'
              }`}
            >
              <Text className="text-center font-semibold text-white">
                {creating ? 'Creating...' : 'Create Circle'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
