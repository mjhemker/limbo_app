import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import {
  Settings,
  MoreHorizontal,
  Search,
  ChevronLeft,
  Star,
  QrCode,
} from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfile } from '../../../hooks/useProfile';
import { useUserResponses } from '../../../hooks/useResponses';
import { useFriendshipStatus, useSendFriendRequest, useRemoveFriend, useFriendRequests, useFriends } from '../../../hooks/useFriends';
import { useScrapbookStats } from '../../../hooks/useScrapbook';
import { useSendNudge } from '../../../hooks/useNudges';
import { useTodaysPrompt } from '../../../hooks/usePrompt';
import { toast } from '../../../utils/toast';
import * as haptics from '../../../utils/haptics';
import { QRCodeModal } from '../../../components/profile/QRCodeModal';
import { StreakCalendar } from '../../../components/profile/StreakCalendar';
import { OptionalPromptsSection } from '../../../components/profile/OptionalPromptsSection';
import { ImageLightbox } from '../../../components/media/ImageLightbox';
import ReportModal from '../../../components/modals/ReportModal';
import { useBlockUser, useUnblockUser, useIsBlocked } from '../../../hooks/useBlocks';
import ScrapbookCard from '../../../components/scrapbook/ScrapbookCard';

// V2 Avatar colors
const AVATAR_COLORS = ['#F26E5E', '#6AAA64', '#8E73C9', '#4F8FE0', '#C28F2C'];

// V2 Card colors for pinned responses
const CARD_COLORS = ['#F7DA21', '#F7DA21', '#F26E5E', '#6AAA64', '#8E73C9'];

function getAvatarColor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getCardColor(index: number) {
  return CARD_COLORS[index % CARD_COLORS.length];
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
}

