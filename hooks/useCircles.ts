import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { circlesService } from '../services/supabase/circles';
import { useCircleMessagesRealtime } from './useRealtimeSubscription';

export function useMyCircles(userId?: string) {
  return useQuery({
    queryKey: ['circles', 'my', userId],
    queryFn: () => circlesService.getMyCircles(userId!),
    enabled: !!userId,
  });
}

export function useCircle(circleId?: string) {
  return useQuery({
    queryKey: ['circle', circleId],
    queryFn: () => circlesService.getCircle(circleId!),
    enabled: !!circleId,
  });
}

export function useCircleMembers(circleId?: string) {
  return useQuery({
    queryKey: ['circleMembers', circleId],
    queryFn: () => circlesService.getCircleMembers(circleId!),
    enabled: !!circleId,
  });
}

export function useCircleMessages(circleId?: string) {
  // Subscribe to realtime updates
  useCircleMessagesRealtime(circleId);

  return useQuery({
    queryKey: ['circleMessages', circleId],
    queryFn: () => circlesService.getCircleMessages(circleId!),
    enabled: !!circleId,
    // Removed polling - using Realtime subscriptions instead
  });
}

export function useCirclePrompts(circleId?: string) {
  return useQuery({
    queryKey: ['circlePrompts', circleId],
    queryFn: () => circlesService.getCirclePrompts(circleId!),
    enabled: !!circleId,
  });
}

export function useCirclePromptResponses(circlePromptId?: string) {
  return useQuery({
    queryKey: ['circlePromptResponses', circlePromptId],
    queryFn: () => circlesService.getCirclePromptResponses(circlePromptId!),
    enabled: !!circlePromptId,
  });
}

export function useCreateCircle() {
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
    }) => circlesService.createCircle(name, description, themeColor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circles'] });
    },
  });
}

export function useUpdateCircle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      circleId,
      updates,
    }: {
      circleId: string;
      updates: any;
    }) => circlesService.updateCircle(circleId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['circle', data.id] });
      queryClient.invalidateQueries({ queryKey: ['circles'] });
    },
  });
}

export function useSendCircleMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      circleId,
      senderId,
      content,
      mediaUrl,
      mediaType,
      replyToId,
    }: {
      circleId: string;
      senderId: string;
      content: string;
      mediaUrl?: string | null;
      mediaType?: 'image' | 'video' | 'audio' | null;
      replyToId?: string | null;
    }) =>
      circlesService.sendCircleMessage(
        circleId,
        senderId,
        content,
        mediaUrl,
        mediaType,
        replyToId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circleMessages'] });
    },
  });
}

export function useCreateCirclePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      circleId,
      text,
      createdBy,
    }: {
      circleId: string;
      text: string;
      createdBy: string;
    }) => circlesService.createCirclePrompt(circleId, text, createdBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circlePrompts'] });
    },
  });
}

export function useSubmitCircleResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      circleId,
      circlePromptId,
      userId,
      textContent,
      mediaUrl,
      mediaType,
    }: {
      circleId: string;
      circlePromptId: string;
      userId: string;
      textContent: string;
      mediaUrl?: string | null;
      mediaType?: 'image' | 'video' | null;
    }) =>
      circlesService.submitCircleResponse(
        circleId,
        circlePromptId,
        userId,
        textContent,
        mediaUrl,
        mediaType
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circlePromptResponses'] });
    },
  });
}

export function useLeaveCircle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      circleId,
      userId,
    }: {
      circleId: string;
      userId: string;
    }) => circlesService.leaveCircle(circleId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circles'] });
    },
  });
}
