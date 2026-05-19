import { supabase } from '../../lib/supabase';

export interface ScrapbookPage {
  page_id: string;
  slug: string;
  title: string;
  tagline: string;
  icon: string;
  color: string;
  total_prompts: number;
  answered_prompts: number;
}

export interface ScrapbookStats {
  total_prompts: number;
  answered_prompts: number;
  public_count: number;
  current_streak: number;
}

/**
 * Get user's scrapbook overview (all pages with progress)
 */
export async function getScrapbookOverview(userId: string): Promise<ScrapbookPage[]> {
  const { data, error } = await supabase.rpc('get_scrapbook_overview', {
    p_user_id: userId,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get scrapbook stats (total prompts, answered, public)
 */
export async function getScrapbookStats(userId: string): Promise<ScrapbookStats> {
  const { data, error } = await supabase
    .rpc('get_scrapbook_stats', { p_user_id: userId })
    .single();

  if (error) {
    // If RPC fails or returns no data, fall back to counting responses directly
    console.log('Scrapbook stats RPC error, falling back to response count:', error.message);

    // Count all responses and visible responses in parallel
    const [allResponses, visibleResponses] = await Promise.all([
      supabase
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .or('is_visible.eq.true,is_public.eq.true'),
    ]);

    return {
      total_prompts: 0,
      answered_prompts: allResponses.count || 0,
      public_count: visibleResponses.count || 0,
      current_streak: 0, // Can't calculate streak without RPC
    };
  }

  return data || {
    total_prompts: 0,
    answered_prompts: 0,
    public_count: 0,
    current_streak: 0,
  };
}

/**
 * Get a specific page with prompts and user's answers
 */
export async function getScrapbookPage(
  userId: string,
  pageSlug: string,
  viewerId: string | null = null
): Promise<any[]> {
  const { data, error } = await supabase.rpc('get_scrapbook_page', {
    p_user_id: userId,
    p_page_slug: pageSlug,
    p_viewer_id: viewerId,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Submit or update a scrapbook entry
 */
export async function submitScrapbookEntry({
  userId,
  promptId,
  answerText = null,
  selectedOption = null,
  mediaUrl = null,
  mediaType = null,
  visibility = 'friends',
}: {
  userId: string;
  promptId: string;
  answerText?: string | null;
  selectedOption?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  visibility?: string;
}): Promise<any> {
  const { data, error } = await supabase.rpc('submit_scrapbook_entry', {
    p_user_id: userId,
    p_prompt_id: promptId,
    p_answer_text: answerText,
    p_selected_option: selectedOption,
    p_media_url: mediaUrl,
    p_media_type: mediaType,
    p_visibility: visibility,
  });

  if (error) throw error;
  return data;
}

/**
 * Get an unanswered prompt for a specific page
 */
export async function getNextPrompt(userId: string, pageSlug: string): Promise<any | null> {
  const { data, error } = await supabase.rpc('get_next_scrapbook_prompt', {
    p_user_id: userId,
    p_page_slug: pageSlug,
  });

  if (error) {
    console.error('Error getting next prompt:', error);
    return null;
  }
  return data;
}
