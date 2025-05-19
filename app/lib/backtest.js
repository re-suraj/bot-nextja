import { SMA, RSI, MACD, BollingerBands } from "technicalindicators";
import { performanceTracker } from "./performance";
import { getBotConfig } from "./botState";

const API_KEY =
  "c87de240064f6d839211a8bb9fb46354-301353f03ea7363dff1216b24aaa652d";
const BASE_URL = "https://api-fxpractice.oanda.com/v3";
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

class Backtester {
  constructor() {
    this.initialBalance = 10000;
    this.balance = this.initialBalance;
    this.positions = new Map();
    this.equityCurve = new Map();
  }

  async runBacktests() {
    const instruments = [
      "EUR_USD",
      "AUD_USD",
      "GBP_USD",
      "USD_JPY",
      "EUR_JPY",
      "AUD_CAD",
      "AUD_CHF",
      "AUD_HKD",
      "AUD_JPY",
      "AUD_NZD",
      "AUD_SGD",
      "CAD_CHF",
      "CAD_HKD",
      "CAD_JPY",
      "CAD_SGD",
      "CHF_HKD",
      "CHF_JPY",
      "CHF_ZAR",
      "EUR_AUD",
      "EUR_CAD",
      "EUR_CHF",
      "EUR_CZK",
      "EUR_DKK",
      "EUR_GBP",
      "EUR_HKD",
      "EUR_HUF",
      "EUR_NOK",
      "EUR_NZD",
      "EUR_PLN",
      "EUR_SEK",
      "EUR_SGD",
      "EUR_TRY",
      "EUR_ZAR",
      "GBP_AUD",
      "GBP_CAD",
      "GBP_CHF",
      "GBP_HKD",
      "GBP_JPY",
      "GBP_NZD",
      "GBP_PLN",
      "GBP_SGD",
      "GBP_ZAR",
      "HKD_JPY",
      "NZD_CAD",
      "NZD_CHF",
      "NZD_HKD",
      "NZD_JPY",
      "NZD_SGD",
      "NZD_USD",
      "SGD_CHF",
      "SGD_JPY",
      "TRY_JPY",
      "USD_CAD",
      "USD_CHF",
      "USD_CNH",
      "USD_CZK",
      "USD_DKK",
      "USD_HKD",
      "USD_HUF",
      "USD_MXN",
      "USD_NOK",
      "USD_PLN",
      "USD_SEK",
      "USD_SGD",
      "USD_THB",
      "USD_TRY",
      "USD_ZAR",
      "ZAR_JPY",
    ];
    const results = {};

    for (const instrument of instruments) {
      try {
        console.log(`Running backtest for ${instrument}...`);
        const result = await this.runBacktest([instrument]);
        results[instrument] = result;

        // Store equity curve data in memory
        this.storeEquityCurve(instrument);

        // Store performance report in memory
        this.storePerformanceReport(instrument, result);
      } catch (error) {
        console.error(`Error in backtest for ${instrument}:`, error);
        results[instrument] = { error: error.message };
      }
    }

    return results;
  }

  async runBacktest(instruments, startDate, endDate) {
    performanceTracker.reset();
    this.balance = this.initialBalance;
    this.positions.clear();
    this.equityCurve.clear();

    // Get enabled strategies from config
    const config = getBotConfig();
    const enabledStrategies = Object.entries(config.strategies)
      .filter(([_, strategy]) => strategy.enabled)
      .map(([id, strategy]) => ({ id, ...strategy }));

    if (enabledStrategies.length === 0) {
      throw new Error("No enabled strategies found");
    }

    // Initialize equity curve with starting balance
    for (const instrument of instruments) {
      this.equityCurve.set(instrument, [
        {
          timestamp: startDate,
          equity: this.initialBalance,
        },
      ]);
    }

    for (const instrument of instruments) {
      try {
        const candles = await this.getHistoricalData(
          instrument,
          startDate,
          endDate
        );
        await this.runStrategyOnData(instrument, candles, enabledStrategies);
      } catch (error) {
        console.error(`Backtest error for ${instrument}:`, error);
      }
    }

    return performanceTracker.getPerformanceReport();
  }

