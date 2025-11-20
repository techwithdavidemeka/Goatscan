# Manual API Trigger Guide

## Option 1: Fetch Wallet Data for a Single User

### Using PowerShell (Windows)

**GET Request:**
```powershell
# Replace with your actual values
$deploymentUrl = "https://your-app.vercel.app"
$userId = "your-user-id-from-supabase"
$walletAddress = "7BWYBVUAvQp7BZKkosaXimAauZoXvwbwHjGtjzEJwhDz"

Invoke-WebRequest -Uri "$deploymentUrl/api/fetch-user-wallet-data?userId=$userId&walletAddress=$walletAddress" -Method GET
```

**POST Request:**
```powershell
$deploymentUrl = "https://your-app.vercel.app"
$userId = "your-user-id"
$walletAddress = "7BWYBVUAvQp7BZKkosaXimAauZoXvwbwHjGtjzEJwhDz"

$body = @{
    userId = $userId
    walletAddress = $walletAddress
} | ConvertTo-Json

Invoke-WebRequest -Uri "$deploymentUrl/api/fetch-user-wallet-data" -Method POST -Body $body -ContentType "application/json"
```

### Using Browser
Simply open this URL in your browser (replace with your values):
```
https://your-app.vercel.app/api/fetch-user-wallet-data?userId=USER_ID&walletAddress=WALLET_ADDRESS
```

### Using curl
```bash
curl "https://your-app.vercel.app/api/fetch-user-wallet-data?userId=USER_ID&walletAddress=WALLET_ADDRESS"
```

---

## Option 2: Fetch Wallet Data for ALL Users

### Using PowerShell (Windows)

**GET Request (with secret):**
```powershell
$deploymentUrl = "https://your-app.vercel.app"
$cronSecret = "e263dc062382ee13e797b0b569b0d913b4596d6ccd0a915ed2b2174af30af608"

Invoke-WebRequest -Uri "$deploymentUrl/api/fetch-wallet-data?secret=$cronSecret" -Method GET
```

**POST Request (with Authorization header):**
```powershell
$deploymentUrl = "https://your-app.vercel.app"
$cronSecret = "e263dc062382ee13e797b0b569b0d913b4596d6ccd0a915ed2b2174af30af608"

$headers = @{
    Authorization = "Bearer $cronSecret"
}

Invoke-WebRequest -Uri "$deploymentUrl/api/fetch-wallet-data" -Method POST -Headers $headers
```

### Using Browser
```
https://your-app.vercel.app/api/fetch-wallet-data?secret=YOUR_CRON_SECRET
```

---

## How to Get Your Values

1. **Deployment URL**: Check your Vercel dashboard → Your project → Settings → Domains
2. **User ID**: 
   - Go to Supabase Dashboard → Table Editor → `users` table
   - Find the user and copy their `id` (UUID)
3. **Wallet Address**: 
   - Same Supabase `users` table
   - Copy the `wallet_address` field
4. **Cron Secret**: Already provided: `e263dc062382ee13e797b0b569b0d913b4596d6ccd0a915ed2b2174af30af608`

---

## Expected Response

**Success Response:**
```json
{
  "message": "Wallet data fetched successfully",
  "metrics": {
    "totalTrades": 32,
    "totalProfitUsd": 1234.56,
    "pnlPercent": 15.5,
    "lastTradeTimestamp": "2025-01-15T10:30:00Z"
  },
  "timestamp": "2025-01-15T12:00:00Z"
}
```

**Error Response:**
```json
{
  "error": "User not found"
}
```

---

## Check Logs

After triggering, check Vercel logs:
1. Go to Vercel Dashboard → Your Project → Functions → Logs
2. Look for messages like:
   - `"Fetched X transactions from Helius"`
   - `"Parsed X trades"`
   - `"Pump.fun API failed for {mint}, using fallback:"` (if pump.fun API fails)
   - `"Updated username: X trades, $Y profit, Z% PnL"`

