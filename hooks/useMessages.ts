import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesService } from '../services/supabase/messages';
import { storageService, FileUpload } from '../services/supabase/storage';
import { useMessagesRealtime, useConversationsRealtime } from './useRealtimeSubscription';

export function useConversation(userId?: string, otherUserId?: string) {
  // Subscribe to realtime updates
  useMessagesRealtime(userId, otherUserId);

  return useQuery({
    queryKey: ['conversation', userId, otherUserId],
    queryFn: () => messagesService.getConversation(userId!, otherUserId!),
    enabled: !!(userId && otherUserId),
    // Removed polling - using Realtime subscriptions instead
  });
}

export function useConversations(userId?: string) {
  // Subscribe to realtime updates
  useConversationsRealtime(userId);

  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: () => messagesService.getConversations(userId!),
    enabled: !!userId,
    // Removed polling - using Realtime subscriptions instead
  });
}

export function useUnreadCount(userId?: string) {
  // Subscribe to realtime updates (will be handled by useConversationsRealtime)
  useConversationsRealtime(userId);

  return useQuery({
    queryKey: ['unreadCount', userId],
    queryFn: () => messagesService.getUnreadCount(userId!),
    enabled: !!userId,
    // Removed polling - using Realtime subscriptions instead
  });
}

export function useSuggestedConversations(userId?: string) {
  // Subscribe to realtime updates (conversations changes affect suggestions)
  useConversationsRealtime(userId);

  return useQuery({
    queryKey: ['suggestedConversations', userId],
    queryFn: () => messagesService.getSuggestedConversations(userId!),
    enabled: !!userId,
    // Reduced from 60s polling to Realtime - will refresh when conversations change
  });
}

interface SendMessageParams {
  senderId: string;
  recipientId: string;
  content: string;
  responseId?: string;
  mediaFile?: FileUpload;
  replyToId?: string;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      senderId,
      recipientId,
      content,
      responseId,
      mediaFile,
      replyToId,
    }: SendMessageParams) => {
      let mediaUrl = null;
      let mediaType = null;

      // Upload media if provided
      if (mediaFile) {
        mediaUrl = await storageService.uploadMessageMedia(mediaFile, senderId);
        mediaType = mediaFile.type?.split('/')[0] as
          | 'image'
          | 'video'
          | 'audio'
          | undefined;
      }

      return messagesService.sendMessage(
        senderId,
        recipientId,
        content,
        responseId || null,
        mediaUrl,
        mediaType || null,
        replyToId || null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkConversationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      otherUserId,
    }: {
      userId: string;
      otherUserId: string;
    }) => messagesService.markConversationAsRead(userId, otherUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });
}

// Alias exports for compatibility
export const useMessages = useConversation;
export const useMarkAsRead = useMarkConversationAsRead;
