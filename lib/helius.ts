 

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

const DEXSCREENER_TOKEN_ENDPOINT = "https://api.dexscreener.com/latest/dex/tokens";
const JUPITER_PRICE_ENDPOINT = "https://price.jup.ag/v6/price?ids=SOL";

// -------------------------
// Types
// -------------------------
export type HeliusParsedTransaction = {
  signature: string;
  timestamp: number;
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
};

export type TradeSide = "buy" | "sell";

export type ParsedTrade = {
  signature: string;
  tokenAddress: string;
  tokenSymbol: string;
  side: TradeSide;
  quantity: number; // token quantity bought/sold
  amountUsd: number; // notional value of the trade in USD
  profitLossUsd: number; // PnL realized for sell trades; 0 for buys
  timestamp: string; // ISO string
  source: string; // e.g. "pumpfun", "raydium", "jupiter", "meteora", ...
};

// -------------------------
// Caches
// -------------------------
const tokenMetaCache = new Map<string, { symbol: string; fetchedAt: number }>();
const SOL_PRICE_CACHE_TTL_MS = 60_000; // 1 minute
let cachedSolPriceUsd: { value: number; ts: number } | null = null;

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

// Recognize pump.fun and common DEX sources from Helius programInfo.source
function normalizeSource(source?: string | null): string {
  const s = (source || "").toLowerCase();
  if (s.includes("pump")) return "pumpfun";
  if (s.includes("raydium")) return "raydium";
  if (s.includes("jupiter")) return "jupiter";
  if (s.includes("meteora")) return "meteora";
  if (s.includes("orca")) return "orca";
  return s || "unknown";
}

// -------------------------
// Price and Metadata Helpers
// -------------------------
export async function getSolPriceUsd(): Promise<number> {
  const now = Date.now();
  if (cachedSolPriceUsd && now - cachedSolPriceUsd.ts < SOL_PRICE_CACHE_TTL_MS) {
    return cachedSolPriceUsd.value;
  }
  try {
    const resp = await fetch(JUPITER_PRICE_ENDPOINT, { cache: "no-store" });
    const json = await resp.json();
    const price = json.data?.SOL?.price || 0;
    if (price > 0) {
      cachedSolPriceUsd = { value: price, ts: now };
      return price;
    }
  } catch {
    // ignore; fallback later
  }
  // conservative fallback
  return 150;
}

async function getTokenSymbol(mint: string): Promise<string> {
  const cached = tokenMetaCache.get(mint);
  if (cached && Date.now() - cached.fetchedAt < 5 * 60_000) {
    return cached.symbol;
  }
  try {
    const url = `${DEXSCREENER_TOKEN_ENDPOINT}/${mint}`;
    const resp = await fetch(url, { cache: "force-cache" });
    if (resp.ok) {
      const json = await resp.json();
      const symbol =
        json?.pairs?.[0]?.baseToken?.symbol ||
        json?.pairs?.[0]?.baseToken?.name ||
        "MEME";
      tokenMetaCache.set(mint, { symbol, fetchedAt: Date.now() });
      return symbol;
    }
  } catch {
    // ignore
  }
  return "MEME";
}

function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

function rawToAmount(raw: { tokenAmount: string; decimals: number }): number {
  const amt = Number(raw.tokenAmount);
  return raw.decimals > 0 ? amt / 10 ** raw.decimals : amt;
}

