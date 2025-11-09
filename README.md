# Goatscan

A Next.js web application for tracking and ranking Solana traders.

## Features

- Home page with overview of top traders
- Leaderboard ranked by PnL %
- Individual trader profiles
- Sign up with X account and Solana wallet
- Automated wallet data fetching and metrics calculation
- Built with Next.js, TypeScript, TailwindCSS, shadcn/ui, Framer Motion, and Supabase

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env.local
```

Fill in your credentials:
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Helius API**: `HELIUS_API_KEY` (get from https://helius.dev)
- **Cron Secret**: `CRON_SECRET` (for securing the API endpoint)

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Routes

### `/api/fetch-wallet-data`

Fetches wallet transaction data and calculates trading metrics for all users.

**Manual trigger:**
```bash
curl http://localhost:3000/api/fetch-wallet-data?secret=your-secret-key
```

**Scheduled:** Runs automatically every 6 hours via Vercel Cron Jobs.

## Cron Jobs

The app uses Vercel Cron Jobs to automatically fetch wallet data every 6 hours. The cron job is configured in `vercel.json`.

To set up in Vercel:
1. Deploy your app to Vercel
2. Add environment variables in Vercel dashboard
3. The cron job will automatically run based on the schedule in `vercel.json`

## Database Schema

### Users Table
- `id` (uuid, primary key)
- `x_username` (text)
- `wallet_address` (text)
- `pnl_percent` (numeric)
- `total_profit_usd` (numeric)
- `total_trades` (integer)
- `followers_count` (integer)
- `last_trade_timestamp` (timestamp)
- `active` (boolean)
- `created_at` (timestamp)

### Trades Table
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `token_symbol` (text)
- `token_address` (text)
- `amount_usd` (numeric)
- `profit_loss_usd` (numeric)
- `timestamp` (timestamp)

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **shadcn/ui** - UI components
- **Framer Motion** - Animations
- **Supabase** - Authentication and database
- **Solana Web3.js** - Solana blockchain integration
- **Helius API** - Enhanced transaction data
- **Vercel Cron Jobs** - Scheduled tasks

## Setup Instructions

### Supabase Setup

1. Create a Supabase project
2. Create the `users` and `trades` tables with the schema above
3. Enable Row Level Security (RLS) policies as needed
4. Configure Twitter OAuth in Authentication → Providers

### Helius API Setup

1. Sign up at https://helius.dev
2. Get your API key from the dashboard
3. Add `HELIUS_API_KEY` to your environment variables

### Vercel Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Steps:**
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `HELIUS_API_KEY`
   - `CRON_SECRET`
4. Deploy - cron jobs will be automatically configured

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `HELIUS_API_KEY` - Your Helius API key (for wallet data fetching)
- `CRON_SECRET` - Secret key for securing cron endpoints
