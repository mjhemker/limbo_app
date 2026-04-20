import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';

interface ReactionPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  position?: { x: number; y: number };
}

const EMOJI_OPTIONS = [
  '❤️', // Heart
  '😂', // Laughing
  '😮', // Surprised
  '😢', // Sad
  '👍', // Thumbs up
  '👎', // Thumbs down
  '🔥', // Fire
  '🎉', // Party
];

export function ReactionPicker({
  visible,
  onClose,
  onSelectEmoji,
  position,
}: ReactionPickerProps) {
  const handleEmojiSelect = (emoji: string) => {
    onSelectEmoji(emoji);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1" onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          className="flex-1 bg-black/30"
        >
          <Animated.View
            entering={SlideInDown.springify().damping(15)}
            exiting={SlideOutDown.duration(200)}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-6 py-6"
          >
            {/* Header */}
            <View className="items-center mb-4">
              <View className="w-12 h-1 bg-gray-300 rounded-full mb-4" />
              <Text className="text-lg font-bold text-gray-900 font-heading">
                React to Message
              </Text>
            </View>

            {/* Emoji Grid */}
            <View className="flex-row flex-wrap justify-center gap-3 mb-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => handleEmojiSelect(emoji)}
                  className="w-16 h-16 items-center justify-center bg-gray-100 rounded-2xl active:bg-gray-200"
                  activeOpacity={0.7}
                >
                  <Text className="text-3xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={onClose}
              className="bg-gray-200 rounded-full py-4 mt-4"
              activeOpacity={0.7}
            >
              <Text className="text-center font-semibold text-gray-900">
                Cancel
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
