-- ============================================
-- LIMBO PARTY MODE - Database Migration
-- ============================================
-- Run this migration in your Supabase SQL editor
-- This creates all tables, indexes, RLS policies, and RPC functions for Party Mode

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE game_room_status AS ENUM ('lobby', 'playing', 'voting', 'results', 'ended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE game_round_status AS ENUM ('waiting', 'active', 'voting', 'results', 'complete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- Game Rooms table
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Party Game',
  code TEXT UNIQUE NOT NULL,
  status game_room_status DEFAULT 'lobby',
  max_players INTEGER DEFAULT 10 CHECK (max_players >= 2 AND max_players <= 50),
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 5 CHECK (total_rounds >= 1 AND total_rounds <= 20),
  round_duration_seconds INTEGER DEFAULT 60 CHECK (round_duration_seconds >= 15 AND round_duration_seconds <= 300),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Game Participants
CREATE TABLE IF NOT EXISTS game_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  is_ready BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

-- Game Rounds
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number > 0),
  prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  prompt_text TEXT NOT NULL,
  prompt_type TEXT DEFAULT 'general' CHECK (prompt_type IN ('general', 'debate', 'draw')),
  status game_round_status DEFAULT 'waiting',
  started_at TIMESTAMPTZ,
  voting_started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, round_number)
);

-- Game Responses
CREATE TABLE IF NOT EXISTS game_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text_content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image', 'drawing', 'audio')),
  votes INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, user_id)
);

