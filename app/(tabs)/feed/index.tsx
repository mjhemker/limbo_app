import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Dimensions, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ghost, Bell, ChevronRight, MoreHorizontal } from 'lucide-react-native';
import ReportModal from '../../../components/modals/ReportModal';
import { useBlockUser } from '../../../hooks/useBlocks';
import { useState, useEffect, useCallback } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  runOnJS,
} from 'react-native-reanimated';
import { useAuth } from '../../../contexts/AuthContext';
import { useTodaysPrompt, useDailyArchive } from '../../../hooks/usePrompt';
import { DailyArchive } from '../../../components/feed/DailyArchive';
import { VisibilityToggle } from '../../../components/common/VisibilityToggle';
import { useToggleVisibility } from '../../../hooks/useResponses';
import OpinionSlider from '../../../components/opinion/OpinionSlider';
import SuggestedMutuals from '../../../components/profile/SuggestedMutuals';
import { useUserResponse } from '../../../hooks/useResponses';
import { useFriendsResponses } from '../../../hooks/useResponses';
import { useProfile } from '../../../hooks/useProfile';
import { useLimboFriends, useRescueFriend } from '../../../hooks/useLimbo';
import { useSendNudge } from '../../../hooks/useNudges';
import { useMyGroupChats as useMyCircles } from '../../../hooks/useChats';
import { ResponseReactions } from '../../../components/feed/ResponseReactions';
import PromptCard from '../../../components/home/PromptCard';
import * as haptics from '../../../utils/haptics';
import { toast } from '../../../utils/toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

// Spring configs matching web app
const SPRING_CONFIG = { damping: 25, stiffness: 300 };
const SPRING_CONFIG_SNAPPY = { damping: 30, stiffness: 400 };

// Animated avatar with pop-in effect (opacity: 0, scale: 0 → 1)
function AnimatedAvatar({
  children,
  index,
  animKey,
  style,
}: {
  children: React.ReactNode;
  index: number;
  animKey: number;
  style?: any;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Reset and animate with staggered delay (100ms per avatar)
    scale.value = 0;
    opacity.value = 0;
    const delay = 300 + index * 100;
    scale.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 300 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
  }, [animKey, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedView style={[animatedStyle, style]}>
      {children}
    </AnimatedView>
  );
}

