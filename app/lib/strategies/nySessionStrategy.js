const NY_SESSION_START = 1; // 1:00 ET
const NY_SESSION_END = 23; // 23:00 ET

const STRATEGY_PARAMS = {
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  riskRewardRatio: 2,
  maxSpread: 0.0003,
  smaPeriod: 200, // For trend confirmation
  atrPeriod: 14, // For volatility
};

function calculateRSI(closes, period = 14) {
  if (!Array.isArray(closes) || closes.length < period + 1) {
    throw new Error("Not enough data to calculate RSI.");
  }

  const rsi = new Array(closes.length).fill(undefined);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgGain / avgLoss;
    rsi[i] = 100 - 100 / (1 + rs);
  }

  return rsi;
}

function calculateSMA(prices, period) {
  if (!Array.isArray(prices) || prices.length < period) {
    return [];
  }
  const sma = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

function calculateATR(ohlc, period = 14) {
  if (!Array.isArray(ohlc) || ohlc.length < period + 1) {
    return [];
  }
  const atr = [];
  const tr = [];
  for (let i = 1; i < ohlc.length; i++) {
    const high = ohlc[i].high;
    const low = ohlc[i].low;
    const prevClose = ohlc[i - 1].close;
    const trueRange = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    tr.push(trueRange);
  }
  for (let i = period - 1; i < tr.length; i++) {
    const avgTR =
      tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    atr.push(avgTR);
  }
  return atr;
}

export class NYSessionStrategy {
  constructor(params = {}) {
    this.params = { ...STRATEGY_PARAMS, ...params };
  }

  isNYSession() {
    return true;
    // const now = new Date();
    // const et = new Date(
    //   now.toLocaleString("en-US", { timeZone: "America/New_York" })
    // );
    // const hour = et.getHours();
    // return hour >= NY_SESSION_START && hour < NY_SESSION_END;
  }

  calculateIndicators(ohlc) {
    const closes = ohlc.map((c) => c.close);
    const rsi = calculateRSI(closes, this.params.rsiPeriod);
    const sma = calculateSMA(closes, this.params.smaPeriod);
    const atr = calculateATR(ohlc, this.params.atrPeriod);
    return { rsi, sma, atr };
  }

  shouldEnterLong(indicators, currentIndex) {
    if (!this.isNYSession()) return false;

    const { rsi, sma, atr } = indicators;
    const curr = currentIndex;
    const prev = currentIndex - 1;

    if (!rsi[curr] || !rsi[prev] || !sma[curr] || !atr[curr]) {
      return false;
    }

    const isOversold = rsi[curr] < this.params.rsiOversold;
    const rsiIncreasing = rsi[curr] > rsi[prev];
    const isAboveSMA = ohlc[curr].close > sma[curr]; // Trend confirmation
    const sufficientVolatility = atr[curr] >= 0.0005; // From TRADING_PARAMS

    return isOversold && rsiIncreasing && isAboveSMA && sufficientVolatility;
  }

  shouldEnterShort(indicators, currentIndex) {
    if (!this.isNYSession()) return false;

    const { rsi, sma, atr } = indicators;
    const curr = currentIndex;
    const prev = currentIndex - 1;

    if (!rsi[curr] || !rsi[prev] || !sma[curr] || !atr[curr]) {
      return false;
    }

    const isOverbought = rsi[curr] > this.params.rsiOverbought;
    const rsiDecreasing = rsi[curr] < rsi[prev];
    const isBelowSMA = ohlc[curr].close < sma[curr]; // Trend confirmation
    const sufficientVolatility = atr[curr] >= 0.0005;

    return isOverbought && rsiDecreasing && isBelowSMA && sufficientVolatility;
  }

  calculateStopLoss(entryPrice, direction, atr) {
    const stopDistance = atr * 2; // 2x ATR for stop loss
    return direction === "long"
      ? entryPrice - stopDistance
      : entryPrice + stopDistance;
  }

  calculateTakeProfit(entryPrice, stopLoss, direction) {
    const stopDistance = Math.abs(entryPrice - stopLoss);
    const targetDistance = stopDistance * this.params.riskRewardRatio;
    return direction === "long"
      ? entryPrice + targetDistance
      : entryPrice - targetDistance;
  }

  getTradeParameters(entryPrice, direction, indicators) {
    const stopLoss = this.calculateStopLoss(
      entryPrice,
      direction,
      indicators.atr[indicators.atr.length - 1]
    );
    const takeProfit = this.calculateTakeProfit(
      entryPrice,
      stopLoss,
      direction
    );
    return {
      stopLoss,
      takeProfit,
      riskRewardRatio: this.params.riskRewardRatio,
    };
  }
}

// // strategies/nySessionStrategy
// // New York session hours (ET)
// const NY_SESSION_START = 8; // 8:00 ET
// const NY_SESSION_END = 16; // 16:00 ET

// // Strategy parameters
// const STRATEGY_PARAMS = {
//   // RSI settings
//   rsiPeriod: 14,
//   rsiOverbought: 70,
//   rsiOversold: 30,

//   // Risk management
//   riskRewardRatio: 2,
//   maxSpread: 0.0003, // 3 pips
// };

// /**
//  * Calculate RSI (Relative Strength Index)
//  * @param {number[]} closes - Array of closing prices
//  * @param {number} period - RSI period (default is 14)
//  * @returns {number[]} - Array of RSI values (undefined for initial values)
//  */
// function calculateRSI(closes, period = 14) {
//   if (!Array.isArray(closes) || closes.length < period + 1) {
//     throw new Error("Not enough data to calculate RSI.");
//   }

//   const rsi = new Array(closes.length).fill(undefined);
//   let gains = 0;
//   let losses = 0;

//   // Initial average gain/loss
//   for (let i = 1; i <= period; i++) {
//     const delta = closes[i] - closes[i - 1];
//     if (delta >= 0) gains += delta;
//     else losses -= delta;
//   }

//   let avgGain = gains / period;
//   let avgLoss = losses / period;
//   rsi[period] = 100 - 100 / (1 + avgGain / avgLoss);

//   // Continue for the rest of the data
//   for (let i = period + 1; i < closes.length; i++) {
//     const delta = closes[i] - closes[i - 1];
//     const gain = delta > 0 ? delta : 0;
//     const loss = delta < 0 ? -delta : 0;

//     avgGain = (avgGain * (period - 1) + gain) / period;
//     avgLoss = (avgLoss * (period - 1) + loss) / period;

//     const rs = avgGain / avgLoss;
//     rsi[i] = 100 - 100 / (1 + rs);
//   }

//   return rsi;
// }

// export class NYSessionStrategy {
//   constructor(params = {}) {
//     this.params = { ...STRATEGY_PARAMS, ...params };
//   }

//   isNYSession() {
//     const now = new Date();
//     const et = new Date(
//       now.toLocaleString("en-US", { timeZone: "America/New_York" })
//     );
//     const hour = et.getHours();
//     return hour >= NY_SESSION_START && hour < NY_SESSION_END;
//   }

//   calculateIndicators(prices) {
//     // Use the custom RSI function instead of technicalindicators
//     const rsi = calculateRSI(prices, this.params.rsiPeriod);

//     return {
//       rsi,
//     };
//   }

//   shouldEnterLong(indicators, currentIndex) {
//     if (!this.isNYSession()) return false;

//     const { rsi } = indicators;
//     const curr = currentIndex;
//     const prev = currentIndex - 1;

//     // Check if we have enough data
//     if (!rsi[curr] || !rsi[prev]) {
//       return false;
//     }

//     // RSI conditions for long entry
//     const isOversold = rsi[curr] < this.params.rsiOversold; // RSI below 30
//     const rsiIncreasing = rsi[curr] > rsi[prev]; // RSI starting to increase

//     return isOversold && rsiIncreasing;
//   }

//   shouldEnterShort(indicators, currentIndex) {
//     if (!this.isNYSession()) return false;

//     const { rsi } = indicators;
//     const curr = currentIndex;
//     const prev = currentIndex - 1;

//     // Check if we have enough data
//     if (!rsi[curr] || !rsi[prev]) {
//       return false;
//     }

//     // RSI conditions for short entry
//     const isOverbought = rsi[curr] > this.params.rsiOverbought; // RSI above 70
//     const rsiDecreasing = rsi[curr] < rsi[prev]; // RSI starting to decrease

//     return isOverbought && rsiDecreasing;
//   }

//   calculateStopLoss(entryPrice, direction, rsi) {
//     // Simple fixed stop loss based on RSI extremes
//     const stopDistance = direction === "long" ? 0.01 : 0.01; // 1% stop loss

//     return direction === "long"
//       ? entryPrice - stopDistance
//       : entryPrice + stopDistance;
//   }

//   calculateTakeProfit(entryPrice, stopLoss, direction) {
//     const stopDistance = Math.abs(entryPrice - stopLoss);
//     const targetDistance = stopDistance * this.params.riskRewardRatio;

//     return direction === "long"
//       ? entryPrice + targetDistance
//       : entryPrice - targetDistance;
//   }

//   getTradeParameters(entryPrice, direction, rsi) {
//     const stopLoss = this.calculateStopLoss(entryPrice, direction, rsi);
//     const takeProfit = this.calculateTakeProfit(
//       entryPrice,
//       stopLoss,
//       direction
//     );

//     return {
//       stopLoss,
//       takeProfit,
//       riskRewardRatio: this.params.riskRewardRatio,
//     };
//   }
// }
