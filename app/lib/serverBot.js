import { SMA, RSI, EMA, ADX, ATR } from "technicalindicators";
import { OANDA_API_KEY, OANDA_ACCOUNT_ID, OANDA_API_URL } from "../config/env";
import { INSTRUMENTS, TRADING_PARAMS } from "../config/instruments";
import { NYSessionStrategy } from "./strategies/nySessionStrategy";

const { STOP_LOSS_PIPS, TAKE_PROFIT_PIPS, RISK_PERCENT } = TRADING_PARAMS;

// Bot state
let botInterval = null;
let dailyStats = {
  trades: 0,
  wins: 0,
  losses: 0,
  profit: 0,
  lastReset: new Date().toDateString(),
  currentBalance: 0,
  peakBalance: 0,
  maxDrawdown: 0,
};

// Log management
let logSubscribers = new Set();

// Initialize NY Session Strategy
const nyStrategy = new NYSessionStrategy();

// Profit management settings
const PROFIT_MANAGEMENT = {
  // Break-even settings
  BREAK_EVEN_THRESHOLD: 0.5, // Move to break-even at 50% of target

  // Trailing stop settings
  TRAILING_START: 0.7, // Start trailing at 70% of target
  TRAILING_ATR_MULTIPLIER: 1.5, // 1.5x ATR for trailing stop

  // Profit targets based on ADX
  STRONG_TREND: {
    ADX_THRESHOLD: 30,
    PROFIT_TARGET: 0.03, // 3%
    STOP_LOSS: 0.01, // 1%
  },
  MODERATE_TREND: {
    ADX_THRESHOLD: 20,
    PROFIT_TARGET: 0.02, // 2%
    STOP_LOSS: 0.015, // 1.5%
  },
  WEAK_TREND: {
    PROFIT_TARGET: 0.015, // 1.5%
    STOP_LOSS: 0.02, // 2%
  },
};

// Track trade performance
let tradeStats = {
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  totalProfit: 0,
  averageProfit: 0,
  maxDrawdown: 0,
  currentDrawdown: 0,
  peakBalance: 0,
};

// Strategy parameters
const STRATEGY_PARAMS = {
  // EMA periods
  fastEMA: 9,
  slowEMA: 21,

  // RSI settings
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,

  // ADX settings
  adxPeriod: 14,
  adxThreshold: 25, // Minimum ADX for trend confirmation

  // ATR settings
  atrPeriod: 14,
  atrMultiplier: 1.5, // For stop loss and take profit

  // Risk management
  riskRewardRatio: 2, // 1:2 risk-reward
  maxSpread: 0.0003, // 3 pips maximum spread
};

