# Database Migration for Existing Limbo Backend

Since you're using the **existing Supabase backend** from the Limbo web app (Project ID: `aqaauryiptfbuqrtfcnu`), follow these steps to add mobile-specific features.

## ⚠️ Important

**DO NOT** run `supabase-schema.sql` - it's for fresh databases only and will conflict with your existing tables.

Instead, use the migration approach below.

---

## Step 1: Verify What Exists

1. Go to your Supabase project: https://supabase.com/dashboard/project/aqaauryiptfbuqrtfcnu
2. Click **SQL Editor**
3. Copy and run **`verify-schema.sql`**

This will show:
- ✅ Which tables already exist
- ✅ Which storage buckets already exist
- ✅ What columns are in the profiles table

**Expected Results:**

Most tables from the web app should already exist:
- `profiles` ✅
- `prompts` ✅
- `responses` ✅
- `friendships` ✅
- `messages` ✅

These tables might be **missing** (needed for mobile):
- `circles` ❓
- `circle_members` ❓
- `circle_prompts` ❓
- `circle_responses` ❓
- `circle_messages` ❓
- `reactions` ❓

---

## Step 2: Run the Migration

1. In Supabase SQL Editor
2. Copy and run **`mobile-migration.sql`**

This script is **safe to run multiple times** because it:
- ✅ Only adds columns if they don't exist (`ADD COLUMN IF NOT EXISTS`)
- ✅ Only creates tables if they don't exist (`CREATE TABLE IF NOT EXISTS`)
- ✅ Only adds storage buckets if they don't exist (`ON CONFLICT DO NOTHING`)
- ✅ Only creates policies if they don't exist

**What it adds:**

1. **New Column:** `expo_push_token` in `profiles` table
   - For Expo push notifications (replaces/supplements `onesignal_player_id`)

2. **Circle Tables** (if missing):
   - `circles` - Group chats
   - `circle_members` - Group membership
   - `circle_prompts` - Custom group prompts
   - `circle_responses` - Responses to group prompts
   - `circle_messages` - Group chat messages

3. **Reactions Table** (if missing):
   - For emoji reactions on responses and messages

4. **Indexes & Policies:**
   - Performance indexes for all new tables
   - Row Level Security policies

---

## Step 3: Update .env File

Your `.env` should point to the **existing** Supabase project:

```env
EXPO_PUBLIC_SUPABASE_URL=https://aqaauryiptfbuqrtfcnu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-project-settings
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

To get your anon key:
1. Go to Project Settings → API
2. Copy "Project URL" (should be https://aqaauryiptfbuqrtfcnu.supabase.co)
3. Copy "anon public" key

---

## Step 4: Test the Connection

Run this query to verify the migration worked:

```sql
-- Check mobile-specific features
SELECT
  'expo_push_token column' as feature,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'expo_push_token'
  ) THEN 'READY ✓' ELSE 'MISSING ✗' END as status

UNION ALL

SELECT
  'circles table' as feature,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'circles'
  ) THEN 'READY ✓' ELSE 'MISSING ✗' END as status

UNION ALL

SELECT
  'reactions table' as feature,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'reactions'
  ) THEN 'READY ✓' ELSE 'MISSING ✗' END as status;
```

All should show **"READY ✓"**

---

## Differences from Web App

The mobile app adds these features:

1. **Expo Push Notifications**
   - Uses `expo_push_token` instead of `onesignal_player_id`
   - Both can coexist if needed

2. **Circles (Group Chats)**
   - New feature for mobile
   - Creates 5 new tables
   - If web app also needs this, it will work there too

3. **Reactions**
   - Emoji reactions on responses and messages
   - New table with RLS policies

---

## Shared Data

Since you're using the same database:

✅ **Users** - Same accounts work on web and mobile
✅ **Prompts** - Same daily prompts on both platforms
✅ **Responses** - Responses created on mobile appear on web (and vice versa)
✅ **Messages** - Direct messages sync between platforms
✅ **Friends** - Friend lists are shared

---

## Rollback (if needed)

If something goes wrong, you can rollback the changes:

```sql
-- Remove expo_push_token column
ALTER TABLE profiles DROP COLUMN IF EXISTS expo_push_token;

-- Remove circle tables (only if you want to remove them)
DROP TABLE IF EXISTS circle_messages CASCADE;
DROP TABLE IF EXISTS circle_responses CASCADE;
DROP TABLE IF EXISTS circle_prompts CASCADE;
DROP TABLE IF EXISTS circle_members CASCADE;
DROP TABLE IF EXISTS circles CASCADE;

-- Remove reactions table
DROP TABLE IF EXISTS reactions CASCADE;
```

**Note:** Only do this if you haven't created any data in these tables yet!

---

## Next Steps

After migration is complete:

1. ✅ Database is ready
2. ✅ `.env` is configured
3. ✅ Ready to run the app

Try starting the app:
```bash
cd /Users/michaelhemker/Documents/limbo-mobile
npx expo start
```

---

## FAQ

**Q: Will this affect my web app?**
A: No, the migration only adds new features. Existing tables and data remain unchanged.

**Q: Can I use both web and mobile apps with the same account?**
A: Yes! They share the same database and authentication.

**Q: What if I already have a `circles` table from the web app?**
A: The migration script will skip creating it and only verify it has the right structure.

**Q: Do I need to run this migration again?**
A: No, once is enough. The script is idempotent (safe to run multiple times) but you only need to run it once.
