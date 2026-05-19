import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { ChevronRight, Zap, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useScrapbookOverview, useScrapbookStats } from '../../hooks/useScrapbook';
import { useLightningHistory } from '../../hooks/useLightning';
import * as haptics from '../../utils/haptics';

// Scrapbook page colors - matching web design
const PAGE_COLORS: Record<string, string> = {
  hot_takes: '#F26E5E',       // coral/red
  origin_stories: '#6B8E5A',  // olive green
  this_or_that: '#F7DA21',    // yellow
  current_obsessions: '#8E73C9', // purple
  unfinished_thoughts: '#4F8FE0', // blue
  the_basics: '#2E6F5E',      // teal
  origin: '#6B8E5A',
  personality: '#F7DA21',
  relationships: '#8E73C9',
  dreams: '#4F8FE0',
  wildcard: '#6B6760',
};

const PAGE_ICONS: Record<string, string> = {
  hot_takes: '🔥',
  origin_stories: '📖',
  this_or_that: '⚡',
  current_obsessions: '💜',
  unfinished_thoughts: '💭',
  the_basics: '📋',
  origin: '📖',
  personality: '⚡',
  relationships: '💜',
  dreams: '💭',
  wildcard: '🎲',
};

interface ScrapbookHomeProps {
  userId: string;
  isOwner?: boolean;
}

/**
 * PageTile - Individual scrapbook page card
 */
function PageTile({
  page,
  index,
  onPress,
}: {
  page: any;
  index: number;
  onPress: () => void;
}) {
  const progress = page.total_prompts > 0
    ? Math.round((page.answered_prompts / page.total_prompts) * 100)
    : 0;

  // Use color from database if available, otherwise fall back to slug-based color
  const bgColor = page.color || PAGE_COLORS[page.slug] || PAGE_COLORS.wildcard;
  // Use icon from database if available, otherwise fall back to slug-based icon
  const icon = page.icon || PAGE_ICONS[page.slug] || '📖';

  // Determine if this is a light background (yellow) that needs dark text
  const isLightBg = bgColor === '#F7DA21' || bgColor?.toLowerCase() === '#f7da21';
  const textColor = isLightBg ? '#111111' : '#FFFFFF';
  const textOpacity = isLightBg ? 0.7 : 0.7;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-[18px] p-4 mb-3 overflow-hidden"
      style={{ backgroundColor: bgColor, minHeight: 140 }}
      activeOpacity={0.85}
    >
      {/* Progress indicator */}
      <View className="absolute top-3 right-3 flex-row items-center">
        <Text
          className="text-[11px] font-bold"
          style={{ color: textColor, opacity: 0.8 }}
        >
          {page.answered_prompts}/{page.total_prompts}
        </Text>
      </View>

      {/* Icon */}
      <Text className="text-[20px] mb-2">{icon}</Text>

      {/* Title and tagline */}
      <Text
        className="text-[15px] font-extrabold leading-tight"
        style={{ color: textColor }}
        numberOfLines={2}
      >
        {page.title}
      </Text>
      <Text
        className="text-[11px] mt-0.5 leading-snug"
        style={{ color: textColor, opacity: textOpacity }}
        numberOfLines={2}
      >
        {page.tagline}
      </Text>

      {/* Progress bar */}
      <View
        className="absolute bottom-4 left-4 right-4 h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }}
      >
        <View
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: isLightBg ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)',
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

/**
 * LightningRoundsTile - Card for viewing all lightning rounds
 */
function LightningRoundsTile({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-ink rounded-[18px] p-4"
      activeOpacity={0.85}
    >
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
          <Zap size={24} color="#111111" fill="#F7DA21" />
        </View>
        <View className="flex-1 ml-3">
          <Text
            className="text-[16px] font-extrabold text-white"
            style={{ letterSpacing: -0.3 }}
          >
            Lightning Rounds
          </Text>
          <Text className="text-[12px] text-white/60">
            {count} {count === 1 ? 'round' : 'rounds'} completed
          </Text>
        </View>
        <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
      </View>
    </TouchableOpacity>
  );
}

