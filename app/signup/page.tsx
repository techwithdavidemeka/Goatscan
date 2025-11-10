"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Twitter, Wallet, Check, Loader2 } from "lucide-react";
import { isValidSolanaAddress } from "@/lib/solana";
import { supabase } from "@/lib/supabaseClient";
import { signInWithTwitter, createUserProfile, getUserProfile } from "@/lib/supabase/auth";
import { WalletConnectModal } from "@/components/wallet-connect-modal";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [xHandle, setXHandle] = useState("");
  const [xConnected, setXConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Check for error in URL params
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "auth_failed") {
      setError("Failed to authenticate with X. Please try again.");
    }
  }, [searchParams]);

  // Check if user is already authenticated (from OAuth callback)
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if user already has a profile
        const profile = await getUserProfile(session.user.id);
        if (profile) {
          router.push(`/profile/${profile.x_username}`);
          return;
        }

        // Try to get Twitter username from user metadata
        const twitterUsername = session.user.user_metadata?.user_name || 
                                session.user.user_metadata?.preferred_username ||
                                session.user.user_metadata?.full_name?.split(" ")[0]?.replace("@", "");
        
        if (twitterUsername) {
          setXHandle(twitterUsername);
          setXConnected(true);
          setFollowersCount(session.user.user_metadata?.followers_count || 0);
        }
      }
    }
    checkAuth();
  }, [router]);

  const handleXConnect = async () => {
    setIsConnecting(true);
    setError("");

    try {
      await signInWithTwitter();
      // User will be redirected to OAuth, then back to this page
    } catch (err: any) {
      setError(err.message || "Failed to connect X account");
      setIsConnecting(false);
    }
  };

  const handleWalletConnect = () => {
    setIsWalletModalOpen(true);
  };

  const handleWalletConnected = (address: string) => {
    setWalletAddress(address);
    setWalletConnected(true);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!xConnected && !xHandle.trim()) {
      setError("Please connect your X (Twitter) account");
      return;
    }

    if (!walletConnected && !walletAddress.trim()) {
      setError("Please connect your Solana wallet");
      return;
    }

    if (walletAddress && !isValidSolanaAddress(walletAddress)) {
      setError("Invalid Solana wallet address");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // If not authenticated, create anonymous auth first
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        
        if (authError) {
          setError("Failed to create account. Please try again.");
          return;
        }

        if (!authData.user) {
          setError("Failed to create account. Please try again.");
          return;
        }

        // Create profile with anonymous user
        const username = xHandle.replace("@", "").trim();
        const profile = await createUserProfile(
          authData.user.id,
          username,
          walletAddress,
          followersCount
        );

        router.push(`/profile/${profile.x_username}`);
        return;
      }

      // User is authenticated, create/update profile
      const username = xHandle.replace("@", "").trim();
      const profile = await createUserProfile(
        session.user.id,
        username,
        walletAddress,
        followersCount
      );

      router.push(`/profile/${profile.x_username}`);
    } catch (err: any) {
      setError(err.message || "An error occurred during signup");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2 text-center">Join Goatscan</h1>
        <p className="text-muted-foreground text-center mb-8">
          Connect your X account and Solana wallet to start tracking your trades
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              Link your X account and Solana wallet to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="x-handle" className="text-sm font-medium">
                  X (Twitter) Account
                </label>
                {xConnected ? (
                  <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <Twitter className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">@{xHandle}</span>
                      {followersCount > 0 && (
                        <span className="text-sm text-muted-foreground">
                          ({followersCount.toLocaleString()} followers)
                        </span>
                      )}
                    </div>
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleXConnect}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Twitter className="h-4 w-4" />
                        <span>Connect X (Twitter)</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="wallet" className="text-sm font-medium">
                  Solana Wallet
                </label>
                {walletConnected ? (
                  <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <Wallet className="h-4 w-4 text-purple-500" />
                      <span className="font-mono text-sm">
                        {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                      </span>
                    </div>
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleWalletConnect}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>Connect Wallet</span>
                  </Button>
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 bg-destructive/10 text-destructive rounded-md text-sm"
                >
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !xConnected || !walletConnected}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Complete Sign Up"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <WalletConnectModal
          open={isWalletModalOpen}
          onOpenChange={setIsWalletModalOpen}
          onConnect={handleWalletConnected}
        />
      </motion.div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}