function isExcludedMint(mint: string): boolean {
  return STABLE_OR_BLUECHIP_MINTS.has(mint);
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
  transactions: HeliusParsedTransaction[],
  walletAddress: string
): Promise<ParsedTrade[]> {
  // Inventory per mint for FIFO cost basis
  const inventory: Record<
    string,
    Array<{ qty: number; costUsdPerToken: number }>
  > = {};
  const trades: ParsedTrade[] = [];
  const solPriceUsd = await getSolPriceUsd();

  for (const tx of transactions) {
    const swap = tx.events?.swap;
    if (!swap) continue;
    // Only consider swaps initiated by the wallet
    if (swap.userAccount && swap.userAccount !== walletAddress) continue;

    const source = normalizeSource(swap.programInfo?.source);
    const timestampIso = new Date(tx.timestamp * 1000).toISOString();

    // Determine non-stable token mint and quote amount (SOL/USDC/USDT)
    const tokenOut =
      swap.tokenOutputs?.find((o) => !isExcludedMint(o.mint)) || null;
    const tokenIn =
      swap.tokenInputs?.find((i) => !isExcludedMint(i.mint)) || null;

    const stableIn =
      swap.tokenInputs?.find((i) => isExcludedMint(i.mint)) || null;
    const stableOut =
      swap.tokenOutputs?.find((o) => isExcludedMint(o.mint)) || null;

    // Native SOL flows as input/output
    const nativeInLamports = swap.nativeInput?.amount || 0;
    const nativeOutLamports = swap.nativeOutput?.amount || 0;

    // Buy scenario: spend SOL/USDC to receive token
    if ((tokenOut && (stableIn || nativeInLamports > 0)) || (tokenOut && !tokenIn)) {
      const mint = tokenOut.mint;
      const qty = rawToAmount(tokenOut.rawTokenAmount);
      let notionalUsd = 0;

      if (stableIn) {
        const amt = rawToAmount(stableIn.rawTokenAmount);
        // USDC/USDT ~ USD
        notionalUsd = amt;
      } else if (nativeInLamports > 0) {
        notionalUsd = lamportsToSol(nativeInLamports) * solPriceUsd;
      }

      const symbol = await getTokenSymbol(mint);

      // Record inventory for cost basis
      if (!inventory[mint]) inventory[mint] = [];
      const unitCost = qty > 0 ? notionalUsd / qty : 0;
      inventory[mint].push({ qty, costUsdPerToken: unitCost });

      trades.push({
        signature: tx.signature,
        tokenAddress: mint,
        tokenSymbol: symbol,
        side: "buy",
        quantity: qty,
        amountUsd: notionalUsd,
        profitLossUsd: 0,
        timestamp: timestampIso,
        source,
      });
      continue;
    }

    // Sell scenario: receive SOL/USDC by giving token
    if ((tokenIn && (stableOut || nativeOutLamports > 0)) || (tokenIn && !tokenOut)) {
      const mint = tokenIn.mint;
      const qtyToSell = rawToAmount(tokenIn.rawTokenAmount);
      let proceedsUsd = 0;

      if (stableOut) {
        const amt = rawToAmount(stableOut.rawTokenAmount);
        proceedsUsd = amt;
      } else if (nativeOutLamports > 0) {
        proceedsUsd = lamportsToSol(nativeOutLamports) * solPriceUsd;
      }

      const symbol = await getTokenSymbol(mint);

      // Compute cost basis from inventory FIFO
      let remaining = qtyToSell;
      let costUsd = 0;
      const lots = inventory[mint] || [];
      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        const take = Math.min(remaining, lot.qty);
        costUsd += take * lot.costUsdPerToken;
        lot.qty -= take;
        remaining -= take;
        if (lot.qty <= 1e-9) {
          lots.shift();
        }
      }
      // If selling more than current inventory, treat excess cost as zero (edge case)
      if (remaining > 0) {
        // no-op for cost
      }
      inventory[mint] = lots;

      const pnlUsd = proceedsUsd - costUsd;

      trades.push({
        signature: tx.signature,
        tokenAddress: mint,
        tokenSymbol: symbol,
        side: "sell",
        quantity: qtyToSell,
        amountUsd: proceedsUsd,
        profitLossUsd: pnlUsd,
        timestamp: timestampIso,
        source,
      });
    }
  }

  // Filter to memecoins: include any token not in excluded list
  const filtered = trades.filter((t) => !isExcludedMint(t.tokenAddress));
  return filtered;
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

