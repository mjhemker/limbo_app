import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reactionsService } from '../services/supabase/reactions';

// --- Response reactions ---

export function useReactions(responseId?: string) {
  return useQuery({
    queryKey: ['reactions', responseId],
    queryFn: () => reactionsService.getResponseReactions(responseId!),
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
      chatId,
    }: {
      responseId: string;
      userId: string;
      emoji: string;
      postOwnerId?: string;
      chatId?: string;
    }) => reactionsService.addResponseReaction(responseId, userId, emoji, postOwnerId, chatId),
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
    }) => reactionsService.removeResponseReaction(responseId, userId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
  });
}

// --- Message reactions (absorbed from useMessageReactions) ---

export function useMessageReactions(messageIds: string[]) {
  return useQuery({
    queryKey: ['messageReactions', messageIds],
    queryFn: () => reactionsService.getMessageReactions(messageIds),
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
    }) => reactionsService.addMessageReaction(messageId, userId, emoji),
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
    }) => reactionsService.removeMessageReaction(messageId, userId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageReactions'] });
    },
  });
}
