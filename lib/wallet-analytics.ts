import { fetchWalletTransactions, parseTradesFromTransactions, ParsedTrade, getSolPriceUsd } from "./helius";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Trade } from "@/lib/types";

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
  try {
    // Fetch transactions from Helius (covers Pump.fun and DEX swaps via events.source)
    const transactions = await fetchWalletTransactions(walletAddress);
    console.log(`Fetched ${transactions.length} transactions from Helius for ${walletAddress}`);
    
    if (transactions.length > 0) {
      console.log(`First transaction sample:`, JSON.stringify(transactions[0], null, 2).substring(0, 1000));
    }
    
    // Parse trades from transactions
    const parsedTrades = await parseTradesFromTransactions(transactions, walletAddress);
    console.log(`Parsed ${parsedTrades.length} trades from ${transactions.length} transactions`);

    // Log inclusion by source (Pump.fun vs DEX)
    const pumpTrades = parsedTrades.filter((t) => t.source === "pumpfun");
    const dexTrades = parsedTrades.filter((t) => t.source !== "pumpfun");
    console.log(`Parsed trades for ${walletAddress}: total=${parsedTrades.length}, pumpfun=${pumpTrades.length}, dex=${dexTrades.length}`);
    
    // Get existing trades from database to avoid duplicates
    // Signatures are globally unique (transaction signatures), so check across all users
    // Also check user-specific trades for timestamp+token_address fallback
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
    
    // Filter out existing trades and insert new ones
    const newTrades = parsedTrades.filter((trade) => {
      if (trade.signature && existingSignatures.has(trade.signature)) return false;
      const tradeKey = `${trade.timestamp}_${trade.tokenAddress}`;
      return !existingTimeAddrKeys.has(tradeKey);
    });

    console.log(`Deduplication for ${walletAddress}: newTrades=${newTrades.length}, existing=${(existingTradesByUser?.length)||0}, globalSignatures=${existingSignatures.size}`);
    
    if (newTrades.length > 0) {
      // Insert new trades - prefer including source/side/quantity if columns exist
      const tradesWithExtended = newTrades.map((trade) => ({
        user_id: userId,
        token_symbol: trade.tokenSymbol,
        token_address: trade.tokenAddress,
        amount_usd: trade.amountUsd,
        profit_loss_usd: trade.profitLossUsd,
        timestamp: trade.timestamp,
        source: trade.source, // optional column
        side: trade.side, // optional column
        quantity: trade.quantity, // optional column
        signature: trade.signature, // optional column for idempotency
      }));

      // First attempt with extended columns; if it fails, retry with minimal set
      const insertAttempt = await supabase.from("trades").insert(tradesWithExtended);
      if (insertAttempt.error) {
        console.warn("Insert with extended columns failed, retrying with minimal set:", insertAttempt.error.message);
        const tradesMinimal = newTrades.map((trade) => ({
          user_id: userId,
          token_symbol: trade.tokenSymbol,
          token_address: trade.tokenAddress,
          amount_usd: trade.amountUsd,
          profit_loss_usd: trade.profitLossUsd,
          timestamp: trade.timestamp,
        }));
        const retry = await supabase.from("trades").insert(tradesMinimal);
        if (retry.error) {
          console.error("Error inserting trades:", retry.error);
        }
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
        totalProfitSol: 0,
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
    
    // Current SOL price for SOL-denominated PnL
    const solPrice = await getSolPriceUsd();
    const totalProfitSol = solPrice > 0 ? totalProfitUsd / solPrice : 0;

    // Calculate PnL percentage
    // PnL% = (Total Profit / Total Volume) * 100
    const pnlPercent = totalVolume > 0 
      ? (totalProfitUsd / totalVolume) * 100 
      : 0;
    
    const lastTradeTimestamp = allTrades[0]?.timestamp || null;
    
    return {
      totalProfitUsd: Math.round(totalProfitUsd * 100) / 100,
      totalProfitSol: Math.round(totalProfitSol * 10000) / 10000,
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

