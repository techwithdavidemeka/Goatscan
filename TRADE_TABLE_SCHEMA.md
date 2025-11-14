# Trade Table Schema Recommendations

Based on the current implementation in `lib/helius.ts` and `lib/wallet-analytics.ts`, here are the recommended columns to add to your `trades` table in Supabase:

## Current Schema (from DEPLOYMENT.md)
```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_symbol TEXT,
  token_address TEXT,
  amount_usd NUMERIC DEFAULT 0,
  profit_loss_usd NUMERIC DEFAULT 0,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Recommended Additional Columns

### 1. **source** (TEXT)
- **Purpose**: Track where the trade originated (Pump.fun, Raydium, Jupiter, Meteora, etc.)
- **Why**: Essential for transparency and debugging. The code already tries to insert this.
- **Example values**: `"pumpfun"`, `"raydium"`, `"jupiter"`, `"meteora"`, `"orca"`

### 2. **side** (TEXT)
- **Purpose**: Indicate whether it's a buy or sell
- **Why**: Needed for accurate PnL calculation and trade analysis
- **Example values**: `"buy"`, `"sell"`
- **Constraint**: Should be CHECK (side IN ('buy', 'sell'))

### 3. **quantity** (NUMERIC)
- **Purpose**: Store the token quantity traded
- **Why**: Useful for detailed trade analysis and volume calculations
- **Note**: Store with appropriate decimals (consider token decimals)

### 4. **signature** (TEXT, UNIQUE)
- **Purpose**: Transaction signature for deduplication and idempotency
- **Why**: Prevents duplicate trades from being inserted. The code already uses this for deduplication.
- **Index**: Create a unique index on this column for fast lookups

## Complete Recommended Schema

```sql
-- Add new columns to existing trades table
ALTER TABLE trades 
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS side TEXT CHECK (side IN ('buy', 'sell')),
  ADD COLUMN IF NOT EXISTS quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS signature TEXT;

-- Create unique index on signature for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_signature ON trades(signature) 
  WHERE signature IS NOT NULL;

-- Create index on source for filtering
CREATE INDEX IF NOT EXISTS idx_trades_source ON trades(source);

-- Create index on side for filtering
CREATE INDEX IF NOT EXISTS idx_trades_side ON trades(side);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_trades_user_timestamp ON trades(user_id, timestamp DESC);
```

## Optional Enhancements

### 5. **token_mint** (TEXT)
- **Purpose**: Store the token mint address (same as token_address, but more explicit)
- **Why**: Helps link Pump.fun and DEX trades for the same token
- **Note**: This might be redundant with `token_address`, but can be useful for clarity

### 6. **price_usd** (NUMERIC)
- **Purpose**: Store the price per token at trade time
- **Why**: Useful for historical analysis and price tracking
- **Calculation**: `price_usd = amount_usd / quantity`

### 7. **fee_usd** (NUMERIC)
- **Purpose**: Store transaction fees in USD
- **Why**: More accurate PnL calculation (net profit = profit_loss_usd - fee_usd)

## Migration Script

Run this in your Supabase SQL Editor:

```sql
-- Add new columns
ALTER TABLE trades 
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS side TEXT CHECK (side IN ('buy', 'sell')),
  ADD COLUMN IF NOT EXISTS quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS signature TEXT;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_signature ON trades(signature) 
  WHERE signature IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_source ON trades(source);
CREATE INDEX IF NOT EXISTS idx_trades_side ON trades(side);
```

## Notes

- The code in `lib/wallet-analytics.ts` already handles these columns gracefully - it will try to insert them, and if they don't exist, it falls back to the minimal schema.
- The `signature` column is particularly important for preventing duplicate trades when re-fetching wallet data.
- The `source` column is essential for the unified PnL calculation across Pump.fun and DEX trades.

