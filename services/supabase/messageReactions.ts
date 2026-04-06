import { supabase } from '../../lib/supabase';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export const messageReactionsService = {
  async addMessageReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<MessageReaction> {
    const { data, error } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, user_id: userId, emoji })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeMessageReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);

    if (error) throw error;
  },

  async getMessageReactions(messageIds: string[]): Promise<MessageReaction[]> {
    if (!messageIds || messageIds.length === 0) return [];

    const { data, error } = await supabase
      .from('message_reactions')
      .select('id, message_id, user_id, emoji')
      .in('message_id', messageIds);

    if (error) throw error;
    return data || [];
  },
};
