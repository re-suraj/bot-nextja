'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function AccountSummary() {
  const [accountData, setAccountData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bot/account');
      const data = await response.json();
      setAccountData(data);
    } catch (error) {
      console.error('Error fetching account data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAccountData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!accountData) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Account Summary</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchAccountData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Balance</p>
              <p className="text-2xl font-bold">${accountData.balance?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Open Trades</p>
              <p className="text-2xl font-bold">{accountData.openTrades}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold">{accountData.dailyStats?.winRate}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">P/L Today</p>
              <p className={`text-2xl font-bold ${accountData.dailyStats?.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${accountData.dailyStats?.profitLoss?.toFixed(2)}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Max Drawdown</p>
            <p className="text-2xl font-bold text-red-500">{accountData.dailyStats?.maxDrawdown?.toFixed(2)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 