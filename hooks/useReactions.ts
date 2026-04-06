import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reactionsService } from '../services/supabase/reactions';

export function useReactions(responseId?: string) {
  return useQuery({
    queryKey: ['reactions', responseId],
    queryFn: () => reactionsService.getReactions(responseId!),
    enabled: !!responseId,
  });
}

export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      responseId,
      userId,
      emoji,
      postOwnerId,
    }: {
      responseId: string;
      userId: string;
      emoji: string;
      postOwnerId?: string;
    }) => reactionsService.addReaction(responseId, userId, emoji, postOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
  });
}

export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      responseId,
      userId,
      emoji,
    }: {
      responseId: string;
      userId: string;
      emoji: string;
    }) => reactionsService.removeReaction(responseId, userId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
  });
}
