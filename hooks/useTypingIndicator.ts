import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook to broadcast typing status to other user
 */
export function useBroadcastTyping(userId?: string, otherUserId?: string) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId || !otherUserId) return;

    // Create a channel for this conversation
    const channelName = `typing:${[userId, otherUserId].sort().join(':')}`;
    channelRef.current = supabase.channel(channelName);

    channelRef.current.subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [userId, otherUserId]);

  const startTyping = () => {
    if (!channelRef.current || !userId) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Broadcast typing started
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, isTyping: true },
    });

    // Auto-stop after 3 seconds of no activity
    timeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (!channelRef.current || !userId) return;

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Broadcast typing stopped
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, isTyping: false },
    });
  };

  return { startTyping, stopTyping };
}

/**
 * Hook to listen for other user's typing status
 */
export function useListenTyping(userId?: string, otherUserId?: string) {
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId || !otherUserId) return;

    const channelName = `typing:${[userId, otherUserId].sort().join(':')}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        // Only listen to the other user's typing status
        if (payload.payload.userId === otherUserId) {
          setIsTyping(payload.payload.isTyping);

          // Auto-clear typing status after 4 seconds
          if (payload.payload.isTyping) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
              setIsTyping(false);
            }, 4000);
          }
        }
      })
      .subscribe();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [userId, otherUserId]);

  return isTyping;
}
