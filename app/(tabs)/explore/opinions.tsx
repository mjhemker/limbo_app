import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  Plus,
  ChevronDown,
  ChevronUp,
  Globe,
  Trophy,
  Newspaper,
  Clapperboard,
  UtensilsCrossed,
  Sparkles,
  Monitor,
  Shuffle,
  Star,
  Flame,
  Clock,
  Users,
} from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import {
  useOpinionTopics,
  useSubmitOpinionVote,
  useOpinionDistribution,
} from '../../../hooks/useOpinion';
import { OpinionTopic } from '../../../services/supabase/opinion';
import * as haptics from '../../../utils/haptics';

// Category options
const CATEGORIES = [
  { id: 'all', label: 'All', icon: Globe },
  { id: 'sports', label: 'Sports', icon: Trophy },
  { id: 'current_events', label: 'Current Events', icon: Newspaper },
  { id: 'entertainment', label: 'Entertainment', icon: Clapperboard },
  { id: 'food', label: 'Food', icon: UtensilsCrossed },
  { id: 'lifestyle', label: 'Lifestyle', icon: Sparkles },
  { id: 'tech', label: 'Tech', icon: Monitor },
  { id: 'random', label: 'Random', icon: Shuffle },
];

// Sort options
const SORT_OPTIONS = [
  { id: 'highlighted', label: 'Highlighted', icon: Star },
  { id: 'popular', label: 'Popular', icon: Flame },
  { id: 'new', label: 'New', icon: Sparkles },
  { id: 'most_recent', label: 'Most Recent', icon: Clock },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 80;
const THUMB_SIZE = 24;

/**
 * Get color from gradient based on value (0-1)
 * Gradient: coral (#EE695A) → yellow (#F7D721) → green (#1DB168)
 */
function getOpinionColor(value: number): string {
  const v = Math.max(0, Math.min(1, value));
  const stops = [
    [238, 105, 90],  // #EE695A (coral)
    [247, 215, 33],  // #F7D721 (yellow)
    [29, 177, 104],  // #1DB168 (green)
  ];

  const [a, b] = v < 0.5 ? [stops[0], stops[1]] : [stops[1], stops[2]];
  const t = v < 0.5 ? v / 0.5 : (v - 0.5) / 0.5;
  const mix = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);

  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
}

/**
 * Opinion Results - Shows histogram after voting
 */
