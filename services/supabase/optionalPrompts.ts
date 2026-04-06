import { supabase } from '../../lib/supabase';

export interface OptionalPrompt {
  id: string;
  text: string;
  category?: string;
  is_active: boolean;
  created_at: string;
}

export const optionalPromptsService = {
  async getRandomPrompts(limit: number = 5): Promise<OptionalPrompt[]> {
    const { data, error } = await supabase
      .from('optional_prompts')
      .select('*')
      .eq('is_active', true)
      .limit(limit);

    if (error) {
      console.error('Get random prompts error:', error);
      throw error;
    }

    // Shuffle and return
    return (data || []).sort(() => Math.random() - 0.5);
  },

  async getPromptById(promptId: string): Promise<OptionalPrompt> {
    const { data, error } = await supabase
      .from('optional_prompts')
      .select('*')
      .eq('id', promptId)
      .single();

    if (error) {
      console.error('Get prompt error:', error);
      throw error;
    }

    return data;
  },

  async getPromptsByCategory(category: string): Promise<OptionalPrompt[]> {
    const { data, error} = await supabase
      .from('optional_prompts')
      .select('*')
      .eq('category', category)
      .eq('is_active', true);

    if (error) {
      console.error('Get prompts by category error:', error);
      throw error;
    }

    return data || [];
  },
};
