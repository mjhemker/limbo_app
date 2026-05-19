import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Lock, Users } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useSubmitScrapbookEntry } from '../../hooks/useScrapbook';
import { toast } from '../../utils/toast';
import * as haptics from '../../utils/haptics';

// Page colors
const PAGE_COLORS: Record<string, string> = {
  'this-or-that': '#F7DA21',
  'the-basics': '#5B8A3F',
  'hot-takes': '#F26E5E',
  'origin-stories': '#7B68EE',
  'current-obsessions': '#5DADE2',
  'lightning-rounds': '#FFB366',
  origin: '#F26E5E',
  personality: '#6AAA64',
  relationships: '#8E73C9',
  dreams: '#4F8FE0',
  hot_takes: '#C28F2C',
  wildcard: '#111111',
};

export default function ScrapbookComposePage() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    promptId: string;
    promptText: string;
    promptType?: string;
    optionA?: string;
    optionB?: string;
    pageSlug?: string;
    existingAnswer?: string;
    existingOption?: string;
  }>();

  const submitEntry = useSubmitScrapbookEntry();

  const [answerText, setAnswerText] = useState(params.existingAnswer || '');
  const [selectedOption, setSelectedOption] = useState<string | null>(
    params.existingOption || null
  );
  const [visibility, setVisibility] = useState<'friends' | 'private'>('friends');
  const [loading, setLoading] = useState(false);

  const isChoicePrompt = params.promptType === 'choice';
  const pageColor = PAGE_COLORS[params.pageSlug || ''] || '#F7DA21';

  const handleSubmit = async () => {
    if (!user?.id || !params.promptId) {
      toast.error('Missing required data');
      return;
    }

    if (isChoicePrompt && !selectedOption) {
      toast.error('Please select an option');
      return;
    }

    if (!isChoicePrompt && !answerText.trim()) {
      toast.error('Please write an answer');
      return;
    }

    setLoading(true);
    try {
      await submitEntry.mutateAsync({
        userId: user.id,
        promptId: params.promptId,
        answerText: isChoicePrompt ? null : answerText.trim(),
        selectedOption: isChoicePrompt ? selectedOption : null,
        visibility,
      });

      haptics.success();
      toast.success('Saved to your scrapbook!');
      router.back();
    } catch (error: any) {
      haptics.error();
      toast.error(error.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const hasContent = isChoicePrompt ? !!selectedOption : !!answerText.trim();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View
          className="px-5 pt-4 pb-5"
          style={{ backgroundColor: pageColor }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
            >
              <ArrowLeft size={22} color="white" />
            </TouchableOpacity>
            <Text className="text-[11px] font-bold text-white/70 uppercase tracking-widest">
              Scrapbook
            </Text>
            <View className="w-10" />
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Prompt Text */}
          <View className="mb-6">
            <Text
              className="text-[22px] font-extrabold text-ink text-center leading-tight"
              style={{ letterSpacing: -0.5 }}
            >
              {isChoicePrompt
                ? `${params.optionA} or ${params.optionB}?`
                : params.promptText}
            </Text>
          </View>

          {/* Choice Prompt - Option Buttons */}
          {isChoicePrompt && (
            <View className="mb-6">
              <TouchableOpacity
                onPress={() => {
                  haptics.lightImpact();
                  setSelectedOption(params.optionA || 'A');
                }}
                className={`p-4 rounded-[16px] mb-3 border-2 ${
                  selectedOption === params.optionA
                    ? 'bg-ink border-ink'
                    : 'bg-card border-rule'
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-[17px] font-bold text-center ${
                    selectedOption === params.optionA ? 'text-white' : 'text-ink'
                  }`}
                >
                  {params.optionA}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  haptics.lightImpact();
                  setSelectedOption(params.optionB || 'B');
                }}
                className={`p-4 rounded-[16px] border-2 ${
                  selectedOption === params.optionB
                    ? 'bg-ink border-ink'
                    : 'bg-card border-rule'
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-[17px] font-bold text-center ${
                    selectedOption === params.optionB ? 'text-white' : 'text-ink'
                  }`}
                >
                  {params.optionB}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Text Input - for non-choice prompts */}
          {!isChoicePrompt && (
            <View className="mb-6">
              <TextInput
                className="bg-card border border-rule rounded-[18px] px-4 py-4 text-[16px] text-ink min-h-[140px]"
                placeholder="Write your answer..."
                placeholderTextColor="#6B6760"
                value={answerText}
                onChangeText={setAnswerText}
                multiline
                textAlignVertical="top"
                maxLength={500}
                editable={!loading}
              />
              <Text className="text-[11px] text-ink-soft mt-2 text-right">
                {answerText.length}/500
              </Text>
            </View>
          )}

          {/* Visibility Toggle */}
          <View className="mb-8">
            <Text className="text-[11px] font-bold text-ink-soft uppercase tracking-widest mb-3">
              Who can see this?
            </Text>
            <View className="flex-row gap-3">
              {/* Private Option */}
              <TouchableOpacity
                onPress={() => {
                  if (!loading) {
                    haptics.lightImpact();
                    setVisibility('private');
                  }
                }}
                disabled={loading}
                className={`flex-1 flex-row items-center justify-center py-4 rounded-full border-2 ${
                  visibility === 'private'
                    ? 'bg-ink border-ink'
                    : 'bg-card border-rule'
                }`}
                activeOpacity={0.7}
              >
                <Lock
                  size={18}
                  color={visibility === 'private' ? '#FFFFFF' : '#6B6760'}
                  strokeWidth={2.5}
                />
                <Text
                  className={`font-bold text-[14px] ml-2 ${
                    visibility === 'private' ? 'text-white' : 'text-ink-soft'
                  }`}
                >
                  Private
                </Text>
              </TouchableOpacity>

              {/* Friends Option */}
              <TouchableOpacity
                onPress={() => {
                  if (!loading) {
                    haptics.lightImpact();
                    setVisibility('friends');
                  }
                }}
                disabled={loading}
                className={`flex-1 flex-row items-center justify-center py-4 rounded-full border-2 ${
                  visibility === 'friends'
                    ? 'bg-ink border-ink'
                    : 'bg-card border-rule'
                }`}
                activeOpacity={0.7}
              >
                <Users
                  size={18}
                  color={visibility === 'friends' ? '#FFFFFF' : '#6B6760'}
                  strokeWidth={2.5}
                />
                <Text
                  className={`font-bold text-[14px] ml-2 ${
                    visibility === 'friends' ? 'text-white' : 'text-ink-soft'
                  }`}
                >
                  Friends
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!hasContent || loading}
            className={`rounded-full py-4 ${
              hasContent && !loading ? 'bg-ink' : 'bg-sand'
            }`}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color={hasContent ? '#FFFFFF' : '#6B6760'} />
            ) : (
              <Text
                className={`text-center font-bold text-[16px] ${
                  hasContent ? 'text-white' : 'text-ink-soft'
                }`}
              >
                Save to Scrapbook
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
