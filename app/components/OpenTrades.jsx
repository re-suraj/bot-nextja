"use client";

import { useState, useEffect } from "react";

export default function OpenTrades() {
  const [trades, setTrades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [tradeState, setTradeState] = useState("ALL");

  useEffect(() => {
    fetchTrades();
  }, [tradeState]);

  const fetchTrades = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/oanda/trades?state=${tradeState}&count=100`
      );
      const data = await response.json();

      if (response.ok) {
        setTrades(data.trades || []);
      } else {
        setError(data.error || "Failed to fetch trades");
      }
    } catch (err) {
      setError("An error occurred while fetching trades");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseTrade = async (tradeId) => {
    try {
      const response = await fetch(`/api/oanda/trades/${tradeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh trades after closing
        fetchTrades();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to close trade");
      }
    } catch (err) {
      setError("An error occurred while closing trade");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  const formatNumber = (num) => {
    return parseFloat(num).toFixed(5);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2962ff]"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e222d] shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-[#d1d4dc]">Trades</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setTradeState("ALL")}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                tradeState === "ALL"
                  ? "bg-[#2962ff] text-white"
                  : "bg-[#2a2e39] text-[#d1d4dc] hover:bg-[#363a45]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTradeState("OPEN")}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                tradeState === "OPEN"
                  ? "bg-[#2962ff] text-white"
                  : "bg-[#2a2e39] text-[#d1d4dc] hover:bg-[#363a45]"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setTradeState("CLOSED")}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                tradeState === "CLOSED"
                  ? "bg-[#2962ff] text-white"
                  : "bg-[#2a2e39] text-[#d1d4dc] hover:bg-[#363a45]"
              }`}
            >
              Closed
            </button>
          </div>
        </div>
        <button
          onClick={fetchTrades}
          className="px-4 py-2 text-sm font-medium text-[#d1d4dc] bg-[#2962ff] rounded-md hover:bg-[#1e53e5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2962ff]"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-[#2a2e39] border border-[#ef5350] rounded-md p-4">
          <div className="text-sm text-[#ef5350]">{error}</div>
        </div>
      )}

      {trades.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[#787b86]">No {tradeState.toLowerCase()} trades</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#2a2e39]">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                  Instrument
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                  Units
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                  Open Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                  {tradeState === "CLOSED" ? "Close Price" : "Current Price"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                  {tradeState === "CLOSED" ? "Realized P/L" : "P/L"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                  Margin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                  Open Time
                </th>
                {tradeState === "CLOSED" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                    Close Time
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2e39]">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-[#2a2e39]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                    {trade.instrument}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        trade.type === "BUY"
                          ? "bg-[#26a69a] text-white"
                          : "bg-[#ef5350] text-white"
                      }`}
                    >
                      {trade.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                    {trade.units}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                    {formatNumber(trade.openPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                    {formatNumber(trade.currentPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`${
                        trade.pl >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"
                      }`}
                    >
                      {formatNumber(trade.pl)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                    {formatNumber(trade.marginRequired)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                    {formatDate(trade.openTime)}
                  </td>
                  {tradeState === "CLOSED" && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                      {formatDate(trade.closeTime)}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {tradeState === "OPEN" && (
                      <button
                        onClick={() => handleCloseTrade(trade.id)}
                        className="text-[#ef5350] hover:text-[#f44336] focus:outline-none"
                      >
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
