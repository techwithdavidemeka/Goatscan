# Pricing and PnL Logic Update Summary

## Overview
Moralis is now the single source of truth for token metadata, prices, pump.fun bonding status, and swap history. Helius remains only for raw transaction signatures; every valuation and analytics step now depends on Moralis.

## Key Changes

### 1. Moralis Pricing Module (`lib/pricing.ts`)
- Fetches token metadata via `GET /token/mainnet/:address/metadata`.
- Fetches historical SOL + USD prices via `GET /token/mainnet/:address/price`.
- Fetches pump.fun bonding info and curated lists via Moralis pump.fun endpoints.
- Fetches wallet/token swaps via `GET /account/:network/:walletAddress/swaps` and `/token/:network/:tokenAddress/swaps`.
- Caches metadata and prices in Supabase (`token_metadata`, `token_prices`) with `price_source = 'moralis'`.

### 2. Trade Parsing (`lib/helius.ts`)
- Reconstructs trades from Moralis swap data rather than pump.fun/Dex heuristics.
- Uses Moralis prices to compute `amount_usd`, `amount_sol`, `price_usd`, `price_sol`, and `is_bonded`.
- Sets `source` based on Moralis bonding status (`pumpfun` vs `dex`) and stores `priceSource = "moralis"`.

### 3. Wallet Analytics (`lib/wallet-analytics.ts`)
- PnL calculation uses Moralis-derived USD/SOL totals (`PnLUSD = totalSellUSD - totalBuyUSD`).
- Inserts include SOL amounts, Moralis price metadata, and bonding flags.

### 4. Database Migration (`supabase-migration-pricing.sql`)
- `price_source` now defaults to `'moralis'` with a CHECK constraint.
- Comments updated to note Moralis as the data source.
- Still adds the price/PnL columns plus caching tables with RLS policies.

### 5. Environment (`env.example`)
- Added `MORALIS_API_KEY` (required) and optional `MORALIS_NETWORK`.

## Deployment Steps
1. **Set env vars**: Configure `MORALIS_API_KEY` (and optionally `MORALIS_NETWORK`) locally and in Vercel.
2. **Run migration**: Execute `supabase-migration-pricing.sql` in the Supabase SQL editor.
3. **Deploy code**: Push the updated code; wallet refreshes will now pull metadata, bonding, prices, and swaps from Moralis.

## Validation
- Logs show how many Moralis swaps were parsed for each wallet.
- Trade summaries break down pump.fun vs dex counts using Moralis bonding status.
- `price_source` stored in Supabase should always equal `moralis`.

No legacy pump.fun, DexScreener, or Jupiter endpoints remain. Moralis powers all token metadata, price, pump.fun bonding, and swap history across the analytics engine.

