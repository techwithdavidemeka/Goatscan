 

// -------------------------
// External API Endpoints
// -------------------------
const HELIUS_API_KEY =
  process.env.NEXT_PUBLIC_HELIUS_API_KEY || process.env.HELIUS_API_KEY;
const HELIUS_BASE =
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL ||
  (HELIUS_API_KEY
    ? `https://api.helius.xyz/v0`
    : "");

import {
  getTokenPrice,
  getTokenMetadata,
  getWalletSwaps,
  MoralisSwap,
} from "./pricing";
import type { SupabaseClient } from "@supabase/supabase-js";

// -------------------------
// Types
// -------------------------
export type HeliusParsedTransaction = {
  signature: string;
  timestamp: number;
  type?: string; // Transaction type from Helius (e.g., "SWAP")
  source?: string; // Source from Helius (e.g., "PUMP_FUN")
  events?: {
    swap?: {
      programInfo?: { source?: string | null };
      nativeInput?: { amount: number } | null;
      nativeOutput?: { amount: number } | null;
      tokenInputs?: Array<{ mint: string; rawTokenAmount: { tokenAmount: string; decimals: number } }>;
      tokenOutputs?: Array<{ mint: string; rawTokenAmount: { tokenAmount: string; decimals: number } }>;
      userAccount?: string;
    } | null;
  };
  // Direct fields from Helius Enhanced Transactions API
  nativeTransfers?: Array<{
    fromUserAccount?: string;
    toUserAccount?: string;
    amount: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount?: string;
    toUserAccount?: string;
    mint: string;
    tokenAmount: number;
    decimals: number;
  }>;
};

export type TradeSide = "buy" | "sell";

export type ParsedTrade = {
  signature: string;
  tokenAddress: string;
  tokenSymbol: string;
  side: TradeSide;
  quantity: number; // token quantity bought/sold
  amountUsd: number; // notional value of the trade in USD
  amountSol: number; // notional value of the trade in SOL
  profitLossUsd: number; // PnL realized for sell trades; 0 for buys
  profitLossSol: number; // PnL realized for sell trades in SOL; 0 for buys
  priceUsd: number; // token price at trade time in USD
  priceSol: number; // token price at trade time in SOL
  priceSource: "moralis";
  isBonded: boolean; // whether token has LP (bonded) at trade time
  timestamp: string; // ISO string
  source: string; // e.g. "pumpfun", "dex"
};

// -------------------------
// Caches
// -------------------------
const tokenMetaCache = new Map<string, { symbol: string; fetchedAt: number }>();
// Note: SOL price cache is now in ./pricing module

// -------------------------
// Constants
// -------------------------
const STABLE_OR_BLUECHIP_MINTS = new Set<string>([
  // USDC (main)
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  // USDT
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  // SOL not an SPL mint, but treat when quote is native
  // Popular staking derivatives and blue chips to exclude
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", // mSOL
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL3qYk7RKV6x", // stSOL
  "JitoSOL1111111111111111111111111111111111111", // JitoSOL (placeholder, may differ)
]);

// -------------------------
// Metadata Helper
// -------------------------
async function getTokenSymbol(mint: string): Promise<string> {
  const cached = tokenMetaCache.get(mint);
  if (cached && Date.now() - cached.fetchedAt < 5 * 60_000) {
    return cached.symbol;
  }
  
  // Use pricing module's metadata function
  const metadata = await getTokenMetadata(mint);
  tokenMetaCache.set(mint, { symbol: metadata.symbol, fetchedAt: Date.now() });
  return metadata.symbol;
}

function isExcludedMint(mint: string): boolean {
  return STABLE_OR_BLUECHIP_MINTS.has(mint);
}

function getLegMint(leg?: { mint?: string; address?: string; tokenAddress?: string }): string {
  if (!leg) return "";
  return leg.mint || leg.address || leg.tokenAddress || "";
}

function getLegAmount(leg?: { amount?: number; amountRaw?: string; rawAmount?: string; decimals?: number }): number {
  if (!leg) return 0;
  if (typeof leg.amount === "number" && Number.isFinite(leg.amount)) {
    return leg.amount;
  }
  const rawValue =
    leg.amountRaw ?? leg.rawAmount ?? 0;
  const raw = typeof rawValue === "string" ? Number(rawValue) : rawValue;
  const decimals = leg.decimals ?? 0;
  if (!Number.isFinite(raw) || !Number.isFinite(decimals)) return 0;
  return raw / 10 ** decimals;
}

function resolveSwapSignature(swap: MoralisSwap): string | null {
  return swap.signature || swap.transactionSignature || null;
}

function resolveSwapTimestamp(swap: MoralisSwap): number {
  return (
    swap.blockTimestamp ||
    swap.blockTime ||
    swap.timestamp ||
    Math.floor(Date.now() / 1000)
  );
}

