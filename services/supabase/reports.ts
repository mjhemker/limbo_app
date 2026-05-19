import { supabase } from '../../lib/supabase';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'nudity'
  | 'misinformation'
  | 'impersonation'
  | 'other';

export type ReportContentType = 'response' | 'message' | 'profile' | 'prompt';

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  content_type: ReportContentType;
  content_id: string;
  reason: ReportReason;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export const reportsService = {
  async reportContent(
    reporterId: string,
    reportedUserId: string,
    contentType: ReportContentType,
    contentId: string,
    reason: ReportReason,
    description?: string
  ): Promise<Report> {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        content_type: contentType,
        content_id: contentId,
        reason,
        description: description || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Report content error:', error);
      throw error;
    }

    return data;
  },

  async getMyReports(userId: string): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get my reports error:', error);
      throw error;
    }

    return data || [];
  },

  async hasAlreadyReported(
    reporterId: string,
    contentType: ReportContentType,
    contentId: string
  ): Promise<boolean> {
    const { count, error } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_id', reporterId)
      .eq('content_type', contentType)
      .eq('content_id', contentId);

    if (error) {
      console.error('Check report error:', error);
      return false;
    }

    return (count || 0) > 0;
  },
};
