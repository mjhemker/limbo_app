import { supabase } from '../../lib/supabase';

export interface Response {
  id: string;
  user_id: string;
  prompt_id: string;
  text_content?: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  audio_url?: string;
  is_visible: boolean;
  is_pinned: boolean;
  debate_side?: 'side_a' | 'side_b';
  created_at: string;
  updated_at: string;
}

export interface CreateResponseInput {
  user_id: string;
  prompt_id: string;
  text_content?: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  audio_url?: string;
  is_visible?: boolean;
  is_pinned?: boolean;
  debate_side?: 'side_a' | 'side_b';
}

export const responsesService = {
  async createResponse(response: CreateResponseInput): Promise<Response> {
    const { data, error } = await supabase
      .from('responses')
      .insert({
        user_id: response.user_id,
        prompt_id: response.prompt_id,
        text_content: response.text_content || null,
        media_url: response.media_url || null,
        media_type: response.media_type || null,
        audio_url: response.audio_url || null,
        is_visible:
          response.is_visible !== undefined ? response.is_visible : true,
        is_pinned: response.is_pinned || false,
        debate_side: response.debate_side || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Create response error:', error);
      throw error;
    }

    return data;
  },

  async getUserResponse(
    userId: string,
    promptId: string
  ): Promise<Response | null> {
    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .eq('user_id', userId)
      .eq('prompt_id', promptId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Get user response error:', error);
      throw error;
    }

    return data || null;
  },

  async getUserResponses(
    userId: string,
    offset: number = 0,
    limit: number = 20
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('responses')
      .select('*, prompt:prompts!responses_prompt_id_fkey(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get user responses error:', error);
      throw error;
    }

    return data || [];
  },

  async getPinnedResponses(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('responses')
      .select('*, prompt:prompts!responses_prompt_id_fkey(*)')
      .eq('user_id', userId)
      .eq('is_pinned', true)
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) {
      console.error('Get pinned responses error:', error);
      throw error;
    }

    return data || [];
  },

  async getFriendsResponses(promptId: string, userId: string): Promise<any[]> {
    const { data: friendships, error: friendsError } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (friendsError) {
      console.error('Get friends error:', friendsError);
      throw friendsError;
    }

    const friendIds = friendships.map((f) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    );

    if (friendIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('responses')
      .select('*, user:profiles!responses_user_id_fkey(*), prompt:prompts!responses_prompt_id_fkey(*)')
      .eq('prompt_id', promptId)
      .eq('is_visible', true)
      .in('user_id', friendIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get friends responses error:', error);
      throw error;
    }

    return data || [];
  },

  async updateResponse(
    responseId: string,
    updates: Partial<Response>
  ): Promise<Response> {
    const { data, error } = await supabase
      .from('responses')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', responseId)
      .select()
      .single();

    if (error) {
      console.error('Update response error:', error);
      throw error;
    }

    return data;
  },

  async deleteResponse(responseId: string): Promise<void> {
    const { error } = await supabase
      .from('responses')
      .delete()
      .eq('id', responseId);

    if (error) {
      console.error('Delete response error:', error);
      throw error;
    }
  },

  async toggleVisibility(
    responseId: string,
    isVisible: boolean
  ): Promise<Response> {
    return this.updateResponse(responseId, { is_visible: isVisible });
  },

  async togglePin(
    responseId: string,
    isPinned: boolean,
    userId: string
  ): Promise<Response> {
    if (isPinned) {
      const { count } = await supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_pinned', true);

      if (count && count >= 6) {
        throw new Error('You can only pin up to 6 responses');
      }
    }

    return this.updateResponse(responseId, { is_pinned: isPinned });
  },

  async getAnsweredPromptIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('responses')
      .select('prompt_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Get answered prompt IDs error:', error);
      throw error;
    }

    return (data || []).map((r) => r.prompt_id).filter(Boolean) as string[];
  },

  async getRespondedPromptIds(userId: string, promptIds: string[]): Promise<string[]> {
    if (!promptIds.length) return [];

    const { data, error } = await supabase
      .from('responses')
      .select('prompt_id')
      .eq('user_id', userId)
      .in('prompt_id', promptIds);

    if (error) {
      console.error('Get responded prompt IDs error:', error);
      throw error;
    }

    return (data || []).map((r) => r.prompt_id).filter(Boolean) as string[];
  },

  async getResponseCountsForPrompts(promptIds: string[]): Promise<Record<string, number>> {
    if (!promptIds.length) return {};

    const { data, error } = await supabase
      .from('responses')
      .select('prompt_id')
      .in('prompt_id', promptIds);

    if (error) {
      console.error('Get response counts error:', error);
      throw error;
    }

    const counts: Record<string, number> = {};
    (data || []).forEach((r) => {
      counts[r.prompt_id] = (counts[r.prompt_id] || 0) + 1;
    });
    return counts;
  },

  // --- Circle/chat response methods (absorbed from circlesService) ---

  async submitChatResponse(
    promptId: string,
    userId: string,
    textContent: string,
    mediaUrl: string | null = null,
    mediaType: 'image' | 'video' | null = null,
    debateSide: 'side_a' | 'side_b' | null = null
  ): Promise<any> {
    const { data, error } = await supabase
      .from('responses')
      .upsert(
        {
          prompt_id: promptId,
          user_id: userId,
          text_content: textContent,
          media_url: mediaUrl,
          media_type: mediaType,
          debate_side: debateSide,
        },
        { onConflict: 'prompt_id,user_id' }
      )
      .select('*, user:profiles!responses_user_id_fkey(*)')
      .single();

    if (error) throw error;
    return data;
  },

  async getPromptResponses(promptId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('responses')
      .select('*, user:profiles!responses_user_id_fkey(*), prompt:prompts!responses_prompt_id_fkey(*)')
      .eq('prompt_id', promptId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
