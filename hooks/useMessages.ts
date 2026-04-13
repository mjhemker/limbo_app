import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesService } from '../services/supabase/messages';
import { storageService, FileUpload } from '../services/supabase/storage';
import { useChatMessagesRealtime, useChatsRealtime } from './useRealtimeSubscription';

export function useChatMessages(chatId?: string) {
  useChatMessagesRealtime(chatId);

  return useQuery({
    queryKey: ['chatMessages', chatId],
    queryFn: () => messagesService.getChatMessages(chatId!),
    enabled: !!chatId,
  });
}

export function useChats(userId?: string) {
  useChatsRealtime(userId);

  return useQuery({
    queryKey: ['chats', userId],
    queryFn: () => messagesService.getChats(userId!),
    enabled: !!userId,
  });
}

export function useUnreadCount(userId?: string) {
  useChatsRealtime(userId);

  return useQuery({
    queryKey: ['unreadCount', userId],
    queryFn: () => messagesService.getUnreadCount(userId!),
    enabled: !!userId,
  });
}

export function useSuggestedConversations(userId?: string) {
  return useQuery({
    queryKey: ['suggestedConversations', userId],
    queryFn: () => messagesService.getSuggestedConversations(userId!),
    enabled: !!userId,
  });
}

interface SendMessageParams {
  chatId: string;
  senderId: string;
  content: string;
  responseId?: string;
  mediaFile?: FileUpload;
  replyToId?: string;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chatId,
      senderId,
      content,
      responseId,
      mediaFile,
      replyToId,
    }: SendMessageParams) => {
      let mediaUrl = null;
      let mediaType = null;

      if (mediaFile) {
        mediaUrl = await storageService.uploadMessageMedia(mediaFile, senderId);
        mediaType = mediaFile.type?.split('/')[0] as
          | 'image'
          | 'video'
          | 'audio'
          | undefined;
      }

      return messagesService.sendMessage(
        chatId,
        senderId,
        content,
        responseId || null,
        mediaUrl,
        mediaType || null,
        replyToId || null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useMarkChatAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      chatId,
      userId,
    }: {
      chatId: string;
      userId: string;
    }) => messagesService.markChatAsRead(chatId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useGetOrCreateDMChat() {
  return useMutation({
    mutationFn: ({
      userA,
      userB,
    }: {
      userA: string;
      userB: string;
    }) => messagesService.getOrCreateDMChat(userA, userB),
  });
}

// Backward-compatible aliases
export const useConversation = useChatMessages;
export const useConversations = useChats;
export const useMessages = useChatMessages;
export const useMarkAsRead = useMarkChatAsRead;
export const useMarkConversationAsRead = useMarkChatAsRead;
