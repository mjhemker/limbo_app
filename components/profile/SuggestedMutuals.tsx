import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useFriends, useSendFriendRequest } from '../../hooks/useFriends';
import { useQueryClient } from '@tanstack/react-query';
import * as haptics from '../../utils/haptics';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// V2 Avatar colors
const AVATAR_COLORS = ['#F26E5E', '#6AAA64', '#8E73C9', '#4F8FE0', '#C28F2C'];

function getAvatarColor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

interface SuggestedMutualsProps {
  userId: string;
}

/**
 * SuggestedMutuals - Shows friend suggestions based on mutual connections
 */
export default function SuggestedMutuals({ userId }: SuggestedMutualsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: friends } = useFriends(userId);
  const sendRequest = useSendFriendRequest();

  // For now, we'll use existing friends as a proxy for suggestions
  // In production, this would call a dedicated suggested mutuals endpoint
  const suggestions = friends?.slice(0, 4) || [];

  const handleAddFriend = async (addresseeId: string) => {
    try {
      haptics.mediumImpact();
      await sendRequest.mutateAsync({
        requesterId: userId,
        addresseeId: addresseeId,
      });
      queryClient.invalidateQueries({ queryKey: ['friends', userId] });
    } catch (error) {
      console.error('Error sending friend request:', error);
      haptics.error();
    }
  };

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
    haptics.lightImpact();
  };

  // Don't render if no suggestions
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <View className="bg-white border border-rule rounded-[22px] overflow-hidden mb-4">
      {/* Collapsible Header */}
      <TouchableOpacity
        onPress={toggleExpanded}
        className="flex-row items-center justify-between p-4"
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          <View className="w-8 h-8 bg-sand rounded-full items-center justify-center mr-2.5">
            <Text className="text-[14px]">👋</Text>
          </View>
          <View>
            <Text className="text-[15px] font-bold text-ink">
              Suggested Friends
            </Text>
            <Text className="text-[11px] text-ink-soft">
              {suggestions.length} people you may know
            </Text>
          </View>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color="#6B6760" />
        ) : (
          <ChevronDown size={20} color="#6B6760" />
        )}
      </TouchableOpacity>

      {/* Collapsible Content */}
      {isExpanded && (
        <View className="border-t border-rule">
          {suggestions.slice(0, 4).map((item: any, index: number) => {
            const user = item.friend;
            const avatarColor = getAvatarColor(user.display_name);
            const isLast = index === Math.min(suggestions.length, 4) - 1;

            return (
              <View
                key={user.id}
                className={`flex-row items-center p-4 ${!isLast ? 'border-b border-rule' : ''}`}
              >
                <TouchableOpacity
                  onPress={() => router.push(`/(tabs)/profile/${user.id}`)}
                  className="flex-row items-center flex-1"
                  activeOpacity={0.7}
                >
                  {user.avatar_url ? (
                    <Image
                      source={{ uri: user.avatar_url }}
                      className="w-11 h-11 rounded-full"
                    />
                  ) : (
                    <View
                      className="w-11 h-11 rounded-full items-center justify-center"
                      style={{ backgroundColor: avatarColor }}
                    >
                      <Text className="text-white font-bold text-[15px]">
                        {user.display_name?.[0]?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-[15px] font-bold text-ink"
                      numberOfLines={1}
                    >
                      {user.display_name || user.username}
                    </Text>
                    <Text className="text-[12px] text-ink-soft" numberOfLines={1}>
                      Friends with you
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push(`/(tabs)/messages/${user.id}`)}
                  className="px-4 py-2 bg-ink rounded-full ml-2"
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-[12px] font-bold">Message</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
