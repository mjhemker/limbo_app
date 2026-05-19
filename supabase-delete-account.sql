-- Delete User Account Function
-- Run this migration on your Supabase database to enable account deletion
-- IMPORTANT: Run this as the postgres superuser in Supabase SQL Editor

-- Grant necessary permissions for the function to delete auth users
GRANT DELETE ON TABLE auth.users TO postgres;

-- Create the delete_user_account function
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current user ID from the auth context
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user's reactions
  DELETE FROM reactions WHERE user_id = current_user_id;

  -- Delete user's responses
  DELETE FROM responses WHERE user_id = current_user_id;

  -- Delete user's messages
  DELETE FROM messages WHERE sender_id = current_user_id;

  -- Delete user's chat memberships
  DELETE FROM chat_members WHERE user_id = current_user_id;

  -- Delete user's friendships (both directions)
  DELETE FROM friendships
  WHERE requester_id = current_user_id OR addressee_id = current_user_id;

  -- Delete user's blocks (both directions)
  DELETE FROM user_blocks
  WHERE blocker_id = current_user_id OR blocked_id = current_user_id;

  -- Delete user's reports
  DELETE FROM reports WHERE reporter_id = current_user_id;

  -- Delete prompts created by the user
  DELETE FROM prompts WHERE created_by = current_user_id;

  -- Delete the user's profile
  DELETE FROM profiles WHERE id = current_user_id;

  -- Delete the auth user from auth.users
  -- This requires the function to be SECURITY DEFINER and have proper permissions
  DELETE FROM auth.users WHERE id = current_user_id;

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION delete_user_account() IS 'Deletes all user data and their account. Required for App Store compliance (Guideline 5.1.1(v)).';
