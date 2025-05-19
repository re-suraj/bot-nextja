// config/instruments

const INSTRUMENTS = [
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

// Default instrument for charts and initial views
const DEFAULT_INSTRUMENT = "EUR_USD";

// Trading parameters for NY Session Strategy
const TRADING_PARAMS = {
  // Risk management
  RISK_PERCENT: 0.02, // 2% risk per trade
  MAX_DAILY_TRADES: 5, // Reduced from 25 to 5 for more selective trading
  MAX_OPEN_POSITIONS: 3, // Reduced from 30 to 3 for better risk management

  // Session parameters
  NY_SESSION_START: 8, // 8:00 ET
  NY_SESSION_END: 16, // 16:00 ET

  // Technical parameters
  FAST_EMA: 9,
  SLOW_EMA: 21,
  LONG_TERM_EMA: 200,
  RSI_PERIOD: 14,
  RSI_THRESHOLD: 50,
  ADX_PERIOD: 14,
  ADX_THRESHOLD: 25,
  ATR_PERIOD: 14,
  ATR_MULTIPLIER: 1.2,

  // Risk:Reward
  RISK_REWARD_RATIO: 2,

  // Spread management
  MAX_SPREAD: 0.0003, // 3 pips maximum spread
};

export { INSTRUMENTS, DEFAULT_INSTRUMENT, TRADING_PARAMS };