/**
 * ScrapbookHome - The 6-tile grid showing all scrapbook pages
 */
export default function ScrapbookHome({ userId, isOwner = true }: ScrapbookHomeProps) {
  const router = useRouter();
  const { data: pages, isLoading } = useScrapbookOverview(userId);
  const { data: stats } = useScrapbookStats(userId);
  const { data: lightningHistory } = useLightningHistory(userId, 50);

  const handlePagePress = (page: any) => {
    haptics.lightImpact();
    // Navigate to scrapbook page view
    router.push(`/scrapbook/${page.slug}?userId=${userId}`);
  };

  const handleLightningPress = () => {
    haptics.lightImpact();
    router.push('/lightning');
  };

  if (isLoading) {
    return (
      <View className="space-y-4">
        <View className="h-24 bg-sand rounded-[22px]" />
        <View className="flex-row flex-wrap justify-between">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              className="bg-sand rounded-[18px] mb-3"
              style={{ width: '48%', height: 120 }}
            />
          ))}
        </View>
      </View>
    );
  }

  const totalAnswered = stats?.answered_prompts || 0;
  const totalPrompts = stats?.total_prompts || 0;
  const progressPercent = totalPrompts > 0 ? (totalAnswered / totalPrompts) * 100 : 0;

  // Split pages into two columns
  const leftColumn = pages?.filter((_: any, i: number) => i % 2 === 0) || [];
  const rightColumn = pages?.filter((_: any, i: number) => i % 2 === 1) || [];

  return (
    <View>
      {/* Header */}
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1 pr-4">
          <Text className="text-[10px] font-extrabold uppercase tracking-widest text-ink-soft mb-1">
            Your Scrapbook
          </Text>
          <Text
            className="text-[24px] font-extrabold text-ink leading-tight"
            style={{ letterSpacing: -0.5 }}
          >
            A portrait of you,{'\n'}made of small answers.
          </Text>
          <Text className="text-[13px] text-ink-soft mt-2">
            {totalAnswered} of {totalPrompts} prompts answered · keep going at your own pace
          </Text>
        </View>

        {/* Circular progress - V2 Style */}
        <View className="relative w-[68px] h-[68px] items-center justify-center">
          {/* Background circle */}
          <View
            className="absolute w-[60px] h-[60px] rounded-full"
            style={{
              borderWidth: 4,
              borderColor: '#E8E4DE',
            }}
          />
          {/* Progress arc - simple approach showing progress as partial circle */}
          {progressPercent > 0 && (
            <View
              className="absolute w-[60px] h-[60px] rounded-full"
              style={{
                borderWidth: 4,
                borderColor: 'transparent',
                borderTopColor: '#1A1A1A',
                borderRightColor: progressPercent > 25 ? '#1A1A1A' : 'transparent',
                borderBottomColor: progressPercent > 50 ? '#1A1A1A' : 'transparent',
                borderLeftColor: progressPercent > 75 ? '#1A1A1A' : 'transparent',
                transform: [{ rotate: '-45deg' }],
              }}
            />
          )}
          {/* Center text */}
          <View className="items-center justify-center">
            <Text className="text-[18px] font-extrabold text-ink leading-none">{totalAnswered}</Text>
            <Text className="text-[9px] font-bold text-ink-soft uppercase tracking-wide">entries</Text>
          </View>
        </View>
      </View>

      {/* 6-tile grid */}
      <View className="flex-row mb-4">
        <View className="flex-1 mr-1.5">
          {leftColumn.map((page: any, index: number) => (
            <PageTile
              key={page.page_id || page.slug}
              page={page}
              index={index * 2}
              onPress={() => handlePagePress(page)}
            />
          ))}
        </View>
        <View className="flex-1 ml-1.5">
          {rightColumn.map((page: any, index: number) => (
            <PageTile
              key={page.page_id || page.slug}
              page={page}
              index={index * 2 + 1}
              onPress={() => handlePagePress(page)}
            />
          ))}
        </View>
      </View>

      {/* Lightning Rounds */}
      <LightningRoundsTile
        count={lightningHistory?.length || 0}
        onPress={handleLightningPress}
      />
    </View>
  );
}
