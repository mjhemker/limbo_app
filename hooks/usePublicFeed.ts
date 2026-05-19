import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  getPublicFeed,
  toggleReaction,
  getPublicResponsesByPrompt,
  PublicFeedResponse,
} from '../services/supabase/publicFeed';

/**
 * Hook to get infinite scrolling public feed
 */
export function usePublicFeed(userId?: string) {
  return useInfiniteQuery<PublicFeedResponse[]>({
    queryKey: ['publicFeed', userId],
    queryFn: ({ pageParam = 0 }) => getPublicFeed(userId || null, 20, pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;
      return allPages.length * 20;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to toggle reaction
 */
export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      responseId,
      reactionType,
    }: {
      userId: string;
      responseId: string;
      reactionType: string;
    }) => toggleReaction(userId, responseId, reactionType),
    onMutate: async ({ responseId, reactionType, userId }) => {
      // Optimistically update the UI
      await queryClient.cancelQueries({ queryKey: ['publicFeed'] });

      const previousFeed = queryClient.getQueryData(['publicFeed', userId]);

      queryClient.setQueryData(['publicFeed', userId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: PublicFeedResponse[]) =>
            page.map((response) => {
              if (response.id !== responseId) return response;

              const currentReaction = response.user_reaction;
              const counts = { ...response.reaction_counts };

              // If same reaction, remove it
              if (currentReaction === reactionType) {
                counts[reactionType] = Math.max(0, (counts[reactionType] || 0) - 1);
                return { ...response, reaction_counts: counts, user_reaction: null };
              }

              // If different reaction, swap
              if (currentReaction) {
                counts[currentReaction] = Math.max(0, (counts[currentReaction] || 0) - 1);
              }
              counts[reactionType] = (counts[reactionType] || 0) + 1;

              return { ...response, reaction_counts: counts, user_reaction: reactionType };
            })
          ),
        };
      });

      return { previousFeed };
    },
    onError: (err, variables, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['publicFeed', variables.userId], context.previousFeed);
      }
    },
  });
}

/**
 * Hook to get public responses for a specific prompt
 */
export function usePublicResponsesByPrompt(promptId?: string, userId?: string) {
  return useQuery({
    queryKey: ['publicResponses', promptId, userId],
    queryFn: () => getPublicResponsesByPrompt(promptId!, userId || null),
    enabled: !!promptId,
    staleTime: 1000 * 60, // 1 minute
  });
}
