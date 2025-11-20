export type TradeSide = "buy" | "sell";

export type ProfileTrade = {
  signature: string;
  tokenAddress: string;
  tokenSymbol: string;
  side: TradeSide;
  quantity: number;
  amountUsd: number;
  amountSol: number;
  profitLossUsd: number;
  timestamp: number;
};

export type ProfileStats = {
  solBalance: number;
  usdcBalance: number;
  solPriceUsd: number;
  portfolioValueUsd: number;
  winRate: number;
  avgDurationSeconds: number;
  topWinUsd: number;
  totalVolumeUsd: number;
  realizedProfitUsd: number;
  unrealizedProfitUsd: number;
  totalProfitUsd: number;
  totalTrades: number;
  lastTradeTimestamp: number | null;
};

export type HoldingsSummary = {
  tokenAddress: string;
  tokenSymbol: string;
  quantity: number;
  avgCostUsd: number;
  markPriceUsd: number;
  markValueUsd: number;
  unrealizedUsd: number;
};

export type ProfileAnalytics = {
  stats: ProfileStats;
  trades: ProfileTrade[];
  holdings: HoldingsSummary[];
};

