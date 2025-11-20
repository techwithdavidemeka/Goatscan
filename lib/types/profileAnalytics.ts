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
  winRate: number;
  avgDurationSeconds: number;
  topWinUsd: number;
  totalVolumeUsd: number;
  realizedProfitUsd: number;
  unrealizedProfitUsd: number;
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

