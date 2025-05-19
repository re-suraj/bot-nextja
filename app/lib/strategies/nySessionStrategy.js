import { EMA, RSI, ADX, ATR } from "technicalindicators";

// New York session hours (ET)
const NY_SESSION_START = 8; // 8:00 ET
const NY_SESSION_END = 16; // 16:00 ET

// Strategy parameters
const STRATEGY_PARAMS = {
  // EMA periods
  fastEMA: 9,
  slowEMA: 21,
  longTermEMA: 200,
  
  // RSI settings
  rsiPeriod: 14,
  rsiThreshold: 50,
  
  // ADX settings
  adxPeriod: 14,
  adxThreshold: 25,
  
  // ATR settings
  atrPeriod: 14,
  atrMultiplier: 1.2,
  
  // Risk management
  riskRewardRatio: 2,
  maxSpread: 0.0003, // 3 pips
};

export class NYSessionStrategy {
  constructor(params = {}) {
    this.params = { ...STRATEGY_PARAMS, ...params };
  }

  isNYSession() {
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hour = et.getHours();
    return hour >= NY_SESSION_START && hour < NY_SESSION_END;
  }

  calculateIndicators(prices) {
    const fastEMA = EMA.calculate({
      period: this.params.fastEMA,
      values: prices,
    });
    
    const slowEMA = EMA.calculate({
      period: this.params.slowEMA,
      values: prices,
    });
    
    const longTermEMA = EMA.calculate({
      period: this.params.longTermEMA,
      values: prices,
    });
    
    const rsi = RSI.calculate({
      period: this.params.rsiPeriod,
      values: prices,
    });
    
    const adx = ADX.calculate({
      high: prices.map(p => p + 0.0001), // Approximate high
      low: prices.map(p => p - 0.0001),  // Approximate low
      close: prices,
      period: this.params.adxPeriod,
    });
    
    const atr = ATR.calculate({
      high: prices.map(p => p + 0.0001),
      low: prices.map(p => p - 0.0001),
      close: prices,
      period: this.params.atrPeriod,
    });

    return {
      fastEMA,
      slowEMA,
      longTermEMA,
      rsi,
      adx,
      atr,
    };
  }

  shouldEnterLong(indicators, currentIndex) {
    if (!this.isNYSession()) return false;

    const {
      fastEMA,
      slowEMA,
      longTermEMA,
      rsi,
      adx,
      atr,
    } = indicators;

    const curr = currentIndex;
    const prev = currentIndex - 1;

    // Check if we have enough data
    if (!fastEMA[curr] || !slowEMA[curr] || !longTermEMA[curr] || 
        !rsi[curr] || !adx[curr] || !atr[curr]) {
      return false;
    }

    // Trend filter
    const price = fastEMA[curr];
    const isAboveLongTermEMA = price > longTermEMA[curr];

    // EMA crossover
    const emaCrossedUp = fastEMA[curr] > slowEMA[curr] && 
                        fastEMA[prev] <= slowEMA[prev];

    // RSI momentum
    const rsiAboveThreshold = rsi[curr] > this.params.rsiThreshold;

    // ADX trend strength
    const strongTrend = adx[curr] > this.params.adxThreshold;

    return isAboveLongTermEMA && 
           emaCrossedUp && 
           rsiAboveThreshold && 
           strongTrend;
  }

  shouldEnterShort(indicators, currentIndex) {
    if (!this.isNYSession()) return false;

    const {
      fastEMA,
      slowEMA,
      longTermEMA,
      rsi,
      adx,
      atr,
    } = indicators;

    const curr = currentIndex;
    const prev = currentIndex - 1;

    // Check if we have enough data
    if (!fastEMA[curr] || !slowEMA[curr] || !longTermEMA[curr] || 
        !rsi[curr] || !adx[curr] || !atr[curr]) {
      return false;
    }

    // Trend filter
    const price = fastEMA[curr];
    const isBelowLongTermEMA = price < longTermEMA[curr];

    // EMA crossover
    const emaCrossedDown = fastEMA[curr] < slowEMA[curr] && 
                          fastEMA[prev] >= slowEMA[prev];

    // RSI momentum
    const rsiBelowThreshold = rsi[curr] < this.params.rsiThreshold;

    // ADX trend strength
    const strongTrend = adx[curr] > this.params.adxThreshold;

    return isBelowLongTermEMA && 
           emaCrossedDown && 
           rsiBelowThreshold && 
           strongTrend;
  }

  calculateStopLoss(entryPrice, direction, atr) {
    const atrValue = atr[atr.length - 1];
    const stopDistance = atrValue * this.params.atrMultiplier;
    
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

  getTradeParameters(entryPrice, direction, atr) {
    const stopLoss = this.calculateStopLoss(entryPrice, direction, atr);
    const takeProfit = this.calculateTakeProfit(entryPrice, stopLoss, direction);
    
    return {
      stopLoss,
      takeProfit,
      riskRewardRatio: this.params.riskRewardRatio,
    };
  }
} 