# Testing Guide

This document outlines the testing checklist for the full Goatscan flow.

## Pre-Deployment Testing (Local)

### 1. Environment Setup
- [ ] Copy `env.example` to `.env.local`
- [ ] Fill in all required environment variables
- [ ] Verify `.env.local` is in `.gitignore`

### 2. Local Development
```bash
npm install
npm run dev
```

### 3. Test Sign Up Flow
1. [ ] Navigate to `/signup`
2. [ ] Click "Connect X (Twitter)"
   - [ ] Verify OAuth redirect works
   - [ ] Verify callback redirects back to signup
   - [ ] Verify X username is populated
3. [ ] Click "Connect Wallet"
   - [ ] Verify wallet modal opens
   - [ ] Connect Phantom or Backpack wallet
   - [ ] Verify wallet address is populated
4. [ ] Click "Complete Sign Up"
   - [ ] Verify user is created in Supabase
   - [ ] Verify redirect to profile page

### 4. Test Profile Page
- [ ] Verify user info displays (username, wallet, followers)
- [ ] Check "Inactive" badge appears if no recent trades
- [ ] Verify stats cards display correctly
- [ ] Check charts render (may be empty initially)
- [ ] Verify trades table displays

### 5. Test Wallet Data Fetch (Manual)
```bash
curl http://localhost:3000/api/fetch-wallet-data?secret=your-secret-key
```
- [ ] Verify API returns success
- [ ] Check Supabase for updated user metrics
- [ ] Verify trades are inserted into database

### 6. Test Leaderboard
- [ ] Navigate to `/leaderboard`
- [ ] Verify only active users appear
- [ ] Test search by username
- [ ] Test time filters (24h, 7d, 30d)
- [ ] Click on trader card to view profile

### 7. Test Deactivate Inactive Users
```bash
curl http://localhost:3000/api/deactivate-inactive-users?secret=your-secret-key
```
- [ ] Verify API returns success
- [ ] Check Supabase for users with `active = false`
- [ ] Verify inactive users don't appear on leaderboard

## Post-Deployment Testing (Production)

### 1. Initial Checks
- [ ] Visit production URL
- [ ] Verify landing page loads
- [ ] Check all environment variables are set in Vercel
- [ ] Verify cron jobs are configured in Vercel dashboard

### 2. Full User Flow Test

#### Step 1: Sign Up
1. [ ] Go to production URL
2. [ ] Click "Connect your wallet + X to join"
3. [ ] Complete X OAuth flow
4. [ ] Connect Solana wallet
5. [ ] Complete signup
6. [ ] Verify redirect to profile page

#### Step 2: Verify Profile Creation
- [ ] Check Supabase `users` table for new user
- [ ] Verify all fields are populated correctly:
  - `x_username`
  - `wallet_address`
  - `active = true`
  - `created_at`

#### Step 3: Fetch Wallet Data
1. [ ] Manually trigger wallet data fetch:
   ```
   https://your-domain.vercel.app/api/fetch-wallet-data?secret=your-secret
   ```
2. [ ] Check Vercel function logs for success
3. [ ] Verify in Supabase:
   - [ ] Trades are inserted into `trades` table
   - [ ] User metrics are updated:
     - `total_trades`
     - `total_profit_usd`
     - `pnl_percent`
     - `last_trade_timestamp`

#### Step 4: Verify Leaderboard Ranking
- [ ] Navigate to `/leaderboard`
- [ ] Verify user appears in leaderboard
- [ ] Check ranking is correct (sorted by `pnl_percent` DESC)
- [ ] Verify user card displays:
  - [ ] Username
  - [ ] Followers count
  - [ ] Wallet address (shortened)
  - [ ] PnL % (color-coded)
  - [ ] Total profit USD

#### Step 5: Test Profile Page
- [ ] Navigate to user's profile page
- [ ] Verify all data displays correctly:
  - [ ] User info
  - [ ] Stats cards
  - [ ] Charts (if trades exist)
  - [ ] Trades table

### 3. Test Cron Jobs

#### Wallet Data Fetch (Every 6 hours)
- [ ] Wait for scheduled execution OR trigger manually
- [ ] Check Vercel function logs
- [ ] Verify all active users' data is updated
- [ ] Check for any errors in logs

#### Deactivate Inactive Users (Daily)
- [ ] Wait for scheduled execution OR trigger manually
- [ ] Check Vercel function logs
- [ ] Verify users with no trades > 7 days are deactivated
- [ ] Verify inactive users don't appear on leaderboard

### 4. Edge Cases

#### Multiple Users
- [ ] Sign up multiple test users
- [ ] Verify all appear on leaderboard
- [ ] Verify correct ranking order
- [ ] Test search with multiple users

#### Inactive User Flow
- [ ] Create a user with old `last_trade_timestamp`
- [ ] Run deactivate cron job
- [ ] Verify user is set to `active = false`
- [ ] Verify user doesn't appear on leaderboard
- [ ] Verify user profile still accessible (but shows inactive badge)

#### Empty States
- [ ] Test leaderboard with no users
- [ ] Test profile with no trades
- [ ] Test charts with no data

### 5. Performance Testing
- [ ] Test page load times
- [ ] Test with many users on leaderboard
- [ ] Test search performance
- [ ] Check Vercel analytics for function execution times

## Monitoring Checklist

### Daily Checks
- [ ] Verify cron jobs are executing successfully
- [ ] Check Vercel function logs for errors
- [ ] Monitor Supabase database size and performance
- [ ] Check for any user-reported issues

### Weekly Checks
- [ ] Review inactive user deactivation
- [ ] Check wallet data fetch accuracy
- [ ] Review leaderboard rankings
- [ ] Monitor API usage (Helius, Supabase)

## Troubleshooting Test Failures

### Sign Up Fails
- Check Supabase connection
- Verify Twitter OAuth is configured
- Check browser console for errors
- Verify RLS policies allow inserts

### Wallet Data Fetch Fails
- Verify Helius API key is correct
- Check wallet address format
- Review function logs for specific errors
- Verify Supabase connection

### Leaderboard Empty
- Check if users have `active = true`
- Verify RLS policies allow SELECT
- Check for JavaScript errors in console
- Verify data exists in Supabase

### Cron Jobs Not Running
- Check Vercel cron job configuration
- Verify `vercel.json` is correct
- Check function logs for errors
- Verify environment variables are set

## Success Criteria

✅ All tests pass
✅ No errors in Vercel function logs
✅ Data correctly stored in Supabase
✅ Leaderboard displays correctly
✅ Cron jobs execute successfully
✅ User flow works end-to-end

