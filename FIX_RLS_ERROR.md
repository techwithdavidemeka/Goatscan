# Fix: "new row violates row-level security policy" Error

## Problem
When trying to sign up, you get the error: `new row violates row-level security policy for table "users"`

This happens because Row Level Security (RLS) is enabled on the `users` table, but there's no policy that allows users to INSERT their own profile.

## Solution

You need to add RLS policies that allow authenticated users to insert and update their own profiles.

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Run the RLS Policies SQL

Copy and paste this SQL into the SQL Editor and click **Run**:

```sql
-- Enable RLS on users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public read access for active users" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can read their own profile" ON users;

-- Policy 1: Allow public read access to active users
CREATE POLICY "Public read access for active users"
  ON users FOR SELECT
  USING (active = true);

-- Policy 2: Allow authenticated users to read their own profile (even if inactive)
CREATE POLICY "Users can read their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Policy 3: Allow authenticated users to insert their own profile
-- The id must match the authenticated user's id (auth.uid())
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 4: Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Enable RLS on trades table (if not already enabled)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for trades" ON trades;
DROP POLICY IF EXISTS "Users can insert their own trades" ON trades;

-- Policy: Allow public read access to all trades
CREATE POLICY "Public read access for trades"
  ON trades FOR SELECT
  USING (true);

-- Policy: Allow authenticated users to insert trades for themselves
CREATE POLICY "Users can insert their own trades"
  ON trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Step 3: Verify Policies are Created

Run this query to verify the policies were created:

```sql
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'trades')
ORDER BY tablename, policyname;
```

You should see policies for:
- `users` table: SELECT, INSERT, UPDATE
- `trades` table: SELECT, INSERT

### Step 4: Test the Sign Up

1. Go back to your app
2. Try signing up again
3. The error should be fixed!

## What These Policies Do

1. **Public read access for active users**: Anyone can read profiles of active users (for leaderboards, etc.)
2. **Users can read their own profile**: Authenticated users can read their own profile even if inactive
3. **Users can insert their own profile**: Authenticated users can create their own profile, but only if the `id` matches their `auth.uid()`
4. **Users can update their own profile**: Authenticated users can update their own profile
5. **Public read access for trades**: Anyone can read trades (for displaying trade history)
6. **Users can insert their own trades**: Authenticated users can insert trades, but only for themselves

## Important Notes

- The `auth.uid()` function returns the UUID of the currently authenticated user
- The `WITH CHECK` clause ensures that when inserting/updating, the user can only set their own `id` or `user_id`
- The `USING` clause in UPDATE ensures users can only update rows where they own the record

## Alternative: Use the SQL File

You can also use the `supabase-rls-policies.sql` file in the project root - it contains the same policies with additional comments.

