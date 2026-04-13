import { supabase } from '../../lib/supabase';

export interface Chat {
  id: string;
  type: 'dm' | 'group';
  name?: string;
  description?: string;
  avatar_url?: string;
  theme_color?: string;
  context?: string;
  prompt_frequency_hours?: number;
  created_by: string;
  created_at: string;
}

export interface ChatMember {
  id: string;
  chat_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at: string;
}

export const chatsService = {
  async createGroupChat(
    name: string,
    description?: string,
    themeColor?: string
  ): Promise<{ id: string }> {
    const { data: chatId, error } = await supabase.rpc('create_circle', {
      p_name: name,
      p_description: description || null,
    });

    if (error) throw error;

    if (themeColor) {
      await supabase
        .from('chats')
        .update({ theme_color: themeColor })
        .eq('id', chatId);
    }

    return { id: chatId };
  },

  async getMyGroupChats(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('chat_members')
      .select('chat_id, role, chat:chats(*)')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    // Filter to group chats only
    const groupRows = (data || []).filter((row: any) => row.chat?.type === 'group');

    const chatsWithMembers = await Promise.all(
      groupRows.map(async (row: any) => {
        const { data: members, error: membersError } = await supabase
          .from('chat_members')
          .select('user_id, role, user:profiles(id, display_name, username, avatar_url)')
          .eq('chat_id', row.chat_id)
          .order('joined_at', { ascending: true });

        if (membersError) {
          console.error('Error fetching members:', membersError);
        }

        return {
          ...row.chat,
          role: row.role,
          is_admin: row.role === 'admin',
          members: members || [],
          member_count: members?.length || 0,
        };
      })
    );

    return chatsWithMembers;
  },

  async getChat(chatId: string): Promise<any> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single();

    if (error) throw error;

    const { count, error: countError } = await supabase
      .from('chat_members')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId);

    if (countError) {
      console.error('Error fetching member count:', countError);
    }

    return {
      ...data,
      member_count: count || 0,
    };
  },

  async getChatMembers(chatId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('chat_members')
      .select('id, role, joined_at, user:profiles(*)')
      .eq('chat_id', chatId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async addChatMember(chatId: string, userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('chat_members')
      .insert({ chat_id: chatId, user_id: userId, role: 'member' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async leaveChat(chatId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_members')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async updateChat(
    chatId: string,
    updates: Partial<Chat>
  ): Promise<Chat> {
    const { data, error } = await supabase
      .from('chats')
      .update(updates)
      .eq('id', chatId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getChatPrompts(chatId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('prompts')
      .select('*, creator:profiles(*)')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createChatPrompt(
    chatId: string,
    text: string,
    createdBy: string
  ): Promise<any> {
    const { data, error } = await supabase
      .from('prompts')
      .insert({ chat_id: chatId, text, created_by: createdBy, type: 'general' })
      .select('*, creator:profiles(*)')
      .single();

    if (error) throw error;
    return data;
  },

  async deleteChatPrompt(promptId: string): Promise<void> {
    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', promptId);

    if (error) throw error;
  },
};
