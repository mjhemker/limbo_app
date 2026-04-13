import { supabase } from '../../lib/supabase';

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio';
  response_id?: string;
  reply_to_id?: string;
  created_at: string;
}

export interface ChatWithLastMessage {
  chat: any;
  members: any[];
  partner?: any; // For DMs: the other user
  lastMessage: any;
  unreadCount: number;
}

export const messagesService = {
  async getOrCreateDMChat(userA: string, userB: string): Promise<string> {
    const { data, error } = await supabase.rpc('get_or_create_dm_chat', {
      p_user_a: userA,
      p_user_b: userB,
    });

    if (error) {
      console.error('Get or create DM chat error:', error);
      throw error;
    }

    return data;
  },

  async sendMessage(
    chatId: string,
    senderId: string,
    content: string,
    responseId: string | null = null,
    mediaUrl: string | null = null,
    mediaType: 'image' | 'video' | 'audio' | null = null,
    replyToId: string | null = null
  ): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        content,
        response_id: responseId,
        media_url: mediaUrl,
        media_type: mediaType,
        reply_to_id: replyToId,
      })
      .select('*, sender:profiles(*)')
      .single();

    if (error) {
      console.error('Send message error:', error);
      throw error;
    }

    // Update last_read_at for sender
    await supabase
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .eq('user_id', senderId);

    return data;
  },

  async getChatMessages(chatId: string): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('messages')
      .select(
        '*, sender:profiles!messages_sender_id_fkey(*), response:responses(id, media_url, media_type, text_content, audio_url, prompt:prompts(text))'
      )
      .eq('chat_id', chatId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get chat messages error:', error);
      throw error;
    }

    return data || [];
  },

  async getChats(userId: string): Promise<ChatWithLastMessage[]> {
    // Get all chats the user belongs to
    const { data: memberships, error: memberError } = await supabase
      .from('chat_members')
      .select('chat_id, last_read_at, chat:chats(*)')
      .eq('user_id', userId);

    if (memberError) {
      console.error('Get chats error:', memberError);
      throw memberError;
    }

    if (!memberships || memberships.length === 0) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results: ChatWithLastMessage[] = [];

    for (const membership of memberships) {
      const chatId = membership.chat_id;
      const chat = (membership as any).chat;
      const lastReadAt = membership.last_read_at;

      // Get last message
      const { data: lastMsgArr } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(*)')
        .eq('chat_id', chatId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      const lastMessage = lastMsgArr?.[0] || null;

      // Skip chats with no recent messages (for DMs)
      if (!lastMessage && chat.type === 'dm') continue;

      // Count unread messages
      let unreadCount = 0;
      if (lastReadAt) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chatId)
          .gt('created_at', lastReadAt)
          .neq('sender_id', userId);
        unreadCount = count || 0;
      }

      // For DMs, get the partner
      let partner = null;
      const members: any[] = [];
      if (chat.type === 'dm') {
        const { data: chatMembers } = await supabase
          .from('chat_members')
          .select('user_id, user:profiles(*)')
          .eq('chat_id', chatId);

        partner = chatMembers?.find((m: any) => m.user_id !== userId)?.user || null;
        members.push(...(chatMembers || []));
      }

      results.push({
        chat,
        members,
        partner,
        lastMessage,
        unreadCount,
      });
    }

    // Sort by last message time
    results.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.chat.created_at;
      const bTime = b.lastMessage?.created_at || b.chat.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return results;
  },

  async markChatAsRead(chatId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .eq('user_id', userId);

    if (error) {
      console.error('Mark chat as read error:', error);
      throw error;
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    // Get all user's chats with their last_read_at
    const { data: memberships, error } = await supabase
      .from('chat_members')
      .select('chat_id, last_read_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Get unread count error:', error);
      throw error;
    }

    let total = 0;
    for (const m of memberships || []) {
      if (m.last_read_at) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', m.chat_id)
          .gt('created_at', m.last_read_at)
          .neq('sender_id', userId);
        total += count || 0;
      }
    }

    return total;
  },

  async getSuggestedConversations(userId: string): Promise<any[]> {
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select(
        '*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)'
      )
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (friendshipsError) {
      console.error('Get friendships error:', friendshipsError);
      throw friendshipsError;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all DM chats for this user that have recent messages
    const { data: memberships } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId);

    const chatIds = (memberships || []).map((m: any) => m.chat_id);

    const recentlyMessagedFriendIds = new Set<string>();

    if (chatIds.length > 0) {
      // Get chats with recent messages
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('chat_id')
        .in('chat_id', chatIds)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const activeChatIds = new Set((recentMessages || []).map((m: any) => m.chat_id));

      // For active DM chats, find the partner
      for (const activeChatId of activeChatIds) {
        const { data: chatMembers } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('chat_id', activeChatId);

        chatMembers?.forEach((cm: any) => {
          if (cm.user_id !== userId) {
            recentlyMessagedFriendIds.add(cm.user_id);
          }
        });
      }
    }

    const suggestedFriends =
      friendships
        ?.map((f: any) => ({
          friendshipId: f.id,
          friend: f.requester_id === userId ? f.addressee : f.requester,
        }))
        .filter(
          ({ friend }: any) => !recentlyMessagedFriendIds.has(friend.id)
        ) || [];

    return suggestedFriends;
  },
};
