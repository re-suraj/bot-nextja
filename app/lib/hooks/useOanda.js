import { useState, useCallback } from "react";
import { oandaGet } from "../oanda";

export function useOanda() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCandles = useCallback(async (instrument, granularity, count) => {
    try {
      setLoading(true);
      setError(null);

      // Validate parameters
      if (!instrument || !granularity || !count) {
        throw new Error(
          "Missing required parameters: instrument, granularity, and count are required"
        );
      }

      // Validate granularity format
      const validGranularities = [
        "S5",
        "S10",
        "S15",
        "S30",
        "M1",
        "M2",
        "M4",
        "M5",
        "M10",
        "M15",
        "M30",
        "H1",
        "H2",
        "H3",
        "H4",
        "H6",
        "H8",
        "H12",
        "D",
        "W",
        "M",
      ];
      if (!validGranularities.includes(granularity)) {
        throw new Error(
          `Invalid granularity: ${granularity}. Must be one of: ${validGranularities.join(
            ", "
          )}`
        );
      }

      // Validate count
      if (count < 1 || count > 5000) {
        throw new Error("Count must be between 1 and 5000");
      }

      if (window.addMarketLog) {
        window.addMarketLog(
          `Fetching candles for ${instrument} with ${granularity} granularity, count: ${count}`
        );
      }

      const response = await oandaGet(
        `/v3/instruments/${instrument}/candles?granularity=${granularity}&count=${count}&price=M`
      );

      // Validate response structure
      if (!response || !response.candles || !Array.isArray(response.candles)) {
        if (window.addMarketLog) {
          window.addMarketLog(
            "Invalid response structure: " + JSON.stringify(response),
            "error"
          );
        }
        throw new Error("Invalid response structure from OANDA API");
      }

      // Validate candle data
      const validCandles = response.candles.filter(
        (candle) =>
          candle &&
          candle.mid &&
          typeof candle.mid.c === "number" &&
          typeof candle.mid.h === "number" &&
          typeof candle.mid.l === "number" &&
          typeof candle.mid.o === "number"
      );

      if (validCandles.length === 0) {
        if (window.addMarketLog) {
          // window.addMarketLog(
          //   "No valid candles in response: " + JSON.stringify(response.message),
          //   "error"
          // );
        }
        return null;
      }

      if (window.addMarketLog) {
        window.addMarketLog(
          `Successfully fetched ${validCandles.length} candles for ${instrument}`
        );
      }
      return validCandles;
    } catch (error) {
      if (error.message.includes("429")) {
        if (window.addMarketLog) {
          window.addMarketLog(
            "Rate limit reached, waiting before next request...",
            "error"
          );
        }
        return null;
      }
      if (window.addMarketLog) {
        // window.addMarketLog(
        //   "Error fetching candles: " + error.message,
        //   "error"
        // );
      }
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getCandles,
    loading,
    error,
  };
}