  storeEquityCurve(instrument) {
    const equityData = this.equityCurve.get(instrument);
    if (!equityData) return;

    const chartData = {
      type: "line",
      data: {
        labels: equityData.map((d) =>
          new Date(d.timestamp).toLocaleDateString()
        ),
        datasets: [
          {
            label: "Equity Curve",
            data: equityData.map((d) => d.equity),
            borderColor: "#10B981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `${instrument} Equity Curve`,
            color: "#fff",
          },
          legend: {
            labels: {
              color: "#fff",
            },
          },
        },
        scales: {
          y: {
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "#fff",
            },
          },
          x: {
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "#fff",
            },
          },
        },
      },
    };

    // Store in localStorage instead of file system
    try {
      localStorage.setItem(
        `equity_curve_${instrument}`,
        JSON.stringify(chartData)
      );
    } catch (error) {
      console.error("Error storing equity curve data:", error);
    }
  }

  storePerformanceReport(instrument, results) {
    const report = {
      instrument,
      timestamp: new Date().toISOString(),
      summary: {
        totalTrades: results.summary.totalTrades,
        winRate: results.summary.winRate,
        avgPnL: results.summary.avgPnL,
        maxDrawdown: results.summary.maxDrawdown,
        finalEquity: results.summary.currentBalance,
        profitFactor: results.summary.profitFactor,
      },
      trades: results.trades,
    };

    // Store in localStorage instead of file system
    try {
      localStorage.setItem(`report_${instrument}`, JSON.stringify(report));
    } catch (error) {
      console.error("Error storing performance report:", error);
    }
  }

  async getHistoricalData(instrument, startDate, endDate) {
    try {
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      const now = new Date();

      if (start > end) {
        throw new Error("Start date must be before end date");
      }

      if (end > now) {
        throw new Error("End date cannot be in the future");
      }

      // Ensure we're not requesting too much data
      const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
      if (daysDiff > 30) {
        throw new Error("Cannot request more than 30 days of historical data");
      }

      // Break down the request into smaller chunks (5 days each)
      const CHUNK_DAYS = 5;
      const allCandles = [];
      let currentStart = new Date(start);

      while (currentStart < end) {
        const chunkEnd = new Date(currentStart);
        chunkEnd.setDate(chunkEnd.getDate() + CHUNK_DAYS);
        const actualEnd = chunkEnd > end ? end : chunkEnd;

        const response = await fetch(
          `${BASE_URL}/instruments/${instrument}/candles?` +
            `granularity=M5&from=${currentStart.toISOString()}&to=${actualEnd.toISOString()}&price=M`,
          { headers }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Failed to fetch historical data: ${response.status} - ${
              errorData.errorMessage || response.statusText
            }`
          );
        }

        const data = await response.json();

        if (!data.candles || !Array.isArray(data.candles)) {
          throw new Error("Invalid candle data received from API");
        }

        allCandles.push(...data.candles);

        // Move to next chunk
        currentStart = new Date(actualEnd);
        currentStart.setMinutes(currentStart.getMinutes() + 1); // Add 1 minute to avoid overlap

        // Add a small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (allCandles.length === 0) {
        throw new Error("No candle data received from API");
      }

      // Sort candles by time to ensure correct order
      allCandles.sort((a, b) => new Date(a.time) - new Date(b.time));

      return allCandles;
    } catch (error) {
      console.error(`Error fetching historical data for ${instrument}:`, error);
      throw error;
    }
  }

  async runStrategyOnData(instrument, candles, strategies) {
    try {
      const prices = candles.map((c) => parseFloat(c.mid.c));

      // Calculate indicators for each strategy
      const indicators = {};
      for (const strategy of strategies) {
        const params = strategy.parameters;
        indicators[strategy.id] = {
          prices: prices, // Store prices in indicators object
          shortMA: SMA.calculate({
            period: params.shortPeriod || 5,
            values: prices,
          }),
          longMA: SMA.calculate({
            period: params.longPeriod || 20,
            values: prices,
          }),
          rsi: RSI.calculate({
            period: params.rsiPeriod || 14,
            values: prices,
          }),
          macd: MACD.calculate({
            fastPeriod: params.macdFastPeriod || 12,
            slowPeriod: params.macdSlowPeriod || 26,
            signalPeriod: params.macdSignalPeriod || 9,
            values: prices,
          }),
          bb: BollingerBands.calculate({
            period: params.bbPeriod || 20,
            values: prices,
            stdDev: params.bbStdDev || 2,
          }),
        };
      }

      // Find the maximum offset needed for all indicators
      const maxOffset = Math.max(
        ...strategies.flatMap((strategy) => [
          indicators[strategy.id].shortMA.length - prices.length,
          indicators[strategy.id].longMA.length - prices.length,
          indicators[strategy.id].rsi.length - prices.length,
          indicators[strategy.id].macd.length - prices.length,
          indicators[strategy.id].bb.length - prices.length,
        ])
      );

      // Start from the point where all indicators are available
      const startIndex = Math.abs(maxOffset);

      if (startIndex >= prices.length) {
        throw new Error("Not enough data points for indicator calculations");
      }

      // Calculate the offset for each indicator
      const indicatorOffsets = {};
      for (const strategy of strategies) {
        const ind = indicators[strategy.id];
        indicatorOffsets[strategy.id] = {
          shortMA: ind.shortMA.length - prices.length,
          longMA: ind.longMA.length - prices.length,
          rsi: ind.rsi.length - prices.length,
          macd: ind.macd.length - prices.length,
          bb: ind.bb.length - prices.length,
        };
      }

      for (let i = startIndex; i < prices.length; i++) {
        const curr = i;
        const prev = i - 1;
        const currentPrice = prices[curr];
        const timestamp = new Date(candles[curr].time);

        // Update equity curve
        this.updateEquityCurve(instrument, timestamp, this.balance);

        // Check for open positions
        const position = this.positions.get(instrument);
        if (position) {
          // Check for stop loss or take profit
          const pnl = this.calculatePnL(position, currentPrice);
          const pnlPct = pnl / (Math.abs(position.units) * position.entryPrice);

          if (this.shouldClosePosition(position, pnl, currentPrice)) {
            this.closePosition(instrument, currentPrice, pnl);
          }
        } else {
          // Check for new trade signals from each strategy
          for (const strategy of strategies) {
            const ind = indicators[strategy.id];
            const params = strategy.parameters;
            const offsets = indicatorOffsets[strategy.id];

            // Calculate adjusted indices for each indicator
            const shortMAIndex = curr + offsets.shortMA;
            const longMAIndex = curr + offsets.longMA;
            const rsiIndex = curr + offsets.rsi;
            const macdIndex = curr + offsets.macd;
            const bbIndex = curr + offsets.bb;

            // Skip if we don't have enough data for all indicators
            if (
              shortMAIndex < 0 ||
              shortMAIndex >= ind.shortMA.length ||
              longMAIndex < 0 ||
              longMAIndex >= ind.longMA.length ||
              rsiIndex < 0 ||
              rsiIndex >= ind.rsi.length ||
              macdIndex < 0 ||
              macdIndex >= ind.macd.length ||
              bbIndex < 0 ||
              bbIndex >= ind.bb.length
            ) {
              continue;
            }

            // Create adjusted indicators object for the current point
            const currentIndicators = {
              prices: prices,
              shortMA: ind.shortMA[shortMAIndex],
              longMA: ind.longMA[longMAIndex],
              rsi: ind.rsi[rsiIndex],
              macd: ind.macd[macdIndex],
              bb: ind.bb[bbIndex],
            };

            if (this.shouldEnterLong(currentIndicators, params, curr)) {
              const units = this.calculatePositionSize(
                params.riskPerTrade || 0.02
              );
              this.openPosition(instrument, "buy", currentPrice, units, {
                stopLoss: currentPrice * (1 - (params.stopLoss || 0.01)),
                takeProfit: currentPrice * (1 + (params.takeProfit || 0.02)),
              });
              break;
            } else if (this.shouldEnterShort(currentIndicators, params, curr)) {
              const units = this.calculatePositionSize(
                params.riskPerTrade || 0.02
              );
              this.openPosition(instrument, "sell", currentPrice, units, {
                stopLoss: currentPrice * (1 + (params.stopLoss || 0.01)),
                takeProfit: currentPrice * (1 - (params.takeProfit || 0.02)),
              });
              break;
            }
          }
        }
      }

      // Close any remaining positions at the last price
      for (const [instrument, position] of this.positions) {
        const pnl = this.calculatePnL(position, prices[prices.length - 1]);
        this.closePosition(instrument, prices[prices.length - 1], pnl);
      }
    } catch (error) {
      console.error(`Error running strategy for ${instrument}:`, error);
      throw error;
    }
  }

  shouldEnterLong(indicators, params, curr) {
    try {
      // Check if all required indicators are available
      if (
        !indicators.shortMA?.[curr] ||
        !indicators.longMA?.[curr] ||
        !indicators.rsi?.[curr] ||
        !indicators.macd?.[curr]?.MACD ||
        !indicators.macd?.[curr]?.signal ||
        !indicators.bb?.[curr]?.lower
      ) {
        return false;
      }

      const shortMA = indicators.shortMA[curr];
      const longMA = indicators.longMA[curr];
      const rsi = indicators.rsi[curr];
      const macd = indicators.macd[curr].MACD;
      const signal = indicators.macd[curr].signal;
      const bbLower = indicators.bb[curr].lower;

      return (
        shortMA > longMA && // MA crossover
        rsi < (params.rsiOversold || 30) && // Oversold
        macd > signal && // MACD crossover
        indicators.prices[curr] < bbLower // Price below lower BB
      );
    } catch (error) {
      console.error("Error in shouldEnterLong:", error);
      return false;
    }
  }

  shouldEnterShort(indicators, params, curr) {
    try {
      // Check if all required indicators are available
      if (
        !indicators.shortMA?.[curr] ||
        !indicators.longMA?.[curr] ||
        !indicators.rsi?.[curr] ||
        !indicators.macd?.[curr]?.MACD ||
        !indicators.macd?.[curr]?.signal ||
        !indicators.bb?.[curr]?.upper
      ) {
        return false;
      }

      const shortMA = indicators.shortMA[curr];
      const longMA = indicators.longMA[curr];
      const rsi = indicators.rsi[curr];
      const macd = indicators.macd[curr].MACD;
      const signal = indicators.macd[curr].signal;
      const bbUpper = indicators.bb[curr].upper;

      return (
        shortMA < longMA && // MA crossover
        rsi > (params.rsiOverbought || 70) && // Overbought
        macd < signal && // MACD crossover
        indicators.prices[curr] > bbUpper // Price above upper BB
      );
    } catch (error) {
      console.error("Error in shouldEnterShort:", error);
      return false;
    }
  }

  shouldClosePosition(position, pnl, currentPrice) {
    const profitTarget = 0.02; // 2% profit target
    const stopLoss = -0.01; // 1% stop loss
    const pnlPct = pnl / (Math.abs(position.units) * position.entryPrice);

    return pnlPct >= profitTarget || pnlPct <= stopLoss;
  }

  calculatePositionSize(riskPerTrade = 0.02) {
    const riskAmount = this.balance * riskPerTrade;
    return Math.floor(riskAmount / 50); // Assuming 50 pip stop loss
  }

  calculatePnL(position, currentPrice) {
    const priceDiff = currentPrice - position.entryPrice;
    return position.direction === "buy"
      ? priceDiff * position.units
      : -priceDiff * position.units;
  }

  updateEquityCurve(instrument, timestamp, equity) {
    const curve = this.equityCurve.get(instrument) || [];
    curve.push({ timestamp, equity });
    this.equityCurve.set(instrument, curve);
  }

  openPosition(instrument, direction, price, units, levels) {
    const position = {
      id: `${instrument}-${Date.now()}`,
      instrument,
      direction,
      entryPrice: price,
      units,
      stopLoss: levels.stopLoss,
      takeProfit: levels.takeProfit,
      timestamp: new Date().toISOString(),
    };

    this.positions.set(instrument, position);
    performanceTracker.addTrade(position);
  }

  closePosition(instrument, exitPrice, pnl) {
    const position = this.positions.get(instrument);
    if (position) {
      performanceTracker.updateTrade(position.id, exitPrice, pnl);
      this.balance += pnl;
      this.positions.delete(instrument);
    }
  }
}

export const backtester = new Backtester();
