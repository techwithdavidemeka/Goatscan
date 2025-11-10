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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading...</div>
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

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Trader Info Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-4xl font-bold text-white">@{trader.x_username}</h1>
                  {!isActive && (
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-gray-400">
                  {trader.followers_count > 0 && (
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{trader.followers_count.toLocaleString()} followers</span>
                    </div>
                  )}
                  {trader.last_trade_timestamp && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        Last active:{" "}
                        {new Date(trader.last_trade_timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Wallet className="h-4 w-4 text-gray-400" />
              <div className="font-mono text-sm bg-gray-800/50 border border-gray-700 p-3 rounded-md inline-block text-white">
                {trader.wallet_address}
              </div>
              <a
                href={`https://solscan.io/account/${trader.wallet_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline text-sm ml-2"
              >
                View on Solscan →
              </a>
            </div>
          </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-300">
                      {stat.label}
                    </CardTitle>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Profit/Loss Over Time */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Profit/Loss Over Time</CardTitle>
              <CardDescription className="text-gray-400">
                Cumulative profit and loss from trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profitLossData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={profitLossData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [
                        `$${value.toFixed(2)}`,
                        "Cumulative P&L",
                      ]}
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
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  No trade data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portfolio Growth */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Portfolio Growth</CardTitle>
              <CardDescription className="text-gray-400">
                Portfolio value over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {portfolioGrowthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={portfolioGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [
                        `$${value.toFixed(2)}`,
                        "Portfolio Value",
                      ]}
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
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  No portfolio data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Latest Trades Table */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Latest Trades</CardTitle>
            <CardDescription className="text-gray-400">
              Recent trading activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestTrades.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Token</TableHead>
                    <TableHead className="text-gray-300">Amount (USD)</TableHead>
                    <TableHead className="text-gray-300">Profit/Loss</TableHead>
                    <TableHead className="text-gray-300">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestTrades.map((trade) => (
                    <TableRow key={trade.id} className="border-gray-700 hover:bg-gray-800/50">
                      <TableCell className="font-medium text-white">
                        {trade.token_symbol || "N/A"}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        ${trade.amount_usd.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            trade.profit_loss_usd >= 0
                              ? "text-green-500 font-semibold"
                              : "text-red-500 font-semibold"
                          }
                        >
                          {trade.profit_loss_usd >= 0 ? "+" : ""}
                          ${trade.profit_loss_usd.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-300">
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
            ) : (
              <div className="text-center py-8 text-gray-400">
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
