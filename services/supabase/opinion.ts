import { supabase } from '../../lib/supabase';

export interface OpinionTopic {
  id: string;
  topic_text: string;
  left_label: string;
  right_label: string;
  total_votes: number;
  has_voted: boolean;
  user_vote: number | null;
  topic_date: string;
  category?: string;
}

export interface OpinionDistribution {
  bucket: number;
  count: number;
  percentage: number;
}

/**
 * Get today's opinion topic with user's vote status
 */
export async function getTodaysOpinionTopic(userId: string | null = null): Promise<OpinionTopic | null> {
  const { data, error } = await supabase
    .rpc('get_todays_opinion_topic', { p_user_id: userId })
    .single();

  if (error) {
    // No topic for today is not an error
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Get tomorrow's topic teaser
 */
export async function getTomorrowsTeaser(): Promise<{ teaser_text: string } | null> {
  const { data, error } = await supabase
    .rpc('get_tomorrows_topic_teaser')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Submit a vote for a topic
 */
export async function submitOpinionVote(
  userId: string,
  topicId: string,
  voteValue: number
): Promise<void> {
  const { error } = await supabase
    .rpc('submit_opinion_vote', {
      p_user_id: userId,
      p_topic_id: topicId,
      p_vote_value: voteValue,
    });

  if (error) throw error;
}

/**
 * Get vote distribution for a topic
 */
export async function getOpinionDistribution(
  topicId: string,
  userId: string | null = null,
  bucketCount: number = 20
): Promise<OpinionDistribution[]> {
  const { data, error } = await supabase
    .rpc('get_opinion_distribution', {
      p_topic_id: topicId,
      p_user_id: userId,
      p_bucket_count: bucketCount,
    });

  if (error) throw error;
  return data || [];
}

export type OpinionCategory = 'featured' | 'trending' | 'new';
export type OpinionSort = 'hot' | 'new' | 'top';
export type OpinionPeriod = 'day' | 'week' | 'month' | 'all';

/**
 * Get opinion topics by category and sort
 */
export async function getOpinionTopics(
  userId: string | null,
  category: OpinionCategory = 'featured',
  sort: OpinionSort = 'hot',
  period: OpinionPeriod = 'week',
  limit: number = 20,
  offset: number = 0
): Promise<OpinionTopic[]> {
  // Try using RPC first, fallback to direct query
  try {
    const { data, error } = await supabase
      .rpc('get_opinion_topics', {
        p_user_id: userId,
        p_category: category,
        p_sort: sort,
        p_period: period,
        p_limit: limit,
        p_offset: offset,
      });

    if (!error && data) {
      return data;
    }
  } catch {
    // Fallback to direct query
  }

  // Fallback: direct query for all topics (no date filter - show all)
  let query = supabase
    .from('opinion_topics')
    .select('*')
    .order('topic_date', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply sort
  if (sort === 'top') {
    query = query.order('total_votes', { ascending: false });
  } else if (sort === 'new') {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching opinion topics:', error);
    return [];
  }

  // Add user vote info if userId provided
  if (userId && data) {
    const topicIds = data.map((t: any) => t.id);
    const { data: votes } = await supabase
      .from('opinion_votes')
      .select('topic_id, vote_value')
      .eq('user_id', userId)
      .in('topic_id', topicIds);

    const voteMap = new Map(votes?.map((v: any) => [v.topic_id, v.vote_value]) || []);

    return data.map((topic: any) => ({
      ...topic,
      has_voted: voteMap.has(topic.id),
      user_vote: voteMap.get(topic.id) ?? null,
    }));
  }

  return data || [];
}
