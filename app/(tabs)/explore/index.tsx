import { useRef, useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Compass, RefreshCw } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, SlideInRight, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING_CONFIG_SNAPPY = { damping: 30, stiffness: 400 };

// Reusable pressable with scale feedback
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

  return (
    <AnimatedPressable
      onPressIn={() => { scaleValue.value = withSpring(scale, SPRING_CONFIG_SNAPPY); }}
      onPressOut={() => { scaleValue.value = withSpring(1, SPRING_CONFIG_SNAPPY); }}
      onPress={onPress}
      style={[animatedStyle, style]}
      className={className}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
import { useAuth } from '../../../contexts/AuthContext';
import { usePublicFeed } from '../../../hooks/usePublicFeed';
import { incrementViewCount } from '../../../services/supabase/publicFeed';
import OpinionSlider from '../../../components/opinion/OpinionSlider';
import LightningButton from '../../../components/lightning/LightningButton';
import SuggestedMutuals from '../../../components/profile/SuggestedMutuals';
import PublicResponseCard from '../../../components/explore/PublicResponseCard';

/**
 * ExplorePage - Public feed of anonymous responses
 * Includes Opinion Slider, Lightning Round CTA, and Suggested Friends
 */
export default function ExplorePage() {
  const { user } = useAuth();
  const viewedResponses = useRef(new Set<string>());
  const [animKey, setAnimKey] = useState(() => Date.now());

  // Re-trigger animations when tab is focused
  useFocusEffect(
    useCallback(() => {
      setAnimKey(Date.now());
    }, [])
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = usePublicFeed(user?.id);

  // Track views when responses come into viewport
  const trackView = useCallback((responseId: string) => {
    if (viewedResponses.current.has(responseId)) return;
    viewedResponses.current.add(responseId);
    incrementViewCount(responseId);
  }, []);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const allResponses = data?.pages?.flat() || [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
          if (isCloseToBottom) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Header */}
        <Animated.View
          key={`header-${animKey}`}
          entering={FadeInDown.duration(400)}
          className="flex-row items-center justify-between py-4"
        >
          <View className="flex-row items-center">
            <Compass size={20} color="#111111" />
            <Text className="text-[20px] font-extrabold text-ink ml-2" style={{ letterSpacing: -0.5 }}>
              Explore
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={isRefetching}
            className="p-2 rounded-full"
            activeOpacity={0.6}
          >
            <RefreshCw
              size={18}
              color="#6B6760"
              style={isRefetching ? { transform: [{ rotate: '360deg' }] } : undefined}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Opinion Slider */}
        {user && (
          <Animated.View
            key={`opinion-${animKey}`}
            entering={FadeInDown.delay(100).duration(400).springify()}
            className="mb-4"
          >
            <OpinionSlider userId={user.id} />
          </Animated.View>
        )}

        {/* Lightning Round CTA */}
        {user && (
          <Animated.View
            key={`lightning-${animKey}`}
            entering={FadeInDown.delay(200).duration(400).springify()}
            className="mb-4"
          >
            <LightningButton userId={user.id} variant="card" />
          </Animated.View>
        )}

        {/* Suggested Friends */}
        {user && (
          <Animated.View
            key={`suggested-${animKey}`}
            entering={FadeInDown.delay(300).duration(400).springify()}
          >
            <SuggestedMutuals userId={user.id} />
          </Animated.View>
        )}

        {/* Section header */}
        <Animated.Text
          key={`feed-header-${animKey}`}
          entering={FadeInDown.delay(350).duration(300)}
          className="text-[10px] font-extrabold text-ink-soft uppercase tracking-widest mb-3 mt-2"
        >
          Public Feed
        </Animated.Text>

        {/* Public Feed */}
        {isLoading ? (
          <View>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} className="bg-white border border-rule rounded-[22px] p-5 mb-3">
                <View className="h-3 bg-sand rounded w-1/3 mb-3" />
                <View className="h-5 bg-sand rounded w-full mb-2" />
                <View className="h-5 bg-sand rounded w-2/3 mb-4" />
                <View className="flex-row">
                  <View className="h-8 bg-sand rounded-full w-16 mr-2" />
                  <View className="h-8 bg-sand rounded-full w-16 mr-2" />
                  <View className="h-8 bg-sand rounded-full w-16" />
                </View>
              </View>
            ))}
          </View>
        ) : allResponses.length === 0 ? (
          <View className="bg-sand/50 rounded-[22px] p-8 items-center">
            <Text className="text-[15px] font-semibold text-ink-soft text-center">
              No public responses yet
            </Text>
            <Text className="text-[13px] text-ink-soft text-center mt-1">
              Be the first to share your thoughts!
            </Text>
          </View>
        ) : (
          <>
            {allResponses.map((response, index) => (
              <Animated.View
                key={`${response.id}-${animKey}`}
                entering={FadeInDown.delay(400 + Math.min(index, 5) * 60).duration(400).springify()}
                onLayout={() => trackView(response.id)}
              >
                <PublicResponseCard
                  response={response}
                  userId={user?.id}
                  index={index}
                />
              </Animated.View>
            ))}

            {/* Load more indicator */}
            <View className="h-20 items-center justify-center">
              {isFetchingNextPage ? (
                <ActivityIndicator size="small" color="#F7DA21" />
              ) : hasNextPage ? (
                <TouchableOpacity onPress={handleLoadMore}>
                  <Text className="text-[13px] text-ink-soft font-medium">
                    Load more
                  </Text>
                </TouchableOpacity>
              ) : allResponses.length > 0 ? (
                <Text className="text-[13px] text-ink-soft font-medium">
                  You've seen it all!
                </Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
