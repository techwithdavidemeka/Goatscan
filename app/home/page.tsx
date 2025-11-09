"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { getTopTraders, getUserTrades, getTradeStats } from "@/lib/supabase/queries";
import { User } from "@/lib/types";
import Link from "next/link";

export default function HomePage() {
  const [topTraders, setTopTraders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [winRates, setWinRates] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const traders = await getTopTraders(6);
      setTopTraders(traders);

      // Fetch win rates for each trader
      const rates: Record<string, number> = {};
      for (const trader of traders) {
        const trades = await getUserTrades(trader.id);
        const stats = await getTradeStats(trades);
        rates[trader.id] = stats.winRate;
      }
      setWinRates(rates);
      setLoading(false);
    }

    fetchData();
  }, []);

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
      >
        <h1 className="text-4xl font-bold mb-2">Top Traders Overview</h1>
        <p className="text-muted-foreground mb-8">
          Discover the most successful Solana traders on the platform
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {topTraders.map((trader, index) => (
          <motion.div
            key={trader.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Link href={`/profile/${trader.x_username}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">@{trader.x_username}</CardTitle>
                    <div className="flex items-center space-x-1 text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-semibold">
                        {trader.pnl_percent > 0 ? "+" : ""}
                        {trader.pnl_percent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <CardDescription className="font-mono text-xs">
                    {trader.wallet_address.slice(0, 8)}...{trader.wallet_address.slice(-8)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Trades</span>
                      <span className="font-semibold">{trader.total_trades}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Win Rate</span>
                      <span className="font-semibold">
                        {winRates[trader.id]?.toFixed(1) || "0.0"}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        PnL
                      </span>
                      <span
                        className={`font-bold text-lg ${
                          trader.pnl_percent >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {trader.pnl_percent > 0 ? "+" : ""}
                        {trader.pnl_percent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

