import { supabase } from "@/lib/supabaseClient";
import { User, Trade } from "@/lib/types";

export async function getTopTraders(limit: number = 10): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("active", true)
    .order("pnl_percent", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching top traders:", error);
    return [];
  }

  return data || [];
}

export async function getLeaderboard(): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("active", true)
    .order("pnl_percent", { ascending: false });

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }

  return data || [];
}

export async function getUserByUsername(username: string): Promise<User | null> {
  // Try case-insensitive lookup first
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("x_username", username) // Case-insensitive match
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  return data;
}

export async function getUserTrades(userId: string): Promise<Trade[]> {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Error fetching trades:", error);
    return [];
  }

  return data || [];
}

export async function calculateWinRate(trades: Trade[]): Promise<number> {
  if (trades.length === 0) return 0;
  
  const winningTrades = trades.filter((trade) => trade.profit_loss_usd > 0);
  return (winningTrades.length / trades.length) * 100;
}

export async function getTradeStats(trades: Trade[]) {
  if (trades.length === 0) {
    return {
      winRate: 0,
      bestTrade: 0,
      worstTrade: 0,
      avgTradeSize: 0,
      totalVolume: 0,
    };
  }

  const winningTrades = trades.filter((trade) => trade.profit_loss_usd > 0);
  const winRate = (winningTrades.length / trades.length) * 100;

  const profits = trades.map((trade) => trade.profit_loss_usd);
  const bestTrade = Math.max(...profits);
  const worstTrade = Math.min(...profits);

  const totalVolume = trades.reduce((sum, trade) => sum + trade.amount_usd, 0);
  const avgTradeSize = totalVolume / trades.length;

  return {
    winRate: Math.round(winRate * 10) / 10,
    bestTrade: Math.round(bestTrade * 100) / 100,
    worstTrade: Math.round(worstTrade * 100) / 100,
    avgTradeSize: Math.round(avgTradeSize * 100) / 100,
    totalVolume: Math.round(totalVolume * 100) / 100,
  };
}

