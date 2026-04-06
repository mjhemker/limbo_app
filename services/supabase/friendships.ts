import { supabase } from '../../lib/supabase';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
}

export const friendshipsService = {
  async sendFriendRequest(
    requesterId: string,
    addresseeId: string
  ): Promise<Friendship> {
    const { data, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: requesterId,
        addressee_id: addresseeId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Send friend request error:', error);
      throw error;
    }

    return data;
  },

  async acceptFriendRequest(friendshipId: string): Promise<Friendship> {
    const { data, error } = await supabase
      .from('friendships')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', friendshipId)
      .select()
      .single();

    if (error) {
      console.error('Accept friend request error:', error);
      throw error;
    }

    return data;
  },

  async declineFriendRequest(friendshipId: string): Promise<Friendship> {
    const { data, error } = await supabase
      .from('friendships')
      .update({
        status: 'declined',
        updated_at: new Date().toISOString(),
      })
      .eq('id', friendshipId)
      .select()
      .single();

    if (error) {
      console.error('Decline friend request error:', error);
      throw error;
    }

    return data;
  },

  async removeFriend(friendshipId: string): Promise<void> {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      console.error('Remove friend error:', error);
      throw error;
    }
  },

  async getFriends(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('friendships')
      .select(
        '*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)'
      )
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (error) {
      console.error('Get friends error:', error);
      throw error;
    }

    // Transform to return friend profile
    return (
      data?.map((f: any) => ({
        friendshipId: f.id,
        friend: f.requester_id === userId ? f.addressee : f.requester,
      })) || []
    );
  },

  async getPendingRequests(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('friendships')
      .select('*, requester:profiles!friendships_requester_id_fkey(*)')
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get pending requests error:', error);
      throw error;
    }

    return data || [];
  },

  async getSentRequests(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('friendships')
      .select('*, addressee:profiles!friendships_addressee_id_fkey(*)')
      .eq('requester_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get sent requests error:', error);
      throw error;
    }

    return data || [];
  },

  async getFriendshipStatus(
    userId1: string,
    userId2: string
  ): Promise<Friendship | null> {
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(
        `and(requester_id.eq.${userId1},addressee_id.eq.${userId2}),and(requester_id.eq.${userId2},addressee_id.eq.${userId1})`
      )
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Get friendship status error:', error);
      throw error;
    }

    return data || null;
  },

  async searchUsers(query: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20);

    if (error) {
      console.error('Search users error:', error);
      throw error;
    }

    return data || [];
  },
};
