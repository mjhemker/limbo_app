-- ============================================
-- STREAK CALCULATION FOR LIMBO
-- ============================================
-- Streak counts consecutive days where the user responded to the DAILY prompt
-- that was active on that specific day (based on active_date).
-- A streak continues if the user responded today or yesterday.

-- 1. Function to calculate current streak for a user (DAILY PROMPTS ONLY)
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_streak INTEGER := 0;
  v_check_date DATE;
  v_has_response BOOLEAN;
BEGIN
  -- Start checking from today
  v_check_date := CURRENT_DATE;

  -- First check if user responded to a daily prompt today or yesterday
  SELECT EXISTS (
    SELECT 1
    FROM responses r
    JOIN prompts p ON r.prompt_id = p.id
    WHERE r.user_id = p_user_id
    AND p.type = 'daily'
    AND p.active_date IS NOT NULL
    AND p.active_date >= CURRENT_DATE - INTERVAL '1 day'
    AND DATE(r.created_at) >= p.active_date  -- Response was on or after the prompt's active date
  ) INTO v_has_response;

  -- If no response to daily prompt today or yesterday, streak is 0
  IF NOT v_has_response THEN
    RETURN 0;
  END IF;

  -- Count consecutive days going backwards where user answered the daily prompt
  LOOP
    -- Check if user responded to the daily prompt that was active on v_check_date
    SELECT EXISTS (
      SELECT 1
      FROM responses r
      JOIN prompts p ON r.prompt_id = p.id
      WHERE r.user_id = p_user_id
      AND p.type = 'daily'
      AND p.active_date = v_check_date
    ) INTO v_has_response;

    IF v_has_response THEN
      v_streak := v_streak + 1;
      v_check_date := v_check_date - INTERVAL '1 day';
    ELSE
      -- If no response today but we haven't counted any days yet,
      -- check if yesterday started the streak
      IF v_streak = 0 THEN
        v_check_date := CURRENT_DATE - INTERVAL '1 day';
        SELECT EXISTS (
          SELECT 1
          FROM responses r
          JOIN prompts p ON r.prompt_id = p.id
          WHERE r.user_id = p_user_id
          AND p.type = 'daily'
          AND p.active_date = v_check_date
        ) INTO v_has_response;

        IF v_has_response THEN
          v_streak := 1;
          v_check_date := v_check_date - INTERVAL '1 day';
          CONTINUE;
        END IF;
      END IF;
      EXIT;
    END IF;

    -- Safety limit to prevent infinite loops
    IF v_streak > 365 THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN v_streak;
END;
$$;

-- 2. Function to get scrapbook/profile stats
-- - total_prompts: Count of all active prompts (for reference)
-- - answered_prompts: Count of ALL responses by user (daily + scrapbook + optional + etc)
-- - public_count: Count of public/visible responses
-- - current_streak: Consecutive days with daily prompt responses
DROP FUNCTION IF EXISTS get_scrapbook_stats(UUID);

CREATE OR REPLACE FUNCTION get_scrapbook_stats(p_user_id UUID)
RETURNS TABLE (
  total_prompts BIGINT,
  answered_prompts BIGINT,
  public_count BIGINT,
  current_streak INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total active prompts (for reference)
    (SELECT COUNT(*) FROM prompts WHERE is_active = true)::BIGINT as total_prompts,

    -- Count ALL responses by this user (any prompt type)
    (SELECT COUNT(*) FROM responses WHERE user_id = p_user_id)::BIGINT as answered_prompts,

    -- Count public/visible responses
    (SELECT COUNT(*)
     FROM responses
     WHERE user_id = p_user_id
     AND (is_visible = true OR is_public = true))::BIGINT as public_count,

    -- Streak based on daily prompts only
    calculate_user_streak(p_user_id) as current_streak;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION calculate_user_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_scrapbook_stats(UUID) TO authenticated;

-- 4. Test the functions (run these to verify they work)
-- SELECT calculate_user_streak('your-user-id-here');
-- SELECT * FROM get_scrapbook_stats('your-user-id-here');

-- 5. Example: Check a user's daily prompt responses
-- SELECT r.created_at, p.text, p.active_date
-- FROM responses r
-- JOIN prompts p ON r.prompt_id = p.id
-- WHERE r.user_id = 'your-user-id-here'
-- AND p.type = 'daily'
-- ORDER BY p.active_date DESC;
