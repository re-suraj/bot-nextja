// // lib/nySessionStrategy.js
// import { TRADING_PARAMS } from "./config/instruments";
class NYSessionsStrategy {
  constructor() {
    this.params = {
      rsiPeriod: 14, // Default RSI period
      rsiOversold: 35, // Threshold for long trades
      rsiOverbought: 65, // Threshold for short trades
      // Other params (e.g., stopLossPips, takeProfitPips) remain unchanged
    };
  }

  shouldEnterLong(indicators, currentIndex, instrument, emitLog) {
    const { rsi } = indicators;
    const curr = currentIndex;
    if (!rsi[curr]) {
      emitLog(
        `[NO TRADE REASON] ${instrument}: Insufficient data for RSI`,
        "info"
      );
      return false;
    }
    const isOversold = rsi[curr] < this.params.rsiOversold;
    if (!isOversold) {
      emitLog(
        `[NO TRADE REASON] ${instrument}: RSI not oversold (${rsi[curr].toFixed(
          2
        )})`,
        "info"
      );
    }
    return isOversold;
  }

  shouldEnterShort(indicators, currentIndex, instrument, emitLog) {
    const { rsi } = indicators;
    const curr = currentIndex;
    if (!rsi[curr]) {
      emitLog(
        `[NO TRADE REASON] ${instrument}: Insufficient data for RSI`,
        "info"
      );
      return false;
    }
    const isOverbought = rsi[curr] > this.params.rsiOverbought;
    if (!isOverbought) {
      emitLog(
        `[NO TRADE REASON] ${instrument}: RSI not overbought (${rsi[
          curr
        ].toFixed(2)})`,
        "info"
      );
    }
    return isOverbought;
  }

  // getTradeParameters remains unchanged unless you want RSI-based SL/TP
  getTradeParameters(price, direction, indicators) {
    return {
      stopLoss:
        direction === "long"
          ? price - this.params.stopLossPips
          : price + this.params.stopLossPips,
      takeProfit:
        direction === "long"
          ? price + this.params.takeProfitPips
          : price - this.params.takeProfitPips,
    };
  }
}

export default NYSessionsStrategy;
// const NY_SESSION_START = 8; // 8:00 ET
// const NY_SESSION_END = 16; // 16:00 ET

// export class NYSessionsStrategy {
//   constructor() {
//     this.params = {
//       rsiPeriod: TRADING_PARAMS.RSI_PERIOD || 14,
//       rsiOverbought: TRADING_PARAMS.RSI_OVERBOUGHT || 65,
//       rsiOversold: TRADING_PARAMS.RSI_OVERSOLD || 35,
//       smaPeriod: TRADING_PARAMS.SMA_PERIOD || 200,
//       atrPeriod: TRADING_PARAMS.ATR_PERIOD || 14,
//     };
//   }

//   isNYSession() {
//     // Set to true for 24/7 trading; adjust as needed
//     return true;
//     // const now = new Date();
//     // const nyTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
//     // const hours = nyTime.getHours();
//     // return hours >= NY_SESSION_START && hours < NY_SESSION_END;
//   }

