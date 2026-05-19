import { supabase } from '../../lib/supabase';

export interface LightningSession {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  total_questions: number;
  answers: LightningAnswer[];
}

export interface LightningAnswer {
  question_index: number;
  prompt_text: string;
  answer_text: string;
  time_taken_ms: number | null;
}

// Fallback prompts in case AI generation fails
const FALLBACK_PROMPTS = [
  "What's your go-to comfort food?",
  "Morning person or night owl?",
  "Last song you had on repeat?",
  "Favorite way to relax?",
  "Beach or mountains?",
  "What's something you're grateful for today?",
  "Cats or dogs?",
  "Favorite season and why?",
  "What's a skill you want to learn?",
  "Coffee or tea?",
  "What made you smile today?",
  "Dream vacation destination?",
  "Favorite childhood memory?",
  "What's your hidden talent?",
  "Best advice you've ever received?",
];

/**
 * Generate AI-powered lightning round prompts
 * Uses Supabase Edge Function to call AI API
 */
export async function generateLightningPrompts(count: number = 5): Promise<string[]> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-lightning-prompts', {
      body: { count },
    });

    if (error) {
      console.error('Error generating prompts:', error);
      return getRandomFallbackPrompts(count);
    }

    if (data?.prompts && Array.isArray(data.prompts) && data.prompts.length >= count) {
      return data.prompts.slice(0, count);
    }

    return getRandomFallbackPrompts(count);
  } catch (error) {
    console.error('Failed to generate AI prompts:', error);
    return getRandomFallbackPrompts(count);
  }
}

/**
 * Get random fallback prompts
 */
function getRandomFallbackPrompts(count: number): string[] {
  const shuffled = [...FALLBACK_PROMPTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Start a new lightning round session
 */
export async function startLightningRound(userId: string): Promise<LightningSession> {
  const { data, error } = await supabase.rpc('start_lightning_round', {
    p_user_id: userId,
  });

  if (error) throw error;
  return data;
}

/**
 * Submit an answer during lightning round
 */
export async function submitLightningAnswer(
  sessionId: string,
  questionIndex: number,
  promptText: string,
  answerText: string,
  timeTakenMs: number | null = null
): Promise<void> {
  const { error } = await supabase.rpc('submit_lightning_answer', {
    p_session_id: sessionId,
    p_question_index: questionIndex,
    p_prompt_text: promptText,
    p_answer_text: answerText,
    p_time_taken_ms: timeTakenMs,
  });

  if (error) throw error;
}

/**
 * Complete a lightning round session
 */
export async function completeLightningRound(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_lightning_round', {
    p_session_id: sessionId,
  });

  if (error) throw error;
}

/**
 * Get user's lightning round history
 */
export async function getLightningHistory(
  userId: string,
  limit: number = 10
): Promise<LightningSession[]> {
  const { data, error } = await supabase.rpc('get_lightning_history', {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Add lightning round to scrapbook
 */
export async function addLightningToScrapbook(
  userId: string,
  sessionId: string
): Promise<void> {
  const { error } = await supabase.rpc('add_lightning_to_scrapbook', {
    p_user_id: userId,
    p_session_id: sessionId,
  });

  if (error) throw error;
}
