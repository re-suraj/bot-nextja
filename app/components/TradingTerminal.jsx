import { useState, useEffect, useCallback, useRef } from "react";

export default function TradingTerminal({ positions, isRunning, error }) {
  const [logs, setLogs] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [analysisStats, setAnalysisStats] = useState({
    lastUpdate: null,
    instrumentsAnalyzed: 0,
    signalsGenerated: 0,
    successfulFetches: 0,
    failedFetches: 0,
    lastPrice: null,
    lastInstrument: null,
    apiStatus: "idle",
    riskMetrics: {
      currentRisk: 0,
      maxRisk: 0,
      dailyPnL: 0,
      maxDrawdown: 0,
      winRate: 0,
    },
    orderStats: {
      totalOrders: 0,
      pendingOrders: 0,
      filledOrders: 0,
      cancelledOrders: 0,
    },
    totalSignals: 0,
    successfulTrades: 0,
    failedTrades: 0,
  });
  const terminalRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Add new logs when positions or status changes
  useEffect(() => {
    const newLog = {
      timestamp: new Date(),
      type: "status",
      message: `Bot Status: ${isRunning ? "RUNNING" : "STOPPED"}`,
    };
    setLogs((prev) => [...prev, newLog]);
  }, [isRunning]);

  useEffect(() => {
    if (error) {
      const newLog = {
        timestamp: new Date(),
        type: "error",
        message: `ERROR: ${error}`,
      };
      setLogs((prev) => [...prev, newLog]);
    }
  }, [error]);

  useEffect(() => {
    positions.forEach((position) => {
      const longUnits = parseInt(position.long?.units || "0");
      const shortUnits = parseInt(position.short?.units || "0");
      const totalUnits = longUnits - shortUnits;
      const pl = parseFloat(position.pl);

      if (totalUnits !== 0) {
        const newLog = {
          timestamp: new Date(),
          type: "position",
          message: `${position.instrument}: ${
            totalUnits > 0 ? "LONG" : "SHORT"
          } ${Math.abs(totalUnits)} units | P/L: ${pl.toFixed(4)}`,
        };
        setLogs((prev) => [...prev, newLog]);
      }
    });
  }, [positions]);

  // Process logs to extract analysis information
  useEffect(() => {
    const lastLogs = logs.slice(-50);
    const stats = {
      ...analysisStats,
      lastUpdate: new Date(),
      apiStatus: isRunning ? "active" : "idle",
      riskMetrics: {
        currentRisk: calculateCurrentRisk(),
        maxRisk: 0.02, // 2% max risk per trade
        dailyPnL: calculateDailyPnL(),
        maxDrawdown: calculateMaxDrawdown(),
        winRate: calculateWinRate(),
      },
      orderStats: {
        totalOrders: calculateTotalOrders(),
        pendingOrders: calculatePendingOrders(),
        filledOrders: calculateFilledOrders(),
        cancelledOrders: calculateCancelledOrders(),
      },
    };

    lastLogs.forEach((log) => {
      if (log.message.includes("Successfully fetched")) {
        stats.successfulFetches++;
        stats.instrumentsAnalyzed++;
      }
      if (log.message.includes("No valid price data")) {
        stats.failedFetches++;
      }
      if (log.message.includes("Latest price:")) {
        const priceMatch = log.message.match(/Latest price: ([\d.]+)/);
        if (priceMatch) {
          stats.lastPrice = priceMatch[1];
          stats.lastInstrument = log.message.split(" ")[0];
        }
      }
      if (log.message.includes("Trade Signal Detected")) {
        stats.signalsGenerated++;
      }
    });

    setAnalysisStats(stats);
  }, [logs, isRunning, positions]);

  // Add new function to handle market analysis logs
  const addMarketLog = useCallback((message, type = "market") => {
    const newLog = {
      timestamp: new Date(),
      type,
      message,
    };
    setLogs((prev) => [...prev, newLog]);
  }, []);

  // Expose the addMarketLog function
  useEffect(() => {
    if (window) {
      window.addMarketLog = addMarketLog;
    }
  }, [addMarketLog]);

  // Function to check if user is at bottom
  const checkIfAtBottom = () => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
    setIsAtBottom(isBottom);
  };

  // Handle scroll events
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    const handleScroll = () => {
      checkIfAtBottom();
    };

    terminal.addEventListener('scroll', handleScroll);
    return () => terminal.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll only if user is at bottom
  useEffect(() => {
    if (isAtBottom && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, isAtBottom]);

  return (
    <div className="space-y-4">
      {/* Stats Panel */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">API Status:</span>
            <span
              className={`ml-2 ${
                analysisStats.apiStatus === "active"
                  ? "text-green-500"
                  : "text-yellow-500"
              }`}
            >
              {analysisStats.apiStatus.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Instruments:</span>
            <span className="ml-2">{analysisStats.instrumentsAnalyzed}</span>
          </div>
          <div>
            <span className="text-gray-500">Signals:</span>
            <span className="ml-2">{analysisStats.signalsGenerated}</span>
          </div>
          <div>
            <span className="text-gray-500">Success Rate:</span>
            <span className="ml-2">
              {analysisStats.successfulFetches + analysisStats.failedFetches > 0
                ? `${Math.round(
                    (analysisStats.successfulFetches /
                      (analysisStats.successfulFetches +
                        analysisStats.failedFetches)) *
                      100
                  )}%`
                : "N/A"}
            </span>
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Current Risk:</span>
            <span
              className={`ml-2 ${
                analysisStats.riskMetrics.currentRisk >
                analysisStats.riskMetrics.maxRisk
                  ? "text-red-500"
                  : "text-green-500"
              }`}
            >
              {(analysisStats.riskMetrics.currentRisk * 100).toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Daily P/L:</span>
            <span
              className={`ml-2 ${
                analysisStats.riskMetrics.dailyPnL >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {analysisStats.riskMetrics.dailyPnL.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Max Drawdown:</span>
            <span className="ml-2 text-yellow-500">
              {(analysisStats.riskMetrics.maxDrawdown * 100).toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Win Rate:</span>
            <span className="ml-2 text-blue-500">
              {(analysisStats.riskMetrics.winRate * 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Order Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Orders:</span>
            <span className="ml-2">{analysisStats.orderStats.totalOrders}</span>
          </div>
          <div>
            <span className="text-gray-500">Pending:</span>
            <span className="ml-2 text-yellow-500">
              {analysisStats.orderStats.pendingOrders}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Filled:</span>
            <span className="ml-2 text-green-500">
              {analysisStats.orderStats.filledOrders}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Cancelled:</span>
            <span className="ml-2 text-red-500">
              {analysisStats.orderStats.cancelledOrders}
            </span>
          </div>
        </div>

        {analysisStats.lastPrice && (
          <div className="mt-2 text-sm">
            <span className="text-gray-500">Last Update:</span>
            <span className="ml-2">
              {analysisStats.lastInstrument} @ {analysisStats.lastPrice}
            </span>
          </div>
        )}
      </div>

      {/* Terminal */}
      <div className="bg-black text-green-400 font-mono rounded-lg h-[500px] flex flex-col">
        {/* Fixed Header */}
        <div className="p-4 border-b border-green-400">
          <div className="flex justify-between items-center">
            <span>=== TRADING TERMINAL ===</span>
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        >
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="flex items-start">
                <span className="text-gray-500 mr-2">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span
                  className={`
                  ${log.type === "error" ? "text-red-500" : ""}
                  ${log.type === "position" ? "text-yellow-400" : ""}
                  ${log.type === "status" ? "text-blue-400" : ""}
                  ${log.type === "order" ? "text-purple-400" : ""}
                  ${log.type === "risk" ? "text-orange-400" : ""}
                  ${log.type === "market" ? "text-green-400" : ""}
                `}
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 border-t border-green-400 bg-black">
          <div className="flex justify-between">
            <span>
              Active Positions:{" "}
              {
                positions.filter((p) => {
                  const longUnits = parseInt(p.long?.units || "0");
                  const shortUnits = parseInt(p.short?.units || "0");
                  return longUnits !== 0 || shortUnits !== 0;
                }).length
              }
            </span>
            <span>Status: {isRunning ? "RUNNING" : "STOPPED"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions for calculations
const calculateCurrentRisk = () => {
  // Implementation to calculate current risk based on open positions
  return 0.01; // Placeholder
};

const calculateDailyPnL = () => {
  // Implementation to calculate daily profit/loss
  return 0.02; // Placeholder
};

const calculateMaxDrawdown = () => {
  // Implementation to calculate maximum drawdown
  return 0.05; // Placeholder
};

const calculateWinRate = () => {
  // Implementation to calculate win rate
  return 0.65; // Placeholder
};

const calculateTotalOrders = () => {
  // Implementation to calculate total orders
  return 10; // Placeholder
};

const calculatePendingOrders = () => {
  // Implementation to calculate pending orders
  return 2; // Placeholder
};

const calculateFilledOrders = () => {
  // Implementation to calculate filled orders
  return 7; // Placeholder
};

const calculateCancelledOrders = () => {
  // Implementation to calculate cancelled orders
  return 1; // Placeholder
};
