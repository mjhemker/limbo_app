import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debatesService } from '../services/supabase/debates';
import { storageService, FileUpload } from '../services/supabase/storage';

export function useDebateStats(promptId?: string) {
  return useQuery({
    queryKey: ['debateStats', promptId],
    queryFn: () => debatesService.getDebateStats(promptId!),
    enabled: !!promptId,
  });
}

export function useDebateResponses(promptId?: string) {
  return useQuery({
    queryKey: ['debateResponses', promptId],
    queryFn: () => debatesService.getDebateResponses(promptId!),
    enabled: !!promptId,
  });
}

export function useResponseReactions(responseId?: string) {
  return useQuery({
    queryKey: ['debateReactions', responseId],
    queryFn: () => debatesService.getResponseReactions(responseId!),
    enabled: !!responseId,
  });
}

export function useToggleDebateReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      responseId,
      userId,
      reactionType,
    }: {
      responseId: string;
      userId: string;
      reactionType: 'tomato' | 'boost';
    }) => debatesService.toggleDebateReaction(responseId, userId, reactionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debateReactions'] });
      queryClient.invalidateQueries({ queryKey: ['debateResponses'] });
      queryClient.invalidateQueries({ queryKey: ['debateStats'] });
    },
  });
}

export function useCreateDebatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      chatId,
      createdBy,
      sideA,
      sideB,
    }: {
      chatId: string;
      createdBy: string;
      sideA: string;
      sideB: string;
    }) => debatesService.createDebatePrompt(chatId, createdBy, sideA, sideB),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatPrompts'] });
    },
  });
}

export function useSubmitDebateResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      promptId,
      userId,
      side,
      textContent,
      mediaFile,
    }: {
      promptId: string;
      userId: string;
      side: 'side_a' | 'side_b';
      textContent: string;
      mediaFile?: FileUpload;
    }) => {
      let mediaUrl = null;
      let mediaType = null;

      if (mediaFile) {
        mediaUrl = await storageService.uploadResponseMedia(mediaFile, userId, undefined);
        mediaType = mediaFile.type?.split('/')[0] as 'image' | 'video' | undefined;
      }

      return debatesService.submitDebateResponse(
        promptId,
        userId,
        side,
        textContent,
        mediaUrl,
        mediaType
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debateResponses'] });
      queryClient.invalidateQueries({ queryKey: ['debateStats'] });
      queryClient.invalidateQueries({ queryKey: ['chatPromptResponses'] });
    },
  });
}
