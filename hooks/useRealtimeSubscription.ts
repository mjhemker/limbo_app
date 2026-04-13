import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

let globalChannelId = 0;

/**
 * Hook to subscribe to messages in a specific chat (DM or group)
 */
export function useChatMessagesRealtime(chatId?: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!chatId) return;

    const id = ++globalChannelId;
    const channel: RealtimeChannel = supabase
      .channel(`chat-messages:${chatId}:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id.eq.${chatId}`,
        },
        (payload) => {
          console.log('Chat message updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['chatMessages', chatId] });
          queryClient.invalidateQueries({ queryKey: ['chats'] });
          queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);
}

/**
 * Hook to subscribe to all chats for a user (for chat list + unread counts)
 * Listens for new messages across all the user's chats
 */
export function useChatsRealtime(userId?: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;

    const id = ++globalChannelId;
    // Subscribe to messages where the user is the sender or where they're in the chat
    // We listen broadly and let React Query dedup
    const channel: RealtimeChannel = supabase
      .channel(`user-chats:${userId}:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('Chats updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['chats', userId] });
          queryClient.invalidateQueries({ queryKey: ['unreadCount', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

/**
 * Hook to subscribe to friend request changes
 */
export function useFriendRequestsRealtime(userId?: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;

    const id = ++globalChannelId;
    const channel: RealtimeChannel = supabase
      .channel(`friendships:${userId}:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `or(requester_id.eq.${userId},addressee_id.eq.${userId})`,
        },
        (payload) => {
          console.log('Friendship updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['friendRequests', 'pending', userId] });
          queryClient.invalidateQueries({ queryKey: ['friendRequests', 'sent', userId] });
          queryClient.invalidateQueries({ queryKey: ['friends', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

/**
 * Hook to subscribe to response reactions
 */
export function useReactionsRealtime(responseId?: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!responseId) return;

    const id = ++globalChannelId;
    const channel: RealtimeChannel = supabase
      .channel(`reactions:${responseId}:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `response_id.eq.${responseId}`,
        },
        (payload) => {
          console.log('Reaction updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['reactions', responseId] });
          queryClient.invalidateQueries({ queryKey: ['response', responseId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [responseId, queryClient]);
}

/**
 * Hook to subscribe to nudges for a user
 */
export function useNudgesRealtime(userId?: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;

    const id = ++globalChannelId;
    const channel: RealtimeChannel = supabase
      .channel(`nudges:${userId}:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nudges',
          filter: `nudgee_id.eq.${userId}`,
        },
        (payload) => {
          console.log('Nudge received:', payload);
          queryClient.invalidateQueries({ queryKey: ['nudges', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

/**
 * Hook to get Realtime connection status
 */
export function useRealtimeStatus() {
  const [status, setStatus] = useState<'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR'>('CLOSED');
  useEffect(() => {
    const id = ++globalChannelId;
    const channel = supabase.channel(`status-check:${id}`);

    channel.on('system', {}, (payload) => {
      if (payload.extension === 'postgres_changes') {
        setStatus(channel.state as any);
      }
    });

    channel.subscribe((status) => {
      setStatus(status as any);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return status;
}

// Backward-compatible aliases
export const useMessagesRealtime = useChatMessagesRealtime;
export const useConversationsRealtime = useChatsRealtime;
export const useCircleMessagesRealtime = useChatMessagesRealtime;
