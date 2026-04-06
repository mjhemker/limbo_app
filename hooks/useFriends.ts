import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { friendshipsService } from '../services/supabase/friendships';
import { useFriendRequestsRealtime } from './useRealtimeSubscription';

export function useFriends(userId?: string) {
  // Subscribe to realtime friend request updates
  useFriendRequestsRealtime(userId);

  return useQuery({
    queryKey: ['friends', userId],
    queryFn: () => friendshipsService.getFriends(userId!),
    enabled: !!userId,
  });
}

export function usePendingRequests(userId?: string) {
  // Subscribe to realtime friend request updates
  useFriendRequestsRealtime(userId);

  return useQuery({
    queryKey: ['friendRequests', 'pending', userId],
    queryFn: () => friendshipsService.getPendingRequests(userId!),
    enabled: !!userId,
  });
}

export function useSentRequests(userId?: string) {
  return useQuery({
    queryKey: ['friendRequests', 'sent', userId],
    queryFn: () => friendshipsService.getSentRequests(userId!),
    enabled: !!userId,
  });
}

export function useFriendshipStatus(userId1?: string, userId2?: string) {
  return useQuery({
    queryKey: ['friendshipStatus', userId1, userId2],
    queryFn: () => friendshipsService.getFriendshipStatus(userId1!, userId2!),
    enabled: !!(userId1 && userId2),
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requesterId,
      addresseeId,
    }: {
      requesterId: string;
      addresseeId: string;
    }) => friendshipsService.sendFriendRequest(requesterId, addresseeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendshipStatus'] });
    },
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendshipId: string) =>
      friendshipsService.acceptFriendRequest(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

export function useDeclineFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendshipId: string) =>
      friendshipsService.declineFriendRequest(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendshipId: string) =>
      friendshipsService.removeFriend(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

export function useSearchUsers(query?: string, enabled = true) {
  return useQuery({
    queryKey: ['searchUsers', query],
    queryFn: () => friendshipsService.searchUsers(query!),
    enabled: enabled && !!query && query.length > 0,
  });
}

// Alias exports for compatibility
export const useFriendRequests = usePendingRequests;
