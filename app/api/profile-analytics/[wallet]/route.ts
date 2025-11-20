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
    const analytics = await getProfileAnalytics(wallet);
    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error("Error in profile analytics API:", error);
    return NextResponse.json(
      { error: "Failed to build analytics" },
      { status: 500 }
    );
  }
}

