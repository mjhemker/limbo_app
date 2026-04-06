import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendNudge, SendNudgeParams } from '../services/api/nudges';

export function useSendNudge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SendNudgeParams) => sendNudge(params),
    onSuccess: () => {
      // Optionally invalidate any nudge-related queries
      queryClient.invalidateQueries({ queryKey: ['nudges'] });
    },
  });
}