export default function ProfileViewPage() {
  const { userId, from } = useLocalSearchParams<{ userId: string; from?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'pinned' | 'activity' | 'party'>('pinned');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityTimeFilter, setActivityTimeFilter] = useState<'all' | 'month' | 'week'>('all');
  const [animKey, setAnimKey] = useState(() => Date.now());

  // Re-trigger animations when tab is focused
  useFocusEffect(
    useCallback(() => {
      setAnimKey(Date.now());
    }, [])
  );

  const isOwnProfile = userId === user?.id;
  const [showQRModal, setShowQRModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
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
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const { data: isBlocked, refetch: refetchIsBlocked } = useIsBlocked(user?.id, userId);
  const { data: pendingRequests } = useFriendRequests(user?.id);
  const pendingCount = pendingRequests?.length || 0;
  const { data: friends } = useFriends(userId);
  const { data: scrapbookStats } = useScrapbookStats(userId);

  // Flatten the paginated responses
  const responses = responsesData?.pages.flatMap((page) => page) || [];

  const handleFriendAction = async () => {
    if (!user || !userId) return;

    if (friendship?.status === 'accepted') {
      Alert.alert('Remove Friend', 'Are you sure you want to remove this friend?', [
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
      ]);
    } else {
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

  const handleShowMoreMenu = () => {
    Alert.alert('Options', undefined, [
      { text: 'Report Profile', onPress: () => setShowReportModal(true) },
      {
        text: isBlocked ? 'Unblock User' : 'Block User',
        style: isBlocked ? 'default' : 'destructive',
        onPress: () => {
          if (isBlocked) {
            unblockUser.mutateAsync({ blockerId: user!.id, blockedId: userId! })
              .then(() => { toast.success('User unblocked'); refetchIsBlocked(); })
              .catch(() => haptics.error());
          } else {
            blockUser.mutateAsync({ blockerId: user!.id, blockedId: userId!, reason: 'Blocked from profile' })
              .then(() => { toast.success('User blocked'); router.back(); })
              .catch(() => haptics.error());
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleNudge = async () => {
    if (!user || !userId || !todaysPrompt || !profile) return;
    Alert.alert('Nudge Friend', `Send a friendly reminder to ${profile.display_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Nudge',
        onPress: async () => {
          try {
            haptics.mediumImpact();
            await sendNudge.mutateAsync({ toUserId: userId, promptId: todaysPrompt.id, message: `Hey! Don't forget to answer today's prompt` });
            haptics.success();
            toast.success('Nudge sent!');
          } catch (error: any) {
            haptics.error();
            toast.error(error.message || 'Failed to send nudge');
          }
        },
      },
    ]);
  };

  if (profileLoading || responsesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F7DA21" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-extrabold text-ink text-center">Profile not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const optionalResponses = responses?.filter((r: any) => r.prompt?.type === 'optional') || [];
  const regularResponses = responses?.filter((r: any) => r.prompt?.type !== 'optional') || [];
  const pinnedResponses = regularResponses?.filter((r: any) => r.is_pinned) || [];
  const avatarColor = getAvatarColor(profile.display_name);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* V2 Header - minimal with settings */}
        <Animated.View
          key={`header-${animKey}`}
          entering={FadeInDown.duration(300)}
          className="flex-row items-center justify-between px-5 pt-2 pb-1"
        >
          {!isOwnProfile ? (
            <TouchableOpacity
              onPress={() => {
                if (from === 'messages' && userId) {
                  // Navigate back to the message thread with this user
                  router.replace(`/(tabs)/messages/${userId}`);
                } else {
                  router.back();
                }
              }}
              className="w-10 h-10 items-center justify-center"
            >
              <ChevronLeft size={24} color="#111111" strokeWidth={2} />
            </TouchableOpacity>
          ) : (
            <View className="w-10" />
          )}
          <View className="flex-1" />
          {isOwnProfile ? (
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile/edit')} className="w-10 h-10 items-center justify-center">
              <Settings size={22} color="#111111" strokeWidth={2} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleShowMoreMenu} className="w-10 h-10 items-center justify-center">
              <MoreHorizontal size={22} color="#111111" strokeWidth={2} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Profile Header - V2 Coral Card Style */}
        <Animated.View
          key={`profile-card-${animKey}`}
          entering={FadeInDown.delay(100).duration(400).springify()}
          className="px-5 pt-2"
        >
          {/* Main Profile Card with colored background */}
          <View
            className="rounded-[24px] p-5 mb-4"
            style={{ backgroundColor: avatarColor }}
          >
            {/* Avatar + Name + QR Row */}
            <View className="flex-row items-center mb-4">
              {/* Avatar */}
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  className="w-16 h-16 rounded-full bg-white border-2 border-white/20"
                />
              ) : (
                <View className="w-16 h-16 rounded-full bg-white items-center justify-center">
                  <Text className="text-2xl font-extrabold" style={{ color: avatarColor }}>
                    {profile.display_name?.[0]?.toUpperCase()}
                  </Text>
                </View>
              )}

              {/* Name + Username */}
              <View className="flex-1 ml-4">
                <Text
                  className="text-[22px] font-extrabold text-white leading-tight"
                  style={{ letterSpacing: -0.5 }}
                  numberOfLines={1}
                >
                  {profile.display_name}
                </Text>
                <Text className="text-white/85 font-medium text-[12.5px]">@{profile.username}</Text>
              </View>

              {/* QR Code Button */}
              {isOwnProfile && (
                <TouchableOpacity
                  onPress={() => setShowQRModal(true)}
                  className="w-10 h-10 bg-white/15 rounded-[12px] items-center justify-center"
                  activeOpacity={0.7}
                >
                  <QrCode size={20} color="white" strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>

            {/* Stats Row - Pills inside colored card */}
            <View className="flex-row gap-2.5">
              <View className="flex-1 bg-white/15 rounded-[14px] py-2.5 px-2">
                <Text className="text-[22px] font-extrabold text-white text-center" style={{ letterSpacing: -0.5 }}>
                  {scrapbookStats?.answered_prompts ?? regularResponses?.length ?? 0}
                </Text>
                <Text className="text-[10px] font-semibold text-white/85 text-center mt-0.5">entries</Text>
              </View>
              <View className="flex-1 bg-white/15 rounded-[14px] py-2.5 px-2">
                <Text className="text-[22px] font-extrabold text-white text-center" style={{ letterSpacing: -0.5 }}>
                  {scrapbookStats?.current_streak ?? 0}
                </Text>
                <Text className="text-[10px] font-semibold text-white/85 text-center mt-0.5">streak 🔥</Text>
              </View>
              <View className="flex-1 bg-white/15 rounded-[14px] py-2.5 px-2">
                <Text className="text-[22px] font-extrabold text-white text-center" style={{ letterSpacing: -0.5 }}>
                  {friends?.length ?? 0}
                </Text>
                <Text className="text-[10px] font-semibold text-white/85 text-center mt-0.5">friends</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons - V2 Style (below the card) */}
          <View className="flex-row gap-2 mb-6">
            {isOwnProfile ? (
              <>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/profile/edit')}
                  className="flex-1 bg-ink rounded-[14px] py-3.5"
                  activeOpacity={0.7}
                >
                  <Text className="text-white text-center font-bold text-[13px]">Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/profile/friends')}
                  className="flex-1 bg-white border border-rule rounded-[14px] py-3.5 relative"
                  activeOpacity={0.7}
                >
                  <Text className="text-ink text-center font-bold text-[13px]">Friends</Text>
                  {/* Pending requests badge */}
                  {pendingCount > 0 && (
                    <View className="absolute -top-1.5 -right-1.5 bg-coral rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                      <Text className="text-white text-[10px] font-bold">{pendingCount > 9 ? '9+' : pendingCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => router.push(`/(tabs)/messages/${userId}`)}
                  className="flex-1 bg-white border border-rule rounded-[14px] py-3.5"
                  activeOpacity={0.7}
                >
                  <Text className="text-ink text-center font-bold text-[13px]">Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleFriendAction}
                  className={`flex-1 rounded-[14px] py-3.5 ${friendship?.status === 'accepted' ? 'bg-white border border-rule' : 'bg-ink'}`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-center font-bold text-[13px] ${friendship?.status === 'accepted' ? 'text-ink' : 'text-white'}`}>
                    {friendship?.status === 'accepted' ? 'Friends' : friendship?.status === 'pending' ? 'Pending' : 'Add Friend'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>

        {/* Scrapbook Section - V2 positioned above tabs */}
        {isOwnProfile && userId && (
          <Animated.View
            key={`scrapbook-${animKey}`}
            entering={FadeInDown.delay(200).duration(400).springify()}
            className="px-5 mb-6"
          >
            <ScrapbookCard userId={userId} userName={profile?.display_name || 'You'} isOwner />
          </Animated.View>
        )}

        {/* View Toggle - V2 Style Tabs */}
        <Animated.View
          key={`tabs-${animKey}`}
          entering={FadeInDown.delay(300).duration(400).springify()}
          className="px-5 mb-4"
        >
          <View className="flex-row">
            {['pinned', 'activity', 'party'].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setViewMode(tab as any)}
                className={`mr-2 px-4 py-2 rounded-full ${viewMode === tab ? 'bg-ink' : 'bg-transparent'}`}
                activeOpacity={0.7}
              >
                <Text className={`font-bold text-[13px] capitalize ${viewMode === tab ? 'text-white' : 'text-ink-soft'}`}>
                  {tab === 'pinned' ? 'Pinned' : tab === 'activity' ? 'Activity' : 'Party 🎉'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Tab Content */}
        <Animated.View
          key={`content-${viewMode}-${animKey}`}
          entering={FadeInDown.delay(350).duration(400).springify()}
          className="px-5"
        >
          {/* PINNED TAB */}
          {viewMode === 'pinned' && (
            <>
              {pinnedResponses.length > 0 ? (
                pinnedResponses.map((response: any, index: number) => {
                  const cardColor = getCardColor(index);
                  const isYellow = cardColor === '#F7DA21';
                  const textColor = isYellow ? '#111111' : '#FFFFFF';

                  return (
                    <TouchableOpacity
                      key={response.id}
                      className="rounded-[22px] p-5 mb-3"
                      style={{ backgroundColor: cardColor }}
                      activeOpacity={0.9}
                      onPress={() => {
                        if (response.media_url && response.media_type === 'image') {
                          haptics.lightImpact();
                          setLightboxImage(response.media_url);
                        }
                      }}
                    >
                      {/* Header row */}
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <Star size={12} color={textColor} fill={textColor} />
                          <Text className="text-[10px] font-bold uppercase tracking-widest ml-1.5" style={{ color: textColor, opacity: 0.7 }}>
                            PROMPT
                          </Text>
                        </View>
                        <Text className="text-[11px] font-medium" style={{ color: textColor, opacity: 0.6 }}>
                          {formatTimeAgo(response.created_at)}
                        </Text>
                      </View>

                      {/* Prompt text */}
                      <Text className="text-[14px] font-medium mb-2" style={{ color: textColor, opacity: 0.8 }}>
                        {response.prompt?.text}
                      </Text>

                      {/* Response text or image */}
                      {response.media_url && response.media_type === 'image' ? (
                        <View className="rounded-[14px] overflow-hidden mb-3" style={{ aspectRatio: 16/9 }}>
                          <Image source={{ uri: response.media_url }} className="w-full h-full" resizeMode="cover" />
                        </View>
                      ) : (
                        <Text className="text-[18px] font-bold mb-3" style={{ color: textColor, letterSpacing: -0.3 }}>
                          "{response.text_content}"
                        </Text>
                      )}

                      {/* Footer - reactions (only if > 0) and unpin */}
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          {/* Only show reactions if count > 0 */}
                          {(response.reaction_count || 0) > 0 && (
                            <View className="flex-row items-center bg-white/20 rounded-full px-2.5 py-1">
                              <Text className="text-[12px]">🔥</Text>
                              <Text className="text-[12px] font-bold ml-1" style={{ color: textColor }}>{response.reaction_count}</Text>
                            </View>
                          )}
                        </View>
                        {isOwnProfile && (
                          <Text className="text-[12px] font-medium" style={{ color: textColor, opacity: 0.6 }}>
                            tap to unpin
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View className="bg-sand rounded-[22px] p-10 items-center">
                  <Text className="text-ink-soft font-medium text-center">No pinned responses yet</Text>
                  {isOwnProfile && (
                    <Text className="text-ink-soft text-[13px] text-center mt-1">Pin your favorite answers to showcase them here</Text>
                  )}
                </View>
              )}
            </>
          )}

          {/* ACTIVITY TAB */}
          {viewMode === 'activity' && (
            <>
              {/* Search */}
              <View className="flex-row items-center bg-sand rounded-full px-4 py-3 mb-4">
                <Search size={16} color="#6B6760" />
                <TextInput
                  value={activitySearch}
                  onChangeText={setActivitySearch}
                  placeholder="Search responses..."
                  placeholderTextColor="#6B6760"
                  className="flex-1 ml-2 text-ink font-medium text-[14px]"
                />
              </View>

              {/* Time Filters */}
              <View className="flex-row gap-2 mb-4">
                {[{ key: 'all', label: 'All Time' }, { key: 'month', label: 'This Month' }, { key: 'week', label: 'This Week' }].map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    onPress={() => setActivityTimeFilter(filter.key as any)}
                    className={`px-4 py-2 rounded-full ${activityTimeFilter === filter.key ? 'bg-ink' : 'bg-sand'}`}
                  >
                    <Text className={`font-bold text-[12px] ${activityTimeFilter === filter.key ? 'text-white' : 'text-ink-soft'}`}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Activity List */}
              {regularResponses
                .filter((r: any) => {
                  if (activitySearch) {
                    const searchLower = activitySearch.toLowerCase();
                    return r.text_content?.toLowerCase().includes(searchLower) || r.prompt?.text?.toLowerCase().includes(searchLower);
                  }
                  return true;
                })
                .filter((r: any) => {
                  const responseDate = new Date(r.created_at);
                  const now = new Date();
                  if (activityTimeFilter === 'week') return responseDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  if (activityTimeFilter === 'month') return responseDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                  return true;
                })
                .map((response: any) => (
                  <View key={response.id} className="bg-card border border-rule rounded-[18px] p-4 mb-3">
                    <Text className="text-[11px] text-ink-soft font-medium mb-1" style={{ fontFamily: 'JetBrainsMono_400Regular' }}>
                      {new Date(response.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    <Text className="text-ink-soft font-medium text-[13px] mb-2">{response.prompt?.text || 'Unknown prompt'}</Text>
                    {response.media_url && response.media_type === 'image' && (
                      <Image source={{ uri: response.media_url }} className="w-full h-40 rounded-[14px] mb-2" resizeMode="cover" />
                    )}
                    <Text className="text-ink font-medium text-[14px]">{response.text_content}</Text>
                  </View>
                ))}

              {hasNextPage && (
                <TouchableOpacity onPress={() => fetchNextPage()} disabled={isFetchingNextPage} className="bg-sand rounded-full py-4 mt-2">
                  {isFetchingNextPage ? <ActivityIndicator color="#111111" /> : <Text className="text-ink text-center font-bold text-[14px]">Load More</Text>}
                </TouchableOpacity>
              )}
            </>
          )}

          {/* PARTY TAB */}
          {viewMode === 'party' && (
            <View className="bg-gradient-to-br from-purple to-coral rounded-[22px] overflow-hidden">
              <View className="bg-[#8E73C9] p-6 items-center">
                <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mb-4">
                  <Text className="text-[32px]">🎉</Text>
                </View>
                <Text className="text-white font-extrabold text-[20px] mb-2 text-center">Party Mode</Text>
                <Text className="text-white/80 font-medium text-center text-[14px] mb-6">
                  {isOwnProfile
                    ? 'Start a party to answer prompts with friends in real-time!'
                    : `See ${profile.display_name}'s party photos and memories`}
                </Text>

                {isOwnProfile ? (
                  <TouchableOpacity
                    onPress={() => router.push('/party/')}
                    className="bg-white rounded-full px-8 py-3.5"
                    activeOpacity={0.9}
                  >
                    <Text className="text-[#8E73C9] font-extrabold text-[15px]">Start a Party</Text>
                  </TouchableOpacity>
                ) : (
                  <View className="bg-white/10 rounded-full px-6 py-3">
                    <Text className="text-white/80 font-semibold text-[14px]">No party photos yet</Text>
                  </View>
                )}
              </View>

              {/* Party Stats - only for own profile */}
              {isOwnProfile && (
                <View className="bg-[#7A5FB8] px-6 py-4">
                  <View className="flex-row justify-around">
                    <View className="items-center">
                      <Text className="text-white font-extrabold text-[20px]">0</Text>
                      <Text className="text-white/70 font-medium text-[11px]">Parties hosted</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-white font-extrabold text-[20px]">0</Text>
                      <Text className="text-white/70 font-medium text-[11px]">Party photos</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-white font-extrabold text-[20px]">0</Text>
                      <Text className="text-white/70 font-medium text-[11px]">Friends joined</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Optional Prompts / About Me Section */}
        <Animated.View
          key={`optional-${animKey}`}
          entering={FadeInUp.delay(400).duration(400)}
          className="px-5 mt-6"
        >
          <OptionalPromptsSection isOwnProfile={isOwnProfile} optionalResponses={optionalResponses} onRefresh={() => refetchResponses?.()} />
        </Animated.View>

        {/* Streak Calendar */}
        {isOwnProfile && (
          <Animated.View
            key={`streak-${animKey}`}
            entering={FadeInUp.delay(450).duration(400)}
            className="px-5 mt-6"
          >
            <StreakCalendar responseDates={responses?.map((r: any) => r.created_at) || []} streak={scrapbookStats?.current_streak ?? 0} />
          </Animated.View>
        )}
      </ScrollView>

      {/* QR Code Modal */}
      {isOwnProfile && profile && (
        <QRCodeModal visible={showQRModal} onClose={() => setShowQRModal(false)} userId={userId || ''} username={profile.username || ''} displayName={profile.display_name || ''} />
      )}

      {/* Image Lightbox */}
      <ImageLightbox visible={!!lightboxImage} imageUrl={lightboxImage || ''} onClose={() => setLightboxImage(null)} />

      {/* Report Modal */}
      {!isOwnProfile && userId && (
        <ReportModal visible={showReportModal} onClose={() => setShowReportModal(false)} contentType="profile" contentId={userId} reportedUserId={userId} />
      )}
    </SafeAreaView>
  );
}
