import { NextResponse } from "next/server";
import { getTokenPrice, SOLANA_MINT } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const priceData = await getTokenPrice(SOLANA_MINT);
    return NextResponse.json({ priceUsd: priceData.priceUsd });
  } catch (error) {
    console.error("Failed to fetch SOL price:", error);
    return NextResponse.json({ error: "Failed to fetch price" }, { status: 500 });
  }
}

