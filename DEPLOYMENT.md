# Deployment Guide

This guide will walk you through deploying Goatscan to Vercel with Supabase as the backend.

## Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- Supabase account (sign up at https://supabase.com)
- Helius API key (get from https://helius.dev)

## Step 1: Prepare Your Repository

1. **Verify .gitignore**
   - Ensure `.env.local` is in `.gitignore` (already included)
   - Commit all changes to your repository

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

## Step 2: Set Up Supabase

1. **Create a Supabase Project**
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Fill in project details and wait for setup to complete

2. **Create Database Tables**

   Run these SQL commands in the Supabase SQL Editor:

   ```sql
   -- Users table
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     x_username TEXT NOT NULL UNIQUE,
     wallet_address TEXT NOT NULL,
     pnl_percent NUMERIC DEFAULT 0,
     total_profit_usd NUMERIC DEFAULT 0,
     total_trades INTEGER DEFAULT 0,
     followers_count INTEGER DEFAULT 0,
     last_trade_timestamp TIMESTAMP,
     active BOOLEAN DEFAULT true,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Trades table
   CREATE TABLE trades (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     token_symbol TEXT,
     token_address TEXT,
     amount_usd NUMERIC DEFAULT 0,
     profit_loss_usd NUMERIC DEFAULT 0,
     timestamp TIMESTAMP NOT NULL DEFAULT NOW()
   );

   -- Create indexes for better performance
   CREATE INDEX idx_users_active ON users(active);
   CREATE INDEX idx_users_pnl ON users(pnl_percent DESC);
   CREATE INDEX idx_trades_user_id ON trades(user_id);
   CREATE INDEX idx_trades_timestamp ON trades(timestamp DESC);
   ```

3. **Configure Row Level Security (RLS)**

   **Important**: You need policies that allow users to INSERT and UPDATE their own profiles.
   
   Run the SQL from `supabase-rls-policies.sql` in the Supabase SQL Editor, or use this:

   ```sql
   -- Enable RLS on users table
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;

   -- Drop existing policies if they exist
   DROP POLICY IF EXISTS "Public read access for active users" ON users;
   DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
   DROP POLICY IF EXISTS "Users can update their own profile" ON users;
   DROP POLICY IF EXISTS "Users can read their own profile" ON users;

   -- Allow public read access to active users
   CREATE POLICY "Public read access for active users"
     ON users FOR SELECT
     USING (active = true);

   -- Allow authenticated users to read their own profile (even if inactive)
   CREATE POLICY "Users can read their own profile"
     ON users FOR SELECT
     USING (auth.uid() = id);

   -- Allow authenticated users to insert their own profile
   CREATE POLICY "Users can insert their own profile"
     ON users FOR INSERT
     WITH CHECK (auth.uid() = id);

   -- Allow authenticated users to update their own profile
   CREATE POLICY "Users can update their own profile"
     ON users FOR UPDATE
     USING (auth.uid() = id)
     WITH CHECK (auth.uid() = id);

   -- Enable RLS on trades table
   ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

   -- Drop existing policies if they exist
   DROP POLICY IF EXISTS "Public read access for trades" ON trades;
   DROP POLICY IF EXISTS "Users can insert their own trades" ON trades;

   -- Allow public read access to trades
   CREATE POLICY "Public read access for trades"
     ON trades FOR SELECT
     USING (true);

   -- Allow authenticated users to insert trades for themselves
   CREATE POLICY "Users can insert their own trades"
     ON trades FOR INSERT
     WITH CHECK (auth.uid() = user_id);
   ```

4. **Set Up Twitter OAuth**
   - Go to Authentication → Providers in Supabase dashboard
   - Enable Twitter provider
   - Add your Twitter API credentials:
     - Consumer Key (API Key)
     - Consumer Secret (API Secret)
   - Set redirect URL: `https://your-domain.vercel.app/auth/callback`

5. **Get Your Supabase Credentials**
   - Go to Project Settings → API
   - Copy:
     - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
     - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 3: Get Helius API Key

1. Sign up at https://helius.dev
2. Create a new API key
3. Copy the API key → `HELIUS_API_KEY`

## Step 4: Deploy to Vercel

1. **Import Project**
   - Go to https://vercel.com/dashboard
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

2. **Configure Environment Variables**

   In the Vercel project settings, add these environment variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   HELIUS_API_KEY=your-helius-api-key
   CRON_SECRET=your-random-secret-key-here
   ```

   **Important:**
   - Use a strong random string for `CRON_SECRET`
   - All variables should be added for Production, Preview, and Development environments

3. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your app will be live at `https://your-project.vercel.app`

4. **Verify Cron Jobs**
   - Go to your Vercel project → Settings → Cron Jobs
   - You should see two cron jobs:
     - `/api/fetch-wallet-data` (every 6 hours)
     - `/api/deactivate-inactive-users` (daily at midnight UTC)

## Step 5: Update Supabase Redirect URL

After deployment, update the Twitter OAuth redirect URL in Supabase:
- Go to Authentication → Providers → Twitter
- Update redirect URL to: `https://your-actual-domain.vercel.app/auth/callback`

## Step 6: Test the Full Flow

### Test Checklist

1. **Landing Page**
   - [ ] Visit the root URL
   - [ ] Verify hero section displays
   - [ ] Check top 3 traders load (if any exist)
   - [ ] Verify "How It Works" section displays

2. **Sign Up Flow**
   - [ ] Click "Connect your wallet + X to join"
   - [ ] Connect X (Twitter) account via OAuth
   - [ ] Connect Solana wallet (Phantom/Backpack)
   - [ ] Complete signup
   - [ ] Verify redirect to profile page

3. **Profile Page**
   - [ ] Verify user info displays correctly
   - [ ] Check charts render (may be empty initially)
   - [ ] Verify trades table displays

4. **Wallet Data Fetch**
   - [ ] Manually trigger: `https://your-domain.vercel.app/api/fetch-wallet-data?secret=your-secret`
   - [ ] Check Vercel function logs for success
   - [ ] Verify user metrics update in Supabase

5. **Leaderboard**
   - [ ] Visit `/leaderboard`
   - [ ] Verify only active users appear
   - [ ] Test search functionality
   - [ ] Test time filters
   - [ ] Click on a trader to view profile

6. **Cron Jobs**
   - [ ] Wait for next cron execution (or trigger manually)
   - [ ] Check Vercel function logs
   - [ ] Verify data updates in Supabase

## Troubleshooting

### Common Issues

1. **Environment Variables Not Working**
   - Ensure variables are set for all environments (Production, Preview, Development)
   - Redeploy after adding new variables
   - Check variable names match exactly (case-sensitive)

2. **Supabase Connection Errors**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
   - Check Supabase project is active
   - Verify RLS policies allow public read access

3. **Twitter OAuth Not Working**
   - Verify redirect URL matches exactly in Supabase
   - Check Twitter API credentials are correct
   - Ensure Twitter app has correct callback URLs configured

4. **Cron Jobs Not Running**
   - Check Vercel Cron Jobs are enabled in project settings
   - Verify `vercel.json` is in the root directory
   - Check function logs for errors

5. **Wallet Connection Issues**
   - Ensure user has Phantom or Backpack extension installed
   - Check browser console for errors
   - Verify Solana network is set to Mainnet

## Monitoring

- **Vercel Dashboard**: Monitor deployments, function logs, and performance
- **Supabase Dashboard**: Monitor database queries, auth logs, and API usage
- **Function Logs**: Check Vercel function logs for cron job execution

## Next Steps

- Set up custom domain in Vercel
- Configure analytics (Vercel Analytics, Google Analytics)
- Set up error monitoring (Sentry)
- Configure email notifications for cron job failures

