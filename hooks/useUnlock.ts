import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUnlockStatus,
  trackDMSent,
  trackResponseViewed,
  canUnlockMore,
  getRemainingUnlocks,
  UnlockStatus,
} from '../services/supabase/unlock';

const UNLOCK_QUERY_KEY = 'unlockStatus';

// Hook to get current unlock status
export function useUnlockStatus(userId: string | undefined) {
  return useQuery({
    queryKey: [UNLOCK_QUERY_KEY, userId],
    queryFn: () => getUnlockStatus(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });
}

// Hook to track DM sent (increases unlock limit)
export function useTrackDMSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, recipientId }: { userId: string; recipientId: string }) =>
      trackDMSent(userId, recipientId),
    onSuccess: (newStatus, { userId }) => {
      queryClient.setQueryData([UNLOCK_QUERY_KEY, userId], newStatus);
    },
  });
}

// Hook to track response viewed (decrements available unlocks)
export function useTrackResponseViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, responseId }: { userId: string; responseId: string }) =>
      trackResponseViewed(userId, responseId),
    onSuccess: (newStatus, { userId }) => {
      queryClient.setQueryData([UNLOCK_QUERY_KEY, userId], newStatus);
    },
  });
}

// Utility function to check if can unlock more
export function useCanUnlockMore(status: UnlockStatus | undefined): boolean {
  if (!status) return false;
  return canUnlockMore(status);
}

// Utility function to get remaining unlocks
export function useRemainingUnlocks(status: UnlockStatus | undefined): number {
  if (!status) return 0;
  return getRemainingUnlocks(status);
}
