import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import { OANDA_ACCOUNT_ID, OANDA_API_KEY } from '../config/env';
import { INSTRUMENTS, DEFAULT_INSTRUMENT } from '../config/instruments';
// import WebSocket, { WebSocketServer } from "ws";

const ACCOUNT_ID = "101-001-31701945-001";
const ACCESS_TOKEN =
  "c87de240064f6d839211a8bb9fb46354-301353f03ea7363dff1216b24aaa652d";

export default function RealtimeCandles({ instrument = DEFAULT_INSTRUMENT }) {
  const chartContainerRef = useRef();
  const [candles, setCandles] = useState([]);

  // useEffect(() => {
  //   const chart = createChart(chartContainerRef.current, {
  //     width: 600,
  //     height: 300,
  //     layout: { background: { color: "#18181b" }, textColor: "#cbd5e1" },
  //     grid: { vertLines: { color: "#222" }, horzLines: { color: "#222" } },
  //     timeScale: { timeVisible: true, secondsVisible: false },
  //   });
  //   const candleSeries = chart.addCandlestickSeries();

  //   candleSeries.setData(candles);

  //   return () => chart.remove();
  // }, [candles]);

  // useEffect(() => {
  //   const eventSource = new EventSource("/api/stream");

  //   eventSource.onmessage = (event) => {
  //     console.log("Frontend received:", event.data);
  //     const { instrument: msgInstrument, candle } = JSON.parse(event.data);
  //     if (msgInstrument !== instrument) return;
  //     setCandles((prev) => {
  //       if (
  //         prev.length > 0 &&
  //         prev[prev.length - 1].startTime === candle.startTime
  //       ) {
  //         return [...prev.slice(0, -1), candle];
  //       }
  //       return [...prev, candle];
  //     });
  //   };

  //   eventSource.onerror = (err) => {
  //     console.error("SSE error:", err);
  //     eventSource.close();
  //   };

  //   return () => eventSource.close();
  // }, [instrument]);

  // Convert candle data to chart format
  const chartCandles = candles.map((c) => ({
    time: Math.floor(new Date(c.startTime).getTime() / 1000),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));

  useEffect(() => {
    // Update chart when chartCandles changes
    if (chartContainerRef.current && chartCandles.length > 0) {
      const chart = createChart(chartContainerRef.current, {
        width: 600,
        height: 300,
        layout: { background: { color: "#18181b" }, textColor: "#cbd5e1" },
        grid: { vertLines: { color: "#222" }, horzLines: { color: "#222" } },
        timeScale: { timeVisible: true, secondsVisible: false },
      });
      const candleSeries = chart.addCandlestickSeries();
      candleSeries.setData(chartCandles);
      return () => chart.remove();
    }
  }, [chartCandles]);

  return (
    <div>
      <h3 className="text-lg font-bold mb-2">{instrument} Real-Time Candles</h3>
      <div ref={chartContainerRef} />
    </div>
  );
}
