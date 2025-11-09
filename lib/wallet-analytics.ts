import { fetchWalletTransactions, parseTradesFromTransactions, ParsedTrade } from "./helius";
import { supabase } from "@/lib/supabaseClient";
import { Trade } from "@/lib/types";

export interface WalletMetrics {
  totalProfitUsd: number;
  pnlPercent: number;
  totalTrades: number;
  lastTradeTimestamp: string | null;
}

export async function calculateWalletMetrics(
  walletAddress: string,
  userId: string
): Promise<WalletMetrics> {
  try {
    // Fetch transactions from Helius
    const transactions = await fetchWalletTransactions(walletAddress);
    
    // Parse trades from transactions
    const parsedTrades = await parseTradesFromTransactions(transactions, walletAddress);
    
    // Get existing trades from database to avoid duplicates
    // Use timestamp and token_address as unique identifier if signature doesn't exist
    const { data: existingTrades } = await supabase
      .from("trades")
      .select("timestamp, token_address")
      .eq("user_id", userId);
    
    const existingTradeKeys = new Set(
      existingTrades?.map((t: any) => `${t.timestamp}_${t.token_address}`) || []
    );
    
    // Filter out existing trades and insert new ones
    const newTrades = parsedTrades.filter((trade) => {
      const tradeKey = `${trade.timestamp}_${trade.tokenAddress}`;
      return !existingTradeKeys.has(tradeKey);
    });
    
    if (newTrades.length > 0) {
      // Insert new trades
      const tradesToInsert = newTrades.map((trade) => ({
        user_id: userId,
        token_symbol: trade.tokenSymbol,
        token_address: trade.tokenAddress,
        amount_usd: trade.amountUsd,
        profit_loss_usd: trade.profitLossUsd,
        timestamp: trade.timestamp,
      }));
      
      const { error: insertError } = await supabase
        .from("trades")
        .insert(tradesToInsert);
      
      if (insertError) {
        console.error("Error inserting trades:", insertError);
      }
    }
    
    // Fetch all trades for this user (including new ones)
    const { data: allTrades } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false });
    
    if (!allTrades || allTrades.length === 0) {
      return {
        totalProfitUsd: 0,
        pnlPercent: 0,
        totalTrades: 0,
        lastTradeTimestamp: null,
      };
    }
    
    // Calculate metrics
    const totalProfitUsd = allTrades.reduce(
      (sum: number, trade: Trade) => sum + (trade.profit_loss_usd || 0),
      0
    );
    
    const totalVolume = allTrades.reduce(
      (sum: number, trade: Trade) => sum + (trade.amount_usd || 0),
      0
    );
    
    // Calculate PnL percentage
    // PnL% = (Total Profit / Total Volume) * 100
    const pnlPercent = totalVolume > 0 
      ? (totalProfitUsd / totalVolume) * 100 
      : 0;
    
    const lastTradeTimestamp = allTrades[0]?.timestamp || null;
    
    return {
      totalProfitUsd: Math.round(totalProfitUsd * 100) / 100,
      pnlPercent: Math.round(pnlPercent * 100) / 100,
      totalTrades: allTrades.length,
      lastTradeTimestamp,
    };
  } catch (error) {
    console.error(`Error calculating metrics for wallet ${walletAddress}:`, error);
    throw error;
  }
}

export async function updateUserWalletMetrics(
  userId: string,
  metrics: WalletMetrics
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

