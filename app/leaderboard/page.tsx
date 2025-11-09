"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, TrendingDown, Search, Users } from "lucide-react";
import Link from "next/link";
import { getLeaderboard } from "@/lib/supabase/queries";
import { User } from "@/lib/types";

type TimeFilter = "all" | "24h" | "7d" | "30d";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const traders = await getLeaderboard();
      setLeaderboard(traders);
      setLoading(false);
    }

    fetchData();
  }, []);

  // Filter and sort users
  const filteredLeaderboard = useMemo(() => {
    let filtered = [...leaderboard];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((user) =>
        user.x_username.toLowerCase().includes(query)
      );
    }

    // Apply time filter (mock - in production, this would filter by last_trade_timestamp)
    if (timeFilter !== "all") {
      const now = Date.now();
      const timeMap: Record<string, number> = {
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
      };
      const cutoffTime = now - timeMap[timeFilter];

      filtered = filtered.filter((user) => {
        if (!user.last_trade_timestamp) return false;
        const tradeTime = new Date(user.last_trade_timestamp).getTime();
        return tradeTime >= cutoffTime;
      });
    }

    // Sort by PnL percent descending (already sorted from API, but re-sort after filtering)
    return filtered.sort((a, b) => b.pnl_percent - a.pnl_percent);
  }, [leaderboard, searchQuery, timeFilter]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
            <p className="text-muted-foreground">
              Top Solana traders ranked by PnL percentage
            </p>
          </div>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">
              {filteredLeaderboard.length} {filteredLeaderboard.length === 1 ? "trader" : "traders"}
            </span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("all")}
            >
              All Time
            </Button>
            <Button
              variant={timeFilter === "24h" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("24h")}
            >
              Top 24h
            </Button>
            <Button
              variant={timeFilter === "7d" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("7d")}
            >
              Top 7d
            </Button>
            <Button
              variant={timeFilter === "30d" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("30d")}
            >
              Top 30d
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Leaderboard Grid */}
      {filteredLeaderboard.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              {searchQuery ? "No traders found matching your search" : "No traders found"}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLeaderboard.map((trader, index) => (
            <motion.div
              key={trader.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link href={`/profile/${trader.x_username}`}>
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`text-2xl font-bold ${
                            index === 0
                              ? "text-yellow-500"
                              : index === 1
                              ? "text-gray-400"
                              : index === 2
                              ? "text-orange-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          #{index + 1}
                        </div>
                        {index < 3 && (
                          <Trophy
                            className={`h-5 w-5 ${
                              index === 0
                                ? "text-yellow-500"
                                : index === 1
                                ? "text-gray-400"
                                : "text-orange-600"
                            }`}
                          />
                        )}
                      </div>
                      <div
                        className={`flex items-center space-x-1 font-bold text-lg ${
                          trader.pnl_percent >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {trader.pnl_percent >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span>
                          {trader.pnl_percent > 0 ? "+" : ""}
                          {trader.pnl_percent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Username and Followers */}
                      <div>
                        <CardTitle className="text-xl mb-1">
                          @{trader.x_username}
                        </CardTitle>
                        {trader.followers_count > 0 && (
                          <CardDescription className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{trader.followers_count.toLocaleString()} followers</span>
                          </CardDescription>
                        )}
                      </div>

                      {/* Wallet Address */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Wallet Address
                        </div>
                        <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {trader.wallet_address.slice(0, 6)}...{trader.wallet_address.slice(-6)}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Total Profit
                          </div>
                          <div
                            className={`font-bold ${
                              trader.total_profit_usd >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {trader.total_profit_usd >= 0 ? "+" : ""}
                            ${trader.total_profit_usd.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Total Trades
                          </div>
                          <div className="font-bold">{trader.total_trades}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
