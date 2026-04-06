import { supabase } from '../../lib/supabase';

export interface UnlockStatus {
  unlockedCount: number;
  maxUnlocks: number;
  dmsSentToday: string[]; // user IDs of friends messaged today
  lastResetDate: string;
}

const BASE_UNLOCKS = 3;
const UNLOCKS_PER_DM = 3;

// Get or initialize unlock status for a user
export async function getUnlockStatus(userId: string): Promise<UnlockStatus> {
  const today = new Date().toISOString().split('T')[0];

  // Try to get existing status from local storage or database
  const { data, error } = await supabase
    .from('user_unlock_status')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // Initialize default status
    return {
      unlockedCount: 0,
      maxUnlocks: BASE_UNLOCKS,
      dmsSentToday: [],
      lastResetDate: today,
    };
  }

  // Check if we need to reset (new day)
  if (data.last_reset_date !== today) {
    // Reset for new day
    const resetStatus: UnlockStatus = {
      unlockedCount: 0,
      maxUnlocks: BASE_UNLOCKS,
      dmsSentToday: [],
      lastResetDate: today,
    };

    // Update in database
    await supabase
      .from('user_unlock_status')
      .upsert({
        user_id: userId,
        unlocked_count: 0,
        max_unlocks: BASE_UNLOCKS,
        dms_sent_today: [],
        last_reset_date: today,
      });

    return resetStatus;
  }

  return {
    unlockedCount: data.unlocked_count || 0,
    maxUnlocks: data.max_unlocks || BASE_UNLOCKS,
    dmsSentToday: data.dms_sent_today || [],
    lastResetDate: data.last_reset_date,
  };
}

// Track when a DM is sent to unlock more responses
export async function trackDMSent(userId: string, recipientId: string): Promise<UnlockStatus> {
  const today = new Date().toISOString().split('T')[0];
  const currentStatus = await getUnlockStatus(userId);

  // Check if already messaged this friend today
  if (currentStatus.dmsSentToday.includes(recipientId)) {
    return currentStatus;
  }

  // Add to DMs sent and increase max unlocks
  const newDmsSent = [...currentStatus.dmsSentToday, recipientId];
  const newMaxUnlocks = BASE_UNLOCKS + (newDmsSent.length * UNLOCKS_PER_DM);

  const newStatus: UnlockStatus = {
    ...currentStatus,
    maxUnlocks: newMaxUnlocks,
    dmsSentToday: newDmsSent,
    lastResetDate: today,
  };

  // Update in database
  await supabase
    .from('user_unlock_status')
    .upsert({
      user_id: userId,
      unlocked_count: newStatus.unlockedCount,
      max_unlocks: newMaxUnlocks,
      dms_sent_today: newDmsSent,
      last_reset_date: today,
    });

  return newStatus;
}

// Track when a response is viewed (unlocked)
export async function trackResponseViewed(userId: string, responseId: string): Promise<UnlockStatus> {
  const today = new Date().toISOString().split('T')[0];
  const currentStatus = await getUnlockStatus(userId);

  // Check if we've hit the limit
  if (currentStatus.unlockedCount >= currentStatus.maxUnlocks) {
    return currentStatus;
  }

  const newUnlockedCount = currentStatus.unlockedCount + 1;

  const newStatus: UnlockStatus = {
    ...currentStatus,
    unlockedCount: newUnlockedCount,
    lastResetDate: today,
  };

  // Update in database
  await supabase
    .from('user_unlock_status')
    .upsert({
      user_id: userId,
      unlocked_count: newUnlockedCount,
      max_unlocks: currentStatus.maxUnlocks,
      dms_sent_today: currentStatus.dmsSentToday,
      last_reset_date: today,
    });

  return newStatus;
}

// Check if user can unlock more responses
export function canUnlockMore(status: UnlockStatus): boolean {
  return status.unlockedCount < status.maxUnlocks;
}

// Get remaining unlocks
export function getRemainingUnlocks(status: UnlockStatus): number {
  return Math.max(0, status.maxUnlocks - status.unlockedCount);
}
