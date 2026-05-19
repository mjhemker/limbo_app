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
        '*, sender:profiles!messages_sender_id_fkey(*), response:responses!messages_response_id_fkey(id, media_url, media_type, text_content, audio_url, prompt:prompts!responses_prompt_id_fkey(text))'
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
    // Step 1: Get all chats the user belongs to
    const { data: memberships, error: memberError } = await supabase
      .from('chat_members')
      .select('chat_id, last_read_at, chat:chats(*)')
      .eq('user_id', userId);

    if (memberError) throw memberError;
    if (!memberships || memberships.length === 0) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const chatIds = memberships.map(m => m.chat_id);

    // Step 2: Get last messages for ALL chats in ONE query
    const { data: allMessages } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .in('chat_id', chatIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Group messages by chat_id and get only the last one per chat
    const lastMessageByChat = new Map<string, any>();
    for (const msg of allMessages || []) {
      if (!lastMessageByChat.has(msg.chat_id)) {
        lastMessageByChat.set(msg.chat_id, msg);
      }
    }

    // Step 3: Get all chat members for DM chats in ONE query
    const dmChatIds = memberships
      .filter(m => (m as any).chat?.type === 'dm')
      .map(m => m.chat_id);

    const { data: allChatMembers } = await supabase
      .from('chat_members')
      .select('chat_id, user_id')
      .in('chat_id', dmChatIds);

    // Group members by chat_id and find partner IDs
    const membersByChat = new Map<string, any[]>();
    const partnerIds = new Set<string>();
    for (const member of allChatMembers || []) {
      if (!membersByChat.has(member.chat_id)) {
        membersByChat.set(member.chat_id, []);
      }
      membersByChat.get(member.chat_id)!.push(member);
      if (member.user_id !== userId) {
        partnerIds.add(member.user_id);
      }
    }

    // Step 4: Batch fetch ALL partner profiles in ONE query
    const partnerIdsArray = Array.from(partnerIds);
    const { data: allProfiles } = partnerIdsArray.length > 0
      ? await supabase.from('profiles').select('*').in('id', partnerIdsArray)
      : { data: [] };

    const profilesById = new Map<string, any>();
    for (const profile of allProfiles || []) {
      profilesById.set(profile.id, profile);
    }

    // Step 5: Get unread counts in PARALLEL
    const unreadPromises = memberships.map(async (membership) => {
      const chat = (membership as any).chat;
      const lastMessage = lastMessageByChat.get(membership.chat_id);

      // Skip DMs with no recent messages
      if (!lastMessage && chat?.type === 'dm') {
        return { chatId: membership.chat_id, count: 0, skip: true };
      }

      if (!membership.last_read_at) {
        return { chatId: membership.chat_id, count: 0, skip: false };
      }

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', membership.chat_id)
        .gt('created_at', membership.last_read_at)
        .neq('sender_id', userId);

      return { chatId: membership.chat_id, count: count || 0, skip: false };
    });

    const unreadResults = await Promise.all(unreadPromises);
    const unreadByChat = new Map<string, number>();
    const skipChats = new Set<string>();
    for (const result of unreadResults) {
      if (result.skip) {
        skipChats.add(result.chatId);
      } else {
        unreadByChat.set(result.chatId, result.count);
      }
    }

    // Step 6: Assemble results
    const results: ChatWithLastMessage[] = [];
    for (const membership of memberships) {
      const chatId = membership.chat_id;
      const chat = (membership as any).chat;

      // Skip DMs with no recent messages
      if (skipChats.has(chatId)) continue;

      const lastMessage = lastMessageByChat.get(chatId) || null;
      const unreadCount = unreadByChat.get(chatId) || 0;

      let partner = null;
      const members = membersByChat.get(chatId) || [];

      if (chat?.type === 'dm') {
        const partnerMember = members.find((m: any) => m.user_id !== userId);
        if (partnerMember?.user_id) {
          partner = profilesById.get(partnerMember.user_id) || null;
        }
      }

      results.push({ chat, members, partner, lastMessage, unreadCount });
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
