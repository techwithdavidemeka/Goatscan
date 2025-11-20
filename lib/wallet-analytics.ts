import { getProfileAnalytics } from "./moralisAnalytics";
import { getTokenPrice, SOLANA_MINT } from "./pricing";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface WalletMetrics {
  totalProfitUsd: number;
  totalProfitSol: number;
  pnlPercent: number;
  totalTrades: number;
  lastTradeTimestamp: string | null;
}

export async function calculateWalletMetrics(
  walletAddress: string,
  userId: string,
  supabase: SupabaseClient
): Promise<WalletMetrics> {
  // Helper function to safely convert timestamp to ISO string
  const safeTimestampToISO = (timestamp: number): string => {
    if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) {
      return new Date().toISOString();
    }
    try {
      const date = new Date(timestamp * 1000);
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  try {
    console.log(`Calculating wallet metrics using Moralis Wallet API for ${walletAddress}`);
    
    // Use getProfileAnalytics for accurate FIFO-based PnL calculation
    const analytics = await getProfileAnalytics(walletAddress);
    
    // Get existing trades from database to avoid duplicates
    const { data: existingTradesByUser } = await supabase
      .from("trades")
      .select("timestamp, token_address, signature")
      .eq("user_id", userId);
    
    // Get all signatures globally (since signature is a unique constraint)
    const { data: allExistingTrades } = await supabase
      .from("trades")
      .select("signature")
      .not("signature", "is", null);
    
    const existingSignatures = new Set(
      allExistingTrades?.map((t: any) => t.signature).filter(Boolean) || []
    );
    const existingTimeAddrKeys = new Set(
      existingTradesByUser?.map((t: any) => `${t.timestamp}_${t.token_address}`) || []
    );

    // Convert ProfileTrade to database format and filter duplicates
    const newTrades = analytics.trades.filter((trade) => {
      if (trade.signature && existingSignatures.has(trade.signature)) return false;
      const tradeKey = `${safeTimestampToISO(trade.timestamp)}_${trade.tokenAddress}`;
      return !existingTimeAddrKeys.has(tradeKey);
    });

    console.log(`Deduplication for ${walletAddress}: newTrades=${newTrades.length}, existing=${(existingTradesByUser?.length)||0}, totalAnalyticsTrades=${analytics.trades.length}`);
    
    // Insert new trades into database for historical tracking
    if (newTrades.length > 0) {
      // Get token prices for each trade to populate price fields
      const tradesWithPrices = await Promise.all(
        newTrades.map(async (trade) => {
          try {
            const priceData = await getTokenPrice(trade.tokenAddress, trade.timestamp);
            return {
              user_id: userId,
              token_symbol: trade.tokenSymbol,
              token_address: trade.tokenAddress,
              amount_usd: trade.amountUsd,
              amount_sol: trade.amountSol,
              profit_loss_usd: trade.profitLossUsd,
              profit_loss_sol: trade.profitLossUsd / (priceData.priceSol || 1), // Approximate SOL PnL
              price_usd: priceData.priceUsd,
              price_sol: priceData.priceSol,
              price_source: "moralis",
              is_bonded: priceData.isBonded,
              timestamp: safeTimestampToISO(trade.timestamp),
              side: trade.side,
              quantity: trade.quantity,
              signature: trade.signature,
            };
          } catch (error) {
            console.warn(`Failed to get price for ${trade.tokenAddress}, using defaults`, error);
            return {
              user_id: userId,
              token_symbol: trade.tokenSymbol,
              token_address: trade.tokenAddress,
              amount_usd: trade.amountUsd,
              amount_sol: trade.amountSol,
              profit_loss_usd: trade.profitLossUsd,
              profit_loss_sol: 0,
              price_usd: 0,
              price_sol: 0,
              price_source: "moralis",
              is_bonded: false,
              timestamp: safeTimestampToISO(trade.timestamp),
              side: trade.side,
              quantity: trade.quantity,
              signature: trade.signature,
            };
          }
        })
      );

      // Insert trades with extended columns
      const insertAttempt = await supabase.from("trades").insert(tradesWithPrices);
      if (insertAttempt.error) {
        console.warn("Insert with extended columns failed, retrying with minimal set:", insertAttempt.error.message);
        const tradesMinimal = newTrades.map((trade) => ({
          user_id: userId,
          token_symbol: trade.tokenSymbol,
          token_address: trade.tokenAddress,
          amount_usd: trade.amountUsd,
          amount_sol: trade.amountSol,
          profit_loss_usd: trade.profitLossUsd,
          profit_loss_sol: 0,
          timestamp: safeTimestampToISO(trade.timestamp),
        }));
        const retry = await supabase.from("trades").insert(tradesMinimal);
        if (retry.error) {
          console.error("Error inserting trades:", retry.error);
        }
      }
    }
    
    // Extract metrics from ProfileAnalytics (uses accurate FIFO cost basis)
    const stats = analytics.stats;
    const totalProfitUsd = stats.totalProfitUsd; // realized + unrealized
    const totalProfitSol = totalProfitUsd / (stats.solPriceUsd || 1); // Approximate SOL PnL
    
    // Calculate PnL percentage: (Total Profit / Total Volume) * 100
    const pnlPercent = stats.totalVolumeUsd > 0 
      ? (totalProfitUsd / stats.totalVolumeUsd) * 100 
      : 0;
    
    // Get last trade timestamp - validate it's a valid number and positive
    let lastTradeTimestamp: string | null = null;
    if (stats.lastTradeTimestamp && typeof stats.lastTradeTimestamp === 'number' && stats.lastTradeTimestamp > 0) {
      try {
        const date = new Date(stats.lastTradeTimestamp * 1000);
        if (!isNaN(date.getTime())) {
          lastTradeTimestamp = date.toISOString();
        }
      } catch (error) {
        console.warn(`Invalid timestamp for ${walletAddress}: ${stats.lastTradeTimestamp}`, error);
      }
    }
    
    console.log(
      `Metrics for ${walletAddress}: ${stats.totalTrades} trades, ` +
      `$${totalProfitUsd.toFixed(2)} profit (realized: $${stats.realizedProfitUsd.toFixed(2)}, unrealized: $${stats.unrealizedProfitUsd.toFixed(2)}), ` +
      `${pnlPercent.toFixed(2)}% PnL`
    );
    
    return {
      totalProfitUsd: Math.round(totalProfitUsd * 100) / 100,
      totalProfitSol: Math.round(totalProfitSol * 10000) / 10000,
      pnlPercent: Math.round(pnlPercent * 100) / 100,
      totalTrades: stats.totalTrades,
      lastTradeTimestamp,
    };
  } catch (error) {
    console.error(`Error calculating metrics for wallet ${walletAddress}:`, error);
    throw error;
  }
}

export async function updateUserWalletMetrics(
  userId: string,
  metrics: WalletMetrics,
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({
      total_profit_usd: metrics.totalProfitUsd,
      pnl_percent: metrics.pnlPercent,
      total_trades: metrics.totalTrades,
      last_trade_timestamp: metrics.lastTradeTimestamp,
    })
    .eq("id", userId);
  
  if (error) {
    throw new Error(`Failed to update user metrics: ${error.message}`);
  }
}

