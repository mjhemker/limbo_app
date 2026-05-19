import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Animated, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Zap, ChevronRight, Check, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  useStartLightningRound,
  useSubmitLightningAnswer,
  useCompleteLightningRound,
} from '../../hooks/useLightning';
import { generateLightningPrompts } from '../../services/supabase/lightning';
import * as haptics from '../../utils/haptics';

const TOTAL_QUESTIONS = 5;
const ROUND_TIME = 60; // seconds

type GameState = 'start' | 'loading' | 'playing' | 'results';

/**
 * LightningRoundPage - Fast-paced Q&A format
 */
export default function LightningRoundPage() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [gameState, setGameState] = useState<GameState>('start');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const startTime = useRef<number>(0);

  const startRound = useStartLightningRound();
  const submitAnswer = useSubmitLightningAnswer();
  const completeRound = useCompleteLightningRound();

  const progressAnim = useRef(new Animated.Value(1)).current;

  // Load AI-generated prompts
  const loadPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const aiPrompts = await generateLightningPrompts(TOTAL_QUESTIONS);
      setPrompts(aiPrompts);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  // Load prompts on mount
  useEffect(() => {
    loadPrompts();
  }, []);

  // Timer during gameplay
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - submit what we have and show results
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  // Animate progress bar
  useEffect(() => {
    if (gameState === 'playing') {
      Animated.timing(progressAnim, {
        toValue: timeLeft / ROUND_TIME,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }
  }, [timeLeft, gameState]);

  const handleStart = async () => {
    haptics.mediumImpact();

    // If prompts aren't loaded yet, load them first
    if (prompts.length < TOTAL_QUESTIONS) {
      setGameState('loading');
      await loadPrompts();
    }

    try {
      if (user) {
        const session = await startRound.mutateAsync(user.id);
        setSessionId(session?.id || null);
      }
    } catch (error) {
      console.error('Error starting round:', error);
    }
    setGameState('playing');
    setTimeLeft(ROUND_TIME);
    startTime.current = Date.now();
    setCurrentQuestion(0);
    setAnswers([]);
    setCurrentAnswer('');
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) return;

    haptics.lightImpact();
    const timeTaken = Date.now() - startTime.current;

    // Save answer
    const newAnswers = [...answers, currentAnswer.trim()];
    setAnswers(newAnswers);

    // Submit to API if we have a session
    if (sessionId && user) {
      try {
        await submitAnswer.mutateAsync({
          sessionId,
          questionIndex: currentQuestion,
          promptText: prompts[currentQuestion],
          answerText: currentAnswer.trim(),
          timeTakenMs: timeTaken,
        });
      } catch (error) {
        console.error('Error submitting answer:', error);
      }
    }

    // Move to next question or finish
    if (currentQuestion < TOTAL_QUESTIONS - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setCurrentAnswer('');
      startTime.current = Date.now();
    } else {
      // All questions answered
      await handleComplete();
    }
  };

  const handleTimeUp = async () => {
    // If there's a current answer, save it
    if (currentAnswer.trim()) {
      const newAnswers = [...answers, currentAnswer.trim()];
      setAnswers(newAnswers);
    }
    await handleComplete();
  };

  const handleComplete = async () => {
    haptics.success();
    if (sessionId) {
      try {
        await completeRound.mutateAsync(sessionId);
      } catch (error) {
        console.error('Error completing round:', error);
      }
    }
    setGameState('results');
  };

  const handleClose = () => {
    router.back();
  };

  const handlePlayAgain = async () => {
    // Reset everything and load new AI-generated prompts
    setGameState('loading');
    setCurrentQuestion(0);
    setAnswers([]);
    setCurrentAnswer('');
    setTimeLeft(ROUND_TIME);
    setSessionId(null);

    // Load fresh AI prompts
    await loadPrompts();
    setGameState('start');
  };

  // Loading screen
  if (gameState === 'loading') {
    return (
      <View className="flex-1 bg-ink" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {/* Header with close button */}
        <View className="flex-row justify-end px-5 pt-3 pb-2">
          <TouchableOpacity
            onPress={handleClose}
            className="w-11 h-11 bg-white/10 rounded-full items-center justify-center"
          >
            <X size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Centered content */}
        <View className="flex-1 px-6 justify-center items-center">
          {/* Loading indicator */}
          <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-6">
            <ActivityIndicator size="large" color="#111111" />
          </View>

          <Text className="text-[28px] font-extrabold text-white text-center mb-2">
            Generating Questions...
          </Text>
          <Text className="text-[15px] text-white/60 text-center leading-relaxed">
            AI is crafting unique prompts just for you
          </Text>
        </View>
      </View>
    );
  }

  // Start screen
  if (gameState === 'start') {
    return (
      <View className="flex-1 bg-ink" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {/* Header with close button */}
        <View className="flex-row justify-end px-5 pt-3 pb-2">
          <TouchableOpacity
            onPress={handleClose}
            className="w-11 h-11 bg-white/10 rounded-full items-center justify-center"
          >
            <X size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Centered content */}
        <View className="flex-1 px-6 justify-center items-center">
          {/* Icon */}
          <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-6">
            <Zap size={40} color="#111111" fill="#F7DA21" />
          </View>

          <Text className="text-[28px] font-extrabold text-white text-center mb-2">
            Lightning Round
          </Text>
          <Text className="text-[15px] text-white/60 text-center mb-4 leading-relaxed">
            Answer {TOTAL_QUESTIONS} quick questions in {ROUND_TIME} seconds.{'\n'}
            Don't overthink it - just go!
          </Text>

          {/* AI-generated badge */}
          <View className="flex-row items-center bg-white/10 rounded-full px-3 py-1.5 mb-6">
            <Zap size={12} color="#F7DA21" fill="#F7DA21" />
            <Text className="text-white/70 text-[12px] font-medium ml-1.5">
              AI-generated prompts
            </Text>
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleStart}
              disabled={isLoadingPrompts}
              className={`rounded-full px-8 py-4 ${isLoadingPrompts ? 'bg-primary/50' : 'bg-primary'}`}
              activeOpacity={0.8}
            >
              {isLoadingPrompts ? (
                <ActivityIndicator size="small" color="#111111" />
              ) : (
                <Text className="text-ink text-[16px] font-bold">Start Round →</Text>
              )}
            </TouchableOpacity>

            {/* Refresh prompts button */}
            <TouchableOpacity
              onPress={loadPrompts}
              disabled={isLoadingPrompts}
              className="w-14 h-14 bg-white/10 rounded-full items-center justify-center"
              activeOpacity={0.8}
            >
              <RefreshCw size={20} color={isLoadingPrompts ? 'rgba(255,255,255,0.3)' : 'white'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Playing screen
  if (gameState === 'playing') {
    return (
      <View className="flex-1 bg-ink" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-1 px-6">
            {/* Header with timer and progress */}
            <View className="flex-row items-center justify-between pt-3 pb-4">
              <TouchableOpacity
                onPress={handleClose}
                className="w-11 h-11 bg-white/10 rounded-full items-center justify-center"
              >
                <X size={22} color="white" />
              </TouchableOpacity>
              <View className="flex-row items-center">
                <View className="bg-primary rounded-full px-3 py-1">
                  <Text className="text-ink font-bold text-[14px]">{timeLeft}s</Text>
                </View>
              </View>
              <Text className="text-white/60 font-bold text-[14px]">
                {currentQuestion + 1}/{TOTAL_QUESTIONS}
              </Text>
            </View>

            {/* Progress bar */}
            <View className="h-1 bg-white/20 rounded-full mb-8">
              <Animated.View
                className="h-full bg-primary rounded-full"
                style={{
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }}
              />
            </View>

            {/* Question */}
            <View className="flex-1 justify-center">
              <Text className="text-[24px] font-extrabold text-white text-center leading-tight mb-8">
                {prompts[currentQuestion]}
              </Text>

              {/* Answer input */}
              <TextInput
                value={currentAnswer}
                onChangeText={setCurrentAnswer}
                placeholder="Type your answer..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                className="bg-white/10 rounded-2xl px-5 py-4 text-white text-[16px] font-medium text-center"
                autoFocus
                onSubmitEditing={handleSubmitAnswer}
                returnKeyType="next"
              />
            </View>

            {/* Submit button */}
            <View className="pb-4">
              <TouchableOpacity
                onPress={handleSubmitAnswer}
                disabled={!currentAnswer.trim()}
                className={`rounded-full py-4 ${currentAnswer.trim() ? 'bg-primary' : 'bg-white/20'}`}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-center">
                  <Text
                    className={`text-[16px] font-bold ${currentAnswer.trim() ? 'text-ink' : 'text-white/40'}`}
                  >
                    {currentQuestion < TOTAL_QUESTIONS - 1 ? 'Next' : 'Finish'}
                  </Text>
                  <ChevronRight
                    size={20}
                    color={currentAnswer.trim() ? '#111111' : 'rgba(255,255,255,0.4)'}
                    style={{ marginLeft: 4 }}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Results screen
  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="flex-row items-center justify-between pt-3 pb-4">
          <TouchableOpacity
            onPress={handleClose}
            className="w-11 h-11 bg-white/10 rounded-full items-center justify-center"
          >
            <X size={22} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-[16px]">Round Complete!</Text>
          <View className="w-10" />
        </View>

        {/* Success icon */}
        <View className="items-center mb-6 pt-4">
          <View className="w-16 h-16 rounded-full bg-green items-center justify-center">
            <Check size={32} color="white" strokeWidth={3} />
          </View>
        </View>

        <Text className="text-[24px] font-extrabold text-white text-center mb-2">
          Nice work!
        </Text>
        <Text className="text-[15px] text-white/60 text-center mb-6">
          You answered {answers.length} questions
        </Text>

        {/* Answers recap */}
        <View className="flex-1 bg-white/5 rounded-[22px] p-4 mb-4">
          {prompts.slice(0, answers.length).map((prompt, index) => (
            <View
              key={index}
              className={`py-3 ${index < answers.length - 1 ? 'border-b border-white/10' : ''}`}
            >
              <Text className="text-[12px] text-white/50 mb-1">{prompt}</Text>
              <Text className="text-[15px] text-white font-medium">{answers[index]}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View className="pb-4 space-y-3">
          <TouchableOpacity
            onPress={handlePlayAgain}
            className="bg-primary rounded-full py-4"
            activeOpacity={0.8}
          >
            <Text className="text-ink text-[16px] font-bold text-center">Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClose}
            className="bg-white/10 rounded-full py-4"
            activeOpacity={0.8}
          >
            <Text className="text-white text-[16px] font-bold text-center">Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
