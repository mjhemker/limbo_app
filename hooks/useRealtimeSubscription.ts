import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook to subscribe to Supabase Realtime changes for messages
 * Automatically invalidates React Query cache when new messages arrive
 */
export function useMessagesRealtime(userId?: string, otherUserId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !otherUserId) return;

    const channel: RealtimeChannel = supabase
      .channel(`messages:${userId}:${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId}))`,
        },
        (payload) => {
          console.log('New message received:', payload);
          // Invalidate conversation query to refetch
          queryClient.invalidateQueries({ queryKey: ['conversation', userId, otherUserId] });
          queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
          queryClient.invalidateQueries({ queryKey: ['unreadCount', userId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId}))`,
        },
        (payload) => {
          console.log('Message updated:', payload);
          // Invalidate queries when message is marked as read
          queryClient.invalidateQueries({ queryKey: ['conversation', userId, otherUserId] });
          queryClient.invalidateQueries({ queryKey: ['unreadCount', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, otherUserId, queryClient]);
}

/**
 * Hook to subscribe to all messages for a user (for conversations list)
 */
export function useConversationsRealtime(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel: RealtimeChannel = supabase
      .channel(`user-messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${userId},recipient_id.eq.${userId})`,
        },
        (payload) => {
          console.log('Conversations updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
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

    const channel: RealtimeChannel = supabase
      .channel(`friendships:${userId}`)
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
 * Hook to subscribe to circle message changes
 */
export function useCircleMessagesRealtime(circleId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!circleId) return;

    const channel: RealtimeChannel = supabase
      .channel(`circle-messages:${circleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'circle_messages',
          filter: `circle_id.eq.${circleId}`,
        },
        (payload) => {
          console.log('Circle message updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['circleMessages', circleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId, queryClient]);
}

/**
 * Hook to subscribe to response reactions
 */
export function useReactionsRealtime(responseId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!responseId) return;

    const channel: RealtimeChannel = supabase
      .channel(`reactions:${responseId}`)
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

    const channel: RealtimeChannel = supabase
      .channel(`nudges:${userId}`)
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
          // Could show a toast notification here
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
    const channel = supabase.channel('status-check');

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
