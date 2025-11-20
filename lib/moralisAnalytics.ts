import { getWalletSwaps, getTokenMetadata, getTokenPrice, MoralisSwap, MoralisSwapLeg, SOLANA_MINT, USDC_MINT } from "./pricing";
import type { ProfileAnalytics, ProfileStats, ProfileTrade, HoldingsSummary } from "./types/profileAnalytics";

type InventoryLot = {
  qty: number;
  costUsdPerToken: number;
  costSolPerToken: number;
  timestamp: number;
};

const STABLE_OR_BLUECHIP_MINTS = new Set<string>([
  USDC_MINT,
  // Additional blue chips we ignore for memecoin detection
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL3qYk7RKV6x",
  "JitoSOL1111111111111111111111111111111111111",
]);

function isExcludedMint(mint: string): boolean {
  return STABLE_OR_BLUECHIP_MINTS.has(mint);
}

function getLegMint(leg?: MoralisSwapLeg | null): string {
  if (!leg) return "";
  return leg.mint || leg.address || leg.tokenAddress || "";
}

function getLegAmount(leg?: MoralisSwapLeg | null): number {
  if (!leg) return 0;
  if (typeof leg.amount === "number" && Number.isFinite(leg.amount)) {
    return leg.amount;
  }
  if (typeof leg.amountFormatted === "string") {
    const parsed = Number(leg.amountFormatted);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof leg.amountDecimal === "number" && Number.isFinite(leg.amountDecimal)) {
    return leg.amountDecimal;
  }
  const rawValue = leg.amountRaw ?? leg.rawAmount ?? leg.amount ?? 0;
  const raw = typeof rawValue === "string" ? Number(rawValue) : rawValue;
  const decimals = leg.decimals ?? 0;
  if (!Number.isFinite(raw) || !Number.isFinite(decimals)) return 0;
  return raw / 10 ** decimals;
}

function resolveSwapTimestamp(swap: MoralisSwap): number {
  return (
    swap.blockTimestamp ||
    swap.blockTime ||
    swap.timestamp ||
    Math.floor(Date.now() / 1000)
  );
}

function getPrimaryTokenMint(tokenInMint: string, tokenOutMint: string) {
  if (!isExcludedMint(tokenOutMint)) return tokenOutMint;
  if (!isExcludedMint(tokenInMint)) return tokenInMint;
  return tokenOutMint || tokenInMint;
}

