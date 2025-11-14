# Deployment Checklist

Use this checklist to ensure everything is ready for deployment.

## Pre-Deployment

### Code Preparation
- [x] `.env.local` is in `.gitignore` (already included)
- [ ] All code is committed to Git
- [ ] Code is pushed to GitHub repository
- [ ] No sensitive data in code (API keys, secrets, etc.)

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `HELIUS_API_KEY` - Helius API key
- [ ] `CRON_SECRET` - Random secret for cron endpoints

### Supabase Setup
- [ ] Supabase project created
- [ ] `users` table created with correct schema
- [ ] `trades` table created with correct schema
- [ ] Indexes created for performance
- [ ] RLS policies configured
- [ ] Twitter OAuth provider configured
- [ ] Redirect URL set (will update after deployment)

### External Services
- [ ] Helius API account created
- [ ] Helius API key obtained
- [ ] Twitter API credentials obtained (for OAuth)

## Deployment Steps

### Vercel Deployment
- [ ] Vercel account created
- [ ] GitHub repository connected to Vercel
- [ ] Project imported in Vercel
- [ ] Environment variables added in Vercel:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `HELIUS_API_KEY`
  - [ ] `CRON_SECRET`
- [ ] Environment variables set for all environments (Production, Preview, Development)
- [ ] Initial deployment completed
- [ ] Production URL obtained

### Post-Deployment Configuration
- [ ] Update Supabase Twitter OAuth redirect URL to production URL
- [ ] Verify cron jobs are configured in Vercel dashboard
- [ ] Test production URL is accessible

## Testing

### Basic Functionality
- [ ] Landing page loads
- [ ] Navigation works
- [ ] Sign up page accessible

### Sign Up Flow
- [ ] X (Twitter) OAuth works
- [ ] Wallet connection works
- [ ] User creation successful
- [ ] Redirect to profile works

### Data Flow
- [ ] Wallet data fetch API works
- [ ] User metrics update correctly
- [ ] Leaderboard displays users
- [ ] Profile page displays data

### Cron Jobs
- [ ] Wallet data fetch cron job configured
- [ ] Deactivate inactive users cron job configured
- [ ] Both cron jobs can be triggered manually

## Post-Deployment Verification

### Functionality
- [ ] Full signup flow works
- [ ] Wallet data fetch updates user metrics
- [ ] Leaderboard shows correct rankings
- [ ] Profile pages display correctly
- [ ] Search and filters work on leaderboard

### Monitoring
- [ ] Vercel function logs accessible
- [ ] Supabase dashboard accessible
- [ ] Error monitoring set up (optional)

## Quick Test Commands

After deployment, test these endpoints:

```bash
# Test wallet data fetch
curl "https://your-domain.vercel.app/api/fetch-wallet-data?secret=your-secret"

# Test deactivate inactive users
curl "https://your-domain.vercel.app/api/deactivate-inactive-users?secret=your-secret"

# Test landing page
curl https://your-domain.vercel.app
```

## Rollback Plan

If deployment fails:
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Check Supabase connection
4. Review function logs for errors
5. Redeploy from previous successful commit if needed

## Success Criteria

✅ All checklist items completed
✅ Production site is accessible
✅ Sign up flow works end-to-end
✅ Data updates correctly
✅ Cron jobs are scheduled
✅ No critical errors in logs

