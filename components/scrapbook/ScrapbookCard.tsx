import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { ArrowRight, Flame, BookOpen, Zap, Sparkles, MessageCircle, Grid3X3 } from 'lucide-react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { useScrapbookOverview, useScrapbookStats } from '../../hooks/useScrapbook';
import ScrapbookFullscreen from './ScrapbookFullscreen';
import * as haptics from '../../utils/haptics';

// Page colors matching web design
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

interface ScrapbookCardProps {
  userId: string;
  userName?: string;
  isOwner?: boolean;
}

/**
 * ScrapbookCard - Dark card preview that appears on the profile page
 * Opens the fullscreen scrapbook view when tapped
 */
export default function ScrapbookCard({ userId, userName = 'You', isOwner = true }: ScrapbookCardProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const { data: pages, isLoading } = useScrapbookOverview(userId);
  const { data: stats } = useScrapbookStats(userId);

  const handlePress = () => {
    haptics.lightImpact();
    setShowFullscreen(true);
  };

  const totalEntries = stats?.answered_prompts || 0;
  const pagesWithEntries = pages?.filter((p: any) => (p.answered_prompts || 0) > 0).length || 0;

  if (isLoading) {
    return (
      <View className="bg-ink rounded-[22px] p-5">
        <View className="h-4 bg-white/10 rounded w-24 mb-3" />
        <View className="h-6 bg-white/10 rounded w-40 mb-2" />
        <View className="h-4 bg-white/10 rounded w-32 mb-4" />
        <View className="flex-row gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} className="w-10 h-10 rounded-xl bg-white/10" />
          ))}
        </View>
        <View className="h-12 bg-white/20 rounded-full" />
      </View>
    );
  }

  // Sort pages by display_order
  const sortedPages = [...(pages || [])].sort((a: any, b: any) =>
    (a.display_order || 0) - (b.display_order || 0)
  );

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        className="bg-ink rounded-[22px] p-5"
        activeOpacity={0.9}
      >
        {/* Header */}
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-primary text-[12px]">✦</Text>
          <Text className="text-[10px] font-extrabold uppercase tracking-widest text-white/60">
            {isOwner ? 'Your Scrapbook' : `${userName}'s Scrapbook`}
          </Text>
          <Text className="text-[10px] font-bold text-white/40">vol. 1</Text>
        </View>

        {/* Title */}
        <Text className="text-[20px] font-extrabold text-white leading-tight mb-1">
          The {userName} anthology
        </Text>

        {/* Stats */}
        <Text className="text-[12px] text-white/60 mb-4">
          {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} across {pagesWithEntries} {pagesWithEntries === 1 ? 'page' : 'pages'}
        </Text>

        {/* Page icons grid - 6 colored squares */}
        <View className="flex-row gap-2 mb-4">
          {sortedPages.slice(0, 6).map((page: any) => {
            const hasEntries = (page.answered_prompts || 0) > 0;
            const bgColor = page.color || PAGE_COLORS[page.slug] || '#6B6760';
            const IconComponent = PAGE_ICONS[page.slug] || BookOpen;

            return (
              <View
                key={page.page_id || page.slug}
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: bgColor,
                  opacity: hasEntries ? 1 : 0.4,
                }}
              >
                <IconComponent size={18} color="#FFFFFF" />
              </View>
            );
          })}
        </View>

        {/* Open button */}
        <View className="flex-row items-center justify-center gap-2 py-3 bg-white rounded-full">
          <Text className="text-[14px] font-bold text-ink">Open Scrapbook</Text>
          <ArrowRight size={16} color="#1A1A1A" />
        </View>
      </TouchableOpacity>

      {/* Fullscreen Modal */}
      <Modal
        visible={showFullscreen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFullscreen(false)}
      >
        <ScrapbookFullscreen
          userId={userId}
          userName={userName}
          isOwner={isOwner}
          onClose={() => setShowFullscreen(false)}
        />
      </Modal>
    </>
  );
}
