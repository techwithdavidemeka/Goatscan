import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseClient";
import { calculateWalletMetrics, updateUserWalletMetrics } from "@/lib/wallet-analytics";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// This route fetches wallet data for a specific user
// Can be called via POST (from signup flow) or GET (for testing/manual triggers)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, walletAddress } = body;

    if (!userId || !walletAddress) {
      return NextResponse.json(
        { error: "userId and walletAddress are required" },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = getSupabaseServerClient();

    // Verify user exists and is active
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, wallet_address, x_username, active")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "User is not active" },
        { status: 400 }
      );
    }

    if (user.wallet_address !== walletAddress) {
      return NextResponse.json(
        { error: "Wallet address mismatch" },
        { status: 400 }
      );
    }

    console.log(`Processing wallet for user ${user.x_username} (${walletAddress})`);

    // Calculate metrics
    const metrics = await calculateWalletMetrics(
      walletAddress,
      userId,
      supabase
    );

    // Update user record
    await updateUserWalletMetrics(userId, metrics, supabase);

    console.log(
      `Updated ${user.x_username}: ${metrics.totalTrades} trades, ` +
      `$${metrics.totalProfitUsd} profit, ${metrics.pnlPercent}% PnL`
    );

    return NextResponse.json({
      message: "Wallet data fetched successfully",
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in fetch-user-wallet-data:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Also support GET for testing/manual triggers
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    const walletAddress = request.nextUrl.searchParams.get("walletAddress");

    if (!userId || !walletAddress) {
      return NextResponse.json(
        { error: "userId and walletAddress query parameters are required" },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = getSupabaseServerClient();

    // Verify user exists and is active
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, wallet_address, x_username, active")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "User is not active" },
        { status: 400 }
      );
    }

    if (user.wallet_address !== walletAddress) {
      return NextResponse.json(
        { error: "Wallet address mismatch" },
        { status: 400 }
      );
    }

    console.log(`Processing wallet for user ${user.x_username} (${walletAddress})`);

    // Calculate metrics
    const metrics = await calculateWalletMetrics(
      walletAddress,
      userId,
      supabase
    );

    // Update user record
    await updateUserWalletMetrics(userId, metrics, supabase);

    console.log(
      `Updated ${user.x_username}: ${metrics.totalTrades} trades, ` +
      `$${metrics.totalProfitUsd} profit, ${metrics.pnlPercent}% PnL`
    );

    return NextResponse.json({
      message: "Wallet data fetched successfully",
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in fetch-user-wallet-data:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

