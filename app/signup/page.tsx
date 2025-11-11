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
    const errorMessage = searchParams.get("message");
    
    if (errorParam === "auth_failed") {
      setError(errorMessage 
        ? `Authentication failed: ${decodeURIComponent(errorMessage)}` 
        : "Failed to authenticate with X. Please check your Supabase configuration and try again.");
    } else if (errorParam === "no_code") {
      setError("No authorization code received. Please try signing in again.");
    }
  }, [searchParams]);

  // Check if user is already authenticated (from OAuth callback)
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          return;
        }

        if (session?.user) {
          // Check if user already has a profile
          const profile = await getUserProfile(session.user.id);
          if (profile) {
            // Check if there's a redirect parameter in the URL
            const redirectTo = searchParams.get("next");
            // Also check sessionStorage as a fallback
            const storedRedirect = typeof window !== "undefined" 
              ? sessionStorage.getItem("oauth_redirect") 
              : null;
            
            const finalRedirect = redirectTo && redirectTo !== "/signup" 
              ? redirectTo 
              : storedRedirect && storedRedirect !== "/signup"
                ? storedRedirect
                : null;
            
            // Clear the stored redirect
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("oauth_redirect");
            }
            
            if (finalRedirect) {
              router.push(finalRedirect);
            } else {
              router.push(`/profile/${profile.x_username}`);
            }
            return;
          }

          // User is authenticated but doesn't have a profile yet
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
      } catch (error) {
        console.error("Error in checkAuth:", error);
      }
    }
    
    // Run immediately and also set up auth state listener
    checkAuth();
    
    // Listen for auth state changes (important for OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Re-run checkAuth when auth state changes
        checkAuth();
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  const handleXConnect = async () => {
    setIsConnecting(true);
    setError("");

    try {
      // Get the current pathname to redirect back after OAuth
      const currentPath = window.location.pathname + window.location.search;
      
      // Store the current path in sessionStorage as a backup
      // This helps if the query parameter doesn't work
      if (typeof window !== "undefined") {
        sessionStorage.setItem("oauth_redirect", currentPath);
      }
      
      // Start OAuth flow with redirect back to current page
      await signInWithTwitter(currentPath);
      // User will be redirected to OAuth, then back to this page
      // Note: setIsConnecting(false) won't run because the page will redirect
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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-2 text-center text-gray-900 dark:text-white">Join Goatscan</h1>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
            Connect your X account and Solana wallet to start tracking your trades
          </p>

          <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Sign Up</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Link your X account and Solana wallet to get started
              </CardDescription>
            </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="x-handle" className="text-sm font-medium text-gray-900 dark:text-white">
                  X (Twitter) Account
                </label>
                {xConnected ? (
                  <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center space-x-2">
                      <Twitter className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-gray-900 dark:text-white">@{xHandle}</span>
                      {followersCount > 0 && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          ({followersCount.toLocaleString()} followers)
                        </span>
                      )}
                    </div>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleXConnect}
                    disabled={isConnecting}
                    className="w-full min-h-[44px] flex items-center justify-center space-x-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
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
                <label htmlFor="wallet" className="text-sm font-medium text-gray-900 dark:text-white">
                  Solana Wallet
                </label>
                {walletConnected ? (
                  <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center space-x-2">
                      <Wallet className="h-4 w-4 text-purple-500" />
                      <span className="font-mono text-sm text-gray-900 dark:text-white">
                        {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                      </span>
                    </div>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleWalletConnect}
                    className="w-full min-h-[44px] flex items-center justify-center space-x-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
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
                  className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-sm"
                >
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white"
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
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}

