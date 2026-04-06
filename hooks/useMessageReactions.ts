import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageReactionsService } from '../services/supabase/messageReactions';

export function useMessageReactions(messageIds: string[]) {
  return useQuery({
    queryKey: ['messageReactions', messageIds],
    queryFn: () => messageReactionsService.getMessageReactions(messageIds),
    enabled: messageIds.length > 0,
  });
}

export function useAddMessageReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      userId,
      emoji,
    }: {
      messageId: string;
      userId: string;
      emoji: string;
    }) => messageReactionsService.addMessageReaction(messageId, userId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageReactions'] });
    },
  });
}

export function useRemoveMessageReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      userId,
      emoji,
    }: {
      messageId: string;
      userId: string;
      emoji: string;
    }) => messageReactionsService.removeMessageReaction(messageId, userId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageReactions'] });
    },
  });
}
