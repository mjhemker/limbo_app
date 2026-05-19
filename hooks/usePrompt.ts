import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promptsService, DailyArchiveItem } from '../services/supabase/prompts';

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

export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (text: string) => promptsService.createPrompt(text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
  });
}

// --- Optional prompts (absorbed from useOptionalPrompts) ---

export function useRandomPrompts(limit: number = 5) {
  return useQuery({
    queryKey: ['prompts', 'optional', 'random', limit],
    queryFn: () => promptsService.getRandomOptionalPrompts(limit),
  });
}

export function useOptionalPrompt(promptId?: string) {
  return useQuery({
    queryKey: ['prompt', promptId],
    queryFn: () => promptsService.getOptionalPromptById(promptId!),
    enabled: !!promptId,
  });
}

export function usePromptsByCategory(category?: string) {
  return useQuery({
    queryKey: ['prompts', 'optional', 'category', category],
    queryFn: () => promptsService.getPromptsByCategory(category!),
    enabled: !!category,
  });
}

// Daily Archive - past 7 days with prompts and user response status
export function useDailyArchive(userId?: string) {
  return useQuery({
    queryKey: ['prompts', 'archive', userId],
    queryFn: () => promptsService.getDailyArchive(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export type { DailyArchiveItem };
