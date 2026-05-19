import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blocksService } from '../services/supabase/blocks';
import { reportsService } from '../services/supabase/reports';

export function useBlockedUserIds(userId?: string) {
  return useQuery({
    queryKey: ['blocked-users', userId],
    queryFn: () => blocksService.getBlockedUsers(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useBlockedUsers(userId?: string) {
  return useQuery({
    queryKey: ['blocked-users-details', userId],
    queryFn: () => blocksService.getBlockedByMe(userId!),
    enabled: !!userId,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blockerId,
      blockedId,
      reason,
    }: {
      blockerId: string;
      blockedId: string;
      reason?: string;
    }) => {
      // Block the user
      const block = await blocksService.blockUser(blockerId, blockedId);

      // Auto-report for developer notification (Apple requirement)
      try {
        await reportsService.reportContent(
          blockerId,
          blockedId,
          'profile',
          blockedId,
          'other',
          reason || 'User was blocked - auto-generated report for moderation review'
        );
      } catch (e) {
        // Report might fail if already reported, that's okay
        console.log('Auto-report on block:', e);
      }

      return block;
    },
    onSuccess: () => {
      // Invalidate all queries that might show blocked user content
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['responses'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ blockerId, blockedId }: { blockerId: string; blockedId: string }) =>
      blocksService.unblockUser(blockerId, blockedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    },
  });
}

export function useIsBlocked(blockerId?: string, blockedId?: string) {
  return useQuery({
    queryKey: ['is-blocked', blockerId, blockedId],
    queryFn: () => blocksService.isBlocked(blockerId!, blockedId!),
    enabled: !!(blockerId && blockedId),
  });
}
