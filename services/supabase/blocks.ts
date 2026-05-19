import { supabase } from '../../lib/supabase';

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export const blocksService = {
  async blockUser(blockerId: string, blockedId: string): Promise<UserBlock> {
    const { data, error } = await supabase
      .from('user_blocks')
      .insert({
        blocker_id: blockerId,
        blocked_id: blockedId,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (already blocked)
      if (error.code === '23505') {
        throw new Error('You have already blocked this user');
      }
      console.error('Block user error:', error);
      throw error;
    }

    return data;
  },

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) {
      console.error('Unblock user error:', error);
      throw error;
    }
  },

  async getBlockedUsers(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);

    if (error) {
      console.error('Get blocked users error:', error);
      throw error;
    }

    return (data || []).map((b) => b.blocked_id);
  },

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('user_blocks')
      .select('*', { count: 'exact', head: true })
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) {
      console.error('Check blocked error:', error);
      return false;
    }

    return (count || 0) > 0;
  },

  async getBlockedByMe(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('*, blocked:profiles!user_blocks_blocked_id_fkey(id, display_name, username, avatar_url)')
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get blocked by me error:', error);
      throw error;
    }

    return data || [];
  },
};
