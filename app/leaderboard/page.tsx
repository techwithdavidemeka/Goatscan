"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getLeaderboard, getUserTrades } from "@/lib/supabase/queries";
import { User } from "@/lib/types";
import { Trophy } from "lucide-react";
import { getXProfileUrl, getXAvatarUrl, getDefaultAvatarUrl } from "@/lib/x-profile";

type TimeFilter = "daily" | "weekly" | "monthly";

// Approximate SOL price (you might want to fetch this dynamically)
const SOL_PRICE_USD = 166;

// Avatar component with fade-in animation
function Avatar({ username, className }: { username: string; className?: string }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);

  useEffect(() => {
    // Try to get X avatar URL
    const xAvatarUrl = getXAvatarUrl(username);
    
    if (xAvatarUrl) {
      // Try to load the X avatar
      const img = new Image();
      img.onload = () => {
        setAvatarUrl(xAvatarUrl);
        // Image will be loaded, placeholder will hide when image loads
      };
      img.onerror = () => {
        // Fallback to default avatar
        setAvatarUrl(getDefaultAvatarUrl(username));
        setShowPlaceholder(false);
        setImageLoaded(true);
      };
      img.src = xAvatarUrl;
    } else {
      // Use default avatar immediately
      setAvatarUrl(getDefaultAvatarUrl(username));
      setShowPlaceholder(false);
      setImageLoaded(true);
    }
  }, [username]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setShowPlaceholder(false);
  };

  const handleImageError = () => {
    // Fallback to default avatar
    setAvatarUrl(getDefaultAvatarUrl(username));
    setImageLoaded(true);
    setShowPlaceholder(false);
  };

  return (
    <div className={`relative ${className || ""}`}>
      {showPlaceholder && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs md:text-sm lg:text-base border-2 border-white/20 z-10">
          {username.charAt(0).toUpperCase()}
        </div>
      )}
      {avatarUrl && (
        <motion.img
          src={avatarUrl}
          alt={username}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className="w-full h-full rounded-full border-2 border-white/20 object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: imageLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("daily");
  const [tradeCounts, setTradeCounts] = useState<Record<string, { wins: number; total: number }>>({});

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const traders = await getLeaderboard();
      setLeaderboard(traders);
      
      // Fetch trade counts for each trader
      const counts: Record<string, { wins: number; total: number }> = {};
      for (const trader of traders) {
        const trades = await getUserTrades(trader.id);
        const wins = trades.filter(t => t.profit_loss_usd > 0).length;
        counts[trader.id] = { wins, total: trades.length };
      }
      setTradeCounts(counts);
      
      setLoading(false);
    }

    fetchData();
  }, []);

  // Filter by time period
  const filteredLeaderboard = useMemo(() => {
    let filtered = [...leaderboard];

    if (timeFilter !== "daily") {
      const now = Date.now();
      const timeMap: Record<string, number> = {
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
      };
      const cutoffTime = now - timeMap[timeFilter];

      filtered = filtered.filter((user) => {
        if (!user.last_trade_timestamp) return false;
        const tradeTime = new Date(user.last_trade_timestamp).getTime();
        return tradeTime >= cutoffTime;
      });
    }

    // Sort by total profit USD descending
    return filtered.sort((a, b) => b.total_profit_usd - a.total_profit_usd);
  }, [leaderboard, timeFilter]);

  // Helper function to get short wallet identifier (6 characters like "2kv8X2")
  const getShortWallet = (address: string) => {
    // Take first 6 characters and capitalize appropriately
    return address.slice(0, 6);
  };

  // Helper function to convert USD to SOL
  const usdToSol = (usd: number) => {
    return usd / SOL_PRICE_USD;
  };

  // Helper function to format numbers
  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Get rank background style
  const getRankStyle = (index: number) => {
    if (index === 0) {
      return "bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border-yellow-500/30";
    } else if (index === 1) {
      return "bg-gradient-to-r from-gray-400/20 to-gray-300/10 border-gray-400/30";
    } else if (index === 2) {
      return "bg-gradient-to-r from-orange-600/20 to-orange-500/10 border-orange-600/30";
    }
    return "bg-gray-800/50 border-gray-700/50";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white">GOAT Leaderboard</h1>
          
          {/* Time Filter Tabs */}
          <div className="flex gap-2 bg-gray-800/50 rounded-lg p-1">
            {(["daily", "weekly", "monthly"] as TimeFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  timeFilter === filter
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard List */}
        {filteredLeaderboard.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No traders found
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLeaderboard.map((trader, index) => {
              const tradeCount = tradeCounts[trader.id] || { wins: 0, total: 0 };
              const profitSol = usdToSol(trader.total_profit_usd);
              const isProfit = trader.total_profit_usd >= 0;

              return (
                <motion.div
                  key={trader.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                >
                  <Link href={`/profile/${trader.x_username}`}>
                    <div
                      className={`rounded-lg border p-3 md:p-4 hover:bg-gray-800/70 transition-all cursor-pointer ${getRankStyle(
                        index
                      )}`}
                    >
                      <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
                        {/* Rank */}
                        <div className="flex items-center gap-1.5 min-w-[40px] md:min-w-[50px]">
                          {index === 0 && (
                            <Trophy className="h-4 w-4 md:h-5 md:w-5 text-yellow-500 flex-shrink-0" />
                          )}
                          <span
                            className={`text-sm md:text-base lg:text-lg font-bold ${
                              index === 0
                                ? "text-yellow-500"
                                : index === 1
                                ? "text-gray-300"
                                : index === 2
                                ? "text-orange-500"
                                : "text-gray-400"
                            }`}
                          >
                            {index + 1}
                          </span>
                        </div>

                        {/* Avatar */}
                        <Avatar
                          username={trader.x_username}
                          className="w-9 h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 flex-shrink-0"
                        />

                        {/* Username and Wallet */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 md:gap-2 mb-0.5">
                            <span className="font-semibold text-xs md:text-sm lg:text-base text-white truncate">
                              {trader.x_username}
                            </span>
                            <a
                              href={getXProfileUrl(trader.x_username)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-blue-400 transition-colors flex-shrink-0"
                              title={`View @${trader.x_username} on X`}
                            >
                              <svg
                                className="w-3.5 h-3.5 md:w-4 md:h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                            </a>
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            {getShortWallet(trader.wallet_address)}
                          </div>
                        </div>

                        {/* Trade Count */}
                        <div className="text-sm md:text-base text-gray-300 font-medium min-w-[50px] md:min-w-[60px] text-right">
                          {tradeCount.wins}/{tradeCount.total}
                        </div>

                        {/* PnL */}
                        <div
                          className={`text-sm md:text-base font-bold text-right min-w-[120px] md:min-w-[180px] ${
                            isProfit ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          <div className="whitespace-nowrap">
                            {isProfit ? "+" : ""}
                            {formatNumber(profitSol)} Sol
                          </div>
                          <div className="text-xs md:text-sm text-gray-400 font-normal whitespace-nowrap">
                            (${formatNumber(Math.abs(trader.total_profit_usd), 1)})
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
