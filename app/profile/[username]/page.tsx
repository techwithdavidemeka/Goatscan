"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
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
import { getUserByUsername, getUserTrades, getTradeStats } from "@/lib/supabase/queries";
import { prepareProfitLossData, preparePortfolioGrowthData } from "@/lib/chart-data";
import { User, Trade } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const { username } = params;
  const router = useRouter();
  const [trader, setTrader] = useState<User | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState({
    winRate: 0,
    bestTrade: 0,
    worstTrade: 0,
    avgTradeSize: 0,
    totalVolume: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const user = await getUserByUsername(username);

      if (!user) {
        router.push("/home");
        return;
      }

      setTrader(user);
      const userTrades = await getUserTrades(user.id);
      setTrades(userTrades);
      const tradeStats = await getTradeStats(userTrades);
      setStats(tradeStats);
      setLoading(false);
    }

    fetchData();
  }, [username, router]);

  // Prepare chart data
  const profitLossData = useMemo(
    () => prepareProfitLossData(trades),
    [trades]
  );
  const portfolioGrowthData = useMemo(
    () => preparePortfolioGrowthData(trades),
    [trades]
  );

  // Check if trader is active (last trade within 7 days)
  const isActive = useMemo(() => {
    if (!trader?.last_trade_timestamp) return false;
    const lastTradeDate = new Date(trader.last_trade_timestamp);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return lastTradeDate >= sevenDaysAgo;
  }, [trader]);

  if (loading || !trader) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  const statCards = [
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
      value: `${stats.winRate.toFixed(1)}%`,
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

  // Latest trades for table (limit to 10)
  const latestTrades = trades.slice(0, 10);

  // Helper function to truncate wallet address
  const truncateWallet = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

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

        {/* Latest Trades Table */}
        <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-white">
              Latest Trades
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Recent trading activity
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
            {latestTrades.length > 0 ? (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <div className="min-w-[500px] sm:min-w-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-gray-700">
                        <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 px-2 sm:px-4">
                          Token
                        </TableHead>
                        <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 px-2 sm:px-4">
                          Amount (USD)
                        </TableHead>
                        <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 px-2 sm:px-4">
                          Profit/Loss
                        </TableHead>
                        <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 px-2 sm:px-4">
                          Date
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {latestTrades.map((trade) => (
                        <TableRow 
                          key={trade.id} 
                          className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white px-2 sm:px-4 py-2 sm:py-3">
                            {trade.token_symbol || "N/A"}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 px-2 sm:px-4 py-2 sm:py-3">
                            ${trade.amount_usd.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 sm:py-3">
                            <span
                              className={`text-xs sm:text-sm font-semibold ${
                                trade.profit_loss_usd >= 0
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {trade.profit_loss_usd >= 0 ? "+" : ""}
                              ${trade.profit_loss_usd.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                            {new Date(trade.timestamp).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                No trades found
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </div>
  );
}
