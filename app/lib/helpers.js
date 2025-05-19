// lib/helpers.js

// Environment variables
const OANDA_API_URL =
  process.env.OANDA_API_URL || "https://api-fxpractice.oanda.com";
const OANDA_API_KEY = process.env.OANDA_API_KEY;
const OANDA_ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;

if (!OANDA_API_KEY || !OANDA_ACCOUNT_ID) {
  throw new Error(
    "OANDA_API_KEY and OANDA_ACCOUNT_ID must be set in .env.local"
  );
}

// Headers for API requests
const headers = {
  Authorization: `Bearer ${OANDA_API_KEY}`,
  "Content-Type": "application/json",
  "Accept-Datetime-Format": "RFC3339",
};

// Get account details (balance, etc.)
export async function getAccountDetails() {
  try {
    const response = await fetch(
      `${OANDA_API_URL}/v3/accounts/${OANDA_ACCOUNT_ID}`,
      {
        method: "GET",
        headers,
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    const account = data.account;
    // console.log("------------- account", parseFloat(account.balance));

    return {
      balance: parseFloat(account.balance),
      currency: account.currency,
      marginUsed: parseFloat(account.marginUsed),
      marginAvailable: parseFloat(account.marginAvailable),
    };
  } catch (error) {
    console.error(`Error fetching account details: ${error.message}`);
    throw new Error(`Failed to fetch account details: ${error.message}`);
  }
}

// Get current price data for an instrument
export async function getPriceData(instrument) {
  try {
    const response = await fetch(
      `${OANDA_API_URL}/v3/accounts/${OANDA_ACCOUNT_ID}/pricing?instruments=${instrument}`,
      {
        method: "GET",
        headers,
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log("------------- asks", parseFloat(price.asks[0].price));
    const price = data.prices[0];
    if (!price) {
      throw new Error(`No price data for ${instrument}`);
    }
    const ask = parseFloat(price.asks[0].price);
    const bid = parseFloat(price.bids[0].price);
    const spread = ask - bid;
    return { ask, bid, spread };
  } catch (error) {
    console.error(
      `Error fetching price data for ${instrument}: ${error.message}`
    );
    throw new Error(
      `Failed to fetch price data for ${instrument}: ${error.message}`
    );
  }
}

// Get historical candles for an instrument
export async function getCandles(instrument, count = 100, granularity = "M5") {
  try {
    const response = await fetch(
      `${OANDA_API_URL}/v3/instruments/${instrument}/candles?price=M&granularity=${granularity}&count=${count}`,
      {
        method: "GET",
        headers,
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log("------------- asks", parseFloat(price.asks[0].price));
    const candles = data.candles.map((candle) => ({
      time: candle.time,
      open: parseFloat(candle.mid.o),
      high: parseFloat(candle.mid.h),
      low: parseFloat(candle.mid.l),
      close: parseFloat(candle.mid.c),
      volume: parseInt(candle.volume),
    }));
    return candles;
  } catch (error) {
    console.error(`Error fetching candles for ${instrument}: ${error.message}`);
    throw new Error(
      `Failed to fetch candles for ${instrument}: ${error.message}`
    );
  }
}

// Calculate technical indicators (RSI, SMA, ATR)
// export function calculateIndicators(candles) {
//   try {
//     const closes = candles.map((c) => c.close);
//     const highs = candles.map((c) => c.high);
//     const lows = candles.map((c) => c.low);

//     // SMA (200-period)
//     const smaPeriod = 200;
//     const smaValues = [];
//     for (let i = 0; i < closes.length; i++) {
//       if (i < smaPeriod - 1) {
//         smaValues.push(null);
//         continue;
//       }
//       const slice = closes.slice(i - smaPeriod + 1, i + 1);
//       const sum = slice.reduce((acc, val) => acc + val, 0);
//       smaValues.push(sum / smaPeriod);
//     }

//     // RSI (14-period)
//     const rsiPeriod = 14;
//     const rsiValues = [];
//     for (let i = 0; i < closes.length; i++) {
//       if (i < rsiPeriod) {
//         rsiValues.push(null);
//         continue;
//       }
//       const changes = closes.slice(i - rsiPeriod, i).map((close, idx, arr) => {
//         if (idx === 0) return 0;
//         return close - arr[idx - 1];
//       });
//       const gains =
//         changes.reduce((acc, change) => acc + (change > 0 ? change : 0), 0) /
//         rsiPeriod;
//       const losses =
//         changes.reduce((acc, change) => acc + (change < 0 ? -change : 0), 0) /
//         rsiPeriod;
//       const rs = losses === 0 ? gains : gains / losses;
//       const rsi = losses === 0 ? 100 : 100 - 100 / (1 + rs);
//       rsiValues.push(rsi);
//     }

//     // ATR (14-period)
//     const atrPeriod = 14;
//     const atrValues = [];
//     for (let i = 0; i < closes.length; i++) {
//       if (i === 0) {
//         atrValues.push(null);
//         continue;
//       }
//       const tr = Math.max(
//         highs[i] - lows[i],
//         Math.abs(highs[i] - closes[i - 1]),
//         Math.abs(lows[i] - closes[i - 1])
//       );
//       if (i < atrPeriod) {
//         atrValues.push(null);
//         continue;
//       }
//       const trValues = [];
//       for (let j = i - atrPeriod + 1; j <= i; j++) {
//         trValues.push(
//           Math.max(
//             highs[j] - lows[j],
//             Math.abs(highs[j] - closes[j - 1]),
//             Math.abs(lows[j] - closes[j - 1])
//           )
//         );
//       }
//       const atr = trValues.reduce((acc, val) => acc + val, 0) / atrPeriod;
//       atrValues.push(atr);
//     }

//     // Align arrays
//     const maxLength = closes.length;
//     const rsi = new Array(maxLength).fill(null);
//     const sma = new Array(maxLength).fill(null);
//     const atr = new Array(maxLength).fill(null);

//     rsiValues.forEach((value, i) => {
//       rsi[i] = value;
//     });
//     smaValues.forEach((value, i) => {
//       sma[i] = value;
//     });
//     atrValues.forEach((value, i) => {
//       atr[i] = value;
//     });

//     return { rsi, sma, atr };
//   } catch (error) {
//     console.error(`Error calculating indicators: ${error.message}`);
//     throw new Error(`Failed to calculate indicators: ${error.message}`);
//   }
// }

// Create a market order
export async function createOrder(type, price, units, instrument, params) {
  try {
    const order = {
      order: {
        instrument,
        units: type.toLowerCase() === "buy" ? units : -units,
        type: "MARKET",
        positionFill: "DEFAULT",
        stopLossOnFill: {
          price: params.stopLossPrice.toString(),
          timeInForce: "GTC",
        },
        takeProfitOnFill: {
          price: params.takeProfitPrice.toString(),
          timeInForce: "GTC",
        },
      },
    };
    const response = await fetch(
      `${OANDA_API_URL}/v3/accounts/${OANDA_ACCOUNT_ID}/orders`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(order),
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log(
      `Order created: ${type} ${units} units of ${instrument} at ${price}`
    );
    return data.orderCreateTransaction;
  } catch (error) {
    console.error(`Error creating order for ${instrument}: ${error.message}`);
    throw new Error(
      `Failed to create order for ${instrument}: ${error.message}`
    );
  }
}

export function calculateIndicators(candles, rsiPeriod = 14) {
  const rsi = calculateRSI(candles, rsiPeriod);
  return { rsi };
}

// RSI calculation function
function calculateRSI(candles, period) {
  const rsi = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      rsi.push(null); // Not enough data for RSI yet
      continue;
    }
    let gainSum = 0;
    let lossSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const change = candles[j].close - candles[j - 1].close;
      if (change > 0) gainSum += change;
      else lossSum += -change;
    }
    const avgGain = gainSum / period;
    const avgLoss = lossSum / period;
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    const rsiValue = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    rsi.push(rsiValue);
  }
  return rsi;
}
