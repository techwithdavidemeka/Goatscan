import { supabase } from "@/lib/supabaseClient";
import { User } from "@/lib/types";

export async function signInWithTwitter() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "twitter",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function createUserProfile(
  userId: string,
  xUsername: string,
  walletAddress: string,
  followersCount: number = 0
): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .insert({
      id: userId,
      x_username: xUsername,
      wallet_address: walletAddress,
      followers_count: followersCount,
      pnl_percent: 0,
      total_profit_usd: 0,
      total_trades: 0,
      active: true,
    })
    .select()
    .single();

  if (error) {
    // If user already exists, update instead
    if (error.code === "23505") {
      const { data: updateData, error: updateError } = await supabase
        .from("users")
        .update({
          x_username: xUsername,
          wallet_address: walletAddress,
          followers_count: followersCount,
        })
        .eq("id", userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return updateData;
    }
    throw error;
  }

  return data;
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