// Enhanced logging function
function emitLog(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}`;

  // Console logging for terminal visibility
  switch (type) {
    case "error":
      console.error(`\x1b[31m${logMessage}\x1b[0m`); // Red
      break;
    case "success":
      console.log(`\x1b[32m${logMessage}\x1b[0m`); // Green
      break;
    case "warning":
      console.warn(`\x1b[33m${logMessage}\x1b[0m`); // Yellow
      break;
    default:
      console.log(`\x1b[36m${logMessage}\x1b[0m`); // Cyan
  }

  // Store log for subscribers
  const log = {
    timestamp,
    message,
    type,
  };
  logSubscribers.forEach((callback) => callback(log));
}

// Consolidated API configuration
const API_CONFIG = {
  key: OANDA_API_KEY,
  accountId: OANDA_ACCOUNT_ID,
  baseUrl: OANDA_API_URL,
  headers: {
    Authorization: `Bearer ${OANDA_API_KEY}`,
    "Content-Type": "application/json",
  },
};

// Consolidated helper functions
const helpers = {
  pipToPrice: (pips) => pips * 0.0001,

  async getCurrentPrice(instrument) {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/v3/accounts/${API_CONFIG.accountId}/pricing?instruments=${instrument}`,
        { headers: API_CONFIG.headers }
      );
      const data = await response.json();
      return {
        bid: parseFloat(data.prices[0].bids[0].price),
        ask: parseFloat(data.prices[0].asks[0].price),
        spread:
          parseFloat(data.prices[0].asks[0].price) -
          parseFloat(data.prices[0].bids[0].price),
      };
    } catch (error) {
      console.error(`[PRICE ERROR] ${instrument}: ${error.message}`);
      throw error;
    }
  },

  async getCandles(instrument) {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/v3/instruments/${instrument}/candles?count=100&granularity=M5&price=M`,
        { headers: API_CONFIG.headers }
      );
      const data = await response.json();
      return data.candles
        .filter((c) => c.complete)
        .map((c) => parseFloat(c.mid.c));
    } catch (error) {
      console.error(`[CANDLE ERROR] ${instrument}: ${error.message}`);
      throw error;
    }
  },

  async getAccountDetails() {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/v3/accounts/${API_CONFIG.accountId}`,
        { headers: API_CONFIG.headers }
      );
      const data = await response.json();
      return parseFloat(data.account.balance);
    } catch (error) {
      console.error(`[ACCOUNT ERROR]: ${error.message}`);
      throw error;
    }
  },

  async getOpenTrades() {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/v3/accounts/${API_CONFIG.accountId}/openTrades`,
        { headers: API_CONFIG.headers }
      );
      const data = await response.json();
      return data.trades;
    } catch (error) {
      console.error(`[TRADES ERROR]: ${error.message}`);
      throw error;
    }
  },

  async calculateUnits(balance) {
    const riskPerTrade = (RISK_PERCENT / 100) * balance;
    const pipValue = 0.0001;
    const stopLoss = this.pipToPrice(STOP_LOSS_PIPS);
    const units = riskPerTrade / stopLoss;
    return Math.min(Math.max(Math.floor(units / 100) * 100, 100), 1000);
  },

  async updateStopLoss(tradeId, newStopLoss) {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/v3/accounts/${API_CONFIG.accountId}/trades/${tradeId}/orders`,
        {
          method: "PUT",
          headers: API_CONFIG.headers,
          body: JSON.stringify({
            stopLoss: {
              price: newStopLoss.toFixed(5),
              timeInForce: "GTC",
            },
          }),
        }
      );
      return await response.json();
    } catch (error) {
      console.error(`[STOP LOSS ERROR]: ${error.message}`);
      throw error;
    }
  },

  async closeTrade(tradeId) {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/v3/accounts/${API_CONFIG.accountId}/trades/${tradeId}/close`,
        {
          method: "PUT",
          headers: API_CONFIG.headers,
        }
      );
      return await response.json();
    } catch (error) {
      console.error(`[CLOSE TRADE ERROR]: ${error.message}`);
      throw error;
    }
  },

  updateTradeStats(pl) {
    tradeStats.totalTrades++;
    tradeStats.totalProfit += pl;

    if (pl > 0) {
      tradeStats.winningTrades++;
    } else {
      tradeStats.losingTrades++;
    }

    tradeStats.averageProfit = tradeStats.totalProfit / tradeStats.totalTrades;

    // Update drawdown tracking
    const currentBalance = tradeStats.peakBalance + tradeStats.totalProfit;
    if (currentBalance > tradeStats.peakBalance) {
      tradeStats.peakBalance = currentBalance;
    }

    const currentDrawdown =
      (tradeStats.peakBalance - currentBalance) / tradeStats.peakBalance;
    tradeStats.currentDrawdown = currentDrawdown;
    tradeStats.maxDrawdown = Math.max(tradeStats.maxDrawdown, currentDrawdown);
  },
};

// Consolidated trading functions
const trading = {
  async createOrder(direction, price, units, instrument, tradeParams = {}) {
    try {
      console.log(`\n\x1b[35m=== Creating Order for ${instrument} ===\x1b[0m`);
      console.log(
        `\x1b[36mDirection: ${direction} | Price: ${price} | Units: ${units}\x1b[0m`
      );

      // Get current market prices with spread
      const currentPrice = await helpers.getCurrentPrice(instrument);
      console.log(
        `\x1b[36mCurrent Market - Bid: ${currentPrice.bid} | Ask: ${currentPrice.ask} | Spread: ${currentPrice.spread}\x1b[0m`
      );

      // Check if spread is too wide
      if (currentPrice.spread > STRATEGY_PARAMS.maxSpread) {
        console.log(
          `\x1b[31mSpread too wide: ${currentPrice.spread} (max: ${STRATEGY_PARAMS.maxSpread})\x1b[0m`
        );
        return null;
      }

      // Ensure units are valid and within limits
      if (units < 100 || units > 1000) {
        console.log(
          `\x1b[31mInvalid units: ${units} (must be between 100 and 1000)\x1b[0m`
        );
        return null;
      }

      // Round units to nearest 100
      units = Math.floor(units / 100) * 100;
      console.log(`\x1b[36mFinal units after rounding: ${units}\x1b[0m`);

      // Use provided stop loss and take profit if available
      const stopLossPrice =
        tradeParams.stopLoss ||
        (direction === "buy"
          ? (currentPrice.ask - STRATEGY_PARAMS.atrMultiplier * 0.0001).toFixed(
              5
            )
          : (currentPrice.ask + STRATEGY_PARAMS.atrMultiplier * 0.0001).toFixed(
              5
            ));

      const takeProfitPrice =
        tradeParams.takeProfit ||
        (direction === "buy"
          ? (
              currentPrice.ask +
              STRATEGY_PARAMS.atrMultiplier *
                STRATEGY_PARAMS.riskRewardRatio *
                0.0001
            ).toFixed(5)
          : (
              currentPrice.ask -
              STRATEGY_PARAMS.atrMultiplier *
                STRATEGY_PARAMS.riskRewardRatio *
                0.0001
            ).toFixed(5));

      console.log(`\x1b[36mExecution Price: ${currentPrice.ask}\x1b[0m`);
      console.log(`\x1b[36mStop Loss: ${stopLossPrice}\x1b[0m`);
      console.log(`\x1b[36mTake Profit: ${takeProfitPrice}\x1b[0m`);

      // Create order with dynamic stops
      const order = {
        order: {
          instrument: instrument,
          units: direction === "buy" ? units.toString() : (-units).toString(),
          type: "MARKET",
          positionFill: "DEFAULT",
          price: currentPrice.ask.toString(),
          stopLossOnFill: {
            price: stopLossPrice,
            timeInForce: "GTC",
            guaranteed: false,
          },
          takeProfitOnFill: {
            price: takeProfitPrice,
            timeInForce: "GTC",
          },
          clientExtensions: {
            id: `order_${Date.now()}`,
            comment: `${direction.toUpperCase()}_${instrument}`,
            tag: "bot_trade",
          },
        },
      };

      console.log(
        `\x1b[36mSending order to OANDA:\x1b[0m`,
        JSON.stringify(order, null, 2)
      );

      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;

      while (retryCount < maxRetries) {
        try {
          const response = await fetch(
            `${API_CONFIG.baseUrl}/v3/accounts/${API_CONFIG.accountId}/orders`,
            {
              method: "POST",
              headers: API_CONFIG.headers,
              body: JSON.stringify(order),
            }
          );

          const responseData = await response.json();
          console.log(
            `\x1b[36mOANDA Response Status: ${response.status}\x1b[0m`
          );

          if (!response.ok) {
            lastError = responseData;
            console.error(
              `\x1b[31mOrder Failed: ${JSON.stringify(responseData)}\x1b[0m`
            );

            if (responseData.errorMessage) {
              if (
                responseData.errorMessage.includes("spread") ||
                responseData.errorMessage.includes("price") ||
                responseData.errorMessage.includes("rejected")
              ) {
                retryCount++;
                await new Promise((resolve) => setTimeout(resolve, 2000));
                continue;
              }
            }

            throw new Error(responseData.errorMessage || "Unknown error");
          }

          console.log(`\x1b[32mOrder placed successfully!\x1b[0m`);
          console.log(
            `\x1b[32mOrder Details: ${JSON.stringify(
              responseData,
              null,
              2
            )}\x1b[0m`
          );
          return responseData;
        } catch (error) {
          lastError = error;
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      throw new Error(
        `Order failed after ${maxRetries} retries: ${
          lastError?.message || "Unknown error"
        }`
      );
    } catch (error) {
      emitLog(`[ORDER ERROR]: ${error.message}`, "error");
      throw error;
    }
  },

  async closeTrade(tradeId) {
    try {
      // First verify the trade still exists and is open
      const trades = await helpers.getOpenTrades();
      const trade = trades.find((t) => t.id === tradeId && t.state === "OPEN");

      if (!trade) {
        emitLog(
          `[INFO] Trade ${tradeId} is not open or already closed`,
          "info"
        );
        return null;
      }

      // Log trade details before closing
      emitLog(
        `[CLOSING] Trade ${tradeId} - ${trade.instrument} | Units: ${trade.currentUnits} | P/L: ${trade.unrealizedPL}`,
        "info"
      );

      const response = await fetch(
        `${API_CONFIG.baseUrl}/v3/accounts/${API_CONFIG.accountId}/trades/${tradeId}/close`,
        {
          method: "PUT",
          headers: API_CONFIG.headers,
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (responseData.errorMessage?.includes("does not exist")) {
          emitLog(`[INFO] Trade ${tradeId} already closed`, "info");
          return null;
        }
        throw new Error(responseData.errorMessage || "Failed to close trade");
      }

      emitLog(`[CLOSE] Trade ${tradeId} closed successfully`, "success");
      return responseData;
    } catch (error) {
      // Handle specific error cases
      if (error.message?.includes("does not exist")) {
        emitLog(`[INFO] Trade ${tradeId} already closed`, "info");
        return null;
      }
      emitLog(`[CLOSE TRADE ERROR]: ${error.message}`, "error");
      return null; // Return null instead of throwing to prevent cascading errors
    }
  },
};

// Helper function to check if current time is within NY session

// Main strategy function
async function runStrategy(instrument) {
  try {
    // Get OHLC data first
    const ohlcResponse = await fetch(
      `${API_CONFIG.baseUrl}/v3/instruments/${instrument}/candles?count=800&granularity=M5&price=M`,
      { headers: API_CONFIG.headers }
    );

    if (!ohlcResponse.ok) {
      throw new Error(`Failed to fetch OHLC data: ${ohlcResponse.statusText}`);
    }

    const ohlcData = await ohlcResponse.json();
    if (!ohlcData.candles || ohlcData.candles.length === 0) {
      emitLog(`[SKIP] No OHLC data available for ${instrument}`, "warning");
      return;
    }

    // Process OHLC data
    const ohlc = ohlcData.candles
      .filter((c) => c.complete)
      .map((c) => ({
        high: parseFloat(c.mid.h),
        low: parseFloat(c.mid.l),
        close: parseFloat(c.mid.c),
        open: parseFloat(c.mid.o),
      }));

    if (ohlc.length < 50) {
      emitLog(
        `[SKIP] ${ohlc.length} Not enough OHLC data for ${instrument}`,
        "warning"
      );
      return;
    }

    // Extract close prices for other indicators
    const prices = ohlc.map((c) => c.close);

    // Calculate indicators with error handling
    let fastEMA, slowEMA, rsi, adx, atr;
    try {
      // Calculate EMAs
      fastEMA = EMA.calculate({
        period: STRATEGY_PARAMS.fastEMA,
        values: prices,
      });
      emitLog(
        `[DEBUG] ${instrument} - Fast EMA length: ${fastEMA.length}`,
        "info"
      );

      slowEMA = EMA.calculate({
        period: STRATEGY_PARAMS.slowEMA,
        values: prices,
      });
      emitLog(
        `[DEBUG] ${instrument} - Slow EMA length: ${slowEMA.length}`,
        "info"
      );

      // Calculate RSI
      rsi = RSI.calculate({
        period: STRATEGY_PARAMS.rsiPeriod,
        values: prices,
      });
      emitLog(`[DEBUG] ${instrument} - RSI length: ${rsi.length}`, "info");

      // Calculate ADX
      const high = ohlc.map((c) => c.high);
      const low = ohlc.map((c) => c.low);
      const close = ohlc.map((c) => c.close);

      adx = ADX.calculate({
        high: high,
        low: low,
        close: close,
        period: STRATEGY_PARAMS.adxPeriod,
      });
      emitLog(`[DEBUG] ${instrument} - ADX length: ${adx.length}`, "info");

      // Calculate ATR
      atr = ATR.calculate({
        high: high,
        low: low,
        close: close,
        period: STRATEGY_PARAMS.atrPeriod,
      });
      emitLog(`[DEBUG] ${instrument} - ATR length: ${atr.length}`, "info");

      // Validate indicator calculations
      if (!fastEMA || !slowEMA || !rsi || !adx || !atr) {
        throw new Error("One or more indicators failed to calculate");
      }

      // Ensure we have enough data points
      if (
        fastEMA.length < 2 ||
        slowEMA.length < 2 ||
        rsi.length < 2 ||
        adx.length < 1 ||
        atr.length < 1
      ) {
        throw new Error(
          `Insufficient data points - Fast EMA: ${fastEMA.length}, Slow EMA: ${slowEMA.length}, RSI: ${rsi.length}, ADX: ${adx.length}, ATR: ${atr.length}`
        );
      }
    } catch (error) {
      emitLog(`[INDICATOR ERROR] ${instrument}: ${error.message}`, "error");
      return;
    }

    // Get current values
    const currentPrice = await helpers.getCurrentPrice(instrument);
    const spread = currentPrice.spread;

    // Check spread
    if (spread > STRATEGY_PARAMS.maxSpread) {
      emitLog(
        `[SKIP] Spread too wide for ${instrument}: ${spread.toFixed(5)}`,
        "warning"
      );
      return;
    }

    // Get the latest values from each indicator
    const fastEMA_curr = fastEMA[fastEMA.length - 1];
    const fastEMA_prev = fastEMA[fastEMA.length - 2];
    const slowEMA_curr = slowEMA[slowEMA.length - 1];
    const slowEMA_prev = slowEMA[slowEMA.length - 2];
    const rsi_curr = rsi[rsi.length - 1];
    const adx_curr = adx[adx.length - 1].adx; // Extract ADX value from the object
    const atr_curr = atr[atr.length - 1];

    // Log indicator values for debugging
    emitLog(
      `[DEBUG] ${instrument} - Fast EMA: ${fastEMA_curr?.toFixed(
        5
      )} | Slow EMA: ${slowEMA_curr?.toFixed(5)} | RSI: ${rsi_curr?.toFixed(
        2
      )} | ADX: ${adx_curr?.toFixed(2)} | ATR: ${atr_curr?.toFixed(5)}`,
      "info"
    );

    // Validate indicator values
    if (
      typeof fastEMA_curr !== "number" ||
      typeof fastEMA_prev !== "number" ||
      typeof slowEMA_curr !== "number" ||
      typeof slowEMA_prev !== "number" ||
      typeof rsi_curr !== "number" ||
      typeof adx_curr !== "number" ||
      typeof atr_curr !== "number"
    ) {
      emitLog(
        `[INDICATOR ERROR] ${instrument}: Invalid indicator values - Fast EMA: ${typeof fastEMA_curr}, Slow EMA: ${typeof slowEMA_curr}, RSI: ${typeof rsi_curr}, ADX: ${typeof adx_curr}, ATR: ${typeof atr_curr}`,
        "error"
      );
      return;
    }

    // Check for existing trades
    const trades = await helpers.getOpenTrades();
    let existingTrade = trades.find(
      (trade) => trade.instrument === instrument && trade.state === "OPEN"
    );

    if (existingTrade) {
      emitLog(
        `[INFO] Trade already open for ${instrument}. Skipping...`,
        "info"
      );
      return;
    }

    // Calculate position size
    const balance = await helpers.getAccountDetails();
    let units = await helpers.calculateUnits(balance);

    // Log market conditions
    emitLog(
      `[MARKET] ${instrument} - RSI: ${rsi_curr.toFixed(
        2
      )} | ADX: ${adx_curr.toFixed(2)} | ATR: ${atr_curr.toFixed(
        5
      )} | Spread: ${spread.toFixed(5)}`,
      "info"
    );

    // Entry conditions
    const isStrongTrend = adx_curr > STRATEGY_PARAMS.adxThreshold;
    const isEMACrossover =
      fastEMA_prev < slowEMA_prev && fastEMA_curr > slowEMA_curr;
    const isRSIValid =
      rsi_curr > STRATEGY_PARAMS.rsiOversold &&
      rsi_curr < STRATEGY_PARAMS.rsiOverbought;

    // Calculate stop loss and take profit based on ATR
    const stopLossDistance = atr_curr * STRATEGY_PARAMS.atrMultiplier;
    const takeProfitDistance =
      stopLossDistance * STRATEGY_PARAMS.riskRewardRatio;

    if (isStrongTrend && isEMACrossover && isRSIValid) {
      emitLog(
        `[BUY SIGNAL] ${instrument} - RSI: ${rsi_curr.toFixed(
          2
        )} | ADX: ${adx_curr.toFixed(2)} | ATR: ${atr_curr.toFixed(5)}`,
        "success"
      );

      // Calculate stop loss and take profit prices
      const stopLossPrice = (currentPrice.ask - stopLossDistance).toFixed(5);
      const takeProfitPrice = (currentPrice.ask + takeProfitDistance).toFixed(
        5
      );

      // Create order with ATR-based stops
      await trading.createOrder("buy", currentPrice.ask, units, instrument, {
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice,
      });
    } else {
      emitLog(
        `[NO TRADE] ${instrument} - RSI: ${rsi_curr.toFixed(
          2
        )} | ADX: ${adx_curr.toFixed(2)} | ATR: ${atr_curr.toFixed(5)}`,
        "info"
      );
    }
  } catch (error) {
    emitLog(`[STRATEGY ERROR] ${instrument}: ${error.message}`, "error");
  }
}

// Profit checking function
async function checkAndCloseProfitableTrades() {
  try {
    const trades = await helpers.getOpenTrades();
    if (!trades || trades.length === 0) {
      return; // No trades to check
    }

    emitLog(`[PROFIT CHECK] Checking ${trades.length} open trades...`, "info");

    for (const trade of trades) {
      try {
        // Skip if trade is not open
        if (trade.state !== "OPEN") {
          emitLog(
            `[SKIP] Trade ${trade.id} is not open (state: ${trade.state})`,
            "info"
          );
          continue;
        }

        const pl = Number(trade.unrealizedPL);
        const price = Number(trade.price);
        const currentPrice = await helpers.getCurrentPrice(trade.instrument);
        const units = Math.abs(Number(trade.currentUnits));
        const direction = Number(trade.currentUnits) > 0 ? "buy" : "sell";

        const valuePerUnit = price;
        const positionValue = units * valuePerUnit;
        const profitPercent = (pl / positionValue) * 100;

        const priceMovement =
          direction === "buy"
            ? ((currentPrice.mid - price) / price) * 100
            : ((price - currentPrice.mid) / price) * 100;

        // More aggressive profit targets
        const quickProfit = 0.001; // 0.1% quick profit
        const mainProfit = 0.002; // 0.2% main profit
        const trailingStop = 0.001; // 0.1% trailing stop
        const stopLoss = -0.002; // -0.2% stop loss
        const retracement = 0.0005; // 0.05% retracement threshold

        emitLog(
          `[TRADE ${trade.id}] ${
            trade.instrument
          } - Direction: ${direction.toUpperCase()} | Units: ${units} | Entry: ${price} | Current: ${
            currentPrice.mid
          } | P/L: ${pl.toFixed(2)} (${profitPercent.toFixed(3)}%)`,
          "info"
        );

        let shouldClose = false;
        let closeReason = "";

        // Quick profit taking on small moves
        if (profitPercent >= quickProfit && priceMovement > 0) {
          shouldClose = true;
          closeReason = `[QUICK PROFIT] Taking quick profit at ${profitPercent.toFixed(
            3
          )}%`;
        }
        // Main profit target
        else if (profitPercent >= mainProfit) {
          shouldClose = true;
          closeReason = `[MAIN PROFIT] Taking main profit at ${profitPercent.toFixed(
            3
          )}%`;
        }
        // Trailing stop with profit retracement
        else if (
          (priceMovement > mainProfit && profitPercent < trailingStop) ||
          (profitPercent > quickProfit && priceMovement < -retracement)
        ) {
          shouldClose = true;
          closeReason = `[TRAILING STOP] Closing on retracement at ${profitPercent.toFixed(
            3
          )}%`;
        }
        // Stop loss
        else if (profitPercent <= stopLoss) {
          shouldClose = true;
          closeReason = `[STOP LOSS] Closing at loss of ${profitPercent.toFixed(
            3
          )}%`;
        }

        if (shouldClose) {
          emitLog(closeReason, "success");
          const result = await trading.closeTrade(trade.id);
          if (result) {
            emitLog(
              `[SUCCESS] Trade ${trade.id} closed successfully`,
              "success"
            );
          }
          continue;
        }

        // Log current status
        emitLog(
          `[HOLDING] ${
            trade.instrument
          } - Current profit: ${profitPercent.toFixed(
            3
          )}% | Movement: ${priceMovement.toFixed(3)}%`,
          "info"
        );
      } catch (tradeError) {
        emitLog(
          `[TRADE ERROR] ${trade.instrument}: ${tradeError.message}`,
          "error"
        );
        // Continue with next trade even if this one fails
        continue;
      }
    }
  } catch (error) {
    emitLog(`[PROFIT CHECK ERROR]: ${error.message}`, "error");
  }
}

// Main profit management function
async function manageProfits() {
  try {
    const trades = await helpers.getOpenTrades();
    const balance = await helpers.getAccountDetails();

    for (const trade of trades) {
      const pl = Number(trade.unrealizedPL);
      const entry = Number(trade.price);
      const current = await helpers.getCurrentPrice(trade.instrument);
      const units = Math.abs(Number(trade.currentUnits));
      const value = entry * units;
      const profitPct = (pl / value) * 100;

      // Get market conditions
      const candles = await helpers.getCandles(trade.instrument);
      const indicators = nyStrategy.calculateIndicators(candles);
      const curr = candles.length - 1;
      const atr = indicators.atr[curr];
      const adx = indicators.adx[curr];

      // Determine profit target and stop loss based on trend strength
      let profitTarget, stopLoss;
      if (adx > PROFIT_MANAGEMENT.STRONG_TREND.ADX_THRESHOLD) {
        profitTarget = PROFIT_MANAGEMENT.STRONG_TREND.PROFIT_TARGET;
        stopLoss = PROFIT_MANAGEMENT.STRONG_TREND.STOP_LOSS;
      } else if (adx > PROFIT_MANAGEMENT.MODERATE_TREND.ADX_THRESHOLD) {
        profitTarget = PROFIT_MANAGEMENT.MODERATE_TREND.PROFIT_TARGET;
        stopLoss = PROFIT_MANAGEMENT.MODERATE_TREND.STOP_LOSS;
      } else {
        profitTarget = PROFIT_MANAGEMENT.WEAK_TREND.PROFIT_TARGET;
        stopLoss = PROFIT_MANAGEMENT.WEAK_TREND.STOP_LOSS;
      }

      // Calculate trailing stop
      const trailingStopDistance =
        atr * PROFIT_MANAGEMENT.TRAILING_ATR_MULTIPLIER;
      const isLong = Number(trade.currentUnits) > 0;
      const trailingStopLevel = isLong
        ? current.bid - trailingStopDistance
        : current.ask + trailingStopDistance;

      // Break-even logic
      if (
        profitPct >= profitTarget * PROFIT_MANAGEMENT.BREAK_EVEN_THRESHOLD &&
        profitPct < profitTarget
      ) {
        await helpers.updateStopLoss(trade.id, entry);
        console.log(
          `[BREAK EVEN] ${trade.instrument} moved stop loss to entry price`
        );
      }

      // Trailing stop logic
      if (profitPct >= profitTarget * PROFIT_MANAGEMENT.TRAILING_START) {
        const currentStop = Number(trade.stopLossOrder?.price || 0);
        if (
          (isLong && trailingStopLevel > currentStop) ||
          (!isLong && trailingStopLevel < currentStop)
        ) {
          await helpers.updateStopLoss(trade.id, trailingStopLevel);
          console.log(
            `[TRAILING STOP] ${
              trade.instrument
            } updated to ${trailingStopLevel.toFixed(5)}`
          );
        }
      }

      // Take profit or stop loss
      if (profitPct >= profitTarget) {
        console.log(
          `[TAKE PROFIT] ${trade.instrument} at ${profitPct.toFixed(4)}%`
        );
        await trading.closeTrade(trade.id);
        helpers.updateTradeStats(pl);
      } else if (profitPct <= stopLoss) {
        console.log(
          `[STOP LOSS] ${trade.instrument} at ${profitPct.toFixed(4)}%`
        );
        await trading.closeTrade(trade.id);
        helpers.updateTradeStats(pl);
      }
    }

    // Log performance metrics
    console.log(`
      Performance Metrics:
      Total Trades: ${tradeStats.totalTrades}
      Win Rate: ${(
        (tradeStats.winningTrades / tradeStats.totalTrades) *
        100
      ).toFixed(2)}%
      Total Profit: ${tradeStats.totalProfit.toFixed(2)}
      Average Profit: ${tradeStats.averageProfit.toFixed(2)}
      Max Drawdown: ${(tradeStats.maxDrawdown * 100).toFixed(2)}%
      Current Drawdown: ${(tradeStats.currentDrawdown * 100).toFixed(2)}%
    `);
  } catch (error) {
    console.error(`[PROFIT MANAGEMENT ERROR]: ${error.message}`);
  }
}

// Bot control functions
export function startBot() {
  if (botInterval) {
    clearInterval(botInterval);
  }

  emitLog("Starting trading bot...", "info");

  // Strategy interval (30 seconds)
  botInterval = setInterval(async () => {
    try {
      for (const instrument of INSTRUMENTS) {
        await runStrategy(instrument);
      }
    } catch (error) {
      emitLog(`[BOT ERROR]: ${error.message}`, "error");
    }
  }, 30000);

  // Profit checking interval (5 seconds)
  setInterval(async () => {
    try {
      await checkAndCloseProfitableTrades();
    } catch (error) {
      emitLog(`[PROFIT CHECK ERROR]: ${error.message}`, "error");
    }
  }, 5000); // Reduced from 10 seconds to 5 seconds for faster profit taking

  return { status: "running" };
}

export function stopBot() {
  if (botInterval) {
    clearInterval(botInterval);
    botInterval = null;
    emitLog("Trading bot stopped", "warning");
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
    },
    dailyStats,
  };
}

// Log subscription management
export function subscribeToLogs(callback) {
  logSubscribers.add(callback);
  return () => logSubscribers.delete(callback);
}

// Add refresh function for account summary
async function refreshAccountSummary() {
  try {
    const balance = await helpers.getAccountDetails();
    const trades = await helpers.getOpenTrades();

    // Update daily stats
    if (dailyStats.currentBalance === 0) {
      dailyStats.currentBalance = balance;
      dailyStats.peakBalance = balance;
    }

    // Calculate current stats
    const currentStats = {
      balance: balance,
      openTrades: trades.length,
      dailyStats: {
        ...dailyStats,
        currentBalance: balance,
        winRate:
          dailyStats.trades > 0
            ? ((dailyStats.wins / dailyStats.trades) * 100).toFixed(2)
            : 0,
        profitLoss: dailyStats.profit,
        maxDrawdown: dailyStats.maxDrawdown,
      },
    };

    emitLog(
      `[ACCOUNT] Balance: ${balance} | Open Trades: ${trades.length}`,
      "info"
    );
    return currentStats;
  } catch (error) {
    emitLog(`[ACCOUNT REFRESH ERROR]: ${error.message}`, "error");
    throw error;
  }
}

// Export the refresh function
export function getAccountSummary() {
  return refreshAccountSummary();
}
