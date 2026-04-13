import { supabase } from '../../lib/supabase';

export interface Prompt {
  id: string;
  chat_id?: string;
  text: string;
  type: 'daily' | 'general' | 'optional' | 'debate';
  is_active: boolean;
  active_date?: string;
  category?: string;
  created_by?: string;
  is_debate: boolean;
  debate_side_a?: string;
  debate_side_b?: string;
  is_recap: boolean;
  created_at: string;
}

export const promptsService = {
  async getTodaysPrompt(): Promise<Prompt | null> {
    const { data, error } = await supabase.rpc('get_todays_prompt');

    if (error) {
      console.error('Get todays prompt error:', error);
      throw error;
    }

    return data?.[0] || null;
  },

  async getPromptById(promptId: string): Promise<Prompt> {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', promptId)
      .single();

    if (error) {
      console.error('Get prompt error:', error);
      throw error;
    }

    return data;
  },

  async getAllPrompts(): Promise<Prompt[]> {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('is_active', true)
      .is('chat_id', null)
      .order('active_date', { ascending: false });

    if (error) {
      console.error('Get all prompts error:', error);
      throw error;
    }

    return data || [];
  },

  async getDailyPrompts(): Promise<Prompt[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('is_active', true)
      .eq('type', 'daily')
      .is('chat_id', null)
      .not('active_date', 'is', null)
      .lte('active_date', today)
      .order('active_date', { ascending: false })
      .limit(7);

    if (error) {
      console.error('Get daily prompts error:', error);
      throw error;
    }

    return data || [];
  },

  async createPrompt(text: string): Promise<Prompt> {
    const { data, error } = await supabase
      .from('prompts')
      .insert({ text, type: 'general', is_active: true })
      .select()
      .single();

    if (error) {
      console.error('Create prompt error:', error);
      throw error;
    }

    return data;
  },

  async getGeneralPrompts(): Promise<Prompt[]> {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('is_active', true)
      .eq('type', 'general')
      .is('chat_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get general prompts error:', error);
      throw error;
    }

    return data || [];
  },

  // --- Optional prompts (absorbed from optionalPromptsService) ---

  async getRandomOptionalPrompts(limit: number = 5): Promise<Prompt[]> {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('is_active', true)
      .eq('type', 'optional')
      .limit(limit);

    if (error) {
      console.error('Get random prompts error:', error);
      throw error;
    }

    return (data || []).sort(() => Math.random() - 0.5);
  },

  async getOptionalPromptById(promptId: string): Promise<Prompt> {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', promptId)
      .single();

    if (error) {
      console.error('Get prompt error:', error);
      throw error;
    }

    return data;
  },

  async getPromptsByCategory(category: string): Promise<Prompt[]> {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .eq('type', 'optional');

    if (error) {
      console.error('Get prompts by category error:', error);
      throw error;
    }

    return data || [];
  },
};
