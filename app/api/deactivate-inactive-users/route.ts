import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// This route can be called manually or via cron job
const CRON_SECRET = process.env.CRON_SECRET || "your-secret-key";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (if provided)
    const authHeader = request.headers.get("authorization");
    const cronSecret = request.nextUrl.searchParams.get("secret");
    const vercelCron = request.headers.get("x-vercel-cron");
    
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

    // Calculate the cutoff date (7 days ago)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    console.log(`Checking for inactive users (last trade before ${cutoffDate})`);

    // Fetch all active users
    const { data: allActiveUsers, error: fetchError } = await supabase
      .from("users")
      .select("id, x_username, last_trade_timestamp, created_at")
      .eq("active", true);

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    if (!allActiveUsers || allActiveUsers.length === 0) {
      return NextResponse.json({
        message: "No active users found",
        deactivated: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Filter users who are inactive (last trade > 7 days ago or no trades and account > 7 days old)
    const inactiveUsers = allActiveUsers.filter((user) => {
      if (user.last_trade_timestamp) {
        // User has trades - check if last trade is older than 7 days
        const lastTradeDate = new Date(user.last_trade_timestamp);
        return lastTradeDate < sevenDaysAgo;
      } else {
        // User has no trades - check if account is older than 7 days
        const createdDate = new Date(user.created_at);
        return createdDate < sevenDaysAgo;
      }
    });

    if (inactiveUsers.length === 0) {
      return NextResponse.json({
        message: "No inactive users found",
        deactivated: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Extract user IDs
    const userIds = inactiveUsers.map((user) => user.id);

    // Update all inactive users to active = false
    const { data: updatedUsers, error: updateError } = await supabase
      .from("users")
      .update({ active: false })
      .in("id", userIds)
      .select("id, x_username");

    if (updateError) {
      throw new Error(`Failed to deactivate users: ${updateError.message}`);
    }

    const results = {
      message: "Inactive users deactivated successfully",
      deactivated: updatedUsers?.length || 0,
      users: updatedUsers?.map((u) => ({
        id: u.id,
        username: u.x_username,
      })),
      timestamp: new Date().toISOString(),
    };

    console.log(`Deactivated ${results.deactivated} inactive users`);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error in deactivate-inactive-users:", error);
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