// Reusable pressable with scale feedback (whileTap equivalent)
function PressableScale({
  children,
  onPress,
  scale = 0.98,
  style,
  className,
  ...props
}: {
  children: React.ReactNode;
  onPress?: () => void;
  scale?: number;
  style?: any;
  className?: string;
  [key: string]: any;
}) {
  const scaleValue = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handlePressIn = () => {
    scaleValue.value = withSpring(scale, SPRING_CONFIG_SNAPPY);
  };

  const handlePressOut = () => {
    scaleValue.value = withSpring(1, SPRING_CONFIG_SNAPPY);
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[animatedStyle, style]}
      className={className}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

// V2 Avatar colors for friends
const AVATAR_COLORS = ['#F26E5E', '#6AAA64', '#8E73C9', '#4F8FE0', '#C28F2C'];

// Circle colors for the "From your circles" section
const CIRCLE_COLORS = ['#6AAA64', '#F26E5E', '#8E73C9', '#4F8FE0', '#F7DA21', '#C28F2C'];

function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getCircleColor(index: number, themeColor?: string) {
  if (themeColor) return themeColor;
  return CIRCLE_COLORS[index % CIRCLE_COLORS.length];
}

// Check if a color is light (for text contrast)
function isLightColor(color: string) {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

export default function FeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [animKey, setAnimKey] = useState(() => Date.now());
  const [isSliderActive, setIsSliderActive] = useState(false);

  // Re-trigger animations when tab is focused
  useFocusEffect(
    useCallback(() => {
      setAnimKey(Date.now());
    }, [])
  );

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

  // Limbo Zone
  const { data: limboFriends, refetch: refetchLimbo } = useLimboFriends(user?.id);
  const rescueFriend = useRescueFriend();
  const sendNudge = useSendNudge();

  // Circles for "From your circles" section
  const { data: circles, refetch: refetchCircles } = useMyCircles(user?.id);
  const blockUser = useBlockUser();

  // Daily Archive
  const { refetch: refetchArchive } = useDailyArchive(user?.id);

  // Visibility toggle
  const toggleVisibility = useToggleVisibility();

  // Report modal state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ responseId: string; userId: string } | null>(null);

  const handleResponseMenu = (response: any) => {
    Alert.alert(
      response.user?.display_name,
      undefined,
      [
        {
          text: 'Report Response',
          onPress: () => {
            setReportTarget({ responseId: response.id, userId: response.user?.id });
            setReportModalVisible(true);
          },
        },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Block User',
              `Are you sure you want to block ${response.user?.display_name}? You won't see their responses anymore.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await blockUser.mutateAsync({
                        blockerId: user!.id,
                        blockedId: response.user?.id,
                        reason: 'Blocked from feed',
                      });
                      toast.success(`${response.user?.display_name} has been blocked`);
                      refetchFriends();
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to block user');
                    }
                  },
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const hasPosted = !!userResponse;
  const friendsCount = friendsResponses?.length || 0;
  const streakCount = userProfile?.streak || 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchPrompt(),
      refetchUserResponse(),
      refetchFriends(),
      refetchLimbo(),
      refetchCircles(),
      refetchArchive(),
    ]);
    setRefreshing(false);
  };

  const handleRescueFriend = async (friendId: string, friendName: string) => {
    if (!user?.id) return;
    try {
      haptics.mediumImpact();
      await sendNudge.mutateAsync({
        fromUserId: user.id,
        toUserId: friendId,
        promptId: todaysPrompt?.id,
      });
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

  if (promptLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F7DA21" />
        </View>
      </SafeAreaView>
    );
  }

  if (!todaysPrompt) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-extrabold text-ink text-center mb-2" style={{ letterSpacing: -0.5 }}>
            No prompt today
          </Text>
          <Text className="text-ink-soft text-center font-medium">
            Check back tomorrow for a new daily prompt!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        scrollEnabled={!isSliderActive}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F7DA21" />
        }
      >
        {/* V2 Header: limbo + streak */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <Text className="text-2xl font-extrabold text-ink" style={{ letterSpacing: -1 }}>
            limbo
          </Text>
          {streakCount > 0 && (
            <View className="flex-row items-center bg-sand rounded-full px-3 py-1.5">
              <Text className="text-sm">🔥</Text>
              <Text className="text-ink font-bold text-sm ml-1">{streakCount}</Text>
            </View>
          )}
        </View>

        {/* 1. DAILY ARCHIVE - 7 day calendar (first section per spec) */}
        <DailyArchive userId={user?.id} animKey={animKey} />

        {/* 2. TODAY'S PROMPT - Daily PromptCard */}
        <View className="px-5 mb-4">
          <PromptCard
            type="daily"
            prompt={todaysPrompt}
            hasAnswered={hasPosted}
            friendsResponses={friendsResponses}
            entering={FadeInDown.delay(50).duration(400).springify()}
            onPress={() => {
              if (hasPosted) {
                router.push(`/(tabs)/feed/prompts/${todaysPrompt.id}`);
              } else {
                router.push('/compose');
              }
            }}
          />
        </View>

        {/* UNLOCKED - YOUR RESPONSE - Yellow themed to match Today's Prompt */}
        {hasPosted && userResponse && (
          <View className="px-5 mb-4 -mt-2">
            {/* Connection indicator */}
            <View className="items-center mb-2">
              <View className="w-0.5 h-3 bg-primary rounded-full" />
            </View>
            <View className="bg-primary/15 rounded-[18px] border-2 border-primary/30 overflow-hidden">
              {/* Your response header */}
              <View className="flex-row items-center p-3 pb-2">
                <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-2">
                  <Text className="text-ink font-bold text-sm">
                    {userProfile?.display_name?.[0]?.toUpperCase() || 'Y'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-ink font-bold text-[13px]">You</Text>
                  <Text className="text-ink-soft text-[11px] font-medium">
                    · {formatTimeAgo(userResponse.created_at)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/compose')}
                  className="bg-primary rounded-full px-3 py-1"
                >
                  <Text className="text-ink font-bold text-[11px]">edit</Text>
                </TouchableOpacity>
              </View>

              {/* Your response content */}
              <View className="px-3 pb-3">
                {userResponse.media_url && userResponse.media_type === 'image' && (
                  <Image
                    source={{ uri: userResponse.media_url }}
                    className="w-full rounded-[14px] mb-2"
                    style={{ aspectRatio: 4/3 }}
                    resizeMode="cover"
                  />
                )}
                {userResponse.text_content && (
                  <Text className="text-ink text-[15px] font-medium leading-relaxed">
                    {userResponse.text_content}
                  </Text>
                )}
              </View>

              {/* Visibility Toggle */}
              <View className="px-3 pb-3 flex-row items-center justify-between border-t border-primary/20 pt-3">
                <Text className="text-[11px] font-bold text-ink-soft uppercase tracking-widest">
                  Visibility
                </Text>
                <VisibilityToggle
                  isVisible={userResponse.is_visible}
                  onToggle={async (newValue) => {
                    try {
                      await toggleVisibility.mutateAsync({
                        responseId: userResponse.id,
                        isVisible: newValue,
                      });
                      refetchUserResponse();
                      toast.success(newValue ? 'Visible to friends' : 'Set to private');
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to update visibility');
                    }
                  }}
                  disabled={toggleVisibility.isPending}
                />
              </View>
            </View>
          </View>
        )}

        {/* FRIENDS' RESPONSES - V2 Cards with staggered animation */}
        {hasPosted && friendsResponses && friendsResponses.length > 0 && (
          <View className="px-5">
            {friendsResponses.map((response: any, index: number) => (
              <Animated.View
                key={`${response.id}-${animKey}`}
                entering={FadeInDown.delay(index * 80).duration(400).springify()}
                className="mb-4"
              >
                <View className="bg-card rounded-[18px] border border-rule overflow-hidden">
                  {/* User Header */}
                  <View className="flex-row items-center p-3 pb-2">
                    {response.user?.avatar_url ? (
                      <Image
                        source={{ uri: response.user.avatar_url }}
                        className="w-8 h-8 rounded-full mr-2"
                      />
                    ) : (
                      <View
                        className="w-8 h-8 rounded-full mr-2 items-center justify-center"
                        style={{ backgroundColor: getAvatarColor(index) }}
                      >
                        <Text className="text-white font-bold text-sm">
                          {response.user?.display_name?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-ink font-bold text-[13px]">
                        {response.user?.display_name}
                      </Text>
                      <Text className="text-ink-soft text-[11px] font-medium">
                        · {formatTimeAgo(response.created_at)}
                      </Text>
                    </View>
                    {/* More menu (report/block) */}
                    <TouchableOpacity
                      onPress={() => handleResponseMenu(response)}
                      className="w-8 h-8 items-center justify-center"
                    >
                      <MoreHorizontal size={18} color="#6B6760" />
                    </TouchableOpacity>
                  </View>

                  {/* Response Content */}
                  <View className="px-3 pb-2">
                    {response.media_url && response.media_type === 'image' && (
                      <View className="mb-2">
                        {/* Image caption label */}
                        <View className="absolute top-2 left-2 z-10 bg-ink/80 rounded-full px-2 py-1">
                          <Text className="text-white font-bold text-[10px] uppercase tracking-wide">
                            {response.user?.display_name} · photo
                          </Text>
                        </View>
                        <Image
                          source={{ uri: response.media_url }}
                          className="w-full rounded-[14px]"
                          style={{ aspectRatio: 4/3 }}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                    {response.text_content && (
                      <Text className="text-ink text-[15px] font-medium leading-relaxed">
                        {response.text_content}
                      </Text>
                    )}
                  </View>

                  {/* V2 DM Reply Bar */}
                  <View className="border-t border-rule bg-background/50 px-3 py-2 flex-row items-center">
                    <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-wider mr-2">DM</Text>
                    <View className="flex-1 bg-card rounded-full px-3 py-2 border border-rule">
                      <Text className="text-ink-soft text-[12px]">reply to {response.user?.display_name}...</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push(`/(tabs)/messages/${response.user?.id}`)}
                      className="w-8 h-8 bg-ink rounded-full items-center justify-center ml-2"
                    >
                      <Text className="text-white font-bold text-sm">→</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Quick reactions */}
                  <View className="px-3 py-2 flex-row gap-2">
                    <TouchableOpacity className="bg-sand rounded-full px-3 py-1.5 flex-row items-center">
                      <Text className="text-[11px]">🥺</Text>
                      <Text className="text-ink font-medium text-[12px] ml-1">felt this</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="bg-sand rounded-full px-3 py-1.5 flex-row items-center">
                      <Text className="text-[11px]">😭</Text>
                      <Text className="text-ink font-medium text-[12px] ml-1">say more</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        )}


        {/* 3. OPINION SLIDER */}
        {user?.id && (
          <Animated.View
            key={`opinion-${animKey}`}
            entering={FadeInDown.delay(100).duration(400).springify()}
            className="px-5 mb-4"
          >
            <OpinionSlider
              userId={user.id}
              onSliderInteractionChange={setIsSliderActive}
            />
          </Animated.View>
        )}

        {/* 4. LIGHTNING ROUND */}
        {user?.id && (
          <View className="px-5 mb-4">
            <PromptCard
              type="lightning"
              prompt={{ text: 'Quickfire questions. 5 in a row, 30 seconds each.' }}
              answerLabel="Start round"
              typeInfo=""
              headerRight={
                <Text
                  className="font-bold text-[10px] uppercase"
                  style={{ color: '#FFFFFF', letterSpacing: 1.5, opacity: 0.85 }}
                >
                  5 × 30 SECONDS
                </Text>
              }
              entering={FadeInDown.delay(150).duration(400).springify()}
              onPress={() => {
                haptics.mediumImpact();
                router.push('/lightning');
              }}
            />
          </View>
        )}

        {/* 5. SUGGESTED MUTUALS */}
        {user?.id && (
          <Animated.View
            key={`mutuals-${animKey}`}
            entering={FadeInDown.delay(200).duration(400).springify()}
            className="px-5 mb-4"
          >
            <SuggestedMutuals userId={user.id} />
          </Animated.View>
        )}

        {/* LIMBO ZONE */}
        {limboFriends && limboFriends.length > 0 && (
          <View className="px-5 mt-6">
            <View className="flex-row items-center mb-3">
              <Ghost size={18} color="#6B6760" />
              <Text className="text-[11px] font-bold text-ink-soft ml-2 uppercase tracking-widest">
                Limbo Zone
              </Text>
              <View className="bg-sand rounded-full px-2 py-0.5 ml-2">
                <Text className="text-[11px] text-ink-soft font-bold">{limboFriends.length}</Text>
              </View>
            </View>
            <Text className="text-ink-soft text-[13px] font-medium mb-4">
              These friends have been inactive for 30+ days.
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
              <View className="flex-row gap-3">
                {limboFriends.map((friend: any, idx: number) => {
                  const friendName = friend.display_name || friend.username || 'Friend';
                  return (
                    <View key={friend.id} className="bg-sand rounded-[18px] p-4 items-center" style={{ width: 130 }}>
                      {friend.avatar_url ? (
                        <Image
                          source={{ uri: friend.avatar_url }}
                          className="w-12 h-12 rounded-full mb-2 opacity-60"
                        />
                      ) : (
                        <View
                          className="w-12 h-12 rounded-full mb-2 items-center justify-center opacity-60"
                          style={{ backgroundColor: getAvatarColor(idx) }}
                        >
                          <Text className="text-white font-bold text-lg">
                            {friendName[0]?.toUpperCase() || '?'}
                          </Text>
                        </View>
                      )}
                      <Text className="font-bold text-ink text-[13px] text-center" numberOfLines={1}>
                        {friendName}
                      </Text>
                      <Text className="text-[11px] text-ink-soft font-medium mb-3">
                        {friend.days_inactive}+ days
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRescueFriend(friend.id, friendName)}
                        className="bg-primary rounded-full px-4 py-2 flex-row items-center"
                        disabled={rescueFriend.isPending}
                      >
                        <Bell size={12} color="#111111" />
                        <Text className="text-ink text-[11px] font-bold ml-1">Nudge</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* FROM YOUR CIRCLES - Horizontal card scroll */}
        {circles && circles.length > 0 && (
          <Animated.View
            key={`circles-${animKey}`}
            entering={FadeInUp.delay(300).duration(400)}
            className="mt-6 mb-4"
          >
            {/* Section header */}
            <View className="flex-row items-center justify-between px-5 mb-3">
              <Text className="text-ink font-bold text-[15px]" style={{ letterSpacing: -0.3 }}>
                From your circles
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/circles')}
                className="flex-row items-center"
              >
                <Text className="text-ink-soft font-semibold text-[13px] mr-0.5">see all</Text>
                <ChevronRight size={14} color="#6B6760" />
              </TouchableOpacity>
            </View>

            {/* Horizontal scroll of circle cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              <View className="flex-row gap-3">
                {circles.slice(0, 5).map((circle: any, idx: number) => {
                  const bgColor = getCircleColor(idx, circle.theme_color);
                  const isDark = !isLightColor(bgColor);
                  const textColor = isDark ? '#FFFFFF' : '#111111';
                  const softTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(17,17,17,0.6)';

                  return (
                    <Animated.View
                      key={`${circle.id}-${animKey}`}
                      entering={SlideInRight.delay(300 + idx * 50).duration(300).springify()}
                    >
                      <PressableScale
                        onPress={() => router.push(`/(tabs)/circles/${circle.id}`)}
                        scale={0.98}
                        className="rounded-[16px] overflow-hidden"
                        style={{
                          backgroundColor: bgColor,
                          width: SCREEN_WIDTH * 0.42,
                          minHeight: 100,
                        }}
                      >
                        <View className="p-3.5">
                          {/* Circle name label */}
                          <Text
                            className="font-bold text-[10px] uppercase tracking-widest mb-1.5"
                            style={{ color: softTextColor }}
                            numberOfLines={1}
                          >
                            {circle.name}
                          </Text>

                          {/* Prompt text - placeholder or actual latest prompt */}
                          <Text
                            className="font-bold text-[15px] leading-tight"
                            style={{ color: textColor, letterSpacing: -0.3 }}
                            numberOfLines={3}
                          >
                            {circle.latest_prompt || `What's on your mind, ${circle.name}?`}
                          </Text>
                        </View>
                      </PressableScale>
                    </Animated.View>
                  );
                })}
              </View>
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          visible={reportModalVisible}
          onClose={() => {
            setReportModalVisible(false);
            setReportTarget(null);
          }}
          contentType="response"
          contentId={reportTarget.responseId}
          reportedUserId={reportTarget.userId}
        />
      )}
    </SafeAreaView>
  );
}
