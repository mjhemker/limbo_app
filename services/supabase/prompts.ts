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
    // Try RPC first
    try {
      const { data, error } = await supabase.rpc('get_todays_prompt');
      if (!error && data) {
        return data?.[0] || null;
      }
    } catch (e) {
      // RPC not available, fall through to direct query
    }

    // Fallback: query prompts table directly for today's daily prompt
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('is_active', true)
      .eq('type', 'daily')
      .is('chat_id', null)
      .eq('active_date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Get todays prompt error:', error);
      throw error;
    }

    return data || null;
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

  // Daily Archive - get past 7 days (excluding today) with prompts
  async getDailyArchive(userId: string): Promise<DailyArchiveItem[]> {
    const today = new Date();
    const result: DailyArchiveItem[] = [];

    // Get past 7 days (excluding today)
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      result.push({
        date: dateStr,
        dayLetter: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()],
        dayNumber: date.getDate(),
        prompt: null,
        hasAnswered: false,
      });
    }

    // Fetch prompts for these dates
    const dates = result.map((r) => r.date);
    const { data: prompts, error: promptsError } = await supabase
      .from('prompts')
      .select('*')
      .eq('is_active', true)
      .eq('type', 'daily')
      .is('chat_id', null)
      .in('active_date', dates);

    if (promptsError) {
      console.error('Get daily archive prompts error:', promptsError);
      throw promptsError;
    }

    // Map prompts to dates
    const promptsByDate: Record<string, Prompt> = {};
    (prompts || []).forEach((p) => {
      if (p.active_date) {
        promptsByDate[p.active_date] = p;
      }
    });

    // Get user's responses for these prompts
    const promptIds = (prompts || []).map((p) => p.id);
    let answeredPromptIds: string[] = [];

    if (promptIds.length > 0) {
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select('prompt_id')
        .eq('user_id', userId)
        .in('prompt_id', promptIds);

      if (responsesError) {
        console.error('Get archive responses error:', responsesError);
        throw responsesError;
      }

      answeredPromptIds = (responses || []).map((r) => r.prompt_id);
    }

    // Combine data
    result.forEach((item) => {
      const prompt = promptsByDate[item.date];
      if (prompt) {
        item.prompt = prompt;
        item.hasAnswered = answeredPromptIds.includes(prompt.id);
      }
    });

    return result;
  },
};

export interface DailyArchiveItem {
  date: string;
  dayLetter: string;
  dayNumber: number;
  prompt: Prompt | null;
  hasAnswered: boolean;
}
