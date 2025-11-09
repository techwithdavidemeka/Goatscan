"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAvailableWallets, WalletAdapter } from "@/lib/wallet";
import { Wallet } from "lucide-react";

interface WalletConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (address: string) => void;
}

export function WalletConnectModal({
  open,
  onOpenChange,
  onConnect,
}: WalletConnectModalProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const availableWallets = getAvailableWallets();

  const handleWalletConnect = async (adapter: WalletAdapter) => {
    setConnecting(true);
    setError("");

    try {
      const address = await adapter.connect();
      onConnect(address);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Choose a wallet to connect to your account
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {availableWallets.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">
                No wallet extensions found. Please install one of the following:
              </p>
              <div className="space-y-2">
                <a
                  href="https://phantom.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-primary hover:underline"
                >
                  Install Phantom →
                </a>
                <a
                  href="https://www.backpack.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-primary hover:underline"
                >
                  Install Backpack →
                </a>
              </div>
            </div>
          ) : (
            availableWallets.map((adapter) => (
              <Button
                key={adapter.provider}
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => handleWalletConnect(adapter)}
                disabled={connecting}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{adapter.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{adapter.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Click to connect
                    </div>
                  </div>
                </div>
              </Button>
            ))
          )}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