function OpinionResults({
  topic,
  distribution,
  userVote,
}: {
  topic: OpinionTopic;
  distribution: any;
  userVote: number;
}) {
  const rawDistribution = distribution?.distribution || distribution;
  const buckets = Array.isArray(rawDistribution) ? rawDistribution : [];
  const totalVotes = distribution?.total_votes || topic?.total_votes || 0;
  const userPercentile = distribution?.user_percentile ?? Math.round(userVote * 100);

  // Calculate max count for scaling bar heights
  const maxCount = buckets.length > 0
    ? Math.max(...buckets.map((b: any) => b?.count || 0), 1)
    : 1;

  // Create full 20-bucket array
  const fullBuckets = Array.from({ length: 20 }, (_, i) => {
    const found = buckets.find((b: any) => b?.bucket === i);
    return { bucket: i, count: found?.count || 0 };
  });

  // User's bucket position (0-19)
  const userBucket = Math.min(Math.floor(userVote * 20), 19);

  return (
    <View className="px-4 pb-4">
      {/* Labels */}
      <View className="flex-row justify-between mb-2">
        <Text className="text-[11px] font-bold text-ink/70 max-w-[40%]" numberOfLines={2}>
          {topic?.left_label || 'Disagree'}
        </Text>
        <Text className="text-[11px] font-bold text-ink/70 max-w-[40%] text-right" numberOfLines={2}>
          {topic?.right_label || 'Agree'}
        </Text>
      </View>

      {/* Histogram - 20 bars */}
      <View className="flex-row items-end h-16" style={{ gap: 2 }}>
        {fullBuckets.map((bucket, i) => {
          const isUserBucket = i === userBucket;
          const effectiveCount = isUserBucket ? Math.max(bucket.count, 1) : bucket.count;
          const heightPercent = effectiveCount > 0
            ? Math.max((effectiveCount / maxCount) * 100, 8)
            : 4;
          const bucketColor = getOpinionColor((i + 0.5) / 20);
          const opacity = isUserBucket ? 1 : 0.3 + (bucket.count / maxCount) * 0.7;

          return (
            <View
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${heightPercent}%`,
                backgroundColor: bucketColor,
                opacity,
                position: 'relative',
              }}
            >
              {isUserBucket && (
                <View
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                  }}
                >
                  <View
                    className="w-3 h-3 rounded-full border-2 border-white"
                    style={{
                      backgroundColor: bucketColor,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.15,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Percentile text */}
      <View className="items-center mt-3 mb-3">
        <Text className="text-[13px] font-semibold text-ink">
          You're in the{' '}
          <Text
            className="font-extrabold text-[16px]"
            style={{ color: getOpinionColor(userVote) }}
          >
            {Math.round(userPercentile)}th
          </Text>{' '}
          percentile
        </Text>
        <Text className="text-[11px] text-ink-soft mt-0.5">
          {totalVotes} {totalVotes === 1 ? 'person' : 'people'} voted
        </Text>
      </View>

      {/* Friends who voted (if available) */}
      {distribution?.friends_votes?.length > 0 && (
        <View className="bg-sand/50 rounded-xl p-3">
          <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-soft mb-2">
            Friends who voted
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {distribution.friends_votes.slice(0, 8).map((friend: any) => (
              <View
                key={friend.user_id}
                className="flex-row items-center bg-white rounded-full pl-1 pr-2 py-1"
              >
                <View className="w-5 h-5 rounded-full bg-sand mr-1.5" />
                <Text className="text-[11px] font-semibold text-ink">
                  {friend.display_name || friend.username}
                </Text>
                <View
                  className="w-1.5 h-1.5 rounded-full ml-1"
                  style={{ backgroundColor: getOpinionColor(parseFloat(friend.vote_value)) }}
                />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Single Opinion Card with embedded slider
 */
function OpinionCard({
  topic,
  userId,
  index,
  onSliderInteractionStart,
  onSliderInteractionEnd,
}: {
  topic: OpinionTopic;
  userId: string;
  index: number;
  onSliderInteractionStart?: () => void;
  onSliderInteractionEnd?: () => void;
}) {
  const [sliderValue, setSliderValue] = useState(topic.user_vote ?? 0.5);
  const [hasSubmitted, setHasSubmitted] = useState(topic.has_voted);
  const [showResults, setShowResults] = useState(topic.has_voted);
  const isDragging = useRef(false);
  const thumbPosition = useRef(new Animated.Value((topic.user_vote ?? 0.5) * SLIDER_WIDTH - THUMB_SIZE / 2)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;

  const submitVote = useSubmitOpinionVote();
  const { data: distribution } = useOpinionDistribution(
    topic.id,
    userId,
    { enabled: hasSubmitted }
  );

  useEffect(() => {
    if (topic.has_voted && topic.user_vote !== null) {
      setSliderValue(topic.user_vote);
      setHasSubmitted(true);
      setShowResults(true);
      thumbPosition.setValue(topic.user_vote * SLIDER_WIDTH - THUMB_SIZE / 2);
    }
  }, [topic]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !hasSubmitted,
      onMoveShouldSetPanResponder: () => !hasSubmitted,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_, gestureState) => {
        isDragging.current = true;
        onSliderInteractionStart?.();
        haptics.lightImpact();
        const newValue = Math.max(0, Math.min(1, (gestureState.x0 - 40) / SLIDER_WIDTH));
        setSliderValue(newValue);
        thumbPosition.setValue(newValue * SLIDER_WIDTH - THUMB_SIZE / 2);
        Animated.spring(thumbScale, {
          toValue: 1.15,
          useNativeDriver: false,
          friction: 5,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        const newValue = Math.max(0, Math.min(1, (gestureState.moveX - 40) / SLIDER_WIDTH));
        setSliderValue(newValue);
        thumbPosition.setValue(newValue * SLIDER_WIDTH - THUMB_SIZE / 2);
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        onSliderInteractionEnd?.();
        Animated.spring(thumbScale, {
          toValue: 1,
          useNativeDriver: false,
          friction: 5,
        }).start();
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        onSliderInteractionEnd?.();
        Animated.spring(thumbScale, {
          toValue: 1,
          useNativeDriver: false,
          friction: 5,
        }).start();
      },
    })
  ).current;

  const handleSubmit = async () => {
    if (hasSubmitted) return;
    try {
      haptics.mediumImpact();
      await submitVote.mutateAsync({
        userId,
        topicId: topic.id,
        voteValue: sliderValue,
      });
      setHasSubmitted(true);
      setShowResults(true);
    } catch (error) {
      console.error('Failed to submit vote:', error);
      haptics.error();
    }
  };

  // Get category label and icon
  const category = CATEGORIES.find(c => c.id === topic.category) || CATEGORIES[7]; // Default to Random
  const CategoryIcon = category.icon;

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(index * 80).duration(400).springify()}
      className="mb-4"
    >
      <View className="bg-white border border-rule rounded-[22px] overflow-hidden">
        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <CategoryIcon size={12} color="#6B6B6B" />
              <Text className="text-[10px] font-extrabold text-ink-soft uppercase tracking-widest ml-1.5">
                {category.label}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Users size={12} color="#6B6B6B" />
              <Text className="text-[11px] font-semibold text-ink-soft ml-1">
                {topic.total_votes || 0}
              </Text>
            </View>
          </View>
          <Text className="text-[17px] font-extrabold text-ink leading-snug">
            {topic.topic_text}
          </Text>
        </View>

        {/* Slider or Results */}
        {!showResults ? (
          <View className="px-5 pb-5">
            {/* Labels */}
            <View className="flex-row justify-between mb-2">
              <Text className="text-[11px] font-bold text-ink-soft">{topic.left_label}</Text>
              <Text className="text-[11px] font-bold text-ink-soft">{topic.right_label}</Text>
            </View>

            {/* Custom Slider */}
            <View className="h-12 mb-4" {...panResponder.panHandlers}>
              {/* Track background - gradient */}
              <View
                style={{
                  position: 'absolute',
                  top: '50%',
                  width: SLIDER_WIDTH,
                  height: 8,
                  borderRadius: 4,
                  overflow: 'hidden',
                  transform: [{ translateY: -4 }],
                }}
              >
                <LinearGradient
                  colors={['#EE695A', '#F7D721', '#1DB168']}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </View>

              {/* Custom thumb - solid color based on position */}
              <Animated.View
                className="absolute top-1/2 rounded-full"
                style={{
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  transform: [
                    { translateY: -THUMB_SIZE / 2 },
                    { scale: thumbScale },
                  ],
                  left: thumbPosition,
                  backgroundColor: getOpinionColor(sliderValue),
                  borderWidth: 2,
                  borderColor: 'rgba(0,0,0,0.05)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              />
            </View>

            {/* Submit button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitVote.isPending}
              className="w-full py-3.5 bg-ink rounded-full"
              activeOpacity={0.8}
            >
              <Text className="text-white text-[14px] font-bold text-center">
                {submitVote.isPending ? 'Submitting...' : 'Lock it in'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <OpinionResults
            topic={topic}
            distribution={distribution}
            userVote={sliderValue}
          />
        )}
      </View>
    </ReAnimated.View>
  );
}

export default function OpinionsFeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('most_recent');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isSliderActive, setIsSliderActive] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useOpinionTopics(user?.id, category as any, sort as any, 'all');

  const allTopics = data?.pages?.flat() || [];

  // Filter topics by category if not "all"
  const filteredTopics = category === 'all'
    ? allTopics
    : allTopics.filter((t: any) => t.category === category || (!t.category && category === 'random'));

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];
  const selectedSort = SORT_OPTIONS.find(s => s.id === sort) || SORT_OPTIONS[3];
  const CategoryIcon = selectedCategory.icon;
  const SortIcon = selectedSort.icon;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center"
        >
          <ChevronLeft size={28} color="#1A1A1A" strokeWidth={2} />
        </TouchableOpacity>
        <Text className="text-[18px] font-extrabold text-ink" style={{ letterSpacing: -0.3 }}>
          Opinions
        </Text>
        <TouchableOpacity
          onPress={() => {/* TODO: Create opinion modal */}}
          className="w-10 h-10 bg-ink rounded-full items-center justify-center"
        >
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Filter Row - Two Dropdowns */}
      <View className="flex-row px-5 py-3 gap-3">
        {/* Category Dropdown */}
        <View className="flex-1 relative">
          <TouchableOpacity
            onPress={() => {
              haptics.lightImpact();
              setShowCategoryDropdown(!showCategoryDropdown);
              setShowSortDropdown(false);
            }}
            className="flex-row items-center justify-between bg-sand/70 rounded-xl px-4 py-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <CategoryIcon size={16} color="#1A1A1A" />
              <Text className="ml-2 font-bold text-[13px] text-ink">
                {selectedCategory.label}
              </Text>
            </View>
            {showCategoryDropdown ? (
              <ChevronUp size={16} color="#6B6760" />
            ) : (
              <ChevronDown size={16} color="#6B6760" />
            )}
          </TouchableOpacity>
        </View>

        {/* Sort Dropdown */}
        <View className="flex-1 relative">
          <TouchableOpacity
            onPress={() => {
              haptics.lightImpact();
              setShowSortDropdown(!showSortDropdown);
              setShowCategoryDropdown(false);
            }}
            className="flex-row items-center justify-between bg-sand/70 rounded-xl px-4 py-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <SortIcon size={16} color="#1A1A1A" />
              <Text className="ml-2 font-bold text-[13px] text-ink">
                {selectedSort.label}
              </Text>
            </View>
            {showSortDropdown ? (
              <ChevronUp size={16} color="#6B6760" />
            ) : (
              <ChevronDown size={16} color="#6B6760" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Dropdown Menu */}
      {showCategoryDropdown && (
        <ReAnimated.View
          entering={FadeIn.duration(150)}
          className="absolute left-5 top-[120px] bg-white rounded-xl border border-rule shadow-lg z-50"
          style={{ minWidth: 180 }}
        >
          {CATEGORIES.map((cat, index) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            const isLast = index === CATEGORIES.length - 1;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => {
                  haptics.lightImpact();
                  setCategory(cat.id);
                  setShowCategoryDropdown(false);
                }}
                className={`flex-row items-center px-4 py-3 ${
                  isSelected ? 'bg-ink' : ''
                } ${!isLast ? 'border-b border-rule' : ''} ${
                  index === 0 ? 'rounded-t-xl' : ''
                } ${isLast ? 'rounded-b-xl' : ''}`}
                activeOpacity={0.7}
              >
                <Icon size={18} color={isSelected ? '#fff' : '#6B6760'} />
                <Text
                  className={`ml-3 font-semibold text-[14px] ${
                    isSelected ? 'text-white' : 'text-ink'
                  }`}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ReAnimated.View>
      )}

      {/* Sort Dropdown Menu */}
      {showSortDropdown && (
        <ReAnimated.View
          entering={FadeIn.duration(150)}
          className="absolute right-5 top-[120px] bg-white rounded-xl border border-rule shadow-lg z-50"
          style={{ minWidth: 180 }}
        >
          {SORT_OPTIONS.map((opt, index) => {
            const Icon = opt.icon;
            const isSelected = sort === opt.id;
            const isLast = index === SORT_OPTIONS.length - 1;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => {
                  haptics.lightImpact();
                  setSort(opt.id);
                  setShowSortDropdown(false);
                }}
                className={`flex-row items-center px-4 py-3 ${
                  isSelected ? 'bg-primary' : ''
                } ${!isLast ? 'border-b border-rule' : ''} ${
                  index === 0 ? 'rounded-t-xl' : ''
                } ${isLast ? 'rounded-b-xl' : ''}`}
                activeOpacity={0.7}
              >
                <Icon size={18} color={isSelected ? '#1A1A1A' : '#6B6760'} />
                <Text
                  className={`ml-3 font-semibold text-[14px] ${
                    isSelected ? 'text-ink' : 'text-ink'
                  }`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ReAnimated.View>
      )}

      {/* Backdrop to close dropdowns */}
      {(showCategoryDropdown || showSortDropdown) && (
        <Pressable
          className="absolute inset-0 z-40"
          onPress={() => {
            setShowCategoryDropdown(false);
            setShowSortDropdown(false);
          }}
        />
      )}

      {/* Topics List */}
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        scrollEnabled={!isSliderActive}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
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
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#F7DA21" />
          </View>
        ) : filteredTopics.length === 0 ? (
          <View className="bg-sand rounded-[24px] p-8 items-center mt-4">
            <Text className="text-[16px] font-extrabold text-ink text-center mb-2">
              No opinions yet
            </Text>
            <Text className="text-[14px] text-ink-soft text-center">
              {category !== 'all'
                ? `No opinions in ${selectedCategory.label} category`
                : 'Check back later for new topics to vote on'}
            </Text>
          </View>
        ) : (
          <>
            {filteredTopics.map((topic: OpinionTopic, index: number) => (
              <OpinionCard
                key={topic.id}
                topic={topic}
                userId={user?.id || ''}
                index={index}
                onSliderInteractionStart={() => setIsSliderActive(true)}
                onSliderInteractionEnd={() => setIsSliderActive(false)}
              />
            ))}

            {/* Load more indicator */}
            <View className="h-16 items-center justify-center">
              {isFetchingNextPage ? (
                <ActivityIndicator size="small" color="#F7DA21" />
              ) : hasNextPage ? (
                <TouchableOpacity onPress={handleLoadMore}>
                  <Text className="text-[13px] text-ink-soft font-medium">
                    Load more
                  </Text>
                </TouchableOpacity>
              ) : filteredTopics.length > 0 ? (
                <Text className="text-[13px] text-ink-soft font-medium">
                  You've seen all opinions
                </Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
