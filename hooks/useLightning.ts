import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  startLightningRound,
  submitLightningAnswer,
  completeLightningRound,
  getLightningHistory,
  addLightningToScrapbook,
  LightningSession,
} from '../services/supabase/lightning';

/**
 * Hook to start a lightning round
 */
export function useStartLightningRound() {
  return useMutation({
    mutationFn: (userId: string) => startLightningRound(userId),
  });
}

/**
 * Hook to submit a lightning answer
 */
export function useSubmitLightningAnswer() {
  return useMutation({
    mutationFn: ({
      sessionId,
      questionIndex,
      promptText,
      answerText,
      timeTakenMs,
    }: {
      sessionId: string;
      questionIndex: number;
      promptText: string;
      answerText: string;
      timeTakenMs?: number | null;
    }) => submitLightningAnswer(sessionId, questionIndex, promptText, answerText, timeTakenMs),
  });
}

/**
 * Hook to complete a lightning round
 */
export function useCompleteLightningRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => completeLightningRound(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lightningHistory'] });
    },
  });
}

/**
 * Hook to get lightning round history
 */
export function useLightningHistory(userId?: string, limit: number = 10) {
  return useQuery<LightningSession[]>({
    queryKey: ['lightningHistory', userId, limit],
    queryFn: () => getLightningHistory(userId!, limit),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!userId,
  });
}

/**
 * Hook to add lightning round to scrapbook
 */
export function useAddLightningToScrapbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, sessionId }: { userId: string; sessionId: string }) =>
      addLightningToScrapbook(userId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lightningHistory'] });
      queryClient.invalidateQueries({ queryKey: ['scrapbook'] });
    },
  });
}
