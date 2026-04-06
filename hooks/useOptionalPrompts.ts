import { useQuery } from '@tanstack/react-query';
import { optionalPromptsService } from '../services/supabase/optionalPrompts';

export function useRandomPrompts(limit: number = 5) {
  return useQuery({
    queryKey: ['optionalPrompts', 'random', limit],
    queryFn: () => optionalPromptsService.getRandomPrompts(limit),
  });
}

export function useOptionalPrompt(promptId?: string) {
  return useQuery({
    queryKey: ['optionalPrompt', promptId],
    queryFn: () => optionalPromptsService.getPromptById(promptId!),
    enabled: !!promptId,
  });
}

export function usePromptsByCategory(category?: string) {
  return useQuery({
    queryKey: ['optionalPrompts', 'category', category],
    queryFn: () => optionalPromptsService.getPromptsByCategory(category!),
    enabled: !!category,
  });
}
