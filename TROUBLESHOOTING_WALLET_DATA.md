# Troubleshooting: Wallet Data Not Showing

## Quick Fix Steps

### Step 1: Manually Fetch Wallet Data for Existing Users

If users signed up before the automatic fetch was added, you need to manually trigger the wallet data fetch:

**For Production:**
```bash
# Replace with your actual domain
curl "https://your-domain.vercel.app/api/fetch-wallet-data?secret=e263dc062382ee13e797b0b569b0d913b4596d6ccd0a915ed2b2174af30af608"
```

**For Local Development:**
```bash
curl "http://localhost:3000/api/fetch-wallet-data?secret=e263dc062382ee13e797b0b569b0d913b4596d6ccd0a915ed2b2174af30af608"
```

### Step 2: Check the Response

The API should return:
```json
{
  "message": "Wallet data fetch completed",
  "processed": 2,
  "failed": 0,
  "errors": [],
  "timestamp": "..."
}
```

If `failed > 0`, check the `errors` array for details.

### Step 3: Verify Data in Database

Check your Supabase `trades` table to see if trades were inserted:
- Go to Supabase Dashboard → Table Editor → `trades`
- Check if there are rows with `user_id` matching your users

### Step 4: Check User Metrics

Check the `users` table to see if metrics were updated:
- `total_trades` should be > 0
- `total_profit_usd` should have a value
- `last_trade_timestamp` should be set

## Common Issues

### Issue 1: "Helius error: 400 invalid query parameter limit"
**Status:** ✅ FIXED - The code now uses POST without limit parameter

### Issue 2: No trades found for wallet
**Possible causes:**
- Wallet has no SWAP transactions
- Helius API key is invalid or missing
- Wallet address is incorrect

**Check:**
- Verify `NEXT_PUBLIC_HELIUS_API_KEY` is set in environment variables
- Test the wallet address on Solscan to see if it has transactions

### Issue 3: Trades exist but not showing on leaderboard
**Check:**
- User is marked as `active = true` in database
- User has `wallet_address` set
- `total_trades > 0` in users table
- Leaderboard query filters correctly

### Issue 4: New signups not getting data
**Check:**
- The automatic fetch code is deployed
- Check browser console for errors during signup
- Verify `/api/fetch-user-wallet-data` endpoint exists and is accessible

## Testing Checklist

- [ ] Run manual wallet data fetch endpoint
- [ ] Check API response for errors
- [ ] Verify trades in Supabase `trades` table
- [ ] Verify user metrics in Supabase `users` table
- [ ] Check leaderboard shows users with trades
- [ ] Check profile page shows trades
- [ ] Test new signup to verify auto-fetch works

## Next Steps

1. **For existing users:** Run the manual fetch endpoint
2. **For new users:** They should automatically get data on signup (if code is deployed)
3. **For production:** Make sure code changes are deployed to Vercel

