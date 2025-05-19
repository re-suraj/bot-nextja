import { SMA, RSI, MACD, BollingerBands } from "technicalindicators";
import { OANDA_API_KEY, OANDA_ACCOUNT_ID, OANDA_API_URL } from "../config/env";
import { INSTRUMENTS, TRADING_PARAMS } from "../config/instruments";
import { NYSessionStrategy } from "./strategies/nySessionStrategy";

const {
  STOP_LOSS_PIPS,
  TAKE_PROFIT_PIPS,
  RISK_PERCENT,
  MIN_RSI_DIFF,
  MIN_MA_DIFF,
  TREND_STRENGTH_THRESHOLD,
  MAX_DAILY_TRADES,
  MAX_OPEN_POSITIONS,
} = TRADING_PARAMS;

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
  Authorization: `Bearer ${OANDA_API_KEY}`,
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
      `${OANDA_API_URL}/instruments/${instrument}/candles?granularity=M5&count=100&price=M`,
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
    const response = await fetch(`${OANDA_API_URL}/accounts`, {
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
    const response = await fetch("/api/oanda/trades/open");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.trades;
  } catch (error) {
    console.error(`[TRADES ERROR] Retrying...`);
    setTimeout(() => getOpenTrades(), 2000);
    throw error;
  }
}

async function createOrder(direction, price, units, instrument, tradeParams) {
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

    const response = await fetch(
      `${OANDA_API_URL}/accounts/${OANDA_ACCOUNT_ID}/orders`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(order),
      }
    );

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
    setTimeout(() => createOrder(direction, price, units, instrument, tradeParams), timeout);
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

// Initialize NY Session Strategy
const nyStrategy = new NYSessionStrategy();

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

    // Calculate indicators using NY Session Strategy
    const indicators = nyStrategy.calculateIndicators(prices);
    const curr = prices.length - 1;

    // Check for long entry
    if (nyStrategy.shouldEnterLong(indicators, curr)) {
      const entryPrice = prices[curr];
      const tradeParams = nyStrategy.getTradeParameters(entryPrice, "long", indicators.atr);
      
      window.addMarketLog(
        `[BUY] ${instrument} - Price: ${entryPrice.toFixed(5)} | RSI: ${indicators.rsi[curr].toFixed(2)} | ADX: ${indicators.adx[curr].toFixed(2)}`
      );

      const balance = await getAccountDetails();
      const units = await calculateUnits(balance);
      if (units > 0) {
        await createOrder("buy", entryPrice, units, instrument, {
          stopLoss: tradeParams.stopLoss,
          takeProfit: tradeParams.takeProfit
        });
        dailyStats.trades++;
      }
    }

    // Check for short entry
    if (nyStrategy.shouldEnterShort(indicators, curr)) {
      const entryPrice = prices[curr];
      const tradeParams = nyStrategy.getTradeParameters(entryPrice, "short", indicators.atr);
      
      window.addMarketLog(
        `[SELL] ${instrument} - Price: ${entryPrice.toFixed(5)} | RSI: ${indicators.rsi[curr].toFixed(2)} | ADX: ${indicators.adx[curr].toFixed(2)}`
      );

      const balance = await getAccountDetails();
      const units = await calculateUnits(balance);
      if (units > 0) {
        await createOrder("sell", entryPrice, units, instrument, {
          stopLoss: tradeParams.stopLoss,
          takeProfit: tradeParams.takeProfit
        });
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
      `${OANDA_API_URL}/accounts/${OANDA_ACCOUNT_ID}/pricing?instruments=${instrument}`,
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
      `${OANDA_API_URL}/accounts/${OANDA_ACCOUNT_ID}/trades/${tradeID}/close`,
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

      // Get current market conditions
      const candles = await getCandles(trade.instrument);
      const indicators = nyStrategy.calculateIndicators(candles);
      const curr = candles.length - 1;
      const atr = indicators.atr[curr];
      const adx = indicators.adx[curr];

      // Dynamic profit targets based on market conditions
      let profitTarget, stopLoss;
      
      if (adx > 30) { // Strong trend
        profitTarget = 0.03; // 3% target in strong trends
        stopLoss = -0.01; // Tighter stop in strong trends
      } else if (adx > 20) { // Moderate trend
        profitTarget = 0.02; // 2% target in moderate trends
        stopLoss = -0.015; // Standard stop
      } else { // Weak trend
        profitTarget = 0.015; // 1.5% target in weak trends
        stopLoss = -0.02; // Wider stop in weak trends
      }

      // Trailing stop logic
      const trailingStopDistance = atr * 1.5; // 1.5x ATR for trailing stop
      const isLong = Number(trade.currentUnits) > 0;
      
      // Calculate trailing stop level
      const trailingStopLevel = isLong 
        ? current - trailingStopDistance
        : current + trailingStopDistance;

      // Check if we should move stop loss to break even
      const breakEvenThreshold = profitTarget * 0.5; // Move to break even at 50% of target
      if (profitPct >= breakEvenThreshold && profitPct < profitTarget) {
        // Move stop loss to break even
        const newStopLoss = entry;
        await updateStopLoss(trade.id, newStopLoss);
        window.addMarketLog(
          `🔄 ${trade.instrument} Moved stop loss to break even at ${newStopLoss.toFixed(5)}`
        );
      }

      // Check if we should trail the stop
      if (profitPct >= profitTarget * 0.7) { // Start trailing at 70% of target
        const currentStop = Number(trade.stopLossOrder?.price || 0);
        if (isLong && trailingStopLevel > currentStop) {
          await updateStopLoss(trade.id, trailingStopLevel);
          window.addMarketLog(
            `🔄 ${trade.instrument} Trailing stop updated to ${trailingStopLevel.toFixed(5)}`
          );
        } else if (!isLong && trailingStopLevel < currentStop) {
          await updateStopLoss(trade.id, trailingStopLevel);
          window.addMarketLog(
            `🔄 ${trade.instrument} Trailing stop updated to ${trailingStopLevel.toFixed(5)}`
          );
        }
      }

      // Take profit or stop loss
      if (profitPct >= profitTarget) {
        window.addMarketLog(
          `✅ ${trade.instrument} Profit ${profitPct.toFixed(4)}% — Closing trade ${trade.id}`
        );
        await closeTrade(trade.id);
        dailyStats.wins++;
        dailyStats.profit += pl;
      } else if (profitPct <= stopLoss) {
        window.addMarketLog(
          `❌ ${trade.instrument} Loss ${profitPct.toFixed(4)}% — Closing trade ${trade.id}`
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

// Add new function to update stop loss
async function updateStopLoss(tradeId, newStopLoss) {
  try {
    const response = await fetch(
      `${OANDA_API_URL}/accounts/${OANDA_ACCOUNT_ID}/trades/${tradeId}/orders`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          stopLoss: {
            price: newStopLoss.toFixed(5),
            timeInForce: "GTC"
          }
        })
      }
    );
    return await response.json();
  } catch (error) {
    window.addMarketLog(
      `[ERROR] Failed to update stop loss: ${error.message}`,
      "error"
    );
    throw error;
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
