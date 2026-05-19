import { View, Text, TouchableOpacity } from 'react-native';
import { useToggleReaction } from '../../hooks/usePublicFeed';
import * as haptics from '../../utils/haptics';

// Reaction emoji options
const REACTIONS = ['👍', '❤️', '😂', '🔥', '💯'];

interface PublicResponseCardProps {
  response: {
    id: string;
    prompt_text: string;
    response_text: string;
    created_at: string;
    view_count: number;
    reaction_counts: Record<string, number>;
    user_reaction: string | null;
  };
  userId?: string;
  index: number;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * PublicResponseCard - Anonymous response card in public feed
 */
export default function PublicResponseCard({
  response,
  userId,
  index,
}: PublicResponseCardProps) {
  const toggleReaction = useToggleReaction();

  const handleReaction = (reactionType: string) => {
    if (!userId) return;
    haptics.lightImpact();
    toggleReaction.mutate({
      userId,
      responseId: response.id,
      reactionType,
    });
  };

  const totalReactions = Object.values(response.reaction_counts || {}).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <View className="bg-white border border-rule rounded-[22px] p-5 mb-3">
      {/* Prompt */}
      <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-2">
        {formatTimeAgo(response.created_at)}
      </Text>
      <Text className="text-[13px] font-semibold text-ink-soft mb-1">
        {response.prompt_text}
      </Text>

      {/* Response */}
      <Text className="text-[17px] font-extrabold text-ink leading-snug mb-4">
        {response.response_text}
      </Text>

      {/* Reactions */}
      <View className="flex-row items-center flex-wrap">
        {REACTIONS.map((emoji) => {
          const count = response.reaction_counts?.[emoji] || 0;
          const isSelected = response.user_reaction === emoji;

          return (
            <TouchableOpacity
              key={emoji}
              onPress={() => handleReaction(emoji)}
              disabled={!userId}
              className={`flex-row items-center rounded-full px-3 py-1.5 mr-2 mb-2 ${
                isSelected ? 'bg-sand border border-ink/20' : 'bg-sand/50'
              }`}
              activeOpacity={0.7}
            >
              <Text className="text-[14px]">{emoji}</Text>
              {count > 0 && (
                <Text className="text-[11px] font-bold text-ink ml-1">
                  {count}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* View count */}
      {response.view_count > 0 && (
        <Text className="text-[10px] text-ink-soft mt-2">
          {response.view_count} views
        </Text>
      )}
    </View>
  );
}
