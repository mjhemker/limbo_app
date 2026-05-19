-- ============================================
-- PUSH NOTIFICATIONS SYSTEM FOR LIMBO
-- ============================================
-- Run this in Supabase SQL Editor to set up notification triggers

-- 1. Add notifications_enabled column to chat_members (for circle notification preferences)
ALTER TABLE chat_members
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

-- 2. Create the http extension if not exists (needed to call edge functions)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 3. Helper function to call the send-notification edge function
CREATE OR REPLACE FUNCTION call_send_notification(payload JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get Supabase URL from environment or hardcode for your project
  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL THEN
    supabase_url := 'https://aqaauryiptfbuqrtfcnu.supabase.co';
  END IF;

  -- Call the edge function (fire and forget)
  PERFORM extensions.http_post(
    supabase_url || '/functions/v1/send-notification',
    payload::text,
    'application/json'
  );
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to send notification: %', SQLERRM;
END;
$$;

-- ============================================
-- TRIGGER: New Message Notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
  message_preview TEXT;
  is_circle_chat BOOLEAN;
  circle_name TEXT;
  circle_id UUID;
  member_notifications_enabled BOOLEAN;
BEGIN
  -- Get sender name
  SELECT display_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Check if this is a circle (group) chat
  SELECT
    c.is_group,
    c.name,
    c.id
  INTO is_circle_chat, circle_name, circle_id
  FROM chats c
  WHERE c.id = NEW.chat_id;

  -- Get message preview (truncate if too long)
  message_preview := LEFT(NEW.content, 50);
  IF LENGTH(NEW.content) > 50 THEN
    message_preview := message_preview || '...';
  END IF;

  IF is_circle_chat THEN
    -- Circle message: notify all members except sender (if they have notifications on)
    FOR recipient_id, member_notifications_enabled IN
      SELECT cm.user_id, COALESCE(cm.notifications_enabled, true)
      FROM chat_members cm
      WHERE cm.chat_id = NEW.chat_id
      AND cm.user_id != NEW.sender_id
    LOOP
      IF member_notifications_enabled THEN
        PERFORM call_send_notification(jsonb_build_object(
          'type', 'circle_message',
          'recipientUserId', recipient_id,
          'senderName', sender_name,
          'senderId', NEW.sender_id,
          'messagePreview', message_preview,
          'circleName', circle_name,
          'circleId', circle_id
        ));
      END IF;
    END LOOP;
  ELSE
    -- DM: notify the other person
    SELECT user_id INTO recipient_id
    FROM chat_members
    WHERE chat_id = NEW.chat_id
    AND user_id != NEW.sender_id
    LIMIT 1;

    IF recipient_id IS NOT NULL THEN
      PERFORM call_send_notification(jsonb_build_object(
        'type', 'message',
        'recipientUserId', recipient_id,
        'senderName', sender_name,
        'senderId', NEW.sender_id,
        'messagePreview', message_preview
      ));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- ============================================
-- TRIGGER: New Daily Prompt Notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_new_daily_prompt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Only notify for daily prompts (type = 'daily')
  IF NEW.type != 'daily' THEN
    RETURN NEW;
  END IF;

  -- Notify all users with push tokens
  FOR user_record IN
    SELECT id, expo_push_token
    FROM profiles
    WHERE expo_push_token IS NOT NULL
  LOOP
    PERFORM call_send_notification(jsonb_build_object(
      'type', 'daily_prompt',
      'recipientUserId', user_record.id,
      'promptText', NEW.text,
      'promptId', NEW.id
    ));
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_daily_prompt ON prompts;
CREATE TRIGGER on_new_daily_prompt
  AFTER INSERT ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_daily_prompt();

-- ============================================
-- TRIGGER: Friend Request Notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requester_name TEXT;
BEGIN
  -- Only notify on new pending requests
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get requester name
  SELECT display_name INTO requester_name
  FROM profiles
  WHERE id = NEW.requester_id;

  -- Notify the addressee
  PERFORM call_send_notification(jsonb_build_object(
    'type', 'friend_request',
    'recipientUserId', NEW.addressee_id,
    'requesterName', requester_name,
    'requesterId', NEW.requester_id
  ));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_friend_request ON friendships;
CREATE TRIGGER on_friend_request
  AFTER INSERT ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request();

-- ============================================
-- TRIGGER: Nudge Notification
-- ============================================
-- First, check if nudges table exists; if not, create it
CREATE TABLE IF NOT EXISTS nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION notify_nudge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  nudger_name TEXT;
  prompt_text TEXT;
BEGIN
  -- Get nudger name
  SELECT display_name INTO nudger_name
  FROM profiles
  WHERE id = NEW.from_user_id;

  -- Get prompt text if available
  IF NEW.prompt_id IS NOT NULL THEN
    SELECT text INTO prompt_text
    FROM prompts
    WHERE id = NEW.prompt_id;
  END IF;

  -- Notify the recipient
  PERFORM call_send_notification(jsonb_build_object(
    'type', 'nudge',
    'recipientUserId', NEW.to_user_id,
    'nudgerName', nudger_name,
    'nudgerId', NEW.from_user_id,
    'promptText', prompt_text
  ));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_nudge ON nudges;
CREATE TRIGGER on_nudge
  AFTER INSERT ON nudges
  FOR EACH ROW
  EXECUTE FUNCTION notify_nudge();

-- ============================================
-- TRIGGER: Circle Prompt Notification
-- ============================================
-- This triggers when a prompt is posted to a circle/group chat
CREATE OR REPLACE FUNCTION notify_circle_prompt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  member_record RECORD;
  circle_name TEXT;
BEGIN
  -- Only notify for circle prompts (has chat_id)
  IF NEW.chat_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get circle name
  SELECT name INTO circle_name
  FROM chats
  WHERE id = NEW.chat_id;

  -- Notify all members with notifications enabled
  FOR member_record IN
    SELECT cm.user_id
    FROM chat_members cm
    WHERE cm.chat_id = NEW.chat_id
    AND COALESCE(cm.notifications_enabled, true) = true
    AND cm.user_id != NEW.created_by
  LOOP
    PERFORM call_send_notification(jsonb_build_object(
      'type', 'circle_prompt',
      'recipientUserId', member_record.user_id,
      'promptText', NEW.text,
      'promptId', NEW.id,
      'circleName', circle_name,
      'circleId', NEW.chat_id
    ));
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_circle_prompt ON prompts;
CREATE TRIGGER on_circle_prompt
  AFTER INSERT ON prompts
  FOR EACH ROW
  WHEN (NEW.chat_id IS NOT NULL)
  EXECUTE FUNCTION notify_circle_prompt();

-- ============================================
-- RPC: Toggle circle notifications
-- ============================================
CREATE OR REPLACE FUNCTION toggle_circle_notifications(
  p_chat_id UUID,
  p_enabled BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE chat_members
  SET notifications_enabled = p_enabled
  WHERE chat_id = p_chat_id
  AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_circle_notifications(UUID, BOOLEAN) TO authenticated;

-- ============================================
-- RPC: Get circle notification status
-- ============================================
CREATE OR REPLACE FUNCTION get_circle_notification_status(p_chat_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT COALESCE(notifications_enabled, true) INTO v_enabled
  FROM chat_members
  WHERE chat_id = p_chat_id
  AND user_id = auth.uid();

  RETURN COALESCE(v_enabled, true);
END;
$$;

GRANT EXECUTE ON FUNCTION get_circle_notification_status(UUID) TO authenticated;

-- ============================================
-- Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION call_send_notification(JSONB) TO postgres;
GRANT EXECUTE ON FUNCTION notify_new_message() TO postgres;
GRANT EXECUTE ON FUNCTION notify_new_daily_prompt() TO postgres;
GRANT EXECUTE ON FUNCTION notify_friend_request() TO postgres;
GRANT EXECUTE ON FUNCTION notify_nudge() TO postgres;
GRANT EXECUTE ON FUNCTION notify_circle_prompt() TO postgres;
