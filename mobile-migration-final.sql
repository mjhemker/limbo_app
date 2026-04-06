-- Limbo Mobile - Final Safe Migration
-- Handles all edge cases with existing tables

-- =============================================
-- STEP 1: Add expo_push_token to profiles
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'expo_push_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN expo_push_token TEXT;
    CREATE INDEX idx_profiles_expo_push_token ON profiles(expo_push_token)
    WHERE expo_push_token IS NOT NULL;
  END IF;
END $$;

-- =============================================
-- STEP 2: Ensure profiles has needed columns
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'streak'
  ) THEN
    ALTER TABLE profiles ADD COLUMN streak INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'friend_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN friend_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- =============================================
-- STEP 3: Ensure responses has is_pinned
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'responses' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE responses ADD COLUMN is_pinned BOOLEAN DEFAULT false;
    CREATE INDEX idx_responses_pinned ON responses(user_id, is_pinned)
    WHERE is_pinned = true;
  END IF;
END $$;

-- =============================================
-- STEP 4: Handle circles table
-- =============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'circles'
  ) THEN
    -- Add creator_id if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'circles' AND column_name = 'creator_id'
    ) THEN
      ALTER TABLE circles ADD COLUMN creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

      UPDATE circles c SET creator_id = (
        SELECT user_id FROM circle_members
        WHERE circle_id = c.id AND role = 'admin' LIMIT 1
      ) WHERE creator_id IS NULL;

      UPDATE circles c SET creator_id = (
        SELECT user_id FROM circle_members WHERE circle_id = c.id LIMIT 1
      ) WHERE creator_id IS NULL;

      ALTER TABLE circles ALTER COLUMN creator_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'circles' AND column_name = 'description'
    ) THEN
      ALTER TABLE circles ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'circles' AND column_name = 'avatar_url'
    ) THEN
      ALTER TABLE circles ADD COLUMN avatar_url TEXT;
    END IF;
  ELSE
    CREATE TABLE circles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      avatar_url TEXT,
      creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =============================================
-- STEP 5: Other circle tables
-- =============================================

CREATE TABLE IF NOT EXISTS circle_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS circle_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE circle_prompts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS circle_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_prompt_id UUID NOT NULL REFERENCES circle_prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text_content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_prompt_id, user_id)
);

ALTER TABLE circle_responses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS circle_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE circle_messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 6: Handle reactions table carefully
-- =============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'reactions'
  ) THEN
    -- Table exists - ensure it has all needed columns

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'reactions' AND column_name = 'message_id'
    ) THEN
      ALTER TABLE reactions ADD COLUMN message_id UUID REFERENCES messages(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'reactions' AND column_name = 'response_id'
    ) THEN
      ALTER TABLE reactions ADD COLUMN response_id UUID REFERENCES responses(id) ON DELETE CASCADE;
    END IF;

    -- Drop existing constraints if they exist (to recreate them properly)
    ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_user_id_response_id_emoji_key;
    ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_user_id_message_id_emoji_key;
    ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_check;

    -- Add constraints
    ALTER TABLE reactions ADD CONSTRAINT reactions_check CHECK (
      (response_id IS NOT NULL AND message_id IS NULL)
      OR (response_id IS NULL AND message_id IS NOT NULL)
    );

    -- Only add unique constraints if columns exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'reactions' AND column_name = 'response_id'
    ) THEN
      ALTER TABLE reactions ADD CONSTRAINT reactions_user_id_response_id_emoji_key
      UNIQUE(user_id, response_id, emoji);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'reactions' AND column_name = 'message_id'
    ) THEN
      ALTER TABLE reactions ADD CONSTRAINT reactions_user_id_message_id_emoji_key
      UNIQUE(user_id, message_id, emoji);
    END IF;

  ELSE
    -- Table doesn't exist - create fresh
    CREATE TABLE reactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
      message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CHECK (
        (response_id IS NOT NULL AND message_id IS NULL)
        OR (response_id IS NULL AND message_id IS NOT NULL)
      ),
      UNIQUE(user_id, response_id, emoji),
      UNIQUE(user_id, message_id, emoji)
    );
    ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =============================================
-- STEP 7: Create indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_circles_creator_id ON circles(creator_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user_id ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_prompts_circle_id ON circle_prompts(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_prompts_created_at ON circle_prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_circle_responses_prompt_id ON circle_responses(circle_prompt_id);
CREATE INDEX IF NOT EXISTS idx_circle_responses_user_id ON circle_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_messages_circle_id ON circle_messages(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_messages_created_at ON circle_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_response_id ON reactions(response_id);
CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);

-- =============================================
-- STEP 8: Storage buckets
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('response-media', 'response-media', true),
  ('response-audio', 'response-audio', true),
  ('message-media', 'message-media', true),
  ('message-audio', 'message-audio', true),
  ('circle-avatars', 'circle-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STEP 9: RLS Policies
-- =============================================

DO $$
BEGIN
  -- Circles policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'circles' AND policyname = 'Circle members can view circles'
  ) THEN
    CREATE POLICY "Circle members can view circles" ON circles FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM circle_members
        WHERE circle_id = circles.id AND user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'circles' AND policyname = 'Users can create circles'
  ) THEN
    CREATE POLICY "Users can create circles" ON circles FOR INSERT
    WITH CHECK (auth.uid() = creator_id);
  END IF;

  -- Circle members policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'circle_members' AND policyname = 'Circle members can view members'
  ) THEN
    CREATE POLICY "Circle members can view members" ON circle_members FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM circle_members cm
        WHERE cm.circle_id = circle_members.circle_id AND cm.user_id = auth.uid()
      )
    );
  END IF;

  -- Circle messages policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'circle_messages' AND policyname = 'Circle members can view messages'
  ) THEN
    CREATE POLICY "Circle members can view messages" ON circle_messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM circle_members
        WHERE circle_id = circle_messages.circle_id AND user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'circle_messages' AND policyname = 'Circle members can send messages'
  ) THEN
    CREATE POLICY "Circle members can send messages" ON circle_messages FOR INSERT
    WITH CHECK (
      auth.uid() = sender_id AND EXISTS (
        SELECT 1 FROM circle_members
        WHERE circle_id = circle_messages.circle_id AND user_id = auth.uid()
      )
    );
  END IF;

  -- Reactions policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reactions' AND policyname = 'Users can view reactions'
  ) THEN
    CREATE POLICY "Users can view reactions" ON reactions FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reactions' AND policyname = 'Users can create reactions'
  ) THEN
    CREATE POLICY "Users can create reactions" ON reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reactions' AND policyname = 'Users can delete own reactions'
  ) THEN
    CREATE POLICY "Users can delete own reactions" ON reactions FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

SELECT '✓ Migration completed successfully!' as message;

-- Show status of mobile features
SELECT
  'expo_push_token' as feature,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'expo_push_token'
  ) THEN '✓ READY' ELSE '✗ MISSING' END as status

UNION ALL SELECT 'circles table',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'circles'
  ) THEN '✓ READY' ELSE '✗ MISSING' END

UNION ALL SELECT 'reactions table',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'reactions'
  ) THEN '✓ READY' ELSE '✗ MISSING' END

UNION ALL SELECT 'circle_messages table',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'circle_messages'
  ) THEN '✓ READY' ELSE '✗ MISSING' END

UNION ALL SELECT 'reactions.message_id column',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reactions' AND column_name = 'message_id'
  ) THEN '✓ READY' ELSE '✗ MISSING' END;
