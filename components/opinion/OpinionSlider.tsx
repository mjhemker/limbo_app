import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, PanResponder, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronRight, Users } from 'lucide-react-native';
import { useTodaysOpinion, useSubmitOpinionVote, useOpinionDistribution } from '../../hooks/useOpinion';
import * as haptics from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 80; // Account for padding (px-5 * 2 = 40, plus some margin)
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
  topic: any;
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
          // Ensure user's bucket always has at least some height
          const effectiveCount = isUserBucket ? Math.max(bucket.count, 1) : bucket.count;
          // Height: min 4% (empty), min 8% (has votes), scales up to 100%
          const heightPercent = effectiveCount > 0
            ? Math.max((effectiveCount / maxCount) * 100, 8)
            : 4;
          const bucketColor = getOpinionColor((i + 0.5) / 20);
          // Opacity: user's bucket full, others fade based on count
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
              {/* User indicator dot - on top of their bar */}
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
 * OpinionSlider - Daily community vote mechanic
 */
export default function OpinionSlider({
  userId,
  onSliderInteractionChange,
}: {
  userId: string;
  onSliderInteractionChange?: (isActive: boolean) => void;
}) {
  const router = useRouter();
  const [sliderValue, setSliderValue] = useState(0.5);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const isDragging = useRef(false);
  const thumbPosition = useRef(new Animated.Value(0.5 * SLIDER_WIDTH - THUMB_SIZE / 2)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;

  const { data: topic, isLoading } = useTodaysOpinion(userId);
  const submitVote = useSubmitOpinionVote();
  const { data: distribution } = useOpinionDistribution(
    topic?.id,
    userId,
    { enabled: hasSubmitted || topic?.has_voted }
  );

  const navigateToOpinions = () => {
    router.push('/(tabs)/explore/opinions');
  };

  // If user already voted, show results
  useEffect(() => {
    if (topic?.has_voted) {
      setHasSubmitted(true);
      setShowResults(true);
      if (topic.user_vote !== null) {
        const vote = parseFloat(String(topic.user_vote));
        setSliderValue(vote);
        thumbPosition.setValue(vote * SLIDER_WIDTH - THUMB_SIZE / 2);
      }
    }
  }, [topic]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !hasSubmitted && !topic?.has_voted,
      onMoveShouldSetPanResponder: () => !hasSubmitted && !topic?.has_voted,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_, gestureState) => {
        isDragging.current = true;
        onSliderInteractionChange?.(true);
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
        onSliderInteractionChange?.(false);
        Animated.spring(thumbScale, {
          toValue: 1,
          useNativeDriver: false,
          friction: 5,
        }).start();
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        onSliderInteractionChange?.(false);
        Animated.spring(thumbScale, {
          toValue: 1,
          useNativeDriver: false,
          friction: 5,
        }).start();
      },
    })
  ).current;

  const handleSubmit = async () => {
    if (!topic || hasSubmitted || topic.has_voted) return;

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

  if (isLoading) {
    return (
      <View className="bg-white border border-rule rounded-[22px] p-5">
        <View className="h-4 bg-sand rounded w-20 mb-3" />
        <View className="h-6 bg-sand rounded w-3/4 mb-4" />
        <View className="h-10 bg-sand rounded" />
      </View>
    );
  }

  if (!topic) {
    return null;
  }

  return (
    <Pressable
      onPress={navigateToOpinions}
      className="bg-white border border-rule rounded-[22px] overflow-hidden"
    >
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-[10px] font-extrabold uppercase tracking-widest text-ink-soft">
            Daily Opinion
          </Text>
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

      {/* View Opinions link */}
      <View className="px-5 pb-4">
        <TouchableOpacity
          onPress={navigateToOpinions}
          className="bg-sand/50 rounded-xl p-3 flex-row items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="text-[13px] font-bold text-ink mr-1">
            View Opinions
          </Text>
          <ChevronRight size={16} color="#1A1A1A" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}