-- Game Votes
CREATE TABLE IF NOT EXISTS game_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID NOT NULL REFERENCES game_responses(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(response_id, voter_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON game_rooms(code);
CREATE INDEX IF NOT EXISTS idx_game_rooms_host ON game_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_game_rooms_created ON game_rooms(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_participants_game ON game_participants(game_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_user ON game_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_game_user ON game_participants(game_id, user_id);

CREATE INDEX IF NOT EXISTS idx_game_rounds_game ON game_rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_status ON game_rounds(status);
CREATE INDEX IF NOT EXISTS idx_game_rounds_game_number ON game_rounds(game_id, round_number DESC);

CREATE INDEX IF NOT EXISTS idx_game_responses_round ON game_responses(round_id);
CREATE INDEX IF NOT EXISTS idx_game_responses_user ON game_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_game_responses_votes ON game_responses(votes DESC);

CREATE INDEX IF NOT EXISTS idx_game_votes_response ON game_votes(response_id);
CREATE INDEX IF NOT EXISTS idx_game_votes_voter ON game_votes(voter_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_votes ENABLE ROW LEVEL SECURITY;

-- Game Rooms policies
CREATE POLICY "Users can view games they host or participate in"
  ON game_rooms FOR SELECT TO authenticated
  USING (
    host_id = auth.uid()
    OR id IN (SELECT game_id FROM game_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create games"
  ON game_rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update their game"
  ON game_rooms FOR UPDATE TO authenticated
  USING (auth.uid() = host_id);

CREATE POLICY "Host can delete their game"
  ON game_rooms FOR DELETE TO authenticated
  USING (auth.uid() = host_id);

-- Game Participants policies
CREATE POLICY "Users can view participants in their games"
  ON game_participants FOR SELECT TO authenticated
  USING (
    game_id IN (
      SELECT id FROM game_rooms WHERE host_id = auth.uid()
      UNION
      SELECT game_id FROM game_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join games"
  ON game_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participant record"
  ON game_participants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave games"
  ON game_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Game Rounds policies
CREATE POLICY "Users can view rounds in their games"
  ON game_rounds FOR SELECT TO authenticated
  USING (
    game_id IN (
      SELECT id FROM game_rooms WHERE host_id = auth.uid()
      UNION
      SELECT game_id FROM game_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Host can create rounds"
  ON game_rounds FOR INSERT TO authenticated
  WITH CHECK (
    game_id IN (SELECT id FROM game_rooms WHERE host_id = auth.uid())
  );

CREATE POLICY "Host can update rounds"
  ON game_rounds FOR UPDATE TO authenticated
  USING (
    game_id IN (SELECT id FROM game_rooms WHERE host_id = auth.uid())
  );

-- Game Responses policies
CREATE POLICY "Users can view responses in their games"
  ON game_responses FOR SELECT TO authenticated
  USING (
    round_id IN (
      SELECT gr.id FROM game_rounds gr
      JOIN game_participants gp ON gr.game_id = gp.game_id
      WHERE gp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can submit their own responses"
  ON game_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses"
  ON game_responses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Game Votes policies
CREATE POLICY "Users can view votes in their games"
  ON game_votes FOR SELECT TO authenticated
  USING (
    response_id IN (
      SELECT gr.id FROM game_responses gr
      JOIN game_rounds rd ON gr.round_id = rd.id
      JOIN game_participants gp ON rd.game_id = gp.game_id
      WHERE gp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can cast votes"
  ON game_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Users can remove their votes"
  ON game_votes FOR DELETE TO authenticated
  USING (auth.uid() = voter_id);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Generate unique room code
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character uppercase alphanumeric code
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6));
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM game_rooms WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Create game room
CREATE OR REPLACE FUNCTION create_game_room(
  p_name TEXT DEFAULT 'Party Game',
  p_max_players INTEGER DEFAULT 10,
  p_total_rounds INTEGER DEFAULT 5,
  p_round_duration INTEGER DEFAULT 60
)
RETURNS game_rooms AS $$
DECLARE
  v_code TEXT;
  v_room game_rooms;
BEGIN
  -- Generate unique code
  v_code := generate_room_code();

  -- Create room
  INSERT INTO game_rooms (host_id, name, code, max_players, total_rounds, round_duration_seconds)
  VALUES (auth.uid(), p_name, v_code, p_max_players, p_total_rounds, p_round_duration)
  RETURNING * INTO v_room;

  -- Add host as first participant (auto-ready)
  INSERT INTO game_participants (game_id, user_id, is_ready)
  VALUES (v_room.id, auth.uid(), true);

  RETURN v_room;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Join game by code
CREATE OR REPLACE FUNCTION join_game_room(p_code TEXT)
RETURNS jsonb AS $$
DECLARE
  v_room game_rooms;
  v_participant game_participants;
  v_count INTEGER;
BEGIN
  -- Find room by code (case insensitive)
  SELECT * INTO v_room
  FROM game_rooms
  WHERE UPPER(code) = UPPER(p_code) AND status = 'lobby';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found or already started');
  END IF;

  -- Check if game is full
  SELECT COUNT(*) INTO v_count FROM game_participants WHERE game_id = v_room.id;
  IF v_count >= v_room.max_players THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game is full');
  END IF;

  -- Check if already a participant
  SELECT * INTO v_participant
  FROM game_participants
  WHERE game_id = v_room.id AND user_id = auth.uid();

  IF FOUND THEN
    -- Update connected status
    UPDATE game_participants
    SET is_connected = true, last_seen_at = NOW()
    WHERE id = v_participant.id
    RETURNING * INTO v_participant;
  ELSE
    -- Join as new participant
    INSERT INTO game_participants (game_id, user_id)
    VALUES (v_room.id, auth.uid())
    RETURNING * INTO v_participant;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'game_id', v_room.id,
    'participant_id', v_participant.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set player ready status
CREATE OR REPLACE FUNCTION set_player_ready(p_game_id UUID, p_is_ready BOOLEAN)
RETURNS game_participants AS $$
DECLARE
  v_participant game_participants;
BEGIN
  UPDATE game_participants
  SET is_ready = p_is_ready, last_seen_at = NOW()
  WHERE game_id = p_game_id AND user_id = auth.uid()
  RETURNING * INTO v_participant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a participant in this game';
  END IF;

  RETURN v_participant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Start next round (host only)
CREATE OR REPLACE FUNCTION start_game_round(p_game_id UUID, p_prompt_text TEXT DEFAULT NULL)
RETURNS game_rounds AS $$
DECLARE
  v_room game_rooms;
  v_round game_rounds;
  v_prompt prompts;
  v_prompt_text TEXT;
  v_next_round INTEGER;
BEGIN
  -- Verify host
  SELECT * INTO v_room FROM game_rooms WHERE id = p_game_id AND host_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized - only host can start rounds';
  END IF;

  -- Calculate next round number
  v_next_round := v_room.current_round + 1;

  -- Check if game is complete
  IF v_next_round > v_room.total_rounds THEN
    RAISE EXCEPTION 'All rounds completed';
  END IF;

  -- Use provided prompt or get random one
  IF p_prompt_text IS NOT NULL THEN
    v_prompt_text := p_prompt_text;
  ELSE
    SELECT * INTO v_prompt FROM prompts
    WHERE type = 'daily' AND is_active = true
    ORDER BY RANDOM() LIMIT 1;

    IF FOUND THEN
      v_prompt_text := v_prompt.text;
    ELSE
      v_prompt_text := 'What''s on your mind?';
    END IF;
  END IF;

  -- Mark any active rounds as complete
  UPDATE game_rounds
  SET status = 'complete', ended_at = NOW()
  WHERE game_id = p_game_id AND status IN ('active', 'voting', 'results');

  -- Create new round
  INSERT INTO game_rounds (game_id, round_number, prompt_id, prompt_text, status, started_at)
  VALUES (p_game_id, v_next_round, v_prompt.id, v_prompt_text, 'active', NOW())
  RETURNING * INTO v_round;

  -- Update room status and round counter
  UPDATE game_rooms
  SET current_round = v_next_round, status = 'playing', started_at = COALESCE(started_at, NOW())
  WHERE id = p_game_id;

  RETURN v_round;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- End round and start voting (host only)
CREATE OR REPLACE FUNCTION end_round_start_voting(p_round_id UUID)
RETURNS game_rounds AS $$
DECLARE
  v_round game_rounds;
  v_room game_rooms;
BEGIN
  -- Get round and verify host
  SELECT r.*, g.host_id INTO v_round
  FROM game_rounds r
  JOIN game_rooms g ON r.game_id = g.id
  WHERE r.id = p_round_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round not found';
  END IF;

  SELECT * INTO v_room FROM game_rooms WHERE id = v_round.game_id AND host_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized - only host can end rounds';
  END IF;

  -- Update round to voting status
  UPDATE game_rounds
  SET status = 'voting', voting_started_at = NOW()
  WHERE id = p_round_id
  RETURNING * INTO v_round;

  -- Update room status
  UPDATE game_rooms SET status = 'voting' WHERE id = v_round.game_id;

  RETURN v_round;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- End voting and show results (host only)
CREATE OR REPLACE FUNCTION end_voting_show_results(p_round_id UUID)
RETURNS game_rounds AS $$
DECLARE
  v_round game_rounds;
  v_room game_rooms;
BEGIN
  -- Get round and verify host
  SELECT * INTO v_round FROM game_rounds WHERE id = p_round_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round not found';
  END IF;

  SELECT * INTO v_room FROM game_rooms WHERE id = v_round.game_id AND host_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized - only host can end voting';
  END IF;

  -- Update round to results status
  UPDATE game_rounds
  SET status = 'results', ended_at = NOW()
  WHERE id = p_round_id
  RETURNING * INTO v_round;

  -- Update room status
  UPDATE game_rooms SET status = 'results' WHERE id = v_round.game_id;

  -- Update participant scores based on votes
  UPDATE game_participants gp
  SET score = gp.score + COALESCE(vote_counts.total_votes, 0)
  FROM (
    SELECT gr.user_id, SUM(gr.votes) as total_votes
    FROM game_responses gr
    WHERE gr.round_id = p_round_id
    GROUP BY gr.user_id
  ) vote_counts
  WHERE gp.user_id = vote_counts.user_id AND gp.game_id = v_round.game_id;

  RETURN v_round;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Submit game response
CREATE OR REPLACE FUNCTION submit_game_response(
  p_round_id UUID,
  p_text_content TEXT DEFAULT NULL,
  p_media_url TEXT DEFAULT NULL,
  p_media_type TEXT DEFAULT NULL
)
RETURNS game_responses AS $$
DECLARE
  v_response game_responses;
  v_round game_rounds;
BEGIN
  -- Verify round is active
  SELECT * INTO v_round FROM game_rounds WHERE id = p_round_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round is not active';
  END IF;

  -- Verify user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM game_participants
    WHERE game_id = v_round.game_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant in this game';
  END IF;

  -- Upsert response
  INSERT INTO game_responses (round_id, user_id, text_content, media_url, media_type)
  VALUES (p_round_id, auth.uid(), p_text_content, p_media_url, p_media_type)
  ON CONFLICT (round_id, user_id) DO UPDATE
  SET text_content = EXCLUDED.text_content,
      media_url = EXCLUDED.media_url,
      media_type = EXCLUDED.media_type,
      updated_at = NOW()
  RETURNING * INTO v_response;

  RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vote for a response
CREATE OR REPLACE FUNCTION vote_for_response(p_response_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_response game_responses;
  v_round game_rounds;
BEGIN
  -- Get response and round info
  SELECT * INTO v_response FROM game_responses WHERE id = p_response_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Response not found';
  END IF;

  -- Can't vote for yourself
  IF v_response.user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot vote for yourself');
  END IF;

  -- Verify round is in voting status
  SELECT * INTO v_round FROM game_rounds WHERE id = v_response.round_id AND status = 'voting';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voting is not open');
  END IF;

  -- Verify user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM game_participants
    WHERE game_id = v_round.game_id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;

  -- Insert vote (or ignore if already voted)
  INSERT INTO game_votes (response_id, voter_id)
  VALUES (p_response_id, auth.uid())
  ON CONFLICT (response_id, voter_id) DO NOTHING;

  -- Update vote count
  UPDATE game_responses
  SET votes = (SELECT COUNT(*) FROM game_votes WHERE response_id = p_response_id)
  WHERE id = p_response_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove vote
CREATE OR REPLACE FUNCTION unvote_response(p_response_id UUID)
RETURNS jsonb AS $$
BEGIN
  -- Delete vote
  DELETE FROM game_votes
  WHERE response_id = p_response_id AND voter_id = auth.uid();

  -- Update vote count
  UPDATE game_responses
  SET votes = (SELECT COUNT(*) FROM game_votes WHERE response_id = p_response_id)
  WHERE id = p_response_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- End game (host only)
CREATE OR REPLACE FUNCTION end_game(p_game_id UUID)
RETURNS game_rooms AS $$
DECLARE
  v_room game_rooms;
BEGIN
  -- Verify host
  SELECT * INTO v_room FROM game_rooms WHERE id = p_game_id AND host_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized - only host can end the game';
  END IF;

  -- Mark any active rounds as complete
  UPDATE game_rounds
  SET status = 'complete', ended_at = NOW()
  WHERE game_id = p_game_id AND status != 'complete';

  -- Update room status
  UPDATE game_rooms
  SET status = 'ended', ended_at = NOW()
  WHERE id = p_game_id
  RETURNING * INTO v_room;

  RETURN v_room;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Leave game
CREATE OR REPLACE FUNCTION leave_game(p_game_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_room game_rooms;
  v_was_host BOOLEAN;
BEGIN
  -- Check if user is host
  SELECT host_id = auth.uid() INTO v_was_host FROM game_rooms WHERE id = p_game_id;

  -- Remove participant
  DELETE FROM game_participants
  WHERE game_id = p_game_id AND user_id = auth.uid();

  -- If host left and game in lobby, end the game
  IF v_was_host THEN
    UPDATE game_rooms
    SET status = 'ended', ended_at = NOW()
    WHERE id = p_game_id AND status = 'lobby';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get game leaderboard
CREATE OR REPLACE FUNCTION get_game_leaderboard(p_game_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  score INTEGER,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    gp.score,
    RANK() OVER (ORDER BY gp.score DESC)::INTEGER as rank
  FROM game_participants gp
  JOIN profiles p ON gp.user_id = p.id
  WHERE gp.game_id = p_game_id
  ORDER BY gp.score DESC, gp.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update participant heartbeat (for presence)
CREATE OR REPLACE FUNCTION update_participant_heartbeat(p_game_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE game_participants
  SET last_seen_at = NOW(), is_connected = true
  WHERE game_id = p_game_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark participant as disconnected
CREATE OR REPLACE FUNCTION mark_participant_disconnected(p_game_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE game_participants
  SET is_connected = false
  WHERE game_id = p_game_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REALTIME PUBLICATION
-- ============================================

-- Enable realtime for party mode tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE game_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE game_responses;

-- ============================================
-- CLEANUP JOB (Optional - run via pg_cron or external scheduler)
-- ============================================

-- Function to clean up old game rooms (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_game_rooms()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM game_rooms
    WHERE
      (status = 'ended' AND ended_at < NOW() - INTERVAL '24 hours')
      OR (status = 'lobby' AND created_at < NOW() - INTERVAL '24 hours')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deleted;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANTS
-- ============================================

-- Grant execute on all functions to authenticated users
GRANT EXECUTE ON FUNCTION generate_room_code() TO authenticated;
GRANT EXECUTE ON FUNCTION create_game_room(TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION join_game_room(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_player_ready(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION start_game_round(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION end_round_start_voting(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_voting_show_results(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_game_response(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION vote_for_response(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unvote_response(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_game(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION leave_game(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_game_leaderboard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_participant_heartbeat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_participant_disconnected(UUID) TO authenticated;
