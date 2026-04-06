import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLimboFriends, rescueFriend, getRescueCount, LimboFriend } from '../services/supabase/limbo';

const LIMBO_QUERY_KEY = 'limboFriends';
const RESCUE_COUNT_KEY = 'rescueCount';

// Hook to get friends in limbo (inactive 30+ days)
export function useLimboFriends(userId: string | undefined) {
  return useQuery({
    queryKey: [LIMBO_QUERY_KEY, userId],
    queryFn: () => getLimboFriends(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to rescue a friend from limbo
export function useRescueFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      friendId,
      promptId,
    }: {
      userId: string;
      friendId: string;
      promptId?: string;
    }) => rescueFriend(userId, friendId, promptId),
    onSuccess: (_, { userId }) => {
      // Invalidate limbo friends and rescue count
      queryClient.invalidateQueries({ queryKey: [LIMBO_QUERY_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: [RESCUE_COUNT_KEY, userId] });
    },
  });
}

// Hook to get user's rescue count
export function useRescueCount(userId: string | undefined) {
  return useQuery({
    queryKey: [RESCUE_COUNT_KEY, userId],
    queryFn: () => getRescueCount(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export type { LimboFriend };
