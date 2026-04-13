import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatsService } from '../services/supabase/chats';
import { messagesService } from '../services/supabase/messages';
import { responsesService } from '../services/supabase/responses';
import { useChatMessagesRealtime } from './useRealtimeSubscription';

export function useMyGroupChats(userId?: string) {
  return useQuery({
    queryKey: ['chats', 'groups', userId],
    queryFn: () => chatsService.getMyGroupChats(userId!),
    enabled: !!userId,
  });
}

export function useChat(chatId?: string) {
  return useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => chatsService.getChat(chatId!),
    enabled: !!chatId,
  });
}

export function useChatMembers(chatId?: string) {
  return useQuery({
    queryKey: ['chatMembers', chatId],
    queryFn: () => chatsService.getChatMembers(chatId!),
    enabled: !!chatId,
  });
}

export function useChatMessages(chatId?: string) {
  useChatMessagesRealtime(chatId);

  return useQuery({
    queryKey: ['chatMessages', chatId],
    queryFn: () => messagesService.getChatMessages(chatId!),
    enabled: !!chatId,
  });
}

export function useChatPrompts(chatId?: string) {
  return useQuery({
    queryKey: ['chatPrompts', chatId],
    queryFn: () => chatsService.getChatPrompts(chatId!),
    enabled: !!chatId,
  });
}

export function useChatPromptResponses(promptId?: string) {
  return useQuery({
    queryKey: ['chatPromptResponses', promptId],
    queryFn: () => responsesService.getPromptResponses(promptId!),
    enabled: !!promptId,
  });
}

export function useCreateGroupChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      description,
      themeColor,
    }: {
      name: string;
      description?: string;
      themeColor?: string;
    }) => chatsService.createGroupChat(name, description, themeColor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useUpdateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      chatId,
      updates,
    }: {
      chatId: string;
      updates: any;
    }) => chatsService.updateChat(chatId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat', data.id] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      chatId,
      senderId,
      content,
      mediaUrl,
      mediaType,
      replyToId,
    }: {
      chatId: string;
      senderId: string;
      content: string;
      mediaUrl?: string | null;
      mediaType?: 'image' | 'video' | 'audio' | null;
      replyToId?: string | null;
    }) =>
      messagesService.sendMessage(
        chatId,
        senderId,
        content,
        null,
        mediaUrl || null,
        mediaType || null,
        replyToId || null
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useCreateChatPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      chatId,
      text,
      createdBy,
    }: {
      chatId: string;
      text: string;
      createdBy: string;
    }) => chatsService.createChatPrompt(chatId, text, createdBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatPrompts'] });
    },
  });
}

export function useSubmitChatResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      promptId,
      userId,
      textContent,
      mediaUrl,
      mediaType,
    }: {
      promptId: string;
      userId: string;
      textContent: string;
      mediaUrl?: string | null;
      mediaType?: 'image' | 'video' | null;
    }) =>
      responsesService.submitChatResponse(
        promptId,
        userId,
        textContent,
        mediaUrl || null,
        mediaType || null
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatPromptResponses'] });
    },
  });
}

export function useLeaveChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      chatId,
      userId,
    }: {
      chatId: string;
      userId: string;
    }) => chatsService.leaveChat(chatId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

// Backward-compatible aliases
export const useMyCircles = useMyGroupChats;
export const useCircle = useChat;
export const useCircleMembers = useChatMembers;
export const useCircleMessages = useChatMessages;
export const useCirclePrompts = useChatPrompts;
export const useCirclePromptResponses = useChatPromptResponses;
export const useCreateCircle = useCreateGroupChat;
export const useUpdateCircle = useUpdateChat;
export const useSendCircleMessage = useSendChatMessage;
export const useCreateCirclePrompt = useCreateChatPrompt;
export const useSubmitCircleResponse = useSubmitChatResponse;
export const useLeaveCircle = useLeaveChat;
