import { PublicKey } from "@solana/web3.js";

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      isBackpack?: boolean;
      publicKey?: PublicKey;
      connect: () => Promise<{ publicKey: PublicKey }>;
      disconnect: () => Promise<void>;
      on: (event: string, callback: (args: any) => void) => void;
      removeListener: (event: string, callback: (args: any) => void) => void;
    };
  }
}

export type WalletProvider = "phantom" | "backpack";

export interface WalletAdapter {
  name: string;
  icon: string;
  provider: WalletProvider;
  isAvailable: () => boolean;
  connect: () => Promise<string>;
}

export const getWalletAdapters = (): WalletAdapter[] => {
  return [
    {
      name: "Phantom",
      icon: "👻",
      provider: "phantom",
      isAvailable: () => typeof window !== "undefined" && !!window.solana?.isPhantom,
      connect: async () => {
        if (typeof window === "undefined" || !window.solana?.isPhantom) {
          throw new Error("Phantom wallet not found. Please install Phantom extension.");
        }
        try {
          const response = await window.solana.connect();
          return response.publicKey.toString();
        } catch (error: any) {
          if (error.code === 4001) {
            throw new Error("User rejected the connection request.");
          }
          throw new Error("Failed to connect to Phantom wallet.");
        }
      },
    },
    {
      name: "Backpack",
      icon: "🎒",
      provider: "backpack",
      isAvailable: () => typeof window !== "undefined" && !!window.solana?.isBackpack,
      connect: async () => {
        if (typeof window === "undefined" || !window.solana?.isBackpack) {
          throw new Error("Backpack wallet not found. Please install Backpack extension.");
        }
        try {
          const response = await window.solana.connect();
          return response.publicKey.toString();
        } catch (error: any) {
          if (error.code === 4001) {
            throw new Error("User rejected the connection request.");
          }
          throw new Error("Failed to connect to Backpack wallet.");
        }
      },
    },
  ];
};

export const getAvailableWallets = (): WalletAdapter[] => {
  return getWalletAdapters().filter((adapter) => adapter.isAvailable());
};

