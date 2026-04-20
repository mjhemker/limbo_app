import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Heart, ThumbsUp, SmileyWink, SmileySad, Confetti } from 'phosphor-react-native';
import { useReactions, useAddReaction, useRemoveReaction } from '../../hooks/useReactions';
import * as haptics from '../../utils/haptics';

interface ResponseReactionsProps {
  responseId: string;
  userId: string;
  postOwnerId: string;
}

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😢', '🎉'];

export function ResponseReactions({ responseId, userId, postOwnerId }: ResponseReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const { data: reactions } = useReactions(responseId);
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  // Group reactions by emoji
  const reactionCounts: Record<string, { count: number; hasReacted: boolean }> = {};
  reactions?.forEach((r) => {
    if (!reactionCounts[r.emoji]) {
      reactionCounts[r.emoji] = { count: 0, hasReacted: false };
    }
    reactionCounts[r.emoji].count++;
    if (r.user_id === userId) {
      reactionCounts[r.emoji].hasReacted = true;
    }
  });

  const handleReaction = async (emoji: string) => {
    haptics.lightImpact();
    setShowPicker(false);

    const existing = reactionCounts[emoji];
    if (existing?.hasReacted) {
      // Remove reaction
      await removeReaction.mutateAsync({ responseId, userId, emoji });
    } else {
      // Add reaction
      await addReaction.mutateAsync({ responseId, userId, emoji, postOwnerId });
    }
  };

  const totalReactions = Object.values(reactionCounts).reduce((sum, r) => sum + r.count, 0);

  return (
    <View className="flex-row items-center">
      {/* Display existing reactions */}
      {Object.entries(reactionCounts).map(([emoji, { count, hasReacted }]) => (
        <TouchableOpacity
          key={emoji}
          onPress={() => handleReaction(emoji)}
          className={`flex-row items-center rounded-full px-2 py-1 mr-1 ${
            hasReacted ? 'bg-primary-100 border border-primary-300' : 'bg-gray-100'
          }`}
        >
          <Text className="text-sm">{emoji}</Text>
          <Text className={`text-xs ml-1 ${hasReacted ? 'text-primary-700 font-semibold' : 'text-gray-600'}`}>
            {count}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Add reaction button */}
      <TouchableOpacity
        onPress={() => {
          haptics.lightImpact();
          setShowPicker(true);
        }}
        className="flex-row items-center bg-gray-100 rounded-full px-3 py-1.5"
      >
        <Heart weight="bold" size={14} color="#6b7280" />
        {totalReactions === 0 && (
          <Text className="text-xs text-gray-500 ml-1">React</Text>
        )}
      </TouchableOpacity>

      {/* Reaction Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/30 justify-center items-center"
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View className="bg-white rounded-2xl p-4 shadow-xl">
            <Text className="text-center text-gray-600 text-sm mb-3">
              Choose a reaction
            </Text>
            <View className="flex-row gap-2">
              {REACTION_EMOJIS.map((emoji) => {
                const hasReacted = reactionCounts[emoji]?.hasReacted;
                return (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleReaction(emoji)}
                    className={`w-12 h-12 items-center justify-center rounded-full ${
                      hasReacted ? 'bg-primary-100 border-2 border-primary-400' : 'bg-gray-100'
                    }`}
                  >
                    <Text className="text-2xl">{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
