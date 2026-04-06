import { supabase } from '../../lib/supabase';

export interface Prompt {
  id: string;
  text: string;
  type: 'daily' | 'general';
  is_active: boolean;
  active_date?: string;
  created_at: string;
  updated_at: string;
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
      .order('active_date', { ascending: false });

    if (error) {
      console.error('Get all prompts error:', error);
      throw error;
    }

    return data || [];
  },

  async getDailyPrompts(): Promise<Prompt[]> {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('is_active', true)
      .eq('type', 'daily')
      .not('active_date', 'is', null)
      .lte('active_date', today) // Only show prompts with dates up to today
      .order('active_date', { ascending: false })
      .limit(7);

    if (error) {
      console.error('Get daily prompts error:', error);
      throw error;
    }

    return data || [];
  },

  async getGeneralPrompts(): Promise<Prompt[]> {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('is_active', true)
      .eq('type', 'general')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get general prompts error:', error);
      throw error;
    }

    return data || [];
  },
};
