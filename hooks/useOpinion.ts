import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  getTodaysOpinionTopic,
  getTomorrowsTeaser,
  submitOpinionVote,
  getOpinionDistribution,
  getOpinionTopics,
  OpinionTopic,
  OpinionDistribution,
  OpinionCategory,
  OpinionSort,
  OpinionPeriod,
} from '../services/supabase/opinion';

/**
 * Hook to get today's opinion topic
 */
export function useTodaysOpinion(userId?: string) {
  return useQuery<OpinionTopic | null>({
    queryKey: ['opinion', 'today', userId],
    queryFn: () => getTodaysOpinionTopic(userId || null),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
}

/**
 * Hook to get tomorrow's teaser
 */
export function useTomorrowsTeaser() {
  return useQuery<{ teaser_text: string } | null>({
    queryKey: ['opinion', 'teaser'],
    queryFn: getTomorrowsTeaser,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to submit a vote
 */
export function useSubmitOpinionVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      topicId,
      voteValue,
    }: {
      userId: string;
      topicId: string;
      voteValue: number;
    }) => submitOpinionVote(userId, topicId, voteValue),
    onSuccess: (_, { userId, topicId }) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['opinion', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['opinion', 'distribution', topicId] });
    },
  });
}

/**
 * Hook to get vote distribution
 */
export function useOpinionDistribution(
  topicId?: string,
  userId?: string,
  options: { enabled?: boolean } = {}
) {
  return useQuery<OpinionDistribution[]>({
    queryKey: ['opinion', 'distribution', topicId, userId],
    queryFn: () => getOpinionDistribution(topicId!, userId || null),
    staleTime: 1000 * 30, // 30 seconds
    enabled: !!topicId && options.enabled !== false,
  });
}

/**
 * Hook to get opinion topics with infinite scroll
 */
export function useOpinionTopics(
  userId?: string,
  category: OpinionCategory = 'featured',
  sort: OpinionSort = 'hot',
  period: OpinionPeriod = 'week'
) {
  const LIMIT = 20;

  return useInfiniteQuery<OpinionTopic[]>({
    queryKey: ['opinion', 'topics', category, sort, period, userId],
    queryFn: async ({ pageParam = 0 }) => {
      return getOpinionTopics(userId || null, category, sort, period, LIMIT, pageParam as number);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < LIMIT) return undefined;
      return allPages.length * LIMIT;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
}
