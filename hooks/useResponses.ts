import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { responsesService } from '../services/supabase/responses';
import { storageService, FileUpload } from '../services/supabase/storage';
import * as Crypto from 'expo-crypto';

export function useUserResponse(userId?: string, promptId?: string) {
  return useQuery({
    queryKey: ['response', userId, promptId],
    queryFn: () => responsesService.getUserResponse(userId!, promptId!),
    enabled: !!(userId && promptId),
  });
}

export function useUserResponses(userId?: string, pageSize: number = 20) {
  return useInfiniteQuery({
    queryKey: ['responses', 'user', userId],
    queryFn: ({ pageParam = 0 }) =>
      responsesService.getUserResponses(userId!, pageParam, pageSize),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === pageSize ? allPages.length * pageSize : undefined,
    enabled: !!userId,
    initialPageParam: 0,
  });
}

export function useFriendsResponses(promptId?: string, userId?: string) {
  return useQuery({
    queryKey: ['responses', 'friends', promptId],
    queryFn: () => responsesService.getFriendsResponses(promptId!, userId!),
    enabled: !!(promptId && userId),
  });
}

interface CreateResponseParams {
  userId: string;
  promptId: string;
  textContent?: string;
  mediaFile?: FileUpload;
  audioFile?: FileUpload;
  isVisible?: boolean;
}

export function useCreateResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      promptId,
      textContent,
      mediaFile,
      audioFile,
      isVisible,
    }: CreateResponseParams) => {
      try {
        const tempId = Crypto.randomUUID();

        let mediaUrl = null;
        let mediaType = null;
        let audioUrl = null;

        if (mediaFile) {
          mediaUrl = await storageService.uploadResponseMedia(
            mediaFile,
            userId,
            tempId
          );
          mediaType = mediaFile.type?.split('/')[0] as
            | 'image'
            | 'video'
            | undefined;
        }

        if (audioFile) {
          audioUrl = await storageService.uploadResponseMedia(
            audioFile,
            userId,
            tempId
          );
        }

        const response = await responsesService.createResponse({
          user_id: userId,
          prompt_id: promptId,
          text_content: textContent,
          media_url: mediaUrl || undefined,
          media_type: mediaType,
          audio_url: audioUrl || undefined,
          is_visible: isVisible,
        });

        return response;
      } catch (error) {
        console.error('Error in createResponse:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] });
      queryClient.invalidateQueries({ queryKey: ['response'] });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
    },
  });
}

interface UpdateResponseParams {
  responseId: string;
  userId: string;
  textContent?: string;
  mediaFile?: FileUpload;
  audioFile?: FileUpload;
  isVisible?: boolean;
  existingMediaUrl?: string;
  existingAudioUrl?: string;
}

export function useUpdateResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      responseId,
      userId,
      textContent,
      mediaFile,
      audioFile,
      isVisible,
      existingMediaUrl,
      existingAudioUrl,
    }: UpdateResponseParams) => {
      let mediaUrl = existingMediaUrl;
      let mediaType = null;
      let audioUrl = existingAudioUrl;

      if (mediaFile) {
        mediaUrl = await storageService.uploadResponseMedia(
          mediaFile,
          userId,
          responseId
        );
        mediaType = mediaFile.type?.split('/')[0] as
          | 'image'
          | 'video'
          | undefined;
      }

      if (audioFile) {
        audioUrl = await storageService.uploadResponseMedia(
          audioFile,
          userId,
          responseId
        );
      }

      return responsesService.updateResponse(responseId, {
        text_content: textContent,
        media_url: mediaUrl,
        media_type: mediaType || (mediaUrl ? undefined : undefined),
        audio_url: audioUrl,
        is_visible: isVisible,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] });
      queryClient.invalidateQueries({ queryKey: ['response'] });
    },
  });
}

export function useToggleVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      responseId,
      isVisible,
    }: {
      responseId: string;
      isVisible: boolean;
    }) => responsesService.toggleVisibility(responseId, isVisible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] });
    },
  });
}

export function useDeleteResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (responseId: string) =>
      responsesService.deleteResponse(responseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] });
    },
  });
}

export function usePinnedResponses(userId?: string) {
  return useQuery({
    queryKey: ['responses', 'pinned', userId],
    queryFn: () => responsesService.getPinnedResponses(userId!),
    enabled: !!userId,
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      responseId,
      isPinned,
      userId,
    }: {
      responseId: string;
      isPinned: boolean;
      userId: string;
    }) => responsesService.togglePin(responseId, isPinned, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] });
    },
  });
}

export function useAnsweredPromptIds(userId?: string) {
  return useQuery({
    queryKey: ['responses', 'answered-prompts', userId],
    queryFn: () => responsesService.getAnsweredPromptIds(userId!),
    enabled: !!userId,
  });
}
