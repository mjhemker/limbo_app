import { supabase } from '../../lib/supabase';

export interface PublicFeedResponse {
  id: string;
  prompt_text: string;
  response_text: string;
  created_at: string;
  view_count: number;
  reaction_counts: Record<string, number>;
  user_reaction: string | null;
}

/**
 * Get paginated public feed
 */
export async function getPublicFeed(
  userId: string | null = null,
  limit: number = 20,
  offset: number = 0
): Promise<PublicFeedResponse[]> {
  const { data, error } = await supabase.rpc('get_public_feed', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Toggle a reaction on a response
 */
export async function toggleReaction(
  userId: string,
  responseId: string,
  reactionType: string
): Promise<void> {
  const { error } = await supabase.rpc('toggle_public_reaction', {
    p_user_id: userId,
    p_response_id: responseId,
    p_reaction_type: reactionType,
  });

  if (error) throw error;
}

/**
 * Increment view count for a response
 */
export async function incrementViewCount(responseId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_response_view', {
    p_response_id: responseId,
  });

  if (error) console.error('Failed to increment view:', error);
}

/**
 * Get public responses for a specific prompt
 */
export async function getPublicResponsesByPrompt(
  promptId: string,
  userId: string | null = null
): Promise<any[]> {
  // Try using RPC first
  try {
    const { data, error } = await supabase.rpc('get_public_responses_by_prompt', {
      p_prompt_id: promptId,
      p_user_id: userId,
    });

    if (!error && data) {
      return data;
    }
  } catch {
    // Fallback to direct query
  }

  // Fallback: direct query for public responses
  const { data, error } = await supabase
    .from('responses')
    .select(`
      *,
      user:profiles!responses_user_id_fkey(id, username, display_name, avatar_url)
    `)
    .eq('prompt_id', promptId)
    .eq('is_visible', true)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching public responses:', error);
    return [];
  }

  return data || [];
}
