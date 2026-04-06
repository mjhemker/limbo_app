import { supabase } from '../../lib/supabase';

export interface LimboFriend {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  last_activity: string;
  days_inactive: number;
}

// Get friends who haven't posted in 30+ days
export async function getLimboFriends(userId: string): Promise<LimboFriend[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all accepted friendships for the user
  const { data: friendships, error: friendshipsError } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (friendshipsError || !friendships) {
    console.error('Error fetching friendships:', friendshipsError);
    return [];
  }

  // Get friend IDs
  const friendIds = friendships.map(f =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );

  if (friendIds.length === 0) return [];

  // Get friends' last activity (last response date)
  const { data: friends, error: friendsError } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      avatar_url,
      responses (
        created_at
      )
    `)
    .in('id', friendIds);

  if (friendsError || !friends) {
    console.error('Error fetching friends:', friendsError);
    return [];
  }

  // Filter to only friends inactive for 30+ days
  const limboFriends: LimboFriend[] = [];

  for (const friend of friends) {
    // Get most recent response date
    const responses = friend.responses as any[];
    let lastActivity: Date | null = null;

    if (responses && responses.length > 0) {
      const sortedResponses = responses.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      lastActivity = new Date(sortedResponses[0].created_at);
    }

    // Check if inactive for 30+ days
    const daysInactive = lastActivity
      ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : 999; // If never posted, consider very inactive

    if (daysInactive >= 30) {
      limboFriends.push({
        id: friend.id,
        username: friend.username,
        display_name: friend.display_name,
        avatar_url: friend.avatar_url,
        last_activity: lastActivity?.toISOString() || 'Never',
        days_inactive: daysInactive,
      });
    }
  }

  // Sort by days inactive (most inactive first)
  return limboFriends.sort((a, b) => b.days_inactive - a.days_inactive);
}

// Rescue a friend from limbo (sends nudge + tracks rescue count)
export async function rescueFriend(userId: string, friendId: string, promptId?: string): Promise<void> {
  // Track the rescue attempt
  const { error } = await supabase
    .from('rescues')
    .insert({
      rescuer_id: userId,
      rescued_id: friendId,
      prompt_id: promptId,
    });

  if (error) {
    console.error('Error recording rescue:', error);
    throw error;
  }
}

// Get user's rescue count
export async function getRescueCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('rescues')
    .select('*', { count: 'exact', head: true })
    .eq('rescuer_id', userId);

  if (error) {
    console.error('Error getting rescue count:', error);
    return 0;
  }

  return count || 0;
}
