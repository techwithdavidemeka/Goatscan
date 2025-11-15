-- Row Level Security (RLS) Policies for Goatscan
-- Run this in your Supabase SQL Editor

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

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
-- The id must match the authenticated user's id
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 4: Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- TRADES TABLE POLICIES
-- ============================================

-- Enable RLS on trades table (if not already enabled)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for trades" ON trades;
DROP POLICY IF EXISTS "Users can insert their own trades" ON trades;
DROP POLICY IF EXISTS "Users can update their own trades" ON trades;

-- Policy 1: Allow public read access to all trades
CREATE POLICY "Public read access for trades"
  ON trades FOR SELECT
  USING (true);

-- Policy 2: Allow authenticated users to insert trades for themselves
-- The user_id must match the authenticated user's id
CREATE POLICY "Users can insert their own trades"
  ON trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 2b: Allow service role to insert trades (for server-side operations)
-- This allows the API to insert trades on behalf of users
CREATE POLICY "Service role can insert trades"
  ON trades FOR INSERT
  WITH CHECK (true);

-- Policy 3: Allow authenticated users to update their own trades
CREATE POLICY "Users can update their own trades"
  ON trades FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'trades')
ORDER BY tablename, policyname;

