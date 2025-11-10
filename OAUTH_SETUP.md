# OAuth Setup Guide - Fixing "requested path is invalid" Error

## The Problem
When clicking "Sign in with X", you see an error: `{"error":"requested path is invalid"}` from Supabase.

This happens because the redirect URL isn't properly configured in your Supabase project.

## Solution: Configure Redirect URLs in Supabase

### Step 1: Go to Supabase Dashboard
1. Open https://app.supabase.com
2. Select your project (the one with URL: `kfuopseeqctmxssmcsvh.supabase.co`)

### Step 2: Configure Redirect URLs
1. Go to **Authentication** → **URL Configuration**
2. In the **Redirect URLs** section, add these URLs:
   - For local development: `http://localhost:3000/auth/callback`
   - For production: `https://your-domain.vercel.app/auth/callback`
   - Replace `your-domain.vercel.app` with your actual Vercel deployment URL

3. **Site URL** should be set to:
   - Local: `http://localhost:3000`
   - Production: `https://your-domain.vercel.app`

### Step 3: Enable Twitter OAuth Provider
1. Go to **Authentication** → **Providers**
2. Find **Twitter** in the list
3. Click to enable it
4. You'll need:
   - **Twitter API Key** (Consumer Key)
   - **Twitter API Secret** (Consumer Secret)
   - **Twitter Bearer Token** (optional but recommended)

### Step 4: Get Twitter API Credentials
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new app or use an existing one
3. Go to **Keys and tokens** tab
4. Copy:
   - **API Key** → Use as Twitter Consumer Key in Supabase
   - **API Secret** → Use as Twitter Consumer Secret in Supabase
5. Under **User authentication settings**:
   - Enable **OAuth 1.0a**
   - Set **Callback URL**: `https://kfuopseeqctmxssmcsvh.supabase.co/auth/v1/callback`
   - Set **Website URL**: Your app URL (e.g., `https://your-domain.vercel.app`)
   - Select read permissions (at minimum)

### Step 5: Configure Twitter in Supabase
1. In Supabase Dashboard → **Authentication** → **Providers** → **Twitter**
2. Paste your Twitter API Key and Secret
3. Save the configuration

### Step 6: Verify the Configuration
1. Make sure the redirect URL in your code matches what's in Supabase
2. The callback URL in Twitter should be: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. The redirect URL in your app code is: `${window.location.origin}/auth/callback`

## Common Issues

### Issue 1: Redirect URL Mismatch
**Error**: "requested path is invalid"
**Solution**: Make sure the redirect URL in Supabase matches exactly with your app's callback URL.

### Issue 2: Twitter OAuth Not Enabled
**Error**: OAuth provider not found
**Solution**: Enable Twitter provider in Supabase and configure API credentials.

### Issue 3: Twitter Callback URL Wrong
**Error**: Twitter rejects the callback
**Solution**: In Twitter Developer Portal, set callback URL to: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

## Testing
1. After configuration, try signing in with X again
2. You should be redirected to Twitter for authorization
3. After authorizing, you should be redirected back to `/auth/callback`
4. Then redirected to `/signup` to complete your profile

## Environment Variables
Make sure these are set in your Vercel environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Notes
- The callback route (`/auth/callback`) handles the OAuth callback from Supabase
- Supabase acts as a proxy between your app and Twitter
- The redirect flow: App → Supabase → Twitter → Supabase → App callback → App signup

