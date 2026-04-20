import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, PlusCircle, Lock, ChatCircle, LockOpen, Ghost, Bell, TextT, Microphone, Camera, VideoCamera } from 'phosphor-react-native';
import { ShareIcon } from '../../../components/icons/ShareIcon';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTodaysPrompt } from '../../../hooks/usePrompt';
import { useUserResponse } from '../../../hooks/useResponses';
import { useFriendsResponses } from '../../../hooks/useResponses';
import { useProfile } from '../../../hooks/useProfile';
import { useUnlockStatus, useTrackResponseViewed, useRemainingUnlocks } from '../../../hooks/useUnlock';
import { useLimboFriends, useRescueFriend } from '../../../hooks/useLimbo';
import { useSendNudge } from '../../../hooks/useNudges';
import { ResponseReactions } from '../../../components/feed/ResponseReactions';
import * as haptics from '../../../utils/haptics';
import { toast } from '../../../utils/toast';

export default function FeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [viewedResponses, setViewedResponses] = useState<Set<string>>(new Set());

  const { data: todaysPrompt, isLoading: promptLoading, refetch: refetchPrompt } = useTodaysPrompt();
  const { data: userProfile } = useProfile(user?.id);
  const { data: userResponse, refetch: refetchUserResponse } = useUserResponse(
    user?.id,
    todaysPrompt?.id
  );
  const { data: friendsResponses, refetch: refetchFriends } = useFriendsResponses(
    todaysPrompt?.id,
    user?.id
  );

  // Unlock system
  const { data: unlockStatus, refetch: refetchUnlock } = useUnlockStatus(user?.id);
  const trackResponseViewed = useTrackResponseViewed();
  const remainingUnlocks = useRemainingUnlocks(unlockStatus);

  // Limbo Zone
  const { data: limboFriends, refetch: refetchLimbo } = useLimboFriends(user?.id);
  const rescueFriend = useRescueFriend();
  const sendNudge = useSendNudge();

  const hasPosted = !!userResponse;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchPrompt(),
      refetchUserResponse(),
      refetchFriends(),
      refetchUnlock(),
      refetchLimbo(),
    ]);
    setRefreshing(false);
  };

  // Handle rescuing a friend from limbo
  const handleRescueFriend = async (friendId: string, friendName: string) => {
    if (!user?.id) return;

    try {
      haptics.mediumImpact();

      // Send nudge to the friend
      await sendNudge.mutateAsync({
        fromUserId: user.id,
        toUserId: friendId,
        promptId: todaysPrompt?.id,
      });

      // Track the rescue
      await rescueFriend.mutateAsync({
        userId: user.id,
        friendId,
        promptId: todaysPrompt?.id,
      });

      toast.success(`Nudge sent to ${friendName}!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send nudge');
    }
  };

  // Handle viewing a response (track unlock)
  const handleViewResponse = async (responseId: string, index: number) => {
    if (!user?.id || viewedResponses.has(responseId)) return;

    // Check if this response needs to use an unlock
    if (index >= (unlockStatus?.unlockedCount || 0)) {
      if (remainingUnlocks > 0) {
        haptics.lightImpact();
        await trackResponseViewed.mutateAsync({ userId: user.id, responseId });
        setViewedResponses(prev => new Set([...prev, responseId]));
      }
    }
  };

  // Determine if a response is unlocked
  const isResponseUnlocked = (index: number) => {
    if (!unlockStatus) return index < 3; // Default to 3 unlocked
    return index < unlockStatus.unlockedCount || index < unlockStatus.maxUnlocks;
  };

  if (promptLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  if (!todaysPrompt) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-bold text-gray-900 text-center mb-2 font-heading">
            No prompt today
          </Text>
          <Text className="text-gray-600 text-center">
            Check back tomorrow for a new daily prompt!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      {/* Today's Prompt + Add Response Card */}
      <View className="px-5 pt-4 pb-3">
        <View
          className="rounded-3xl px-6 py-10"
          style={{
            backgroundColor: '#FFBF00',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: 'rgba(0,0,0,0.5)' }}
            >
              Today's Prompt
            </Text>
            <TouchableOpacity onPress={() => {}} className="p-1">
              <ShareIcon size={22} color="#111827" />
            </TouchableOpacity>
          </View>
          <Text
            className="text-5xl font-bold text-black font-heading mb-5"
            style={{ lineHeight: 48 }}
          >
            {todaysPrompt.text}
          </Text>
          <View className="flex-row items-center mb-4 gap-4">
            <TextT weight="fill" size={22} color="rgba(0,0,0,0.5)" />
            <Camera weight="fill" size={22} color="rgba(0,0,0,0.5)" />
            <VideoCamera weight="fill" size={22} color="rgba(0,0,0,0.5)" />
            <Microphone weight="fill" size={22} color="rgba(0,0,0,0.5)" />
          </View>
          <TouchableOpacity
            onPress={() => router.push('/compose')}
            className="bg-black rounded-full py-4 flex-row items-center justify-center"
            activeOpacity={0.85}
          >
            <PlusCircle weight="fill" size={22} color="white" />
            <Text className="text-white font-semibold text-base ml-2">
              {hasPosted ? 'Edit your response' : 'Add your response'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed Locked / Friends Responses */}
      <View className="px-5">
        {!hasPosted ? (
          <View className="bg-gray-50 rounded-3xl p-8 items-center border border-gray-200">
            <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mb-4">
              <Lock weight="bold" size={28} color="#9ca3af" />
            </View>
            <Text className="text-xl font-bold text-black text-center mb-2 font-heading">
              Feed Locked
            </Text>
            <Text className="text-gray-600 text-center text-base leading-relaxed">
              Post your response to today's prompt to see{'\n'}
              what your friends posted!
            </Text>
            {friendsResponses && friendsResponses.length > 0 && (
              <Text className="text-gray-500 text-sm mt-3">
                {friendsResponses.length} {friendsResponses.length === 1 ? 'friend has' : 'friends have'} already posted
              </Text>
            )}
          </View>
        ) : friendsResponses && friendsResponses.length > 0 ? (
          <View>
            {/* Unlock Progress Banner */}
            {unlockStatus && (
              <View className="bg-primary-50 rounded-2xl p-4 mb-4 border border-primary-200">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <LockOpen weight="bold" size={20} color="#FFBF00" />
                    <Text className="text-black font-semibold ml-2">
                      {remainingUnlocks} unlocks remaining
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/messages')}
                    className="bg-black rounded-full px-3 py-1.5 flex-row items-center"
                  >
                    <ChatCircle weight="bold" size={14} color="white" />
                    <Text className="text-white text-xs font-semibold ml-1">
                      DM +3
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-gray-600 text-xs mt-2">
                  Send a DM to a friend to unlock +3 more responses
                </Text>
              </View>
            )}

            {friendsResponses.map((response: any, index: number) => {
              const unlocked = isResponseUnlocked(index);

              return (
                <TouchableOpacity
                  key={response.id}
                  className="mb-4"
                  onPress={() => {
                    if (unlocked) {
                      handleViewResponse(response.id, index);
                      // Navigate to user profile or show detail
                      router.push(`/(tabs)/profile/${response.user?.id}`);
                    } else {
                      haptics.warning();
                    }
                  }}
                  activeOpacity={unlocked ? 0.8 : 1}
                >
                  <View className={`rounded-3xl overflow-hidden border ${
                    unlocked ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-300'
                  }`}>
                    {/* User Header */}
                    <View className="flex-row items-center p-4">
                      {response.user?.avatar_url ? (
                        <Image
                          source={{ uri: response.user.avatar_url }}
                          className={`w-12 h-12 rounded-full mr-3 ${!unlocked ? 'opacity-50' : ''}`}
                        />
                      ) : (
                        <View className={`w-12 h-12 rounded-full bg-gray-300 mr-3 items-center justify-center ${!unlocked ? 'opacity-50' : ''}`}>
                          <Text className="text-gray-600 font-bold text-lg">
                            {response.user?.display_name?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className={`font-bold text-black text-base ${!unlocked ? 'opacity-50' : ''}`}>
                          {response.user?.display_name}
                        </Text>
                        <Text className={`text-sm text-gray-500 ${!unlocked ? 'opacity-50' : ''}`}>
                          @{response.user?.username}
                        </Text>
                      </View>
                      {!unlocked && (
                        <View className="bg-gray-200 rounded-full p-2">
                          <Lock weight="bold" size={16} color="#6b7280" />
                        </View>
                      )}
                    </View>

                    {/* Response Content */}
                    {unlocked ? (
                      <View className="px-4 pb-4">
                        {response.media_url && response.media_type === 'image' && (
                          <Image
                            source={{ uri: response.media_url }}
                            className="w-full rounded-2xl mb-3"
                            style={{ aspectRatio: 9/11 }}
                            resizeMode="cover"
                          />
                        )}
                        {response.text_content && (
                          <Text className="text-black text-base leading-relaxed">
                            {response.text_content}
                          </Text>
                        )}

                        {/* Reactions */}
                        <View className="mt-3">
                          <ResponseReactions
                            responseId={response.id}
                            userId={user?.id || ''}
                            postOwnerId={response.user?.id || ''}
                          />
                        </View>

                        {/* Quick Actions */}
                        <View className="flex-row items-center mt-3 pt-3 border-t border-gray-200 gap-2">
                          <TouchableOpacity
                            onPress={() => router.push(`/(tabs)/messages/${response.user?.id}`)}
                            className="flex-row items-center bg-gray-100 rounded-full px-4 py-2"
                          >
                            <ChatCircle weight="bold" size={16} color="#000" />
                            <Text className="text-black text-sm font-medium ml-2">Message</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={async () => {
                              if (!user?.id) return;
                              try {
                                haptics.lightImpact();
                                await sendNudge.mutateAsync({
                                  fromUserId: user.id,
                                  toUserId: response.user?.id,
                                  promptId: todaysPrompt?.id,
                                });
                                toast.success(`Nudged ${response.user?.display_name}!`);
                              } catch (error: any) {
                                toast.error(error.message || 'Failed to nudge');
                              }
                            }}
                            className="flex-row items-center bg-primary-100 rounded-full px-4 py-2"
                          >
                            <Bell weight="bold" size={16} color="#FFBF00" />
                            <Text className="text-black text-sm font-medium ml-2">Nudge</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View className="px-4 pb-4">
                        {/* Blurred/Locked Content */}
                        <View className="bg-gray-200 rounded-2xl items-center justify-center p-8">
                          <Lock weight="bold" size={32} color="#9ca3af" />
                          <Text className="text-gray-500 font-semibold mt-2 text-center">
                            Response Locked
                          </Text>
                          <Text className="text-gray-400 text-sm text-center mt-1">
                            {remainingUnlocks > 0
                              ? 'Tap to unlock'
                              : 'Send a DM to unlock more'
                            }
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View className="bg-gray-50 rounded-3xl p-8 items-center border border-gray-200">
            <Text className="text-lg font-semibold text-black text-center mb-2 font-heading">
              Your friends haven't posted yet
            </Text>
            <Text className="text-gray-600 text-center">
              Check back soon, or invite more friends to grow{'\n'}your feed.
            </Text>
          </View>
        )}
      </View>

      {/* Limbo Zone Section */}
      {hasPosted && limboFriends && limboFriends.length > 0 && (
        <View className="px-5 mt-6">
          <View className="flex-row items-center mb-4">
            <Ghost weight="bold" size={20} color="#9ca3af" />
            <Text className="text-lg font-bold text-gray-500 ml-2 font-heading">
              Limbo Zone
            </Text>
            <View className="bg-gray-200 rounded-full px-2 py-0.5 ml-2">
              <Text className="text-xs text-gray-600 font-medium">
                {limboFriends.length}
              </Text>
            </View>
          </View>
          <Text className="text-gray-500 text-sm mb-4">
            These friends have been inactive for 30+ days. Send them a nudge!
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
            <View className="flex-row gap-3">
              {limboFriends.map((friend) => (
                <View
                  key={friend.id}
                  className="bg-gray-100 rounded-2xl p-4 items-center"
                  style={{ width: 140 }}
                >
                  {friend.avatar_url ? (
                    <Image
                      source={{ uri: friend.avatar_url }}
                      className="w-16 h-16 rounded-full mb-3 opacity-60"
                    />
                  ) : (
                    <View className="w-16 h-16 rounded-full bg-gray-300 mb-3 items-center justify-center opacity-60">
                      <Text className="text-gray-600 font-bold text-xl">
                        {friend.display_name?.[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text className="font-semibold text-gray-700 text-center" numberOfLines={1}>
                    {friend.display_name}
                  </Text>
                  <Text className="text-xs text-gray-400 mb-3">
                    {friend.days_inactive}+ days
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRescueFriend(friend.id, friend.display_name)}
                    className="bg-primary-500 rounded-full px-4 py-2 flex-row items-center"
                    disabled={rescueFriend.isPending}
                  >
                    <Bell weight="bold" size={14} color="#000" />
                    <Text className="text-black text-xs font-semibold ml-1">
                      Nudge
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}
