import { supabase } from '../../lib/supabase';
import { messagesService } from './messages';

export interface Reaction {
  id: string;
  user_id: string;
  emoji: string;
  response_id?: string;
  message_id?: string;
  created_at?: string;
}

export const reactionsService = {
  // --- Response reactions ---

  async getResponseReactions(responseId: string): Promise<Reaction[]> {
    const { data, error } = await supabase
      .from('reactions')
      .select('id, emoji, user_id')
      .eq('response_id', responseId);

    if (error) throw error;
    return data || [];
  },

  async addResponseReaction(
    responseId: string,
    userId: string,
    emoji: string,
    postOwnerId?: string,
    chatId?: string
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
        const dmChatId = chatId || await messagesService.getOrCreateDMChat(userId, postOwnerId);
        await messagesService.sendMessage(
          dmChatId,
          userId,
          `REACTION:${emoji}`,
          responseId
        );
      } catch (msgError) {
        console.error('Failed to send reaction notification:', msgError);
      }
    }

    return data;
  },

  async removeResponseReaction(
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

  // --- Message reactions (absorbed from messageReactionsService) ---

  async getMessageReactions(messageIds: string[]): Promise<Reaction[]> {
    if (!messageIds || messageIds.length === 0) return [];

    const { data, error } = await supabase
      .from('reactions')
      .select('id, message_id, user_id, emoji')
      .in('message_id', messageIds);

    if (error) throw error;
    return data || [];
  },

  async addMessageReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<Reaction> {
    const { data, error } = await supabase
      .from('reactions')
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
      .from('reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);

    if (error) throw error;
  },
};
