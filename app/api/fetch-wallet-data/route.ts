import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { calculateWalletMetrics, updateUserWalletMetrics } from "@/lib/wallet-analytics";

// This route can be called manually or via cron job
// Add a secret header to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET || "your-secret-key";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (if provided)
    // Vercel Cron Jobs send a special header, but we can also check for secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = request.nextUrl.searchParams.get("secret");
    const vercelCron = request.headers.get("x-vercel-cron"); // Vercel sets this header
    
    // Allow if it's from Vercel Cron or has valid secret
    const isAuthorized = 
      vercelCron === "1" || 
      authHeader === `Bearer ${CRON_SECRET}` || 
      cronSecret === CRON_SECRET;
    
    if (!isAuthorized) {
      // Allow manual calls without secret for development
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Fetch all active users with wallet addresses
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, wallet_address, x_username")
      .eq("active", true)
      .not("wallet_address", "is", null);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        message: "No active users with wallet addresses found",
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each user's wallet
    for (const user of users) {
      try {
        if (!user.wallet_address) {
          continue;
        }

        console.log(`Processing wallet for user ${user.x_username} (${user.wallet_address})`);

        // Calculate metrics
        const metrics = await calculateWalletMetrics(
          user.wallet_address,
          user.id
        );

        // Update user record
        await updateUserWalletMetrics(user.id, metrics);

        results.processed++;
        
        console.log(
          `Updated ${user.x_username}: ${metrics.totalTrades} trades, ` +
          `$${metrics.totalProfitUsd} profit, ${metrics.pnlPercent}% PnL`
        );
      } catch (error: any) {
        results.failed++;
        const errorMsg = `Error processing ${user.x_username}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return NextResponse.json({
      message: "Wallet data fetch completed",
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in fetch-wallet-data:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

