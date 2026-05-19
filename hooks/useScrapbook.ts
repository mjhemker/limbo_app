import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getScrapbookOverview,
  getScrapbookStats,
  getScrapbookPage,
  submitScrapbookEntry,
  getNextPrompt,
  ScrapbookPage,
  ScrapbookStats,
} from '../services/supabase/scrapbook';

/**
 * Hook to get scrapbook overview (all pages with progress)
 */
export function useScrapbookOverview(userId?: string) {
  return useQuery<ScrapbookPage[]>({
    queryKey: ['scrapbook', 'overview', userId],
    queryFn: () => getScrapbookOverview(userId!),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!userId,
  });
}

/**
 * Hook to get scrapbook stats
 */
export function useScrapbookStats(userId?: string) {
  return useQuery<ScrapbookStats>({
    queryKey: ['scrapbook', 'stats', userId],
    queryFn: () => getScrapbookStats(userId!),
    staleTime: 1000 * 60,
    enabled: !!userId,
  });
}

/**
 * Hook to get a specific page with entries
 */
export function useScrapbookPage(
  userId?: string,
  pageSlug?: string,
  viewerId: string | null = null
) {
  return useQuery({
    queryKey: ['scrapbook', 'page', userId, pageSlug, viewerId],
    queryFn: () => getScrapbookPage(userId!, pageSlug!, viewerId),
    staleTime: 1000 * 30,
    enabled: !!userId && !!pageSlug,
  });
}

/**
 * Hook to submit a scrapbook entry
 */
export function useSubmitScrapbookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitScrapbookEntry,
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['scrapbook', 'overview', userId] });
      queryClient.invalidateQueries({ queryKey: ['scrapbook', 'page', userId] });
      queryClient.invalidateQueries({ queryKey: ['scrapbook', 'stats', userId] });
    },
  });
}

/**
 * Hook to get next unanswered prompt
 */
export function useNextPrompt(userId?: string, pageSlug?: string) {
  return useQuery({
    queryKey: ['scrapbook', 'nextPrompt', userId, pageSlug],
    queryFn: () => getNextPrompt(userId!, pageSlug!),
    staleTime: 0, // Always fresh
    enabled: !!userId && !!pageSlug,
  });
}
