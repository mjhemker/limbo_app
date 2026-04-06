import { supabase } from '../../lib/supabase';
import { messagesService } from './messages';

export interface Reaction {
  id: string;
  response_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export const reactionsService = {
  async getReactions(responseId: string): Promise<Reaction[]> {
    const { data, error } = await supabase
      .from('reactions')
      .select('id, emoji, user_id')
      .eq('response_id', responseId);

    if (error) throw error;
    return data || [];
  },

  async addReaction(
    responseId: string,
    userId: string,
    emoji: string,
    postOwnerId?: string
  ): Promise<Reaction> {
    const { data, error } = await supabase
      .from('reactions')
      .insert({ response_id: responseId, user_id: userId, emoji })
      .select()
      .single();

    if (error) throw error;

    // Send notification message to post owner (if not reacting to own post)
    if (postOwnerId && postOwnerId !== userId) {
      try {
        await messagesService.sendMessage(
          userId,
          postOwnerId,
          `REACTION:${emoji}`, // Special format to identify reaction messages
          responseId
        );
      } catch (msgError) {
        console.error('Failed to send reaction notification:', msgError);
        // Don't fail the reaction if notification fails
      }
    }

    return data;
  },

  async removeReaction(
    responseId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('response_id', responseId)
      .eq('user_id', userId)
      .eq('emoji', emoji);

    if (error) throw error;
  },
};
