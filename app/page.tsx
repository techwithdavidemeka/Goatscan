"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTopTraders } from "@/lib/supabase/queries";
import { User } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Twitter,
  Wallet,
  Activity,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [topTraders, setTopTraders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication status
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        // If user is logged in, redirect to leaderboard
        if (session?.user) {
          router.push("/leaderboard");
          return;
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        router.push("/leaderboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    // Only fetch traders if user is not logged in
    if (!checkingAuth && !user) {
      async function fetchData() {
        setLoading(true);
        const traders = await getTopTraders(3);
        setTopTraders(traders);
        setLoading(false);
      }

      fetchData();
    }
  }, [checkingAuth, user]);

  const howItWorksSteps = [
    {
      step: 1,
      title: "Connect X",
      description: "Link your X (Twitter) account to verify your identity",
      icon: Twitter,
      color: "text-blue-500",
    },
    {
      step: 2,
      title: "Connect Wallet",
      description: "Connect your Solana wallet (Phantom, Backpack, etc.)",
      icon: Wallet,
      color: "text-purple-500",
    },
    {
      step: 3,
      title: "Start Trading",
      description: "Begin trading meme coins and track your performance",
      icon: Activity,
      color: "text-green-500",
    },
    {
      step: 4,
      title: "Stay Active",
      description: "Trade at least once every 7 days or get delisted",
      icon: AlertCircle,
      color: "text-orange-500",
    },
  ];

  // Show loading state while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, don't render the landing page (redirect will happen)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent"
            >
              Track the best meme coin traders on X
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-8"
            >
              powered by <span className="font-bold text-gray-900 dark:text-white">Goatscan</span>
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link href="/signup">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 h-auto group bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Connect your wallet + X to join
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Top 3 Traders Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              Top Traders
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              See who's leading the pack
            </p>
          </motion.div>

          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading top traders...</div>
          ) : topTraders.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {topTraders.map((trader, index) => {
                const rankColors = [
                  "text-yellow-500",
                  "text-gray-300",
                  "text-orange-500",
                ];
                const rankBgColors = [
                  "bg-yellow-500/10 border-yellow-500/30",
                  "bg-gray-400/10 border-gray-400/30",
                  "bg-orange-600/10 border-orange-600/30",
                ];

                return (
                  <motion.div
                    key={trader.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Link href={`/profile/${trader.x_username}`}>
                      <Card
                        className={`hover:shadow-xl transition-all duration-300 cursor-pointer h-full bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/70 ${
                          rankBgColors[index]
                        }`}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between mb-4">
                            <div
                              className={`text-4xl font-bold ${rankColors[index]}`}
                            >
                              #{index + 1}
                            </div>
                            {index < 3 && (
                              <Trophy
                                className={`h-8 w-8 ${rankColors[index]}`}
                              />
                            )}
                          </div>
                          <CardTitle className="text-2xl text-gray-900 dark:text-white">
                            @{trader.x_username}
                          </CardTitle>
                          {trader.followers_count > 0 && (
                            <CardDescription className="text-gray-600 dark:text-gray-400">
                              {trader.followers_count.toLocaleString()} followers
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                PnL
                              </span>
                              <span
                                className={`font-bold text-lg ${
                                  trader.pnl_percent >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                              >
                                {trader.pnl_percent >= 0 ? (
                                  <TrendingUp className="inline h-4 w-4 mr-1" />
                                ) : (
                                  <TrendingDown className="inline h-4 w-4 mr-1" />
                                )}
                                {trader.pnl_percent > 0 ? "+" : ""}
                                {trader.pnl_percent.toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Total Profit
                              </span>
                              <span
                                className={`font-semibold ${
                                  trader.total_profit_usd >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                              >
                                {trader.total_profit_usd >= 0 ? "+" : ""}$
                                {trader.total_profit_usd.toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Total Trades
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {trader.total_trades}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No traders yet. Be the first to join!
            </div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Get started in 4 simple steps
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {howItWorksSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/70">
                    <CardHeader>
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10">
                          <Icon className={`h-6 w-6 ${step.color}`} />
                        </div>
                        <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                          {step.step}
                        </div>
                      </div>
                      <CardTitle className="text-xl text-gray-900 dark:text-white">{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base text-gray-600 dark:text-gray-400">
                        {step.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-12"
          >
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8 py-6 h-auto bg-blue-600 hover:bg-blue-700 text-white">
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Ready to join the leaderboard?
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Connect your wallet and X account to start tracking your trades
            </p>
            <Link href="/signup">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                Sign Up Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
