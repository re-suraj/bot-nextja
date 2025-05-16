// Trading instruments configuration
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

// Default instrument for charts and initial views
const DEFAULT_INSTRUMENT = "USD_JPY";

// Trading parameters
const TRADING_PARAMS = {
  STOP_LOSS_PIPS: 50,
  TAKE_PROFIT_PIPS: 40,
  RISK_PERCENT: 0.02,
  MIN_RSI_DIFF: 5,
  MIN_MA_DIFF: 0.0002,
  TREND_STRENGTH_THRESHOLD: 0.0001,
  MAX_DAILY_TRADES: 5,
  MAX_OPEN_POSITIONS: 3
};

export {
  INSTRUMENTS,
  DEFAULT_INSTRUMENT,
  TRADING_PARAMS
}; 