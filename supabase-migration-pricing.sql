-- Migration: Add pricing and PnL enhancements
-- This migration adds support for accurate memecoin trade analytics with proper price sources

-- ============================================
-- 1. Add new columns to trades table
-- ============================================

-- Add SOL-denominated amounts
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS amount_sol NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_loss_sol NUMERIC DEFAULT 0;

-- Add price information
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS price_usd NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_sol NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_source TEXT DEFAULT 'moralis',
ADD COLUMN IF NOT EXISTS is_bonded BOOLEAN DEFAULT false;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_trades_price_source ON trades(price_source);
CREATE INDEX IF NOT EXISTS idx_trades_is_bonded ON trades(is_bonded);

-- ============================================
-- 2. Create token_prices table for price caching
-- ============================================

CREATE TABLE IF NOT EXISTS token_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  price_usd TEXT NOT NULL, -- Store as TEXT to preserve precision
  price_sol TEXT NOT NULL, -- Store as TEXT to preserve precision
  source TEXT NOT NULL CHECK (source = 'moralis'),
  is_bonded BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(token_address, timestamp)
);

-- Create indexes for token_prices
CREATE INDEX IF NOT EXISTS idx_token_prices_token_address ON token_prices(token_address);
CREATE INDEX IF NOT EXISTS idx_token_prices_timestamp ON token_prices(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_token_prices_source ON token_prices(source);

-- ============================================
-- 3. Create token_metadata table for metadata caching
-- ============================================

CREATE TABLE IF NOT EXISTS token_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL,
  name TEXT,
  fdv TEXT, -- Fully Diluted Valuation (as TEXT for precision)
  liquidity TEXT, -- Liquidity in USD (as TEXT for precision)
  market_cap TEXT, -- Market cap (as TEXT for precision)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for token_metadata
CREATE INDEX IF NOT EXISTS idx_token_metadata_symbol ON token_metadata(symbol);
CREATE INDEX IF NOT EXISTS idx_token_metadata_token_address ON token_metadata(token_address);

-- ============================================
-- 4. Add RLS policies for new tables
-- ============================================

-- Enable RLS on token_prices
ALTER TABLE token_prices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Public read access for token prices" ON token_prices;
CREATE POLICY "Public read access for token prices"
  ON token_prices FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage token prices" ON token_prices;
CREATE POLICY "Service role can manage token prices"
  ON token_prices FOR ALL
  WITH CHECK (true);

-- Enable RLS on token_metadata
ALTER TABLE token_metadata ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Public read access for token metadata" ON token_metadata;
CREATE POLICY "Public read access for token metadata"
  ON token_metadata FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage token metadata" ON token_metadata;
CREATE POLICY "Service role can manage token metadata"
  ON token_metadata FOR ALL
  WITH CHECK (true);

-- ============================================
-- 5. Add comments for documentation
-- ============================================

COMMENT ON COLUMN trades.amount_sol IS 'Trade amount in SOL';
COMMENT ON COLUMN trades.profit_loss_sol IS 'Profit/loss in SOL for sell trades';
COMMENT ON COLUMN trades.price_usd IS 'Token price in USD at trade time';
COMMENT ON COLUMN trades.price_sol IS 'Token price in SOL at trade time';
COMMENT ON COLUMN trades.price_source IS 'API source used for price (Moralis)';
COMMENT ON COLUMN trades.is_bonded IS 'Whether token had LP (was bonded) at trade time';

COMMENT ON TABLE token_prices IS 'Cached token prices to avoid re-fetching from APIs';
COMMENT ON TABLE token_metadata IS 'Cached token metadata (symbol, name, FDV, liquidity)';

