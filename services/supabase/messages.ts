import { supabase } from '../../lib/supabase';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio';
  response_id?: string;
  reply_to_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  partner: any;
  lastMessage: any;
  unreadCount: number;
}

export const messagesService = {
  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    responseId: string | null = null,
    mediaUrl: string | null = null,
    mediaType: 'image' | 'video' | 'audio' | null = null,
    replyToId: string | null = null
  ): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        content,
        response_id: responseId,
        media_url: mediaUrl,
        media_type: mediaType,
        reply_to_id: replyToId,
      })
      .select()
      .single();

    if (error) {
      console.error('Send message error:', error);
      throw error;
    }

    return data;
  },

  async getConversation(userId: string, otherUserId: string): Promise<any[]> {
    // Only fetch messages from the last 30 days (messages expire after a month)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('messages')
      .select(
        '*, sender:profiles!messages_sender_id_fkey(*), recipient:profiles!messages_recipient_id_fkey(*), response:responses(id, media_url, media_type, text_content, audio_url, prompt:prompts(text))'
      )
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
      )
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get conversation error:', error);
      throw error;
    }

    return data || [];
  },

  async getConversations(userId: string): Promise<Conversation[]> {
    // Only fetch messages from the last 30 days (messages expire after a month)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all messages involving this user
    const { data: messages, error } = await supabase
      .from('messages')
      .select(
        '*, sender:profiles!messages_sender_id_fkey(*), recipient:profiles!messages_recipient_id_fkey(*)'
      )
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get conversations error:', error);
      throw error;
    }

    // Group by conversation partner
    const conversationsMap = new Map<string, Conversation>();

    messages?.forEach((msg: any) => {
      const partnerId =
        msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      const partner = msg.sender_id === userId ? msg.recipient : msg.sender;

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          partner,
          lastMessage: msg,
          unreadCount: 0,
        });
      }

      // Count unread messages (messages sent to current user that are unread)
      if (msg.recipient_id === userId && !msg.is_read) {
        const conversation = conversationsMap.get(partnerId);
        if (conversation) {
          conversation.unreadCount++;
        }
      }
    });

    return Array.from(conversationsMap.values());
  },

  async markAsRead(messageId: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error('Mark as read error:', error);
      throw error;
    }

    return data;
  },

  async markConversationAsRead(
    userId: string,
    otherUserId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', otherUserId)
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Mark conversation as read error:', error);
      throw error;
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Get unread count error:', error);
      throw error;
    }

    return count || 0;
  },

  async getSuggestedConversations(userId: string): Promise<any[]> {
    // Get all accepted friends
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

    // Get all messages from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select('sender_id, recipient_id, created_at')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (messagesError) {
      console.error('Get messages error:', messagesError);
      throw messagesError;
    }

    // Create a set of friend IDs who have been messaged in the last 30 days
    const recentlyMessagedFriendIds = new Set<string>();
    recentMessages?.forEach((msg: any) => {
      const friendId =
        msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      recentlyMessagedFriendIds.add(friendId);
    });

    // Filter friends who haven't been messaged in 30+ days or never messaged
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
