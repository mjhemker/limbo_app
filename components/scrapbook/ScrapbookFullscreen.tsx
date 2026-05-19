import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  X,
  ChevronRight,
  Check,
  Flame,
  BookOpen,
  Zap,
  Sparkles,
  MessageCircle,
  Grid3X3,
  Lock,
} from 'lucide-react-native';
import { useScrapbookOverview, useScrapbookStats } from '../../hooks/useScrapbook';
import * as haptics from '../../utils/haptics';

// Tier thresholds
const TIER_THRESHOLDS = [3, 10, 50, 100];

const TIER_CONFIG = [
  { threshold: 0, size: 3, label: 'Tier 1', sublabel: 'Starter', total: 3 },
  { threshold: 3, size: 7, label: 'Tier 2', sublabel: 'Getting to know you', total: 10 },
  { threshold: 10, size: 40, label: 'Tier 3', sublabel: 'Going deeper', total: 50 },
  { threshold: 50, size: 50, label: 'Tier 4', sublabel: 'The full picture', total: 100 },
];

// Page colors
const PAGE_COLORS: Record<string, string> = {
  'hot-takes': '#F26E5E',
  'hot_takes': '#F26E5E',
  'origin-stories': '#8B9A6D',
  'origin_stories': '#8B9A6D',
  'this-or-that': '#F7DA21',
  'this_or_that': '#F7DA21',
  'current-obsessions': '#9B7ED9',
  'current_obsessions': '#9B7ED9',
  'unfinished-thoughts': '#5B9BD5',
  'unfinished_thoughts': '#5B9BD5',
  'the-basics': '#E89AC7',
  'the_basics': '#E89AC7',
};

// Page icons
const PAGE_ICONS: Record<string, any> = {
  'hot-takes': Flame,
  'hot_takes': Flame,
  'origin-stories': Grid3X3,
  'origin_stories': Grid3X3,
  'this-or-that': Zap,
  'this_or_that': Zap,
  'current-obsessions': Sparkles,
  'current_obsessions': Sparkles,
  'unfinished-thoughts': MessageCircle,
  'unfinished_thoughts': MessageCircle,
  'the-basics': BookOpen,
  'the_basics': BookOpen,
};

// Calculate tier info
function getTierInfo(answeredPrompts: number) {
  let currentTier = 0;
  let nextTierThreshold: number | null = TIER_THRESHOLDS[0];
  let promptsToNextTier = TIER_THRESHOLDS[0] - answeredPrompts;

  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    if (answeredPrompts >= TIER_THRESHOLDS[i]) {
      currentTier = i + 1;
      nextTierThreshold = TIER_THRESHOLDS[i + 1] || null;
      promptsToNextTier = nextTierThreshold ? nextTierThreshold - answeredPrompts : 0;
    }
  }

  return {
    currentTier,
    totalTiers: TIER_THRESHOLDS.length,
    nextTierThreshold,
    promptsToNextTier,
    isMaxTier: currentTier === TIER_THRESHOLDS.length,
  };
}

interface StatBoxProps {
  label: string;
  value: number | string;
}

function StatBox({ label, value }: StatBoxProps) {
  return (
    <View className="bg-white border border-rule rounded-[16px] p-4 items-center flex-1">
      <Text className="text-[24px] font-extrabold text-ink">{value}</Text>
      <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">{label}</Text>
    </View>
  );
}

interface CategoryCardProps {
  page: any;
  index: number;
  onPress: () => void;
}

