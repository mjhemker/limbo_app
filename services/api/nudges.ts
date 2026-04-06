import { supabase } from '../../lib/supabase';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Gets the current user's auth token for API requests
 */
async function getAuthToken(): Promise<string | undefined> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token;
}

export interface SendNudgeParams {
  toUserId: string;
  promptId: string;
  message?: string;
}

/**
 * Sends a nudge notification to another user
 */
export async function sendNudge({
  toUserId,
  promptId,
  message,
}: SendNudgeParams): Promise<any> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/api/notify/nudge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      toUserId,
      promptId,
      message,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send nudge');
  }

  return response.json();
}

/**
 * Gets nudges sent or received by the current user
 */
export async function getNudges(
  type?: 'sent' | 'received'
): Promise<any[]> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const url = new URL(`${API_BASE_URL}/api/notify/nudges`);
  if (type) {
    url.searchParams.append('type', type);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get nudges');
  }

  const data = await response.json();
  return data.nudges;
}

export interface SendTestSMSParams {
  phoneNumber: string;
  message?: string;
}

/**
 * Sends a test SMS (for development/testing)
 */
export async function sendTestSMS({
  phoneNumber,
  message,
}: SendTestSMSParams): Promise<any> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/api/notify/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      phoneNumber,
      message,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send test SMS');
  }

  return response.json();
}

/**
 * Manually triggers daily prompt SMS notifications to all opted-in users
 */
export async function triggerDailyPromptNotification(): Promise<any> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/api/admin/trigger-daily-prompt`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.message || 'Failed to trigger daily prompt notification'
    );
  }

  return response.json();
}
