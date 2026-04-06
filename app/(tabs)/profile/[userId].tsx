import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Settings,
  MessageCircle,
  UserPlus,
  UserMinus,
  Calendar,
  Users,
  QrCode,
} from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfile } from '../../../hooks/useProfile';
import { useUserResponses } from '../../../hooks/useResponses';
import { useFriendshipStatus, useSendFriendRequest, useRemoveFriend } from '../../../hooks/useFriends';
import { useSendNudge } from '../../../hooks/useNudges';
import { useTodaysPrompt } from '../../../hooks/usePrompt';
import { toast } from '../../../utils/toast';
import * as haptics from '../../../utils/haptics';
import { Share } from 'lucide-react-native';
import { shareResponse } from '../../../utils/sharing';
import { QRCodeModal } from '../../../components/profile/QRCodeModal';
import { StreakCalendar } from '../../../components/profile/StreakCalendar';
import { OptionalPromptsSection } from '../../../components/profile/OptionalPromptsSection';
import { ImageLightbox } from '../../../components/media/ImageLightbox';

export default function ProfileViewPage() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'pinned' | 'all'>('pinned');

  const isOwnProfile = userId === user?.id;
  const [showQRModal, setShowQRModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { data: profile, isLoading: profileLoading } = useProfile(userId);
  const {
    data: responsesData,
    isLoading: responsesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchResponses,
  } = useUserResponses(userId);
  const { data: friendship } = useFriendshipStatus(user?.id, userId);
  const sendFriendRequest = useSendFriendRequest();
  const removeFriend = useRemoveFriend();
  const sendNudge = useSendNudge();
  const { data: todaysPrompt } = useTodaysPrompt();

  // Flatten the paginated responses
  const responses = responsesData?.pages.flatMap((page) => page) || [];

  const handleFriendAction = async () => {
    if (!user || !userId) return;

    if (friendship?.status === 'accepted') {
      // Remove friend
      Alert.alert(
        'Remove Friend',
        'Are you sure you want to remove this friend?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                haptics.heavyImpact();
                if (friendship?.id) {
                  await removeFriend.mutateAsync(friendship.id);
                }
              } catch (error: any) {
                haptics.error();
                Alert.alert('Error', error.message || 'Failed to remove friend');
              }
            },
          },
        ]
      );
    } else {
      // Send friend request
      try {
        haptics.success();
        await sendFriendRequest.mutateAsync({ requesterId: user.id, addresseeId: userId });
        Alert.alert('Success', 'Friend request sent!');
      } catch (error: any) {
        haptics.error();
        Alert.alert('Error', error.message || 'Failed to send friend request');
      }
    }
  };

  const handleNudge = async () => {
    if (!user || !userId || !todaysPrompt) return;

    // Check if user has already posted today
    const hasPostedToday = responses && responses.some((r: any) => {
      const responseDate = new Date(r.created_at).toDateString();
      const today = new Date().toDateString();
      return responseDate === today && r.prompt_id === todaysPrompt.id;
    });

    if (hasPostedToday) {
      toast.info('Your friend has already posted today!');
      return;
    }

    Alert.alert(
      'Nudge Friend',
      `Send a friendly reminder to ${profile?.display_name} to answer today's prompt?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Nudge',
          onPress: async () => {
            try {
              haptics.mediumImpact();
              await sendNudge.mutateAsync({
                toUserId: userId,
                promptId: todaysPrompt.id,
                message: `Hey! Don't forget to answer today's prompt 😊`,
              });
              haptics.success();
              toast.success('Nudge sent!');
            } catch (error: any) {
              haptics.error();
              toast.error(error.message || 'Failed to send nudge');
            }
          },
        },
      ]
    );
  };

  if (profileLoading || responsesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-semibold text-gray-900 text-center mb-2">
            Profile not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Separate optional prompt responses from regular responses
  const optionalResponses = responses?.filter((r: any) => r.optional_prompt_id) || [];
  const regularResponses = responses?.filter((r: any) => r.prompt_id && !r.optional_prompt_id) || [];
  const pinnedResponses = regularResponses?.filter((r: any) => r.is_pinned) || [];
  const displayedResponses = viewMode === 'pinned' ? pinnedResponses : regularResponses || [];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header */}
      <View className="px-5 py-6 bg-white rounded-3xl">
        <View className="items-center mb-6">
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              className="w-28 h-28 rounded-full bg-gray-200 mb-4"
            />
          ) : (
            <View className="w-28 h-28 rounded-full bg-red-500 items-center justify-center mb-4">
              <Text className="text-white text-4xl font-bold">
                {profile.display_name?.[0]?.toUpperCase()}
              </Text>
            </View>
          )}
          <Text className="text-2xl font-black text-black mb-1">
            {profile.display_name}
          </Text>
          <Text className="text-gray-500 text-base">@{profile.username}</Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 mb-6">
          {isOwnProfile ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  haptics.lightImpact();
                  setShowQRModal(true);
                }}
                className="bg-gray-100 rounded-full p-3"
                activeOpacity={0.7}
              >
                <QrCode size={20} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile/friends')}
                className="flex-1 bg-gray-100 rounded-full py-3"
                activeOpacity={0.7}
              >
                <Text className="text-black text-center font-semibold">Friends</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile/edit')}
                className="flex-1 bg-black rounded-full py-3"
                activeOpacity={0.7}
              >
                <Text className="text-white text-center font-semibold">Edit Profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/messages/${userId}`)}
                className="flex-1 bg-gray-100 rounded-full py-3"
                activeOpacity={0.7}
              >
                <Text className="text-black text-center font-semibold">Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleFriendAction}
                className={`flex-1 rounded-full py-3 ${
                  friendship?.status === 'accepted' ? 'bg-gray-100' : 'bg-black'
                }`}
                activeOpacity={0.7}
              >
                <Text className={`text-center font-semibold ${
                  friendship?.status === 'accepted' ? 'text-black' : 'text-white'
                }`}>
                  {friendship?.status === 'accepted' ? 'Friends' : 'Add Friend'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Nudge Button (for friends only) */}
        {!isOwnProfile && friendship?.status === 'accepted' && (
          <View className="px-5 mb-6">
            <TouchableOpacity
              onPress={handleNudge}
              className="bg-yellow-400 rounded-full py-3 flex-row items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-black font-semibold mr-2">👋</Text>
              <Text className="text-black font-semibold">
                Nudge to Answer Today's Prompt
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Row */}
        <View className="flex-row items-center justify-center gap-8 mb-6">
          <View className="items-center">
            <Text className="text-2xl font-black text-black">
              {regularResponses?.length || 0}
            </Text>
            <Text className="text-gray-600 text-sm">responses</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-black text-black">
              {profile.friend_count || 0}
            </Text>
            <Text className="text-gray-600 text-sm">friends</Text>
          </View>
        </View>
      </View>

      {/* Optional Prompts / About Me Section */}
      <View className="px-5">
        <OptionalPromptsSection
          isOwnProfile={isOwnProfile}
          optionalResponses={optionalResponses}
          onRefresh={() => refetchResponses?.()}
        />
      </View>

      {/* Streak Calendar */}
      {isOwnProfile && (
        <View className="px-5 mb-6">
          <StreakCalendar
            responseDates={responses?.map((r: any) => r.created_at) || []}
            streak={profile.streak || 0}
          />
        </View>
      )}

      {/* Answer More Prompts Button */}
      {isOwnProfile && (
        <View className="px-5 mb-6">
          <TouchableOpacity
            className="bg-black rounded-full py-4"
            activeOpacity={0.7}
          >
            <Text className="text-white text-center font-bold">✨ Answer More Prompts</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* View Toggle */}
      <View className="px-5 mb-4">
        <View className="flex-row bg-gray-100 rounded-full p-1">
          <TouchableOpacity
            onPress={() => setViewMode('pinned')}
            className={`flex-1 py-2.5 rounded-full ${
              viewMode === 'pinned' ? 'bg-black' : 'bg-transparent'
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-center font-semibold ${
                viewMode === 'pinned' ? 'text-white' : 'text-gray-700'
              }`}
            >
              📌 Pinned ({pinnedResponses.length}/6)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('all')}
            className={`flex-1 py-2.5 rounded-full ${
              viewMode === 'all' ? 'bg-black' : 'bg-transparent'
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-center font-semibold ${
                viewMode === 'all' ? 'text-white' : 'text-gray-700'
              }`}
            >
              All Responses ({responses?.length || 0})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Responses Grid */}
      <View className="px-5">
        {displayedResponses.length > 0 ? (
          <>
            <View className="flex-row flex-wrap -mx-1.5">
              {displayedResponses.map((response: any) => (
                <View key={response.id} className="w-1/2 px-1.5 mb-3">
                  <View className="relative">
                    <TouchableOpacity
                      className="bg-gray-100 rounded-3xl overflow-hidden"
                      style={{ aspectRatio: 9/11 }}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (response.media_url && response.media_type === 'image') {
                          haptics.lightImpact();
                          setLightboxImage(response.media_url);
                        }
                      }}
                    >
                      {response.media_url && response.media_type === 'image' ? (
                        <Image
                          source={{ uri: response.media_url }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="flex-1 p-4 justify-center">
                          <Text className="text-black text-sm" numberOfLines={6}>
                            {response.text_content}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {/* Share Button */}
                    <TouchableOpacity
                      onPress={() => {
                        haptics.lightImpact();
                        shareResponse({
                          text: response.text_content,
                          mediaUrl: response.media_url,
                          promptText: response.prompt?.text || response.optional_prompt?.text,
                          userName: profile?.display_name,
                        });
                      }}
                      className="absolute top-2 right-2 bg-white/90 rounded-full p-2 shadow-sm"
                    >
                      <Share size={16} color="#FFBF00" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Load More Button */}
            {viewMode === 'all' && hasNextPage && (
              <View className="mt-4">
                <TouchableOpacity
                  onPress={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="bg-gray-100 rounded-full py-4"
                  activeOpacity={0.7}
                >
                  {isFetchingNextPage ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text className="text-black text-center font-semibold">
                      Load More Responses
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View className="bg-gray-50 rounded-3xl p-12 items-center border border-gray-200">
            <Text className="text-gray-600 text-center">
              {viewMode === 'pinned' ? 'No pinned responses' : 'No responses yet'}
            </Text>
          </View>
        )}
      </View>
      </ScrollView>

      {/* QR Code Modal */}
      {isOwnProfile && profile && (
        <QRCodeModal
          visible={showQRModal}
          onClose={() => setShowQRModal(false)}
          userId={userId || ''}
          username={profile.username || ''}
          displayName={profile.display_name || ''}
        />
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        visible={!!lightboxImage}
        imageUrl={lightboxImage || ''}
        onClose={() => setLightboxImage(null)}
      />
    </SafeAreaView>
  );
}
