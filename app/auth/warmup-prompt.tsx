import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sparkles, ArrowRight, SkipForward } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useCreateResponse } from '../../hooks/useResponses';
import { promptsService } from '../../services/supabase/prompts';
import type { Prompt } from '../../types';

// Sample warm-up prompts for new users
const WARMUP_PROMPTS = [
  "What's one thing you're looking forward to this week?",
  "Describe your perfect lazy Sunday.",
  "What's a small thing that made you smile recently?",
  "If you could have any superpower for a day, what would it be?",
  "What's your go-to comfort food?",
  "What song has been stuck in your head lately?",
  "What's something you're proud of?",
  "If you could travel anywhere tomorrow, where would you go?",
  "What's a hobby you've always wanted to try?",
  "What's the best advice you've ever received?",
];

export default function WarmupPromptScreen() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayPrompt, setTodayPrompt] = useState<Prompt | null>(null);
  const [warmupPrompt, setWarmupPrompt] = useState('');
  const router = useRouter();
  const { user } = useAuth();
  const createResponse = useCreateResponse();

  useEffect(() => {
    // Try to get today's prompt, or use a random warmup prompt
    const loadPrompt = async () => {
      try {
        const prompt = await promptsService.getTodayPrompt();
        setTodayPrompt(prompt);
      } catch {
        // If no daily prompt, use a random warmup prompt
        const randomIndex = Math.floor(Math.random() * WARMUP_PROMPTS.length);
        setWarmupPrompt(WARMUP_PROMPTS[randomIndex]);
      }
    };
    loadPrompt();
  }, []);

  const handleSkip = () => {
    router.replace('/(tabs)/feed');
  };

  const handleSubmit = async () => {
    if (!response.trim() || !user) {
      router.replace('/(tabs)/feed');
      return;
    }

    setLoading(true);
    try {
      // Only submit if we have a real daily prompt
      if (todayPrompt) {
        await createResponse.mutateAsync({
          prompt_id: todayPrompt.id,
          text_content: response.trim(),
        });
      }
      router.replace('/(tabs)/feed');
    } catch (error) {
      // Still navigate even if submission fails
      router.replace('/(tabs)/feed');
    } finally {
      setLoading(false);
    }
  };

  const displayPrompt = todayPrompt?.text || warmupPrompt;
  const isRealPrompt = !!todayPrompt;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        style={{ backgroundColor: '#FBFAF7' }}
      >
        <View className="flex-1 px-6 pt-8" style={{ maxWidth: 500, alignSelf: 'center', width: '100%' }}>
          {/* Header - V2 Style */}
          <View className="mb-8">
            <View className="flex-row items-center mb-2">
              <Sparkles size={22} color="#F7DA21" />
              <Text className="text-2xl font-extrabold text-ink ml-2" style={{ letterSpacing: -0.8 }}>
                Warm Up
              </Text>
            </View>
            <Text className="text-ink-soft text-[15px] font-medium">
              {isRealPrompt
                ? "Here's today's prompt to get you started"
                : 'Try answering this quick prompt'}
            </Text>
          </View>

          {/* Prompt Card - V2 Yellow Tile */}
          <View className="bg-primary rounded-[18px] p-5 mb-6">
            <Text className="text-[10px] font-bold text-ink/60 uppercase tracking-widest mb-2">
              {isRealPrompt ? "Today's Prompt" : "Warm-up Prompt"}
            </Text>
            <Text className="text-[17px] font-bold text-ink leading-snug" style={{ letterSpacing: -0.3 }}>
              {displayPrompt || 'Loading...'}
            </Text>
          </View>

          {/* Response Input - V2 Style */}
          <View className="flex-1 mb-4">
            <TextInput
              className="flex-1 bg-card border border-rule rounded-[14px] p-4 text-[15px] text-ink font-medium"
              placeholder="Share your thoughts..."
              placeholderTextColor="#6B6760"
              value={response}
              onChangeText={setResponse}
              multiline
              textAlignVertical="top"
              editable={!loading}
              style={{ minHeight: 150, maxHeight: 250 }}
            />
            <Text className="text-[11px] text-ink-soft font-medium mt-2 text-right">
              {response.length} characters
            </Text>
          </View>

          {/* Action Buttons - V2 Style */}
          <View className="pb-4">
            {/* Submit Button - V2 Primary */}
            <TouchableOpacity
              className={`w-full py-4 rounded-full flex-row items-center justify-center mb-3 ${
                loading || !response.trim()
                  ? 'bg-ink opacity-30'
                  : 'bg-ink'
              }`}
              onPress={handleSubmit}
              disabled={loading || !response.trim()}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text className="text-white font-bold text-[14px] mr-2">
                    {isRealPrompt ? 'Post & Continue' : 'Continue'}
                  </Text>
                  <ArrowRight size={16} color="white" />
                </>
              )}
            </TouchableOpacity>

            {/* Skip Button - V2 Secondary */}
            <TouchableOpacity
              className="w-full py-3 flex-row items-center justify-center bg-sand rounded-full"
              onPress={handleSkip}
              disabled={loading}
              activeOpacity={0.7}
            >
              <SkipForward size={14} color="#6B6760" />
              <Text className="text-ink-soft font-bold text-[13px] ml-2">
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