//   shouldEnterLong(indicators, currentIndex, instrument, emitLog) {
//     if (!this.isNYSession()) {
//       emitLog(`[NO TRADE REASON] ${instrument}: Outside NY session`, "info");
//       return false;
//     }
//     const { rsi, sma, atr } = indicators;
//     const curr = currentIndex;
//     const prev = currentIndex - 1;
//     if (!rsi[curr] || !rsi[prev] || !sma[curr] || !atr[curr]) {
//       emitLog(
//         `[NO TRADE REASON] ${instrument}: Missing indicator data`,
//         "info"
//       );
//       return false;
//     }
//     const isOversold = rsi[curr] < this.params.rsiOversold;
//     const rsiIncreasing = rsi[curr] > rsi[prev];
//     const isAboveSMA = ohlc[curr].close > sma[curr];
//     const sufficientVolatility = atr[curr] >= TRADING_PARAMS.MIN_ATR_THRESHOLD;
//     if (!isOversold)
//       emitLog(
//         `[NO TRADE REASON] ${instrument}: RSI not oversold (${rsi[curr].toFixed(
//           2
//         )})`,
//         "info"
//       );
//     if (!rsiIncreasing)
//       emitLog(
//         `[NO TRADE REASON] ${instrument}: RSI not increasing (${rsi[
//           curr
//         ].toFixed(2)} <= ${rsi[prev].toFixed(2)})`,
//         "info"
//       );
//     if (!isAboveSMA)
//       emitLog(
//         `[NO TRADE REASON] ${instrument}: Price below SMA (${ohlc[
//           curr
//         ].close.toFixed(5)} <= ${sma[curr].toFixed(5)})`,
//         "info"
//       );
//     if (!sufficientVolatility)
//       emitLog(
//         `[NO TRADE REASON] ${instrument}: Low ATR (${atr[curr].toFixed(5)})`,
//         "info"
//       );
//     return isOversold && rsiIncreasing && isAboveSMA && sufficientVolatility;
//   }

//   shouldEnterShort(indicators, currentIndex, instrument, emitLog) {
//     if (!this.isNYSession()) {
//       emitLog(`[NO TRADE REASON] ${instrument}: Outside NY session`, "info");
//       return false;
//     }
//     const { rsi, sma, atr } = indicators;
//     const curr = currentIndex;
//     const prev = currentIndex - 1;
//     if (!rsi[curr] || !rsi[prev] || !sma[curr] || !atr[curr]) {
//       emitLog(
//         `[NO TRADE REASON] ${instrument}: Missing indicator data`,
//         "info"
//       );
//       return false;
//     }
//     const isOverbought = rsi[curr] > this.params.rsiOverbought;
//     const rsiDecreasing = rsi[curr] < rsi[prev];
//     const isBelowSMA = ohlc[curr].close < sma[curr];
//     const sufficientVolatility = atr[curr] >= TRADING_PARAMS.MIN_ATR_THRESHOLD;
//     if (!isOverbought)
//       emitLog(
//         `[NO TRADE REASON] ${instrument}: RSI not overbought (${rsi[
//           curr
//         ].toFixed(2)})`,
//         "info"
//       );
//     if (!rsiDecreasing)
//       emitLog(
//         `[NO TRADE REASON] ${instrument}: RSI not decreasing (${rsi[
//           curr
//         ].toFixed(2)} >= ${rsi[prev].toFixed(2)})`,
//         "info"
//       );
//     if (!isBelowSMA)
//       emitLog(
//         `[NO TRADE REASON] ${instrument}: Price above SMA (${ohlc[
//           curr
//         ].close.toFixed(5)} >= ${sma[curr].toFixed(5)})`,
//         "info"
//       );
//     if (!sufficientVolatility)
//       emitLog(
//         `[NO TRADE REASON] ${instrument}: Low ATR (${atr[curr].toFixed(5)})`,
//         "info"
//       );
//     return isOverbought && rsiDecreasing && isBelowSMA && sufficientVolatility;
//   }

//   getTradeParameters(price, direction, indicators) {
//     const atr = indicators.atr[indicators.atr.length - 1];
//     const stopLossPips = TRADING_PARAMS.STOP_LOSS_PIPS;
//     const takeProfitPips = TRADING_PARAMS.TAKE_PROFIT_PIPS;
//     const stopLossPrice =
//       direction === "long"
//         ? price - stopLossPips * 0.0001
//         : price + stopLossPips * 0.0001;
//     const takeProfitPrice =
//       direction === "long"
//         ? price + takeProfitPips * 0.0001
//         : price - takeProfitPips * 0.0001;
//     return { stopLossPrice, takeProfitPrice, atr };
//   }
// }