// -------------------------
// Public API
// -------------------------
export async function fetchWalletTransactions(
  walletAddress: string,
  limit: number = 200
): Promise<HeliusParsedTransaction[]> {
  if (!HELIUS_BASE || !HELIUS_API_KEY) {
    throw new Error(
      "Missing Helius configuration. Set NEXT_PUBLIC_HELIUS_API_KEY (or HELIUS_API_KEY)."
    );
  }
  // Helius v0 API - Enhanced Transactions API
  // Verified working format: GET /v0/addresses/{address}/transactions?api-key={key}&type=SWAP
  const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}&type=SWAP`;
  
  const resp = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });
  
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Helius error: ${resp.status} ${text}`);
  }
  
  const data = (await resp.json()) as HeliusParsedTransaction[];
  
  // Helius already filters by type=SWAP, but we ensure we only return swap transactions
  // Limit results client-side
  return data.slice(0, limit);
}

export async function parseTradesFromTransactions(
  _transactions: HeliusParsedTransaction[],
  walletAddress: string,
  supabase?: SupabaseClient
): Promise<ParsedTrade[]> {
  const inventory: Record<
    string,
    Array<{ qty: number; costUsdPerToken: number; costSolPerToken: number }>
  > = {};
  const trades: ParsedTrade[] = [];

  const swaps = await getWalletSwaps(walletAddress, { limit: 100 });
  console.log(
    `Parsing ${swaps.length} swaps from Moralis for wallet ${walletAddress}`
  );

  for (const swap of swaps) {
    const signature = resolveSwapSignature(swap);
    if (!signature) continue;

    const tokenIn = swap.tokenIn;
    const tokenOut = swap.tokenOut;
    const inMint = getLegMint(tokenIn);
    const outMint = getLegMint(tokenOut);

    const memecoinMint = !isExcludedMint(outMint)
      ? outMint
      : !isExcludedMint(inMint)
      ? inMint
      : "";
    if (!memecoinMint) continue;

    const isBuy = memecoinMint === outMint;
    const memecoinLeg = isBuy ? tokenOut : tokenIn;
    const qty = getLegAmount(memecoinLeg);
    if (qty <= 0) continue;

    const timestampSec = resolveSwapTimestamp(swap);
    const timestampIso = new Date(timestampSec * 1000).toISOString();

    const metadata = await getTokenMetadata(memecoinMint, supabase);
    const priceData = await getTokenPrice(
      memecoinMint,
      timestampSec,
      supabase
    );
    const amountUsd = qty * priceData.priceUsd;
    const amountSol = qty * priceData.priceSol;
    const source = priceData.isBonded ? "dex" : "pumpfun";

    if (isBuy) {
      if (!inventory[memecoinMint]) inventory[memecoinMint] = [];
      const unitCostUsd = qty > 0 ? amountUsd / qty : priceData.priceUsd;
      const unitCostSol = qty > 0 ? amountSol / qty : priceData.priceSol;
      inventory[memecoinMint].push({
        qty,
        costUsdPerToken: unitCostUsd,
        costSolPerToken: unitCostSol,
      });

      trades.push({
        signature,
        tokenAddress: memecoinMint,
        tokenSymbol: metadata.symbol,
        side: "buy",
        quantity: qty,
        amountUsd,
        amountSol,
        profitLossUsd: 0,
        profitLossSol: 0,
        priceUsd: priceData.priceUsd,
        priceSol: priceData.priceSol,
        priceSource: priceData.source,
        isBonded: priceData.isBonded,
        timestamp: timestampIso,
        source,
      });
    } else {
      let remaining = qty;
      let costUsd = 0;
      let costSol = 0;
      const lots = inventory[memecoinMint] || [];
      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        const take = Math.min(remaining, lot.qty);
        costUsd += take * lot.costUsdPerToken;
        costSol += take * lot.costSolPerToken;
        lot.qty -= take;
        remaining -= take;
        if (lot.qty <= 1e-9) {
          lots.shift();
        }
      }
      inventory[memecoinMint] = lots;

      const pnlUsd = amountUsd - costUsd;
      const pnlSol = amountSol - costSol;

      trades.push({
        signature,
        tokenAddress: memecoinMint,
        tokenSymbol: metadata.symbol,
        side: "sell",
        quantity: qty,
        amountUsd,
        amountSol,
        profitLossUsd: pnlUsd,
        profitLossSol: pnlSol,
        priceUsd: priceData.priceUsd,
        priceSol: priceData.priceSol,
        priceSource: priceData.source,
        isBonded: priceData.isBonded,
        timestamp: timestampIso,
        source,
      });
    }
  }

  return trades.filter((t) => !isExcludedMint(t.tokenAddress));
}


// Helper function to get token price (placeholder - integrate with price API)
export async function getTokenPriceUsd(
  tokenAddress: string,
  timestamp?: number
): Promise<number> {
  // In production, integrate with:
  // - CoinGecko API
  // - Birdeye API
  // - Jupiter Price API
  // - Helius Token Metadata API
  
  // For now, return a placeholder
  return 0;
}

