import WebSocket, { WebSocketServer } from "ws";
import dotenv from "dotenv";
dotenv.config();

// const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;
// const ACCESS_TOKEN = process.env.OANDA_API_KEY;

const ACCOUNT_ID = "101-001-31701945-001";
const ACCESS_TOKEN =
  "c87de240064f6d839211a8bb9fb46354-301353f03ea7363dff1216b24aaa652d";
// const INSTRUMENT = ['EUR_USD','GBP_USD','AUD_USD','EUR_CAD','EUR_AUD'];

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

const CANDLE_INTERVAL = 60 * 1000; // 1 minute

let candles = {}; // { instrument: [ { open, high, low, close, startTime } ] }
let currentCandle = {}; // { instrument: { ... } }

const priceWS = new WebSocket(
  `wss://stream-fxpractice.oanda.com/v3/accounts/${ACCOUNT_ID}/pricing/stream?instruments=${INSTRUMENTS.join(
    ","
  )}`,
  { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
);

// WebSocket server for frontend clients
const wss = new WebSocketServer({ port: 8080 });

function broadcastCandle(instrument, candle) {
  const msg = JSON.stringify({ instrument, candle });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function updateCandle(instrument, price, time) {
  const now = new Date(time);
  const minute = now.getUTCMinutes();
  if (
    !currentCandle[instrument] ||
    currentCandle[instrument].minute !== minute
  ) {
    // Finalize previous candle
    if (currentCandle[instrument]) {
      broadcastCandle(instrument, currentCandle[instrument]);
      if (!candles[instrument]) candles[instrument] = [];
      candles[instrument].push(currentCandle[instrument]);
    }
    // Start new candle
    currentCandle[instrument] = {
      open: price,
      high: price,
      low: price,
      close: price,
      startTime: now.toISOString(),
      minute,
    };
  } else {
    // Update current candle
    currentCandle[instrument].close = price;
    currentCandle[instrument].high = Math.max(
      currentCandle[instrument].high,
      price
    );
    currentCandle[instrument].low = Math.min(
      currentCandle[instrument].low,
      price
    );
  }
}

priceWS.on("open", () => {
  console.log("Connected to OANDA price stream");
});

priceWS.on("message", (data) => {
  const msg = JSON.parse(data);
  if (msg.type === "PRICE") {
    const instrument = msg.instrument;
    const price = parseFloat(msg.bids[0].price);
    const time = msg.time;
    updateCandle(instrument, price, time);
  }
});

priceWS.on("error", (err) => console.error("WebSocket error:", err));

export function getLatestPrices() {
  return latestPrices;
}
