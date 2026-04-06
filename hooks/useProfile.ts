import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesService, Profile } from '../services/supabase/profiles';
import { storageService, FileUpload } from '../services/supabase/storage';

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => profilesService.getProfile(userId!),
    enabled: !!userId,
  });
}

interface UpdateProfileParams {
  userId: string;
  updates: Partial<Profile>;
  avatarFile?: FileUpload;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates, avatarFile }: UpdateProfileParams) => {
      let avatarUrl = updates.avatar_url;

      // Upload avatar if provided
      if (avatarFile) {
        avatarUrl = await storageService.uploadAvatar(avatarFile, userId);
      }

      return profilesService.updateProfile(userId, {
        ...updates,
        avatar_url: avatarUrl || undefined,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
    },
  });
}

export function useSearchProfiles(query: string) {
  return useQuery({
    queryKey: ['profiles', 'search', query],
    queryFn: () => profilesService.searchProfiles(query),
    enabled: query.length >= 2,
  });
}