export async function getProfileAnalytics(walletAddress: string): Promise<ProfileAnalytics> {
  const swaps = await getWalletSwaps(walletAddress, { limit: 250 });
  const sorted = [...swaps].sort(
    (a, b) => resolveSwapTimestamp(a) - resolveSwapTimestamp(b)
  );

  const metadataCache = new Map<string, { symbol: string }>();
  const priceCache = new Map<string, { priceUsd: number; priceSol: number; isBonded: boolean }>();
  const currentPriceCache = new Map<string, { priceUsd: number }>();

  const inventory = new Map<string, InventoryLot[]>();
  const trades: ProfileTrade[] = [];

  let totalVolumeUsd = 0;
  let realizedProfitUsd = 0;
  let unrealizedProfitUsd = 0;
  let wins = 0;
  let totalSells = 0;
  let topWinUsd = 0;
  let durationWeightedSeconds = 0;
  let durationQty = 0;

  for (const swap of sorted) {
    const signature = swap.signature || swap.transactionSignature;
    if (!signature) continue;

    const tokenInMint = getLegMint(swap.tokenIn);
    const tokenOutMint = getLegMint(swap.tokenOut);
    const selectedMint = getPrimaryTokenMint(tokenInMint, tokenOutMint);
    if (!selectedMint) continue;

    const isBuy = selectedMint === tokenOutMint;
    const qty = getLegAmount(isBuy ? swap.tokenOut : swap.tokenIn);
    if (qty <= 0) continue;

    const timestampSec = resolveSwapTimestamp(swap);

    if (!metadataCache.has(selectedMint)) {
      const metadata = await getTokenMetadata(selectedMint);
      metadataCache.set(selectedMint, { symbol: metadata.symbol });
    }
    const { symbol } = metadataCache.get(selectedMint)!;

    const priceCacheKey = `${selectedMint}_${timestampSec}`;
    if (!priceCache.has(priceCacheKey)) {
      const priceData = await getTokenPrice(selectedMint, timestampSec);
      priceCache.set(priceCacheKey, {
        priceUsd: priceData.priceUsd,
        priceSol: priceData.priceSol,
        isBonded: priceData.isBonded,
      });
    }
    const priceData = priceCache.get(priceCacheKey)!;

    const amountUsd = qty * priceData.priceUsd;
    const amountSol = qty * priceData.priceSol;
    totalVolumeUsd += amountUsd;

    if (!inventory.has(selectedMint)) {
      inventory.set(selectedMint, []);
    }

    if (isBuy) {
      inventory.get(selectedMint)!.push({
        qty,
        costUsdPerToken: priceData.priceUsd,
        costSolPerToken: priceData.priceSol,
        timestamp: timestampSec,
      });
      trades.push({
        signature,
        tokenAddress: selectedMint,
        tokenSymbol: symbol,
        side: "buy",
        quantity: qty,
        amountUsd,
        amountSol,
        profitLossUsd: 0,
        timestamp: timestampSec,
      });
      continue;
    }

    totalSells += 1;
    let remaining = qty;
    let costUsd = 0;
    let latestLotTimestamp = timestampSec;
    const lots = inventory.get(selectedMint)!;

    while (remaining > 0 && lots.length > 0) {
      const lot = lots[0];
      const take = Math.min(remaining, lot.qty);
      costUsd += take * lot.costUsdPerToken;
      const durationSec = timestampSec - lot.timestamp;
      durationWeightedSeconds += durationSec * take;
      durationQty += take;
      lot.qty -= take;
      remaining -= take;
      if (lot.qty <= 1e-9) {
        lots.shift();
      }
      latestLotTimestamp = lot.timestamp;
    }
    inventory.set(selectedMint, lots);

    const pnlUsd = amountUsd - costUsd;
    realizedProfitUsd += pnlUsd;
    if (pnlUsd > 0) wins += 1;
    if (pnlUsd > topWinUsd) topWinUsd = pnlUsd;

    trades.push({
      signature,
      tokenAddress: selectedMint,
      tokenSymbol: symbol,
      side: "sell",
      quantity: qty,
      amountUsd,
      amountSol,
      profitLossUsd: pnlUsd,
      timestamp: timestampSec,
    });
  }

  const holdings: HoldingsSummary[] = [];

  for (const [mint, lots] of inventory.entries()) {
    const totalQty = lots.reduce((sum, lot) => sum + lot.qty, 0);
    if (totalQty <= 0) continue;
    const totalCostUsd = lots.reduce((sum, lot) => sum + lot.qty * lot.costUsdPerToken, 0);
    const avgCostUsd = totalCostUsd / totalQty;

    if (!metadataCache.has(mint)) {
      const metadata = await getTokenMetadata(mint);
      metadataCache.set(mint, { symbol: metadata.symbol });
    }
    const symbol = metadataCache.get(mint)!.symbol;

    if (!currentPriceCache.has(mint)) {
      const priceData = await getTokenPrice(mint);
      currentPriceCache.set(mint, { priceUsd: priceData.priceUsd });
    }
    const markPrice = currentPriceCache.get(mint)!.priceUsd;
    const markValueUsd = markPrice * totalQty;
    const unrealized = (markPrice - avgCostUsd) * totalQty;
    unrealizedProfitUsd += unrealized;

    holdings.push({
      tokenAddress: mint,
      tokenSymbol: symbol,
      quantity: totalQty,
      avgCostUsd,
      markPriceUsd: markPrice,
      markValueUsd,
      unrealizedUsd: unrealized,
    });
  }

  const solBalance =
    holdings.find((h) => h.tokenAddress === SOLANA_MINT)?.quantity ?? 0;
  const usdcBalance =
    holdings.find((h) => h.tokenAddress === USDC_MINT)?.quantity ?? 0;

  const stats: ProfileStats = {
    solBalance,
    usdcBalance,
    winRate: totalSells > 0 ? (wins / totalSells) * 100 : 0,
    avgDurationSeconds: durationQty > 0 ? durationWeightedSeconds / durationQty : 0,
    topWinUsd,
    totalVolumeUsd,
    realizedProfitUsd,
    unrealizedProfitUsd,
  };

  trades.sort((a, b) => b.timestamp - a.timestamp);

  return {
    stats,
    trades,
    holdings,
  };
}

