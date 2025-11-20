import type { SupabaseClient } from "@supabase/supabase-js";

export type PriceData = {
  priceUsd: number;
  priceSol: number;
  source: "moralis";
  timestamp: number;
  isBonded: boolean;
};

export type TokenMetadata = {
  symbol: string;
  name: string;
  image?: string;
  description?: string;
  fdv?: number;
  liquidity?: number;
  marketCap?: number;
};

export type PumpfunStatus = {
  status: string;
  isBonded: boolean;
};

export type MoralisSwapLeg = {
  mint?: string;
  address?: string;
  tokenAddress?: string;
  decimals?: number;
  amount?: number;
  amountRaw?: string;
  rawAmount?: string;
  amountFormatted?: string;
  amountDecimal?: number;
  symbol?: string;
  name?: string;
};

export type MoralisSwap = {
  signature?: string;
  transactionSignature?: string;
  blockTimestamp?: number;
  blockTime?: number;
  timestamp?: number;
  slot?: number;
  owner?: string;
  userAddress?: string;
  tokenIn?: MoralisSwapLeg;
  tokenOut?: MoralisSwapLeg;
  amountUsd?: number;
  amountSol?: number;
};

const MORALIS_API_KEY =
  process.env.MORALIS_API_KEY || process.env.NEXT_PUBLIC_MORALIS_API_KEY;
const MORALIS_BASE_URL =
  process.env.MORALIS_BASE_URL || "https://solana-gateway.moralis.io";
const MORALIS_NETWORK = process.env.MORALIS_NETWORK || "mainnet";
const SOLANA_MINT = "So11111111111111111111111111111111111111112";
const CACHE_TTL_MS = 5 * 60_000;

const priceCache = new Map<string, { data: PriceData; fetchedAt: number }>();
const metadataCache = new Map<string, { data: TokenMetadata; fetchedAt: number }>();
const pumpStatusCache = new Map<string, { data: PumpfunStatus; fetchedAt: number }>();
let solPriceCache: { value: number; ts: number } | null = null;

function ensureMoralisConfig() {
  if (!MORALIS_API_KEY) {
    throw new Error(
      "Missing Moralis configuration. Set MORALIS_API_KEY (or NEXT_PUBLIC_MORALIS_API_KEY)."
    );
  }
}

async function moralisFetch(
  path: string,
  query?: Record<string, string | number | undefined>
) {
  ensureMoralisConfig();
  const url = new URL(`${MORALIS_BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  const resp = await fetch(url.toString(), {
    headers: {
      "X-API-Key": MORALIS_API_KEY!,
      accept: "application/json",
    },
    cache: "no-store",
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Moralis error ${resp.status}: ${text}`);
  }
  return resp.json();
}

function lamportsToNumber(value: string | number | undefined, decimals: number) {
  if (value === undefined || value === null) return 0;
  const raw = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(raw) || !Number.isFinite(decimals)) return 0;
  return raw / 10 ** decimals;
}

function timestampToIso(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function getLegMint(leg?: MoralisSwapLeg | null): string {
  if (!leg) return "";
  return (
    leg.mint ||
    leg.address ||
    leg.tokenAddress ||
    ""
  );
}

function getLegAmount(leg?: MoralisSwapLeg | null): number {
  if (!leg) return 0;
  if (typeof leg.amount === "number" && Number.isFinite(leg.amount)) {
    return leg.amount;
  }
  if (typeof leg.amount === "string" && leg.amount.trim().length > 0) {
    const parsed = Number(leg.amount);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof leg.amountFormatted === "string") {
    const parsed = Number(leg.amountFormatted);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof leg.amountDecimal === "number" && Number.isFinite(leg.amountDecimal)) {
    return leg.amountDecimal;
  }
  return lamportsToNumber(
    leg.amountRaw ?? leg.rawAmount ?? 0,
    leg.decimals ?? 0
  );
}

function resolveSwapTimestamp(swap: MoralisSwap): number {
  return (
    swap.blockTimestamp ||
    swap.blockTime ||
    swap.timestamp ||
    Math.floor(Date.now() / 1000)
  );
}

export async function getPumpfunStatus(
  tokenAddress: string
): Promise<PumpfunStatus> {
  const cached = pumpStatusCache.get(tokenAddress);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }
  try {
    const data = await moralisFetch(
      `/token/mainnet/${tokenAddress}/bonding-status`
    );
    const status = (data?.status || "unknown").toString().toLowerCase();
    const isBonded = status !== "bonding";
    const result: PumpfunStatus = { status, isBonded };
    pumpStatusCache.set(tokenAddress, { data: result, fetchedAt: Date.now() });
    return result;
  } catch (error) {
    console.warn(`Failed to fetch pump.fun status for ${tokenAddress}`, error);
    const fallback: PumpfunStatus = { status: "unknown", isBonded: false };
    pumpStatusCache.set(tokenAddress, { data: fallback, fetchedAt: Date.now() });
    return fallback;
  }
}

