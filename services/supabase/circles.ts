import { supabase } from '../../lib/supabase';

export interface Circle {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  theme_color?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const circlesService = {
  async createCircle(
    name: string,
    description?: string,
    themeColor?: string
  ): Promise<{ id: string }> {
    // Use a SECURITY DEFINER function to atomically create the circle
    // and add the creator as admin, bypassing RLS issues
    const { data: circleId, error } = await supabase.rpc('create_circle', {
      p_name: name,
      p_description: description || null,
    });

    if (error) throw error;

    // Update with theme color if provided
    if (themeColor) {
      await supabase
        .from('circles')
        .update({ theme_color: themeColor })
        .eq('id', circleId);
    }

    return { id: circleId };
  },

  async getMyCircles(userId: string): Promise<any[]> {
    // First get the user's circles
    const { data, error } = await supabase
      .from('circle_members')
      .select('circle_id, role, circles(*)')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    // For each circle, get the members
    const circlesWithMembers = await Promise.all(
      (data || []).map(async (row: any) => {
        const { data: members, error: membersError } = await supabase
          .from('circle_members')
          .select('user_id, role, user:profiles(id, display_name, username, avatar_url)')
          .eq('circle_id', row.circle_id)
          .order('joined_at', { ascending: true });

        if (membersError) {
          console.error('Error fetching members:', membersError);
        }

        return {
          ...row.circles,
          role: row.role,
          is_admin: row.role === 'admin',
          members: members || [],
          member_count: members?.length || 0,
        };
      })
    );

    return circlesWithMembers;
  },

  async getCircle(circleId: string): Promise<any> {
    const { data, error } = await supabase
      .from('circles')
      .select('*')
      .eq('id', circleId)
      .single();

    if (error) throw error;

    // Get member count
    const { count, error: countError } = await supabase
      .from('circle_members')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', circleId);

    if (countError) {
      console.error('Error fetching member count:', countError);
    }

    return {
      ...data,
      member_count: count || 0,
    };
  },

  async getCircleMembers(circleId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('circle_members')
      .select('id, role, joined_at, user:profiles(*)')
      .eq('circle_id', circleId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async addCircleMember(circleId: string, userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('circle_members')
      .insert({ circle_id: circleId, user_id: userId, role: 'member' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async leaveCircle(circleId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('circle_members')
      .delete()
      .eq('circle_id', circleId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async sendCircleMessage(
    circleId: string,
    senderId: string,
    content: string,
    mediaUrl: string | null = null,
    mediaType: 'image' | 'video' | 'audio' | null = null,
    replyToId: string | null = null
  ): Promise<any> {
    const { data, error } = await supabase
      .from('circle_messages')
      .insert({
        circle_id: circleId,
        sender_id: senderId,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
        reply_to_id: replyToId,
      })
      .select('*, sender:profiles(*)')
      .single();

    if (error) throw error;
    return data;
  },

  async getCircleMessages(circleId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('circle_messages')
      .select('*, sender:profiles(*)')
      .eq('circle_id', circleId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createCirclePrompt(
    circleId: string,
    text: string,
    createdBy: string
  ): Promise<any> {
    const { data, error } = await supabase
      .from('circle_prompts')
      .insert({ circle_id: circleId, text, created_by: createdBy })
      .select('*, creator:profiles(*)')
      .single();

    if (error) throw error;
    return data;
  },

  async getCirclePrompts(circleId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('circle_prompts')
      .select('*, creator:profiles(*)')
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateCircle(
    circleId: string,
    updates: Partial<Circle>
  ): Promise<Circle> {
    const { data, error } = await supabase
      .from('circles')
      .update(updates)
      .eq('id', circleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async submitCircleResponse(
    circleId: string,
    circlePromptId: string,
    userId: string,
    textContent: string,
    mediaUrl: string | null = null,
    mediaType: 'image' | 'video' | null = null
  ): Promise<any> {
    const { data, error } = await supabase
      .from('circle_responses')
      .upsert(
        {
          circle_id: circleId,
          circle_prompt_id: circlePromptId,
          user_id: userId,
          text_content: textContent,
          media_url: mediaUrl,
          media_type: mediaType,
        },
        { onConflict: 'circle_prompt_id,user_id' }
      )
      .select('*, user:profiles(*)')
      .single();

    if (error) throw error;
    return data;
  },

  async getCirclePromptResponses(circlePromptId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('circle_responses')
      .select('*, user:profiles(*)')
      .eq('circle_prompt_id', circlePromptId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async deleteCirclePrompt(promptId: string): Promise<void> {
    const { error } = await supabase
      .from('circle_prompts')
      .delete()
      .eq('id', promptId);

    if (error) throw error;
  },
};
