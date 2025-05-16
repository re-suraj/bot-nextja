import { useState, useEffect, useCallback } from "react";
import { useOanda } from "../lib/hooks/useOanda";
import {
  startBot,
  stopBot,
  getBotState,
  getBotConfig,
  updateStrategyConfig,
  executeTrade,
  closePosition,
  monitorPositions,
  analyzeMarket,
} from "../lib/botState";
import { backtester } from "../lib/backtest";
import TradingTerminal from "./TradingTerminal";
import BacktestResults from "./BacktestResults";
import { INSTRUMENTS } from '../config/instruments';

export default function TradingBot() {
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState(null);
  const [positions, setPositions] = useState([]);
  const [error, setError] = useState(null);
  const [backtestResults, setBacktestResults] = useState(null);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const { getCandles, loading, error: oandaError } = useOanda();

  // Initialize bot configuration
  useEffect(() => {
    const initialConfig = getBotConfig();
    setConfig(initialConfig);
  }, []);

  // Separate effect for position monitoring with rate limiting
  useEffect(() => {
    if (!isRunning) return;

    let positionUpdateTimeout;
    const POSITION_UPDATE_INTERVAL = 10000; // 10 seconds

    const updatePositions = async () => {
      try {
        const { positions: currentPositions } = await monitorPositions();
        setPositions(currentPositions);
      } catch (error) {
        console.error("Error monitoring positions:", error);
        if (error.message.includes("429")) {
          console.warn("Rate limit hit, backing off position updates");
          // Double the interval if we hit rate limit
          positionUpdateTimeout = setTimeout(
            updatePositions,
            POSITION_UPDATE_INTERVAL * 2
          );
          return;
        }
        setError(error.message);
      }
      // Schedule next update
      positionUpdateTimeout = setTimeout(
        updatePositions,
        POSITION_UPDATE_INTERVAL
      );
    };

    // Initial position update
    updatePositions();

    return () => {
      if (positionUpdateTimeout) {
        clearTimeout(positionUpdateTimeout);
      }
    };
  }, [isRunning]);

  // Separate effect for market monitoring
  useEffect(() => {
    if (!isRunning) return;

    let marketUpdateTimeout;
    const MARKET_UPDATE_INTERVAL = 5000; // 5 seconds

    const monitorMarket = async () => {
      try {
        let hasValidPrices = false;
        let failedInstruments = [];

        window.addMarketLog("=== Starting Market Analysis ===");
        window.addMarketLog(
          "Enabled Strategies: " +
            Object.entries(config.strategies)
              .filter(([_, strategy]) => strategy.enabled)
              .map(([id, strategy]) => `${id}: ${strategy.name}`)
              .join(", ")
        );

        for (const instrument of INSTRUMENTS) {
          try {
            const candles = await getCandles(instrument, "M5", 100);

            if (!candles) {
              failedInstruments.push(instrument);
              continue;
            }

            hasValidPrices = true;
            window.addMarketLog(
              `Successfully fetched ${candles.length} candles for ${instrument}`
            );
            window.addMarketLog(
              `Latest price: ${candles[candles.length - 1].mid.c}`
            );

            const { signals } = await analyzeMarket(candles, instrument);
            if (signals) {
              for (const [strategyId, signal] of Object.entries(signals)) {
                if (signal && signal.direction) {
                  window.addMarketLog(`\nTrade Signal Detected:`);
                  window.addMarketLog(`Strategy: ${strategyId}`);
                  window.addMarketLog(`Instrument: ${instrument}`);
                  window.addMarketLog(`Direction: ${signal.direction}`);
                  window.addMarketLog(`Strength: ${signal.strength}`);

                  try {
                    const tradeResult = await executeTrade(
                      strategyId,
                      instrument,
                      signal.direction,
                      1000
                    );
                    window.addMarketLog(
                      `Trade executed successfully: ${JSON.stringify(
                        tradeResult
                      )}`
                    );
                  } catch (tradeError) {
                    window.addMarketLog(
                      `Failed to execute trade: ${tradeError.message}`,
                      "error"
                    );
                  }
                }
              }
            }
          } catch (error) {
            if (error.message.includes("429")) {
              window.addMarketLog(
                "Rate limit hit, backing off market updates",
                "error"
              );
              marketUpdateTimeout = setTimeout(
                monitorMarket,
                MARKET_UPDATE_INTERVAL * 2
              );
              return;
            }
            failedInstruments.push(instrument);
            continue;
          }
        }

        if (!hasValidPrices) {
          const errorMessage = `No valid price data available. Failed instruments: ${failedInstruments.join(
            ", "
          )}`;
          setError(errorMessage);
        }

        window.addMarketLog("\n=== Market Analysis Complete ===");
        marketUpdateTimeout = setTimeout(monitorMarket, MARKET_UPDATE_INTERVAL);
      } catch (error) {
        console.error("Market monitoring error:", error);
        if (error.message.includes("429")) {
          window.addMarketLog(
            "Rate limit hit, backing off market updates",
            "error"
          );
          marketUpdateTimeout = setTimeout(
            monitorMarket,
            MARKET_UPDATE_INTERVAL * 2
          );
          return;
        }
        setError(error.message);
      }
    };

    // Initial market update
    monitorMarket();

    return () => {
      if (marketUpdateTimeout) {
        clearTimeout(marketUpdateTimeout);
      }
    };
  }, [isRunning, getCandles, config]);

  const handleStartBot = async () => {
    try {
      setError(null);
      const newState = startBot();
      setIsRunning(true);
      console.log("Bot started:", newState);
    } catch (error) {
      console.error("Error starting bot:", error);
      setError(error.message);
    }
  };

  const handleStopBot = async () => {
    try {
      setError(null);
      const newState = stopBot();
      setIsRunning(false);
      console.log("Bot stopped:", newState);
    } catch (error) {
      console.error("Error stopping bot:", error);
      setError(error.message);
    }
  };

  const handleStartBacktest = async () => {
    try {
      setError(null);
      setIsBacktesting(true);

      // Check if any strategies are enabled
      const enabledStrategies = Object.entries(config.strategies)
        .filter(([_, strategy]) => strategy.enabled)
        .map(([id]) => id);

      if (enabledStrategies.length === 0) {
        throw new Error(
          "Please enable at least one strategy before running backtest"
        );
      }

      // Calculate dates for historical data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      // Format dates for OANDA API
      const formatDate = (date) => {
        return date.toISOString().split(".")[0] + "Z";
      };

      // Get instruments for enabled strategies
      const instruments = [
        // Core majors
        // "EUR_USD",
        // "GBP_USD",
        "USD_JPY",
        // "AUD_USD",
        // Extras
        "USD_CAD",
        "USD_CHF",
        "NZD_USD", // Other majors
        "EUR_GBP",
        "EUR_JPY",
        "GBP_JPY", // Popular crosses
        "AUD_JPY",
        // "EUR_AUD",
        "GBP_AUD", // AUD crosses
        "USD_SGD",
        "USD_HKD",
        "USD_MXN",
      ];

      // Reset backtester state
      backtester.balance = 10000;
      backtester.positions.clear();

      const results = await backtester.runBacktest(
        instruments,
        formatDate(startDate),
        formatDate(endDate)
      );

      if (!results || !results.trades || results.trades.length === 0) {
        throw new Error("No trades were executed during the backtest period");
      }

      setBacktestResults(results);
    } catch (error) {
      console.error("Error running backtest:", error);
      setError(error.message);
      setBacktestResults(null);
    } finally {
      setIsBacktesting(false);
    }
  };

  const handleUpdateConfig = async (strategyId, updates) => {
    try {
      setError(null);
      console.log("Updating strategy config:", { strategyId, updates });

      // Validate strategy name
      if (updates.name && typeof updates.name === "string") {
        updates.name = updates.name.trim();
        if (!updates.name) {
          throw new Error("Strategy name cannot be empty");
        }
      }

      const newConfig = updateStrategyConfig(strategyId, updates);
      setConfig(newConfig);
      console.log("Strategy config updated:", newConfig.strategies[strategyId]);
    } catch (error) {
      console.error("Error updating strategy config:", error);
      setError(error.message);
    }
  };

  const handleClosePosition = async (positionId) => {
    try {
      setError(null);
      await closePosition(positionId);
      const { positions: currentPositions } = await monitorPositions();
      setPositions(currentPositions);
    } catch (error) {
      console.error("Error closing position:", error);
      setError(error.message);
    }
  };

  if (!config) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4 text-white">Trading Bot</h2>
        <div className="flex gap-4">
          <button
            onClick={handleStartBot}
            disabled={isRunning}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 hover:bg-green-700 transition-colors shadow-sm"
          >
            Start Bot
          </button>
          <button
            onClick={handleStopBot}
            disabled={!isRunning}
            className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50 hover:bg-red-700 transition-colors shadow-sm"
          >
            Stop Bot
          </button>
          <button
            onClick={handleStartBacktest}
            disabled={isBacktesting}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-sm"
          >
            {isBacktesting ? "Running Backtest..." : "Run Backtest"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 text-red-200 rounded border border-red-800 shadow-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold mb-4 text-white">Trading Terminal</h3>
        <div className="bg-gray-800 border border-gray-700 rounded shadow-sm">
          <TradingTerminal
            positions={positions}
            isRunning={isRunning}
            error={error}
          />
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-bold mb-4 text-white">Strategies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(config.strategies).map(([id, strategy]) => (
            <div
              key={id}
              className="p-4 border border-gray-700 rounded bg-gray-800 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-white">{strategy.name}</h4>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={strategy.enabled}
                    onChange={(e) =>
                      handleUpdateConfig(id, { enabled: e.target.checked })
                    }
                    className="mr-2 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">Enabled</span>
                </label>
              </div>
              <div className="space-y-3">
                {Object.entries(strategy.parameters).map(([param, value]) => (
                  <div key={param} className="flex items-center">
                    <label className="w-32 text-gray-300">{param}:</label>
                    <input
                      type={typeof value === "number" ? "number" : "text"}
                      value={value}
                      onChange={(e) =>
                        handleUpdateConfig(id, {
                          parameters: {
                            ...strategy.parameters,
                            [param]:
                              typeof value === "number"
                                ? parseFloat(e.target.value)
                                : e.target.value,
                          },
                        })
                      }
                      className="flex-1 border border-gray-600 rounded px-3 py-1.5 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {backtestResults && (
        <div className="mt-8">
          <BacktestResults results={backtestResults} />
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold mb-4 text-white">Open Positions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {positions
            .filter((position) => {
              const hasActiveUnits =
                (position.long?.units !== "0" &&
                  position.long?.units !== "0") ||
                (position.short?.units !== "0" &&
                  position.short?.units !== "0");
              const hasPositivePL = parseFloat(position.pl) > 0;
              return hasActiveUnits || hasPositivePL;
            })
            .map((position) => {
              const longUnits = parseInt(position.long?.units || "0");
              const shortUnits = parseInt(position.short?.units || "0");
              const totalUnits = longUnits - shortUnits;
              const pl = parseFloat(position.pl);
              const unrealizedPL = parseFloat(position.unrealizedPL || "0");

              return (
                <div
                  key={position.instrument}
                  className="p-4 border border-gray-700 rounded bg-gray-800 shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white">
                        {position.instrument}
                      </h4>
                      <p
                        className={`text-sm ${
                          totalUnits !== 0 ? "text-green-400" : "text-gray-400"
                        }`}
                      >
                        Units: {totalUnits}
                      </p>
                      <p
                        className={`text-sm ${
                          pl > 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        P/L: {pl.toFixed(4)}
                      </p>
                      {unrealizedPL !== 0 && (
                        <p
                          className={`text-sm ${
                            unrealizedPL > 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          Unrealized P/L: {unrealizedPL.toFixed(4)}
                        </p>
                      )}
                      {position.marginUsed && (
                        <p className="text-sm text-gray-400">
                          Margin Used:{" "}
                          {parseFloat(position.marginUsed).toFixed(4)}
                        </p>
                      )}
                    </div>
                    {totalUnits !== 0 && (
                      <button
                        onClick={() => handleClosePosition(position.instrument)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-sm"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          {positions.filter((p) => {
            const hasActiveUnits =
              (p.long?.units !== "0" && p.long?.units !== "0") ||
              (p.short?.units !== "0" && p.short?.units !== "0");
            const hasPositivePL = parseFloat(p.pl) > 0;
            return hasActiveUnits || hasPositivePL;
          }).length === 0 && (
            <div className="col-span-2 p-4 border border-gray-700 rounded bg-gray-800 shadow-sm text-center text-gray-400">
              No active positions or positive P/L positions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
