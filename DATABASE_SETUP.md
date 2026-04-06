# Database Setup Guide

This guide will help you set up your Supabase database for the Limbo mobile app.

## Prerequisites

- Supabase account (sign up at https://supabase.com)
- Supabase project created

## Setup Steps

### 1. Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### 2. Run the Schema Script

1. Open the file `supabase-schema.sql`
2. Copy all contents
3. Paste into the Supabase SQL Editor
4. Click "Run" (or press Cmd/Ctrl + Enter)

This will create:
- ✅ All 11 database tables
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Storage buckets for media
- ✅ Triggers and functions
- ✅ Sample seed data

### 3. Verify Tables Were Created

In Supabase, go to "Table Editor" and verify you see:

- `profiles` - User profiles
- `prompts` - Daily and optional prompts
- `responses` - User responses to prompts
- `friendships` - Friend relationships
- `messages` - Direct messages
- `circles` - Group chats
- `circle_members` - Circle membership
- `circle_prompts` - Prompts within circles
- `circle_responses` - Responses to circle prompts
- `circle_messages` - Messages within circles
- `reactions` - Emoji reactions

### 4. Verify Storage Buckets

Go to "Storage" and verify you see these buckets:

- `avatars` - User avatars
- `response-media` - Images/videos in responses
- `response-audio` - Audio in responses
- `message-media` - Images/videos in messages
- `message-audio` - Audio in messages
- `circle-avatars` - Circle group avatars

### 5. Get Your Credentials

1. Go to "Project Settings" > "API"
2. Copy these values to your `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Database Schema Overview

### Core Tables

**profiles** - User information
- Linked to Supabase Auth
- Stores username, display name, bio, avatar
- Tracks streak and friend count

**prompts** - Daily prompts
- One prompt per day
- Optional prompts for variety
- Active date determines today's prompt

**responses** - User answers
- Text, image, video, or audio
- Can be pinned to profile (max 6)
- Visibility controlled by user

**friendships** - Friend connections
- Pending/accepted/declined status
- Bidirectional relationships
- Auto-updates friend_count

**messages** - Direct messaging
- Auto-deletes after 30 days
- Supports media and audio
- Read status tracking

### Circle Tables

**circles** - Group chats
- Created by users
- Has members with roles (admin/member)
- Supports custom prompts and chat

**circle_members** - Membership
- Links users to circles
- Admin or member role
- Controls permissions

**circle_prompts** - Group prompts
- Members can create prompts
- Admins can delete
- Circle-specific responses

**circle_messages** - Group chat
- All members can send
- Real-time messaging

### Other Tables

**reactions** - Emoji reactions
- On responses or messages
- One reaction per user per item
- Popular emojis tracked

## Row Level Security (RLS)

All tables have RLS enabled for security:

- ✅ Users can only update their own data
- ✅ Friend content only visible to friends
- ✅ Circle content only visible to members
- ✅ Messages only visible to participants
- ✅ Storage follows same access rules

## Testing Your Database

### 1. Create a Test User

Sign up in your app (or create in Supabase Auth dashboard).

### 2. Check Profile Creation

After signup, a profile should be automatically created in the `profiles` table with your user ID.

### 3. Insert Test Prompt

```sql
INSERT INTO prompts (text, active_date, is_optional)
VALUES ('What are you looking forward to this week?', CURRENT_DATE, false);
```

### 4. Test Response Creation

Create a response in your app and verify it appears in the `responses` table.

## Common Operations

### Get Today's Prompt

```sql
SELECT * FROM prompts
WHERE active_date = CURRENT_DATE
AND is_optional = false;
```

### Get User's Friends

```sql
SELECT p.*
FROM profiles p
JOIN friendships f ON (p.id = f.friend_id OR p.id = f.user_id)
WHERE (f.user_id = 'YOUR_USER_ID' OR f.friend_id = 'YOUR_USER_ID')
AND f.status = 'accepted'
AND p.id != 'YOUR_USER_ID';
```

### Get Friend Responses

```sql
SELECT r.*, p.display_name, p.avatar_url
FROM responses r
JOIN profiles p ON p.id = r.user_id
WHERE r.prompt_id = 'PROMPT_ID'
AND r.is_visible = true
AND r.user_id IN (
  -- User's friends
  SELECT friend_id FROM friendships
  WHERE user_id = 'YOUR_USER_ID' AND status = 'accepted'
  UNION
  SELECT user_id FROM friendships
  WHERE friend_id = 'YOUR_USER_ID' AND status = 'accepted'
);
```

## Maintenance

### Clean Up Old Messages

The database has a function `delete_old_messages()` to remove messages older than 30 days.

Set up a cron job in Supabase:
1. Go to "Database" > "Cron Jobs"
2. Create new job: `SELECT delete_old_messages();`
3. Schedule: Daily at midnight

### Update Streaks

Create a function to calculate streaks based on response dates:

```sql
-- Run this daily to update all user streaks
CREATE OR REPLACE FUNCTION update_user_streaks()
RETURNS void AS $$
BEGIN
  UPDATE profiles p
  SET streak = (
    SELECT COUNT(DISTINCT DATE(r.created_at))
    FROM responses r
    WHERE r.user_id = p.id
    AND r.created_at >= CURRENT_DATE - INTERVAL '365 days'
    AND r.created_at::date IN (
      -- Get consecutive dates from today backwards
      SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE - INTERVAL '365 days',
        '-1 day'::interval
      )::date
    )
  );
END;
$$ LANGUAGE plpgsql;
```

## Backup

Supabase automatically backs up your database, but you can also:

1. Go to "Database" > "Backups"
2. Create manual backup before major changes
3. Download backups for local storage

## Troubleshooting

### RLS Blocks My Query

If you're getting permission errors:
1. Check you're authenticated (have valid session)
2. Verify the RLS policy allows your operation
3. Use "SQL Editor" to test queries as superuser

### Storage Upload Fails

If file uploads fail:
1. Check bucket exists in Storage
2. Verify storage policies are created
3. Ensure file path matches policy (userId/filename)

### Slow Queries

If queries are slow:
1. Check indexes are created (run schema again)
2. Use "Database" > "Query Performance" to analyze
3. Add missing indexes as needed

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- Check your project logs in Supabase dashboard
