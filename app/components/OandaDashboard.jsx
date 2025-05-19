"use client";

import { useState, useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import OandaTrade from "./OandaTrade";
import OpenTrades from "./OpenTrades";
import OandaOrders from "./OandaOrders";
import OandaAccount from "./OandaAccount";
import OandaInstruments from "./OandaInstruments";
import OrderDefinitions from "./OrderDefinitions";
import TradingBot from "./TradingBot";
import RealtimeCandles from "./RealtimeCandles";

export default function OandaDashboard() {
  const [accountData, setAccountData] = useState(null);
  const [candleData, setCandleData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInstrument, setSelectedInstrument] = useState("EUR_USD");
  const [selectedGranularity, setSelectedGranularity] = useState("M5");
  const [livePrices, setLivePrices] = useState({});

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);

  useEffect(() => {
    fetchAccountData();
    fetchCandleData();
  }, []);

  useEffect(() => {
    fetchCandleData();
  }, [selectedInstrument, selectedGranularity]);

  // Fetch live prices
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // const response = await fetch('/api/prices');
        // const data = await response.json();
        // setLivePrices(data);
      } catch (err) {
        console.error("Error fetching live prices:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chartContainerRef.current && candleData) {
      if (!chartRef.current) {
        // Create chart
        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { color: "#131722" },
            textColor: "#d1d4dc",
          },
          grid: {
            vertLines: { color: "rgba(42, 46, 57, 0.3)" },
            horzLines: { color: "rgba(42, 46, 57, 0.3)" },
          },
          width: chartContainerRef.current.clientWidth,
          height: 600,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: "#2a2e39",
          },
          rightPriceScale: {
            borderColor: "#2a2e39",
          },
        });

        // Create candlestick series
        const candlestickSeries = chart.addCandlestickSeries({
          upColor: "#26a69a",
          downColor: "#ef5350",
          borderVisible: false,
          wickUpColor: "#26a69a",
          wickDownColor: "#ef5350",
        });

        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;
      }

      // Update data
      const formattedData = candleData.candles.map((candle) => ({
        time: new Date(candle.time).getTime() / 1000,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
      }));

      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(formattedData);
        chartRef.current.timeScale().fitContent();
      }
    }

    // Cleanup
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
      }
    };
  }, [candleData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchAccountData = async () => {
    try {
      const response = await fetch("/api/oanda/account");
      const data = await response.json();

      if (response.ok) {
        setAccountData(data);
      } else {
        setError(data.error || "Failed to fetch account data");
      }
    } catch (err) {
      setError("An error occurred while fetching account data");
    }
  };

  const fetchCandleData = async () => {
    try {
      const response = await fetch(
        `/api/oanda/candles?instrument=${selectedInstrument}&granularity=${selectedGranularity}&count=100`
      );
      const data = await response.json();

      if (response.ok) {
        setCandleData(data);
      } else {
        setError(data.error || "Failed to fetch candle data");
      }
    } catch (err) {
      setError("An error occurred while fetching candle data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#131722] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Account Information - Left Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-[#1e222d] shadow rounded-lg p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-[#d1d4dc] mb-6">
                Account Summary
              </h2>
              {accountData && (
                <dl className="space-y-4">
                  <div className="bg-[#2a2e39] p-4 rounded-lg">
                    <dt className="text-sm font-medium text-[#787b86]">
                      Balance
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-[#d1d4dc]">
                      {accountData.currency} {Number(accountData.balance).toFixed(2)}
                    </dd>
                  </div>
                  <div className="bg-[#2a2e39] p-4 rounded-lg">
                    <dt className="text-sm font-medium text-[#787b86]">P/L</dt>
                    <dd
                      className={`mt-1 text-lg font-semibold ${
                        Number(accountData.pl) >= 0
                          ? "text-[#26a69a]"
                          : "text-[#ef5350]"
                      }`}
                    >
                      {accountData.currency} {Number(accountData.pl).toFixed(2)}
                    </dd>
                  </div>
                  <div className="bg-[#2a2e39] p-4 rounded-lg">
                    <dt className="text-sm font-medium text-[#787b86]">
                      Open Trades
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-[#d1d4dc]">
                      {Number(accountData.openTradeCount)}
                    </dd>
                  </div>
                  <div className="bg-[#2a2e39] p-4 rounded-lg">
                    <dt className="text-sm font-medium text-[#787b86]">
                      Open Positions
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-[#d1d4dc]">
                      {Number(accountData.openPositionCount)}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-9">
            <div className="space-y-8">
              {/* Chart Controls */}
              <div className="bg-[#1e222d] shadow rounded-lg p-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-[#787b86]">
                      Instrument
                    </label>
                    <select
                      value={selectedInstrument}
                      onChange={(e) => setSelectedInstrument(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
                    >
                      <option value="EUR_USD">EUR/USD</option>
                      <option value="GBP_USD">GBP/USD</option>
                      <option value="USD_JPY">USD/JPY</option>
                      <option value="AUD_USD">AUD/USD</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-[#787b86]">
                      Timeframe
                    </label>
                    <select
                      value={selectedGranularity}
                      onChange={(e) => setSelectedGranularity(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
                    >
                      <option value="M1">1 Minute</option>
                      <option value="M5">5 Minutes</option>
                      <option value="M15">15 Minutes</option>
                      <option value="M30">30 Minutes</option>
                      <option value="H1">1 Hour</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Price Chart */}
              <div className="bg-[#1e222d] shadow-lg rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e39]">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-base font-medium text-[#d1d4dc]">
                      {selectedInstrument}
                    </h2>
                    {livePrices[selectedInstrument] && (
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <span className="text-[#787b86]">Bid: </span>
                          <span className="text-[#d1d4dc]">
                            {livePrices[selectedInstrument].bid}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-[#787b86]">Ask: </span>
                          <span className="text-[#d1d4dc]">
                            {livePrices[selectedInstrument].ask}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-[#787b86]">
                        Last Update:
                      </span>
                      <span className="text-sm text-[#d1d4dc]">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div ref={chartContainerRef} className="h-[600px] relative" />
              </div>
{/* trading bot */}

<RealtimeCandles instrument="USD_JPY" />
              {/* Trading Bot */}
              <TradingBot />

              {/* Open Trades */}
              <OpenTrades />

              {/* Orders Section */}
              <OandaOrders />

              {/* Order Definitions */}
              <OrderDefinitions />

              {/* Trading Section */}
              <div>
                <OandaTrade />
              </div>

              {/* Instruments Section */}
              <OandaInstruments />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-[#2a2e39] border border-[#ef5350] rounded-md p-4">
            <div className="text-sm text-[#ef5350]">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}
