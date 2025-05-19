"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { INSTRUMENTS } from "../config/instruments";

export default function TradingBot() {
  const [isRunning, setIsRunning] = useState(false);
  const [botState, setBotState] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [connectionError, setConnectionError] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const logContainerRef = useRef(null);
  const eventSourceRef = useRef(null);
  const isUserScrollingRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (
      shouldAutoScroll &&
      logContainerRef.current &&
      !isUserScrollingRef.current
    ) {
      const container = logContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [shouldAutoScroll]);

  const handleScroll = useCallback(() => {
    if (!logContainerRef.current) return;
    const container = logContainerRef.current;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      50;
    setShouldAutoScroll(isAtBottom);
    isUserScrollingRef.current = !isAtBottom;
  }, []);

  const updateLogs = useCallback(
    (newLog) => {
      setLogs((prev) => {
        const newLogs = [...prev, newLog].slice(-100);
        setTimeout(scrollToBottom, 0);
        return newLogs;
      });
    },
    [scrollToBottom]
  );

  useEffect(() => {
    if (shouldAutoScroll && !isUserScrollingRef.current) scrollToBottom();
  }, [logs, scrollToBottom, shouldAutoScroll]);

  useEffect(() => {
    fetchBotState();
    const interval = setInterval(fetchBotState, 5000);
    setupEventSource();

    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  const setupEventSource = () => {
    if (eventSourceRef.current) eventSourceRef.current.close();

    eventSourceRef.current = new EventSource("/api/bot/logs");

    eventSourceRef.current.onopen = () => {
      setConnectionError(false);
      updateLogs({
        timestamp: new Date().toLocaleTimeString(),
        message: "Connected to log stream",
        type: "success",
      });
    };

    eventSourceRef.current.onmessage = (event) => {
      const log = JSON.parse(event.data);
      updateLogs(log);
    };

    eventSourceRef.current.onerror = (error) => {
      console.error("SSE Error:", error);
      setConnectionError(true);
      updateLogs({
        timestamp: new Date().toLocaleTimeString(),
        message: "Lost connection. Reconnecting...",
        type: "error",
      });
      eventSourceRef.current.close();
      setTimeout(setupEventSource, 5000);
    };
  };

  const addLog = (message, type = "info") => {
    updateLogs({ timestamp: new Date().toLocaleTimeString(), message, type });
  };

  const fetchBotState = async () => {
    try {
      const response = await fetch("/api/bot/control");
      if (!response.ok) throw new Error("Failed to fetch bot state");
      const data = await response.json();
      setBotState(data);
      setIsRunning(data.status === "running");
      setError(null);
    } catch (err) {
      setError(err.message);
      addLog(`Error fetching bot state: ${err.message}`, "error");
    }
  };

  const handleToggleBot = async () => {
    try {
      const action = isRunning ? "stop" : "start";
      const response = await fetch("/api/bot/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error("Failed to control bot");
      const data = await response.json();
      setIsRunning(data.status === "running");
      setError(null);
      addLog(
        `Bot ${action}ed successfully`,
        data.status === "running" ? "success" : "warning"
      );
    } catch (err) {
      setError(err.message);
      addLog(`Error controlling bot: ${err.message}`, "error");
    }
  };

  const getLogColor = (type) => {
    return (
      {
        success: "text-green-400",
        error: "text-red-400",
        warning: "text-yellow-400",
        info: "text-gray-300",
      }[type] || "text-gray-300"
    );
  };

  const TerminalSection = () => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Terminal Logs</h3>
        <div className="flex gap-2">
          {connectionError && (
            <button
              onClick={setupEventSource}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Reconnect
            </button>
          )}
          <button
            onClick={() => setLogs([])}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
          >
            🧹 Clear
          </button>
          <button
            onClick={() => {
              setShouldAutoScroll(!shouldAutoScroll);
              if (!shouldAutoScroll) {
                isUserScrollingRef.current = false;
                scrollToBottom();
              }
            }}
            className={`px-3 py-1.5 rounded ${
              shouldAutoScroll
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            }`}
          >
            {shouldAutoScroll ? "Auto-scroll: On" : "Auto-scroll: Off"}
          </button>
        </div>
      </div>
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="bg-black rounded-lg p-4 h-[300px] overflow-y-auto font-mono text-sm"
        aria-live="polite"
      >
        <div className="sticky top-0 z-10 bg-black bg-opacity-70 backdrop-blur px-3 py-2 text-xs text-gray-400 border-b border-gray-700 font-semibold">
          {logs.length} Messages
        </div>
        <div className="mt-2">
          {logs.length === 0 ? (
            <div className="text-gray-500 italic">No logs available</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1 flex gap-2">
                <span className="text-gray-500 w-[90px] shrink-0">
                  [{log.timestamp}]
                </span>
                <span className={getLogColor(log.type)}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Trading Bot</h2>
        <button
          onClick={handleToggleBot}
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            isRunning
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          } text-white`}
        >
          {isRunning ? "Stop Bot" : "Start Bot"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {botState && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-white">Bot Status</h3>
            <div className="space-y-3">
              {["status", "dailyStats"].every(
                (k) => botState[k] !== undefined
              ) && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span
                      className={`font-semibold ${
                        botState.status === "running"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {botState.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Daily Trades:</span>
                    <span className="text-white">
                      {botState.dailyStats.trades}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wins:</span>
                    <span className="text-green-400">
                      {botState.dailyStats.wins}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Losses:</span>
                    <span className="text-red-400">
                      {botState.dailyStats.losses}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Profit:</span>
                    <span
                      className={`font-semibold ${
                        botState.dailyStats.profit >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {botState.dailyStats.profit.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-white">Configuration</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Stop Loss:</span>
                <span className="text-white">
                  {botState.config.stopLossPips} pips
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Take Profit:</span>
                <span className="text-white">
                  {botState.config.takeProfitPips} pips
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Risk:</span>
                <span className="text-white">
                  {botState.config.riskPercent}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Daily Trades:</span>
                <span className="text-white">
                  {botState.config.maxDailyTrades}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Open Positions:</span>
                <span className="text-white">
                  {botState.config.maxOpenPositions}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 mb-8">
        <h3 className="text-xl font-bold mb-4 text-white">
          Trading Instruments
        </h3>
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          }}
        >
          {INSTRUMENTS.map((instrument) => (
            <div
              key={instrument}
              className="bg-gray-700 p-3 rounded text-center text-gray-200 hover:bg-gray-600 transition"
            >
              {instrument}
            </div>
          ))}
        </div>
      </div>

      <TerminalSection />
    </div>
  );
}
