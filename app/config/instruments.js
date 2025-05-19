// config/instruments

const INSTRUMENTS = [
  // Core majors
  "EUR_USD",
  "GBP_USD",
  "AUD_CAD",
  "AUD_USD",
  "EUR_AUD",
  "EUR_CAD",
  // Extras
  "USD_JPY",
  "USD_CAD",
  "USD_CHF",
  "NZD_USD", // Other majors
  "EUR_GBP",
  "EUR_JPY",
  "GBP_JPY", // Popular crosses
  "AUD_JPY",
  "GBP_AUD", // AUD crosses
  "USD_SGD",
  "USD_HKD",
  "USD_MXN",
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