export async function getTokenMetadata(
  tokenAddress: string,
  supabase?: SupabaseClient
): Promise<TokenMetadata> {
  const cached = metadataCache.get(tokenAddress);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  if (supabase) {
    try {
      const { data } = await supabase
        .from("token_metadata")
        .select("symbol, name, fdv, liquidity, market_cap")
        .eq("token_address", tokenAddress)
        .single();
      if (data) {
        const metadata: TokenMetadata = {
          symbol: data.symbol || "MEME",
          name: data.name || "Unknown",
          fdv: data.fdv ? Number(data.fdv) : undefined,
          liquidity: data.liquidity ? Number(data.liquidity) : undefined,
          marketCap: data.market_cap ? Number(data.market_cap) : undefined,
        };
        metadataCache.set(tokenAddress, { data: metadata, fetchedAt: Date.now() });
        return metadata;
      }
    } catch {
      // continue to Moralis fetch
    }
  }

  try {
    const data = await moralisFetch(
      `/token/${MORALIS_NETWORK}/${tokenAddress}/metadata`
    );
    const metadata: TokenMetadata = {
      symbol: data?.symbol || "MEME",
      name: data?.name || "Unknown",
      image: data?.image,
      description: data?.description,
      fdv: data?.fdv || data?.market_cap,
      liquidity: data?.liquidity?.usd || data?.liquidity,
      marketCap: data?.market_cap,
    };
    metadataCache.set(tokenAddress, { data: metadata, fetchedAt: Date.now() });

    if (supabase) {
      try {
        await supabase.from("token_metadata").upsert({
          token_address: tokenAddress,
          symbol: metadata.symbol,
          name: metadata.name,
          fdv: metadata.fdv ? metadata.fdv.toString() : null,
          liquidity: metadata.liquidity ? metadata.liquidity.toString() : null,
          market_cap: metadata.marketCap ? metadata.marketCap.toString() : null,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // ignore errors here
      }
    }

    return metadata;
  } catch (error) {
    console.warn(`Failed to fetch metadata for ${tokenAddress}`, error);
  }

  const fallback: TokenMetadata = {
    symbol: "MEME",
    name: "Unknown",
  };
  metadataCache.set(tokenAddress, { data: fallback, fetchedAt: Date.now() });
  return fallback;
}

export async function getTokenPrice(
  tokenAddress: string,
  timestamp?: number,
  supabase?: SupabaseClient,
  opts?: { pumpfunStatus?: PumpfunStatus }
): Promise<PriceData> {
  const cacheKey = `${tokenAddress}_${timestamp || "latest"}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const isoTimestamp = timestamp ? timestampToIso(timestamp) : null;

  if (supabase && isoTimestamp) {
    try {
      const { data } = await supabase
        .from("token_prices")
        .select("price_usd, price_sol, source, is_bonded")
        .eq("token_address", tokenAddress)
        .eq("timestamp", isoTimestamp)
        .single();
      if (data) {
        const priceData: PriceData = {
          priceUsd: Number(data.price_usd) || 0,
          priceSol: Number(data.price_sol) || 0,
          source: "moralis",
          timestamp: timestamp!,
          isBonded: Boolean(data.is_bonded),
        };
        priceCache.set(cacheKey, { data: priceData, fetchedAt: Date.now() });
        return priceData;
      }
    } catch {
      // continue to API fetch
    }
  }

  let priceUsd = 0;
  let priceSol = 0;

  try {
    const data = await moralisFetch(
      `/token/${MORALIS_NETWORK}/${tokenAddress}/price`,
      timestamp ? { timestamp } : undefined
    );
    priceUsd =
      data?.usdPrice ??
      data?.priceUsd ??
      data?.price ??
      0;

    if (data?.nativePrice) {
      priceSol = lamportsToNumber(
        data.nativePrice.value,
        data.nativePrice.decimals ?? 9
      );
    } else if (data?.solanaPrice) {
      priceSol = Number(data.solanaPrice);
    }
  } catch (error) {
    console.warn(`Failed to fetch price for ${tokenAddress}`, error);
  }

  const resolvedTimestamp = timestamp || Math.floor(Date.now() / 1000);
  const status =
    opts?.pumpfunStatus || (await getPumpfunStatus(tokenAddress));
  const priceData: PriceData = {
    priceUsd,
    priceSol,
    source: "moralis",
    timestamp: resolvedTimestamp,
    isBonded: status.isBonded,
  };

  priceCache.set(cacheKey, { data: priceData, fetchedAt: Date.now() });

  if (supabase) {
    try {
      await supabase.from("token_prices").upsert({
        token_address: tokenAddress,
        timestamp: timestampToIso(resolvedTimestamp),
        price_usd: priceUsd.toString(),
        price_sol: priceSol.toString(),
        source: priceData.source,
        is_bonded: priceData.isBonded,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // ignore DB cache errors
    }
  }

  return priceData;
}

export async function getSolPriceUsd(): Promise<number> {
  const now = Date.now();
  if (solPriceCache && now - solPriceCache.ts < CACHE_TTL_MS) {
    return solPriceCache.value;
  }
  const priceData = await getTokenPrice(SOLANA_MINT);
  const value = priceData.priceUsd || 0;
  solPriceCache = { value, ts: now };
  return value || 150;
}

export async function getPumpfunList(
  list: "new" | "bonding" | "graduated"
) {
  return moralisFetch(`/token/mainnet/exchange/pumpfun/${list}`);
}

export async function getWalletSwaps(
  walletAddress: string,
  params?: Record<string, string | number>
): Promise<MoralisSwap[]> {
  const data = await moralisFetch(
    `/account/${MORALIS_NETWORK}/${walletAddress}/swaps`,
    params
  );
  const swaps = data?.swaps || data?.result || data || [];
  return Array.isArray(swaps) ? swaps : [];
}

export async function getTokenSwaps(
  tokenAddress: string,
  params?: Record<string, string | number>
): Promise<MoralisSwap[]> {
  const data = await moralisFetch(
    `/token/${MORALIS_NETWORK}/${tokenAddress}/swaps`,
    params
  );
  const swaps = data?.swaps || data?.result || data || [];
  return Array.isArray(swaps) ? swaps : [];
}