function CategoryCard({ page, index, onPress }: CategoryCardProps) {
  const tierInfo = getTierInfo(page.answered_prompts || 0);
  const bgColor = page.color || PAGE_COLORS[page.slug] || '#6B6760';
  const IconComponent = PAGE_ICONS[page.slug] || BookOpen;

  // Determine if this is a light background (yellow) that needs dark text
  const isLightBg = bgColor === '#F7DA21' || bgColor?.toLowerCase() === '#f7da21';
  const textColor = isLightBg ? '#111111' : '#FFFFFF';

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <TouchableOpacity
        onPress={onPress}
        className="rounded-[18px] p-4 overflow-hidden relative"
        style={{ backgroundColor: bgColor, minHeight: 160 }}
        activeOpacity={0.85}
      >
        {/* Arrow icon top-right */}
        <View className="absolute top-4 right-4">
          <ChevronRight size={16} color={isLightBg ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)'} />
        </View>

        {/* Icon in rounded square */}
        <View
          className="w-10 h-10 rounded-xl items-center justify-center mb-3"
          style={{ backgroundColor: isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }}
        >
          <IconComponent size={20} color={textColor} />
        </View>

        {/* Title */}
        <Text
          className="text-[15px] font-extrabold mb-1"
          style={{ color: textColor }}
          numberOfLines={2}
        >
          {page.title}
        </Text>

        {/* Entry count */}
        <Text
          className="text-[11px] mb-3"
          style={{ color: textColor, opacity: 0.7 }}
        >
          {page.answered_prompts || 0} entries
        </Text>

        {/* Tier dots */}
        <View className="flex-row items-center gap-1.5">
          {TIER_THRESHOLDS.map((_, i) => (
            <View
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: i < tierInfo.currentTier
                  ? textColor
                  : isLightBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
          {tierInfo.isMaxTier && (
            <Check size={12} color={textColor} style={{ marginLeft: 4 }} />
          )}
        </View>

        {/* Progress hint */}
        {!tierInfo.isMaxTier && tierInfo.promptsToNextTier > 0 && (
          <Text
            className="text-[10px] mt-2"
            style={{ color: textColor, opacity: 0.6 }}
          >
            {tierInfo.promptsToNextTier} more to tier {tierInfo.currentTier + 1}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

interface ScrapbookFullscreenProps {
  userId: string;
  userName?: string;
  isOwner?: boolean;
  onClose: () => void;
}

export default function ScrapbookFullscreen({
  userId,
  userName = 'You',
  isOwner = true,
  onClose,
}: ScrapbookFullscreenProps) {
  const router = useRouter();
  const { data: pages, isLoading } = useScrapbookOverview(userId);
  const { data: stats } = useScrapbookStats(userId);

  const totalEntries = stats?.answered_prompts || 0;
  const publicEntries = stats?.public_entries || 0;

  // Calculate tiers reached across all pages
  const tiersReached = pages?.reduce((sum: number, page: any) => {
    const tierInfo = getTierInfo(page.answered_prompts || 0);
    return sum + tierInfo.currentTier;
  }, 0) || 0;

  const handlePagePress = (page: any) => {
    haptics.lightImpact();
    onClose();
    // Navigate to scrapbook page view
    router.push(`/scrapbook/${page.slug}?userId=${userId}`);
  };

  // Sort pages by display_order
  const sortedPages = [...(pages || [])].sort((a: any, b: any) =>
    (a.display_order || 0) - (b.display_order || 0)
  );

  // Split into two columns
  const leftColumn = sortedPages.filter((_: any, i: number) => i % 2 === 0);
  const rightColumn = sortedPages.filter((_: any, i: number) => i % 2 === 1);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <TouchableOpacity
          onPress={onClose}
          className="w-12 h-12 items-center justify-center bg-sand rounded-full"
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={22} color="#1A1A1A" strokeWidth={2.5} />
        </TouchableOpacity>
        <View />
        <View className="w-12" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title section */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="items-center mb-6"
        >
          <Text className="text-[10px] font-extrabold uppercase tracking-widest text-ink-soft mb-1">
            Vol. 1
          </Text>
          <Text className="text-[28px] font-extrabold text-ink text-center" style={{ letterSpacing: -0.5 }}>
            The {userName} anthology
          </Text>
        </Animated.View>

        {/* "Build it" card */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(400)}
          className="bg-ink rounded-[22px] p-5 items-center mb-6"
        >
          <Text className="text-[20px] font-extrabold text-white text-center mb-1">
            The more you share, the more you unlock.
          </Text>
          <Text className="text-[13px] text-white/70 text-center mb-4">
            Complete prompts to unlock deeper tiers.
          </Text>

          {/* Tier thresholds display */}
          <View className="flex-row items-center justify-center gap-6">
            {TIER_THRESHOLDS.map((threshold, i) => (
              <View key={threshold} className="items-center">
                <Text className="text-[16px] font-extrabold text-white">{threshold}</Text>
                <Text className="text-[9px] font-bold text-white/50 uppercase">Tier {i + 1}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Stats row */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          className="flex-row gap-3 mb-6"
        >
          <StatBox label="Entries" value={totalEntries} />
          <StatBox label="Tiers" value={tiersReached} />
          <StatBox label="Public" value={publicEntries} />
        </Animated.View>

        {/* 2-column grid of page cards */}
        <View className="flex-row gap-3">
          <View className="flex-1 gap-3">
            {leftColumn.map((page: any, index: number) => (
              <CategoryCard
                key={page.page_id || page.slug}
                page={page}
                index={index * 2}
                onPress={() => handlePagePress(page)}
              />
            ))}
          </View>
          <View className="flex-1 gap-3">
            {rightColumn.map((page: any, index: number) => (
              <CategoryCard
                key={page.page_id || page.slug}
                page={page}
                index={index * 2 + 1}
                onPress={() => handlePagePress(page)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
