import { SMA, RSI, MACD, BollingerBands } from "technicalindicators";

const API_KEY =
  "c87de240064f6d839211a8bb9fb46354-301353f03ea7363dff1216b24aaa652d";
const ACCOUNT_ID = "101-001-31701945-001";
const BASE_URL = "https://api-fxpractice.oanda.com/v3";

// const INSTRUMENTS = ['EUR_USD', 'GBP_USD', 'AUD_USD', 'EUR_CAD', 'EUR_AUD'];
const INSTRUMENTS = [
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
const STOP_LOSS_PIPS = 50;
const TAKE_PROFIT_PIPS = 40;
const RISK_PERCENT = 0.02;
const MIN_RSI_DIFF = 5;
const MIN_MA_DIFF = 0.0002;
const TREND_STRENGTH_THRESHOLD = 0.0001;
const MAX_DAILY_TRADES = 5;
const MAX_OPEN_POSITIONS = 3;

// Track daily performance and trade cooldowns
let dailyStats = {
  trades: 0,
  wins: 0,
  losses: 0,
  profit: 0,
  lastReset: new Date().toDateString(),
};

let lastTradeTime = {}; // Cooldown tracking
let errorNumber = 0;

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

const pipToPrice = (pips) => pips * 0.0001;

function canTrade(instrument) {
  const now = Date.now();
  if (!lastTradeTime[instrument] || now - lastTradeTime[instrument] > 60000) {
    lastTradeTime[instrument] = now;
    return true;
  }
  return false;
}

// === API Calls ===
async function getCandles(instrument) {
  try {
    const response = await fetch(
      `${BASE_URL}/instruments/${instrument}/candles?granularity=M5&count=100&price=M`,
      {
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.candles || !Array.isArray(data.candles)) {
      throw new Error("Invalid candle data received from API");
    }

    // Validate and map candles
    const validCandles = data.candles
      .filter(
        (candle) => candle && candle.mid && typeof candle.mid.c === "string"
      )
      .map((candle) => parseFloat(candle.mid.c));

    if (validCandles.length < 50) {
      throw new Error(
        `Not enough valid candles for ${instrument}. Got ${validCandles.length}, need at least 50.`
      );
    }

    return validCandles;
  } catch (error) {
    console.error(`[CANDLE ERROR] ${instrument}: ${error.message}`);
    // Don't retry immediately, let the strategy handle the retry
    throw error;
  }
}

async function getAccountDetails() {
  try {
    const response = await fetch(`${BASE_URL}/accounts/${ACCOUNT_ID}`, {
      headers,
    });
    const data = await response.json();
    return parseFloat(data.account.balance);
  } catch (error) {
    console.error(`[ACCOUNT ERROR] Retrying...`);
    setTimeout(() => getAccountDetails(), 2000);
    throw error;
  }
}

async function getOpenTrades() {
  try {
    const response = await fetch(
      `${BASE_URL}/accounts/${ACCOUNT_ID}/openTrades`,
      { headers }
    );
    const data = await response.json();
    return data.trades;
  } catch (error) {
    console.error(`[TRADES ERROR] Retrying...`);
    setTimeout(() => getOpenTrades(), 2000);
    throw error;
  }
}

async function createOrder(direction, price, units, instrument) {
  try {
    const tpPips = pipToPrice(TAKE_PROFIT_PIPS);
    const slPips = pipToPrice(STOP_LOSS_PIPS);

    const stopLossPrice =
      direction === "buy"
        ? (price - slPips).toFixed(5)
        : (price + slPips).toFixed(5);

    const takeProfitPrice =
      direction === "buy"
        ? (price + tpPips).toFixed(5)
        : (price - tpPips).toFixed(5);

    const order = {
      order: {
        instrument: instrument,
        units: direction === "buy" ? Math.floor(units) : -Math.floor(units),
        type: "MARKET",
        positionFill: "DEFAULT",
        stopLossOnFill: { price: stopLossPrice },
        takeProfitOnFill: { price: takeProfitPrice },
      },
    };

    const response = await fetch(`${BASE_URL}/accounts/${ACCOUNT_ID}/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(order),
    });

    const data = await response.json();
    window.addMarketLog(
      `[ORDER] ${direction.toUpperCase()} ${units} units at ${price} for ${instrument}`
    );
    return data;
  } catch (error) {
    errorNumber++;
    const timeout = error?.status === 429 ? 30000 : 2000;
    console.error(
      `[ERROR] Order failed for ${instrument}. Retrying... (${errorNumber})`
    );
    setTimeout(() => createOrder(direction, price, units, instrument), timeout);
    throw error;
  }
}

// === Position Sizing ===
async function calculateUnits(balance) {
  const riskPerTrade = (RISK_PERCENT / 100) * balance;
  const stopLoss = pipToPrice(STOP_LOSS_PIPS);
  const units = riskPerTrade / stopLoss;
  return Math.min(units, 80000); // Cap at 80000 units
}

// === Strategy ===
async function runStrategy(instrument) {
  try {
    // Reset daily stats if it's a new day
    const today = new Date().toDateString();
    if (dailyStats.lastReset !== today) {
      dailyStats = {
        trades: 0,
        wins: 0,
        losses: 0,
        profit: 0,
        lastReset: today,
      };
    }

    // Check daily trade limits
    if (dailyStats.trades >= MAX_DAILY_TRADES) {
      window.addMarketLog(
        `[LIMIT] Daily trade limit reached for ${instrument}`
      );
      return;
    }

    // Check open positions
    const openTrades = await getOpenTrades();
    if (openTrades.length >= MAX_OPEN_POSITIONS) {
      window.addMarketLog(`[LIMIT] Maximum open positions reached`);
      return;
    }

    // Check trade cooldown
    if (!canTrade(instrument)) {
      window.addMarketLog(`[COOLDOWN] ${instrument} is in cooldown period`);
      return;
    }

    let prices;
    try {
      prices = await getCandles(instrument);
    } catch (error) {
      window.addMarketLog(
        `[ERROR] Failed to get candles for ${instrument}: ${error.message}`,
        "error"
      );
      return;
    }

    // Calculate indicators
    const shortMA = SMA.calculate({ period: 5, values: prices });
    const longMA = SMA.calculate({ period: 20, values: prices });
    const rsi = RSI.calculate({ period: 14, values: prices });
    const macd = MACD.calculate({
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      values: prices,
    });
    const bb = BollingerBands.calculate({
      period: 20,
      values: prices,
      stdDev: 2,
    });

    // Validate indicator calculations
    if (
      !shortMA.length ||
      !longMA.length ||
      !rsi.length ||
      !macd.length ||
      !bb.length
    ) {
      window.addMarketLog(
        `[ERROR] Invalid indicator calculations for ${instrument}`,
        "error"
      );
      return;
    }

    const curr = prices.length - 1;
    const prev = curr - 1;

    // Calculate trend strength
    const trendStrength = Math.abs(shortMA[curr] - longMA[curr]);
    const rsiDiff = Math.abs(rsi[curr] - rsi[prev]);
    const maDiff = Math.abs(shortMA[curr] - longMA[curr]);

    // Enhanced buy signal
    if (
      shortMA[curr] > longMA[curr] && // MA crossover
      rsi[curr] < 30 && // Oversold
      rsiDiff > MIN_RSI_DIFF && // RSI momentum
      maDiff > MIN_MA_DIFF && // Strong MA crossover
      trendStrength > TREND_STRENGTH_THRESHOLD && // Trend confirmation
      macd[curr].MACD > macd[curr].signal && // MACD crossover
      prices[curr] < bb[curr].lower
    ) {
      // Price below lower BB

      window.addMarketLog(
        `[BUY] ${instrument} - Price: ${prices[curr].toFixed(5)} | RSI: ${rsi[
          curr
        ].toFixed(2)} | MACD: ${macd[curr].MACD.toFixed(5)} | BB: ${bb[
          curr
        ].lower.toFixed(5)}`
      );

      const balance = await getAccountDetails();
      const units = await calculateUnits(balance);
      if (units > 0) {
        await createOrder("buy", prices[curr], units, instrument);
        dailyStats.trades++;
      }
    }

    // Enhanced sell signal
    if (
      shortMA[curr] < longMA[curr] && // MA crossover
      rsi[curr] > 70 && // Overbought
      rsiDiff > MIN_RSI_DIFF && // RSI momentum
      maDiff > MIN_MA_DIFF && // Strong MA crossover
      trendStrength > TREND_STRENGTH_THRESHOLD && // Trend confirmation
      macd[curr].MACD < macd[curr].signal && // MACD crossover
      prices[curr] > bb[curr].upper
    ) {
      // Price above upper BB

      window.addMarketLog(
        `[SELL] ${instrument} - Price: ${prices[curr].toFixed(5)} | RSI: ${rsi[
          curr
        ].toFixed(2)} | MACD: ${macd[curr].MACD.toFixed(5)} | BB: ${bb[
          curr
        ].upper.toFixed(5)}`
      );

      const balance = await getAccountDetails();
      const units = await calculateUnits(balance);
      if (units > 0) {
        await createOrder("sell", prices[curr], units, instrument);
        dailyStats.trades++;
      }
    }
  } catch (error) {
    window.addMarketLog(
      `[ERROR] Strategy error for ${instrument}: ${error.message}`,
      "error"
    );
    const timeout = error?.status === 429 ? 10000 : 2000;
    setTimeout(() => runStrategy(instrument), timeout);
  }
}

async function getCurrentPrice(instrument) {
  try {
    const response = await fetch(
      `${BASE_URL}/accounts/${ACCOUNT_ID}/pricing?instruments=${instrument}`,
      {
        headers,
      }
    );
    const data = await response.json();
    const bid = parseFloat(data.prices[0].bids[0].price);
    const ask = parseFloat(data.prices[0].asks[0].price);
    return (bid + ask) / 2;
  } catch (error) {
    window.addMarketLog(
      `[PRICE ERROR] ${instrument}: ${error.message}`,
      "error"
    );
    return 0;
  }
}

async function closeTrade(tradeID) {
  try {
    const response = await fetch(
      `${BASE_URL}/accounts/${ACCOUNT_ID}/trades/${tradeID}/close`,
      {
        method: "PUT",
        headers,
      }
    );
    const data = await response.json();
    window.addMarketLog(`✅ Trade ${tradeID} closed.`);
    return data;
  } catch (error) {
    window.addMarketLog(
      `❌ Error closing trade ${tradeID}: ${error.message}`,
      "error"
    );
    throw error;
  }
}

async function checkAndCloseProfitableTrades() {
  try {
    const trades = await getOpenTrades();
    const balance = await getAccountDetails();

    for (const trade of trades) {
      const pl = Number(trade.unrealizedPL);
      const entry = Number(trade.price);
      const current = await getCurrentPrice(trade.instrument);
      const units = Math.abs(Number(trade.currentUnits));
      const value = entry * units;
      const profitPct = (pl / value) * 100;

      // Dynamic profit taking based on market conditions
      const profitTarget = dailyStats.wins > dailyStats.losses ? 0.015 : 0.02;
      const stopLoss = -0.01; // Tighter stop loss

      if (profitPct >= profitTarget) {
        window.addMarketLog(
          `✅ ${trade.instrument} Profit ${profitPct.toFixed(
            4
          )}% — Closing trade ${trade.id}`
        );
        await closeTrade(trade.id);
        dailyStats.wins++;
        dailyStats.profit += pl;
      } else if (profitPct <= stopLoss) {
        window.addMarketLog(
          `⏳ ${trade.instrument} Profit ${profitPct.toFixed(4)}% — Waiting...`
        );
        await closeTrade(trade.id);
        dailyStats.losses++;
        dailyStats.profit += pl;
      }
    }
  } catch (error) {
    window.addMarketLog(
      `[ERROR] Error checking profitable trades: ${error.message}`,
      "error"
    );
  }
}

let botInterval;

export function startBot() {
  if (botInterval) {
    clearInterval(botInterval);
  }

  botInterval = setInterval(async () => {
    try {
      // Run strategy for each instrument
      for (const instrument of INSTRUMENTS) {
        await runStrategy(instrument);
      }

      // Check and close profitable trades
      await checkAndCloseProfitableTrades();
    } catch (error) {
      window.addMarketLog(`Error in bot execution: ${error.message}`, "error");
    }
  }, 30000); // Run every 30 seconds

  return { status: "running" };
}

export function stopBot() {
  if (botInterval) {
    clearInterval(botInterval);
    botInterval = null;
  }
  return { status: "stopped" };
}

export function getBotState() {
  return {
    status: botInterval ? "running" : "stopped",
    instruments: INSTRUMENTS,
    config: {
      stopLossPips: STOP_LOSS_PIPS,
      takeProfitPips: TAKE_PROFIT_PIPS,
      riskPercent: RISK_PERCENT,
      maxDailyTrades: MAX_DAILY_TRADES,
      maxOpenPositions: MAX_OPEN_POSITIONS,
    },
    dailyStats,
  };
}

export function getBotConfig() {
  return {
    strategies: {
      ma_crossover: {
        name: "Enhanced MA Crossover with RSI",
        enabled: true,
        parameters: {
          shortPeriod: 5,
          longPeriod: 20,
          rsiPeriod: 14,
          rsiOverbought: 70,
          rsiOversold: 30,
          minRSIDiff: MIN_RSI_DIFF,
          minMADiff: MIN_MA_DIFF,
          trendStrengthThreshold: TREND_STRENGTH_THRESHOLD,
        },
      },
    },
  };
}

export function updateStrategyConfig(strategyId, updates) {
  const config = getBotConfig();
  if (config.strategies[strategyId]) {
    config.strategies[strategyId] = {
      ...config.strategies[strategyId],
      ...updates,
    };
  }
  return config;
}

export async function monitorPositions() {
  try {
    const trades = await getOpenTrades();
    return { positions: trades };
  } catch (error) {
    window.addMarketLog(
      `Error monitoring positions: ${error.message}`,
      "error"
    );
    return { positions: [] };
  }
}

export async function analyzeMarket(candles, instrument) {
  try {
    const prices = candles.map((c) => parseFloat(c.mid.c));
    const shortMA = SMA.calculate({ period: 5, values: prices });
    const longMA = SMA.calculate({ period: 20, values: prices });
    const rsi = RSI.calculate({ period: 14, values: prices });
    const macd = MACD.calculate({
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      values: prices,
    });
    const bb = BollingerBands.calculate({
      period: 20,
      values: prices,
      stdDev: 2,
    });

    const curr = prices.length - 1;
    const prev = curr - 1;

    const signals = {
      ma_crossover: null,
    };

    // Calculate trend strength
    const trendStrength = Math.abs(shortMA[curr] - longMA[curr]);
    const rsiDiff = Math.abs(rsi[curr] - rsi[prev]);
    const maDiff = Math.abs(shortMA[curr] - longMA[curr]);

    // BUY SIGNAL
    if (
      shortMA[curr] > longMA[curr] && // MA crossover
      rsi[curr] < 30 && // Oversold
      rsiDiff > MIN_RSI_DIFF && // RSI momentum
      maDiff > MIN_MA_DIFF && // Strong MA crossover
      trendStrength > TREND_STRENGTH_THRESHOLD && // Trend confirmation
      macd[curr].MACD > macd[curr].signal && // MACD crossover
      prices[curr] < bb[curr].lower
    ) {
      // Price below lower BB

      signals.ma_crossover = {
        direction: "buy",
        strength: trendStrength,
        rsi: rsi[curr],
        macd: macd[curr].MACD,
        bb: bb[curr].lower,
      };
    }
    // SELL SIGNAL
    else if (
      shortMA[curr] < longMA[curr] && // MA crossover
      rsi[curr] > 70 && // Overbought
      rsiDiff > MIN_RSI_DIFF && // RSI momentum
      maDiff > MIN_MA_DIFF && // Strong MA crossover
      trendStrength > TREND_STRENGTH_THRESHOLD && // Trend confirmation
      macd[curr].MACD < macd[curr].signal && // MACD crossover
      prices[curr] > bb[curr].upper
    ) {
      // Price above upper BB

      signals.ma_crossover = {
        direction: "sell",
        strength: trendStrength,
        rsi: rsi[curr],
        macd: macd[curr].MACD,
        bb: bb[curr].upper,
      };
    }

    return { signals };
  } catch (error) {
    window.addMarketLog(
      `Error analyzing market for ${instrument}: ${error.message}`,
      "error"
    );
    return { signals: {} };
  }
}

export async function executeTrade(strategyId, instrument, direction, units) {
  try {
    const currentPrice = await getCurrentPrice(instrument);
    return await createOrder(direction, currentPrice, units, instrument);
  } catch (error) {
    window.addMarketLog(`Error executing trade: ${error.message}`, "error");
    throw error;
  }
}

export async function closePosition(positionId) {
  try {
    return await closeTrade(positionId);
  } catch (error) {
    window.addMarketLog(`Error closing position: ${error.message}`, "error");
    throw error;
  }
}
