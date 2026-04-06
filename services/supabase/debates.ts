import { supabase } from '../../lib/supabase';

export interface DebateReaction {
  id: string;
  circle_response_id: string;
  user_id: string;
  reaction_type: 'tomato' | 'boost';
  created_at: string;
}

export interface DebateStats {
  prompt: {
    id: string;
    side_a: string;
    side_b: string;
  };
  side_a: {
    stats: {
      response_count: number;
      boost_count: number;
      tomato_count: number;
    };
    leaderboard: Array<{
      response_id: string;
      user: {
        id: string;
        display_name: string;
        avatar_url?: string;
      };
      text_content: string;
      boost_count: number;
      tomato_count: number;
    }>;
  };
  side_b: {
    stats: {
      response_count: number;
      boost_count: number;
      tomato_count: number;
    };
    leaderboard: Array<{
      response_id: string;
      user: {
        id: string;
        display_name: string;
        avatar_url?: string;
      };
      text_content: string;
      boost_count: number;
      tomato_count: number;
    }>;
  };
  winner: 'side_a' | 'side_b' | 'tie';
}

export const debatesService = {
  /**
   * Toggle a debate reaction (boost 🚀 or tomato 🍅)
   * If the same reaction exists, it will be removed
   * If a different reaction exists, it will be updated
   */
  async toggleDebateReaction(
    responseId: string,
    userId: string,
    reactionType: 'tomato' | 'boost'
  ): Promise<{ action: string; reaction_type: string }> {
    const { data, error } = await supabase.rpc('toggle_debate_reaction', {
      p_circle_response_id: responseId,
      p_user_id: userId,
      p_reaction_type: reactionType,
    });

    if (error) {
      console.error('Toggle debate reaction error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get debate statistics and leaderboards for a prompt
   */
  async getDebateStats(promptId: string): Promise<DebateStats> {
    const { data, error } = await supabase.rpc('get_debate_stats', {
      p_prompt_id: promptId,
    });

    if (error) {
      console.error('Get debate stats error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get reactions for a specific response
   */
  async getResponseReactions(responseId: string): Promise<DebateReaction[]> {
    const { data, error } = await supabase
      .from('debate_reactions')
      .select('*')
      .eq('circle_response_id', responseId);

    if (error) {
      console.error('Get response reactions error:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get all responses for a debate prompt grouped by side
   */
  async getDebateResponses(promptId: string): Promise<{
    sideA: any[];
    sideB: any[];
  }> {
    const { data, error } = await supabase
      .from('circle_responses')
      .select(`
        *,
        user:profiles(*),
        reactions:debate_reactions(*)
      `)
      .eq('circle_prompt_id', promptId)
      .not('debate_side', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get debate responses error:', error);
      throw error;
    }

    const sideA = data?.filter((r) => r.debate_side === 'side_a') || [];
    const sideB = data?.filter((r) => r.debate_side === 'side_b') || [];

    return { sideA, sideB };
  },

  /**
   * Create a new debate prompt
   */
  async createDebatePrompt(
    circleId: string,
    createdBy: string,
    sideA: string,
    sideB: string
  ): Promise<any> {
    const { data, error } = await supabase
      .from('circle_prompts')
      .insert({
        circle_id: circleId,
        created_by: createdBy,
        text: `Debate: ${sideA} vs ${sideB}`,
        is_debate: true,
        debate_side_a: sideA,
        debate_side_b: sideB,
      })
      .select()
      .single();

    if (error) {
      console.error('Create debate prompt error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Submit a response to a debate (must choose a side)
   */
  async submitDebateResponse(
    circleId: string,
    promptId: string,
    userId: string,
    side: 'side_a' | 'side_b',
    textContent: string,
    mediaUrl?: string | null,
    mediaType?: 'image' | 'video' | null
  ): Promise<any> {
    const { data, error } = await supabase
      .from('circle_responses')
      .insert({
        circle_id: circleId,
        circle_prompt_id: promptId,
        user_id: userId,
        debate_side: side,
        text_content: textContent,
        media_url: mediaUrl,
        media_type: mediaType,
      })
      .select()
      .single();

    if (error) {
      console.error('Submit debate response error:', error);
      throw error;
    }

    return data;
  },
};
