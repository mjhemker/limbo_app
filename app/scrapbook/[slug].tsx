import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useScrapbookPage } from '../../hooks/useScrapbook';

// Page colors matching ScrapbookHome
const PAGE_COLORS: Record<string, string> = {
  origin: '#F26E5E',
  personality: '#6AAA64',
  relationships: '#8E73C9',
  dreams: '#4F8FE0',
  hot_takes: '#C28F2C',
  wildcard: '#111111',
};

const PAGE_ICONS: Record<string, string> = {
  origin: '🌱',
  personality: '✨',
  relationships: '💕',
  dreams: '🌙',
  hot_takes: '🔥',
  wildcard: '🎲',
};

const PAGE_TITLES: Record<string, string> = {
  origin: 'Origin Story',
  personality: 'Personality',
  relationships: 'Relationships',
  dreams: 'Dreams',
  hot_takes: 'Hot Takes',
  wildcard: 'Wildcard',
};

/**
 * ScrapbookPageView - Individual scrapbook page with prompts
 */
export default function ScrapbookPageView() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: prompts, isLoading } = useScrapbookPage(user?.id, slug, user?.id);

  const pageColor = PAGE_COLORS[slug || ''] || PAGE_COLORS.wildcard;
  const pageIcon = PAGE_ICONS[slug || ''] || '📖';
  const pageTitle = PAGE_TITLES[slug || ''] || 'Scrapbook';

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F7DA21" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View
        className="px-5 pt-4 pb-6"
        style={{ backgroundColor: pageColor }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white/60 font-bold text-[14px]">
            {prompts?.length || 0} prompts
          </Text>
        </View>

        <Text className="text-[24px] mb-1">{pageIcon}</Text>
        <Text
          className="text-[28px] font-extrabold text-white"
          style={{ letterSpacing: -0.5 }}
        >
          {pageTitle}
        </Text>
      </View>

      {/* Prompts List */}
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
      >
        {prompts && prompts.length > 0 ? (
          prompts.map((prompt: any, index: number) => {
            const isAnswered = !!prompt.answer_text || !!prompt.selected_option;

            return (
              <TouchableOpacity
                key={prompt.id || index}
                className={`rounded-[18px] p-4 mb-3 ${
                  isAnswered ? 'bg-white border border-rule' : 'bg-sand'
                }`}
                activeOpacity={0.8}
                onPress={() => {
                  // Navigate to scrapbook compose screen
                  const params = new URLSearchParams({
                    promptId: prompt.id,
                    promptText: prompt.prompt_text || '',
                    promptType: prompt.prompt_type || 'text',
                    pageSlug: slug || '',
                  });
                  if (prompt.option_a) params.append('optionA', prompt.option_a);
                  if (prompt.option_b) params.append('optionB', prompt.option_b);
                  if (prompt.answer_text) params.append('existingAnswer', prompt.answer_text);
                  if (prompt.selected_option) params.append('existingOption', prompt.selected_option);
                  router.push(`/scrapbook/compose?${params.toString()}`);
                }}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-4">
                    {prompt.prompt_type === 'choice' ? (
                      <Text className="text-[15px] font-semibold text-ink">
                        {prompt.option_a} or {prompt.option_b}?
                      </Text>
                    ) : (
                      <Text className="text-[15px] font-semibold text-ink">
                        {prompt.prompt_text}
                      </Text>
                    )}

                    {isAnswered && (
                      <View className="mt-2">
                        <Text className="text-[14px] text-ink-soft">
                          {prompt.answer_text || prompt.selected_option}
                        </Text>
                      </View>
                    )}
                  </View>

                  {isAnswered ? (
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{ backgroundColor: pageColor }}
                    >
                      <Check size={14} color="white" strokeWidth={3} />
                    </View>
                  ) : (
                    <View className="w-6 h-6 rounded-full border-2 border-ink/20" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View className="bg-sand rounded-[22px] p-8 items-center">
            <Text className="text-[15px] font-semibold text-ink-soft text-center">
              No prompts available for this page yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
