import { supabase } from '../../lib/supabase';

export interface Profile {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  phone_number?: string;
  sms_opt_in: boolean;
  expo_push_token?: string;
  created_at: string;
  updated_at: string;
}

export const profilesService = {
  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Get profile error:', error);
      throw error;
    }

    return data;
  },

  async getProfileByUsername(username: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error('Get profile by username error:', error);
      throw error;
    }

    return data;
  },

  async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Update profile error:', error);
      throw error;
    }

    return data;
  },

  async searchProfiles(query: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or(
        `username.ilike.%${query}%,display_name.ilike.%${query}%,email.ilike.%${query}%`
      )
      .limit(20);

    if (error) {
      console.error('Search profiles error:', error);
      throw error;
    }

    return data || [];
  },
};
