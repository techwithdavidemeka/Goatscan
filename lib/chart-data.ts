import { Trade } from "@/lib/types";

export interface ChartDataPoint {
  date: string;
  profitLoss: number;
  cumulativeProfit: number;
  portfolioValue: number;
}

export function prepareProfitLossData(trades: Trade[]): ChartDataPoint[] {
  if (trades.length === 0) return [];

  // Sort trades by timestamp (oldest first)
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let cumulativeProfit = 0;
  let portfolioValue = 0;

  return sortedTrades.map((trade) => {
    cumulativeProfit += trade.profit_loss_usd || 0;
    portfolioValue += trade.amount_usd || 0;

    return {
      date: new Date(trade.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      profitLoss: trade.profit_loss_usd || 0,
      cumulativeProfit: Math.round(cumulativeProfit * 100) / 100,
      portfolioValue: Math.round(portfolioValue * 100) / 100,
    };
  });
}

export function preparePortfolioGrowthData(trades: Trade[]): ChartDataPoint[] {
  if (trades.length === 0) return [];

  // Sort trades by timestamp (oldest first)
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let cumulativeProfit = 0;
  let cumulativeAmount = 0;

  return sortedTrades.map((trade) => {
    cumulativeProfit += trade.profit_loss_usd || 0;
    cumulativeAmount += trade.amount_usd || 0;
    // Portfolio value = initial amount + profit/loss
    const portfolioValue = cumulativeAmount + cumulativeProfit;

    return {
      date: new Date(trade.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      profitLoss: trade.profit_loss_usd || 0,
      cumulativeProfit: Math.round(cumulativeProfit * 100) / 100,
      portfolioValue: Math.round(portfolioValue * 100) / 100,
    };
  });
}

