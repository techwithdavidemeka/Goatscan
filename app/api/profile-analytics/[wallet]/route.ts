import { NextResponse } from "next/server";
import { getProfileAnalytics } from "@/lib/moralisAnalytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: { wallet: string } }
) {
  try {
    const wallet = params.wallet;
    if (!wallet) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }
    
    console.log(`[profile-analytics] Fetching analytics for wallet: ${wallet}`);
    const analytics = await getProfileAnalytics(wallet);
    console.log(`[profile-analytics] Successfully fetched analytics: ${analytics.stats.totalTrades} trades`);
    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error("Error in profile analytics API:", error);
    // Return a valid empty analytics structure instead of an error
    // This ensures the profile page can still render
    const emptyAnalytics = {
      stats: {
        solBalance: 0,
        usdcBalance: 0,
        solPriceUsd: 0,
        portfolioValueUsd: 0,
        winRate: 0,
        avgDurationSeconds: 0,
        topWinUsd: 0,
        totalVolumeUsd: 0,
        realizedProfitUsd: 0,
        unrealizedProfitUsd: 0,
        totalProfitUsd: 0,
        totalTrades: 0,
        lastTradeTimestamp: null,
      },
      trades: [],
      holdings: [],
    };
    return NextResponse.json(emptyAnalytics);
  }
}

