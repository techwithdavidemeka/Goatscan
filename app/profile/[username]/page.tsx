"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  Activity,
  Target,
  Wallet,
  Users,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getUserByUsername } from "@/lib/supabase/queries";
import { prepareProfitLossData, preparePortfolioGrowthData } from "@/lib/chart-data";
import { User, Trade } from "@/lib/types";
import type { ProfileAnalytics } from "@/lib/types/profileAnalytics";
import { useRouter } from "next/navigation";

export default function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const { username } = params;
  const router = useRouter();
  const [trader, setTrader] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const user = await getUserByUsername(username);

      if (!user) {
        router.push("/home");
        return;
      }

      setTrader(user);
      setLoading(false);
    }

    fetchData();
  }, [username, router]);

  useEffect(() => {
    if (!trader?.wallet_address) return;
    let cancelled = false;
    async function fetchAnalytics() {
      try {
        setAnalyticsLoading(true);
        const res = await fetch(`/api/profile-analytics/${trader!.wallet_address}`);
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const data = await res.json();
        if (!cancelled) {
          setAnalytics(data);
        }
      } catch (error) {
        console.error("Failed to fetch profile analytics", error);
        if (!cancelled) {
          setAnalytics(null);
        }
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false);
        }
      }
    }
    fetchAnalytics();
    return () => {
      cancelled = true;
    };
  }, [trader?.wallet_address]);

  const analyticsTradesForCharts = useMemo<Trade[]>(() => {
    if (!analytics) return [];
    return analytics.trades.map((trade, index) => ({
      id: trade.signature || `analytics-${index}`,
      user_id: trader?.id ?? "analytics",
      token_symbol: trade.tokenSymbol,
      token_address: trade.tokenAddress,
      amount_usd: trade.amountUsd,
      profit_loss_usd: trade.profitLossUsd,
      timestamp: new Date(trade.timestamp * 1000).toISOString(),
    }));
  }, [analytics, trader?.id]);

  const profitLossData = useMemo(
    () => prepareProfitLossData(analyticsTradesForCharts),
    [analyticsTradesForCharts]
  );
  const portfolioGrowthData = useMemo(
    () => preparePortfolioGrowthData(analyticsTradesForCharts),
    [analyticsTradesForCharts]
  );

  // Check if trader is active (last trade within 7 days)
  const isActive = useMemo(() => {
    if (!trader?.last_trade_timestamp) return false;
    const lastTradeDate = new Date(trader.last_trade_timestamp);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return lastTradeDate >= sevenDaysAgo;
  }, [trader]);

  function formatCurrency(value: number, opts: Intl.NumberFormatOptions = {}) {
    return `$${value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      ...opts,
    })}`;
  }

  function formatNumberCompact(value: number) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatDuration(seconds: number) {
    if (!seconds || seconds <= 0) return "—";
    const minutes = seconds / 60;
    if (minutes < 1) return `${Math.round(seconds)}s`;
    if (minutes < 60) return `${minutes.toFixed(0)}m`;
    const hours = minutes / 60;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    const days = hours / 24;
    return `${days.toFixed(1)}d`;
  }

  function getRelativeTime(timestamp: number) {
    const diffMs = Date.now() - timestamp * 1000;
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 60) return `${Math.max(minutes, 1)}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  function truncateWallet(address: string) {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  }

  const statCards = useMemo(() => {
    if (!trader) {
      return [];
    }
    if (analytics) {
      const pnlPercent =
        analytics.stats.totalVolumeUsd > 0
          ? (analytics.stats.realizedProfitUsd / analytics.stats.totalVolumeUsd) * 100
          : 0;
      return [
        {
          label: "Total PnL",
          value: `${pnlPercent > 0 ? "+" : ""}${pnlPercent.toFixed(2)}%`,
          icon: TrendingUp,
          color: pnlPercent >= 0 ? "text-green-600" : "text-red-600",
        },
        {
          label: "Total Trades",
          value: analytics.trades.length.toString(),
          icon: Activity,
          color: "text-blue-600",
        },
        {
          label: "Win Rate",
          value: `${analytics.stats.winRate.toFixed(1)}%`,
          icon: Target,
          color: "text-purple-600",
        },
        {
          label: "Total Profit",
          value: formatCurrency(
            analytics.stats.realizedProfitUsd + analytics.stats.unrealizedProfitUsd
          ),
          icon: DollarSign,
          color: "text-orange-600",
        },
      ];
    }
    return [
      {
        label: "Total PnL",
        value: `${trader.pnl_percent > 0 ? "+" : ""}${trader.pnl_percent.toFixed(2)}%`,
        icon: TrendingUp,
        color: trader.pnl_percent >= 0 ? "text-green-600" : "text-red-600",
      },
      {
        label: "Total Trades",
        value: trader.total_trades.toString(),
        icon: Activity,
        color: "text-blue-600",
      },
      {
        label: "Win Rate",
        value: `—`,
        icon: Target,
        color: "text-purple-600",
      },
      {
        label: "Total Profit",
        value: `$${trader.total_profit_usd.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}`,
        icon: DollarSign,
        color: "text-orange-600",
      },
    ];
  }, [analytics, trader]);

  if (loading || !trader) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Trader Info Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white break-words">
                    @{trader.x_username}
                  </h1>
                  {!isActive && (
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 w-fit">
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  {trader.followers_count > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span>{trader.followers_count.toLocaleString()} followers</span>
                    </div>
                  )}
                  {trader.last_trade_timestamp && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Last active:{" "}
                        {new Date(trader.last_trade_timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Wallet className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <div className="font-mono text-xs sm:text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 rounded-md text-gray-900 dark:text-white break-all sm:break-normal">
                  <span className="hidden sm:inline">{trader.wallet_address}</span>
                  <span className="sm:hidden">{truncateWallet(trader.wallet_address)}</span>
                </div>
              </div>
              <a
                href={`https://solscan.io/account/${trader.wallet_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline text-xs sm:text-sm whitespace-nowrap"
              >
                View on Solscan →
              </a>
            </div>
          </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      {stat.label}
                    </CardTitle>
                    <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${stat.color} flex-shrink-0`} />
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className={`text-xl sm:text-2xl font-bold ${stat.color} break-words`}>
                      {stat.value}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Advanced Stats / Trades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 h-full">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-white">
                Stats / Holdings
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Real-time metrics powered by Moralis swaps
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {analyticsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-8 w-full animate-pulse rounded-md bg-gray-100 dark:bg-gray-800"
                    />
                  ))}
                </div>
              ) : analytics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm sm:text-base">
                    <MetricRow label="Solana balance" value={`${analytics.stats.solBalance.toFixed(2)} SOL`} accent="text-emerald-400" />
                    <MetricRow label="USDC balance" value={formatCurrency(analytics.stats.usdcBalance)} accent="text-blue-400" />
                    <MetricRow label="Win rate" value={`${analytics.stats.winRate.toFixed(1)}%`} />
                    <MetricRow label="Avg trade duration" value={formatDuration(analytics.stats.avgDurationSeconds)} />
                    <MetricRow label="Top win" value={formatCurrency(analytics.stats.topWinUsd)} accent="text-emerald-400" />
                    <MetricRow label="Volume traded" value={formatCurrency(analytics.stats.totalVolumeUsd)} />
                    <MetricRow label="Realized profits" value={formatCurrency(analytics.stats.realizedProfitUsd)} accent={analytics.stats.realizedProfitUsd >= 0 ? "text-emerald-400" : "text-rose-400"} />
                    <MetricRow label="Unrealized profits" value={formatCurrency(analytics.stats.unrealizedProfitUsd)} accent={analytics.stats.unrealizedProfitUsd >= 0 ? "text-emerald-400" : "text-rose-400"} />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                      Open Positions
                    </div>
                    {analytics.holdings.length === 0 ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        No open positions
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {analytics.holdings.slice(0, 5).map((holding) => (
                          <div
                            key={holding.tokenAddress}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {holding.tokenSymbol}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatNumberCompact(holding.quantity)} tokens
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(holding.markValueUsd)}
                              </div>
                              <div
                                className={`text-xs ${
                                  holding.unrealizedUsd >= 0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {holding.unrealizedUsd >= 0 ? "+" : ""}
                                {formatCurrency(holding.unrealizedUsd, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-400">
                  Unable to load analytics right now.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 h-full">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-white">
                Recent Trades
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {analytics && analytics.trades.length > 0
                  ? `Showing ${Math.min(analytics.trades.length, 20)} most recent trades`
                  : "Latest activity from Moralis swaps"}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {analyticsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="h-10 w-full animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                  ))}
                </div>
              ) : analytics && analytics.trades.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-800 max-h-[420px] overflow-y-auto pr-1">
                  {analytics.trades.slice(0, 20).map((trade) => (
                    <div key={trade.signature || `${trade.timestamp}-${trade.tokenAddress}`} className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors rounded px-1 -mx-1">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded ${
                              trade.side === "buy" 
                                ? "text-emerald-400 bg-emerald-400/10" 
                                : "text-rose-400 bg-rose-400/10"
                            }`}
                          >
                            {trade.side}
                          </span>
                          <a
                            href={`https://dexscreener.com/solana/${trade.tokenAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-500 truncate"
                            title={`${formatNumberCompact(trade.quantity)} ${trade.tokenSymbol}`}
                          >
                            {formatNumberCompact(trade.quantity)} {trade.tokenSymbol}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatCurrency(trade.amountUsd)}</span>
                          <span>•</span>
                          <span>{getRelativeTime(trade.timestamp)} ago</span>
                        </div>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <div
                          className={`text-sm font-semibold ${
                            trade.profitLossUsd >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {trade.profitLossUsd >= 0 ? "+" : ""}
                          {formatCurrency(trade.profitLossUsd)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          P&L
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No trades recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Profit/Loss Over Time */}
          <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-white">
                Profit/Loss Over Time
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Cumulative profit and loss from trades
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {profitLossData.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <ResponsiveContainer width="100%" height={250} minHeight={250}>
                    <AreaChart data={profitLossData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-30" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        className="text-xs"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        className="text-xs"
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          `$${value.toFixed(2)}`,
                          "Cumulative P&L",
                        ]}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulativeProfit"
                        stroke={trader.pnl_percent >= 0 ? "#22c55e" : "#ef4444"}
                        fill={trader.pnl_percent >= 0 ? "#22c55e" : "#ef4444"}
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  No trade data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portfolio Growth */}
          <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-white">
                Portfolio Growth
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Portfolio value over time
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {portfolioGrowthData.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <ResponsiveContainer width="100%" height={250} minHeight={250}>
                    <LineChart data={portfolioGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-30" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        className="text-xs"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        className="text-xs"
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          `$${value.toFixed(2)}`,
                          "Portfolio Value",
                        ]}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="portfolioValue"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  No portfolio data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </motion.div>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className={`text-sm sm:text-base font-semibold text-gray-900 dark:text-white ${accent ?? ""}`}>
        {value}
      </span>
    </div>
  );
}
