import { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, PanResponder, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTodaysOpinion, useSubmitOpinionVote, useOpinionDistribution } from '../../hooks/useOpinion';
import * as haptics from '../../utils/haptics';
import PromptCard from '../home/PromptCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Card has px-5 outer (20) + p-5 (20) + inner content padding 14 + small slack
const SLIDER_WIDTH = SCREEN_WIDTH - 20 * 2 - 20 * 2 - 14 * 2;
const THUMB_SIZE = 26;

/**
 * Gradient: coral → yellow → green based on value (0-1)
 */
function getOpinionColor(value: number): string {
  const v = Math.max(0, Math.min(1, value));
  const stops = [
    [238, 105, 90],
    [247, 215, 33],
    [29, 177, 104],
  ];
  const [a, b] = v < 0.5 ? [stops[0], stops[1]] : [stops[1], stops[2]];
  const t = v < 0.5 ? v / 0.5 : (v - 0.5) / 0.5;
  const mix = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
}

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

  const maxCount = buckets.length > 0
    ? Math.max(...buckets.map((b: any) => b?.count || 0), 1)
    : 1;
  const fullBuckets = Array.from({ length: 20 }, (_, i) => {
    const found = buckets.find((b: any) => b?.bucket === i);
    return { bucket: i, count: found?.count || 0 };
  });
  const userBucket = Math.min(Math.floor(userVote * 20), 19);

  return (
    <View>
      <View className="flex-row justify-between mb-2">
        <Text className="text-[11px] font-bold text-ink/70 max-w-[40%]" numberOfLines={2}>
          {topic?.left_label || 'Disagree'}
        </Text>
        <Text className="text-[11px] font-bold text-ink/70 max-w-[40%] text-right" numberOfLines={2}>
          {topic?.right_label || 'Agree'}
        </Text>
      </View>

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
              }}
            />
          );
        })}
      </View>

      <View className="items-center mt-3">
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
    </View>
  );
}

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
        // Approximate slider left edge (page x). Best-effort; will recalibrate from moveX.
        const trackOriginX = 40 + 14;
        const newValue = Math.max(0, Math.min(1, (gestureState.x0 - trackOriginX) / SLIDER_WIDTH));
        setSliderValue(newValue);
        thumbPosition.setValue(newValue * SLIDER_WIDTH - THUMB_SIZE / 2);
        Animated.spring(thumbScale, {
          toValue: 1.15,
          useNativeDriver: false,
          friction: 5,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        const trackOriginX = 40 + 14;
        const newValue = Math.max(0, Math.min(1, (gestureState.moveX - trackOriginX) / SLIDER_WIDTH));
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
    }
  };

  if (isLoading || !topic) return null;

  const totalVotes = topic.total_votes || 0;
  const answered = showResults;

  return (
    <PromptCard
      type="opinion"
      prompt={{ text: topic.topic_text }}
      hasAnswered={answered}
      answerLabel={submitVote.isPending ? 'Submitting…' : 'Lock it in'}
      viewLabel="See all"
      typeInfo={`${totalVotes} ${totalVotes === 1 ? 'VOTE' : 'VOTES'}`}
      headerRight={
        <Text
          className="font-bold text-[10px] uppercase"
          style={{ color: '#FFFFFF', letterSpacing: 1.5, opacity: 0.9 }}
          onPress={navigateToOpinions}
        >
          SEE ALL
        </Text>
      }
      onPress={answered ? navigateToOpinions : undefined}
      onAnswerPress={answered ? navigateToOpinions : handleSubmit}
      content={
        !showResults ? (
          <View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-[12px] font-bold text-ink" numberOfLines={1}>
                {topic.left_label}
              </Text>
              <Text className="text-[12px] font-bold text-ink" numberOfLines={1}>
                {topic.right_label}
              </Text>
            </View>

            <View className="h-12" {...panResponder.panHandlers}>
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
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              />
            </View>

            <Text
              className="text-center font-extrabold text-[15px] mt-1"
              style={{ color: getOpinionColor(sliderValue) }}
            >
              {Math.round(sliderValue * 100)}%
            </Text>
          </View>
        ) : (
          <OpinionResults topic={topic} distribution={distribution} userVote={sliderValue} />
        )
      }
    />
  );
}
