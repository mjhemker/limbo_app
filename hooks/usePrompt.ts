import { useQuery } from '@tanstack/react-query';
import { promptsService } from '../services/supabase/prompts';

export function useTodaysPrompt() {
  return useQuery({
    queryKey: ['prompt', 'today'],
    queryFn: () => promptsService.getTodaysPrompt(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function usePrompt(promptId?: string) {
  return useQuery({
    queryKey: ['prompt', promptId],
    queryFn: () => promptsService.getPromptById(promptId!),
    enabled: !!promptId,
  });
}

// Alias for usePrompt
export const usePromptById = usePrompt;

export function useAllPrompts() {
  return useQuery({
    queryKey: ['prompts', 'all'],
    queryFn: () => promptsService.getAllPrompts(),
  });
}

export function useDailyPrompts() {
  return useQuery({
    queryKey: ['prompts', 'daily'],
    queryFn: () => promptsService.getDailyPrompts(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useGeneralPrompts() {
  return useQuery({
    queryKey: ['prompts', 'general'],
    queryFn: () => promptsService.getGeneralPrompts(),
  });
}
