import { PublicKey } from "@solana/web3.js";

export interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  slot: number;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    fromTokenAccount: string;
    toTokenAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
  }>;
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      userAccount: string;
      tokenAccount: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      mint: string;
      tokenStandard: string;
    }>;
  }>;
}

export interface ParsedTrade {
  signature: string;
  timestamp: string;
  tokenSymbol: string;
  tokenAddress: string;
  amountUsd: number;
  profitLossUsd: number;
  type: "buy" | "sell";
}

export async function fetchWalletTransactions(
  walletAddress: string,
  apiKey?: string
): Promise<HeliusTransaction[]> {
  const heliusApiKey = apiKey || process.env.HELIUS_API_KEY;
  
  if (!heliusApiKey) {
    console.warn("Helius API key not found. Using Solana RPC fallback.");
    return [];
  }

  // Fetch recent transactions (last 1000)
  const heliusUrl = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${heliusApiKey}&limit=1000`;

  try {
    const response = await fetch(heliusUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Helius API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error(`Error fetching transactions for ${walletAddress}:`, error);
    return [];
  }
}

export async function parseTradesFromTransactions(
  transactions: HeliusTransaction[],
  walletAddress: string
): Promise<ParsedTrade[]> {
  const trades: ParsedTrade[] = [];
  
  // This is a simplified parser - in production, you'd want more sophisticated logic
  // to identify DEX swaps (Jupiter, Raydium, Orca, etc.)
  
  for (const tx of transactions) {
    // Filter for swap transactions (Jupiter, Raydium, Orca patterns)
    if (
      tx.type === "SWAP" ||
      tx.source === "JUPITER" ||
      tx.source === "RAYDIUM" ||
      tx.source === "ORCA" ||
      tx.tokenTransfers?.length >= 2
    ) {
      // Get token transfers
      const tokenTransfers = tx.tokenTransfers || [];
      
      if (tokenTransfers.length >= 2) {
        // Find the token being traded
        const incomingTransfer = tokenTransfers.find(
          (t) => t.toUserAccount === walletAddress
        );
        const outgoingTransfer = tokenTransfers.find(
          (t) => t.fromUserAccount === walletAddress
        );

        if (incomingTransfer && outgoingTransfer) {
          // This is a simplified calculation - in production, you'd need:
          // 1. Token price data (CoinGecko, Birdeye, etc.)
          // 2. More accurate swap detection
          // 3. Handling of multiple tokens in one swap
          
          const tokenSymbol = incomingTransfer.mint.slice(0, 8);
          const tokenAddress = incomingTransfer.mint;
          
          // Estimate USD value (simplified - you'd fetch real prices)
          // For now, we'll use SOL price as a proxy
          const solPriceUsd = 100; // This should come from a price API
          const amountUsd = (incomingTransfer.tokenAmount / 1e9) * solPriceUsd;
          
          trades.push({
            signature: tx.signature,
            timestamp: new Date(tx.timestamp * 1000).toISOString(),
            tokenSymbol,
            tokenAddress,
            amountUsd,
            profitLossUsd: 0, // Would need historical price data to calculate
            type: "buy",
          });
        }
      }
    }
  }

  return trades;
}

// Helper function to get token price (placeholder - integrate with price API)
export async function getTokenPriceUsd(
  tokenAddress: string,
  timestamp?: number
): Promise<number> {
  // In production, integrate with:
  // - CoinGecko API
  // - Birdeye API
  // - Jupiter Price API
  // - Helius Token Metadata API
  
  // For now, return a placeholder
  return 0;
}

