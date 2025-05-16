import https from "https";
import { OANDA_ACCOUNT_ID, OANDA_API_KEY } from '../config/env';
import { INSTRUMENTS } from '../config/instruments';

let currentCandle = {};
let candles = {};
let subscribers = [];

function subscribeClient(callback) {
  subscribers.push(callback);
  return () => {
    subscribers = subscribers.filter((cb) => cb !== callback);
  };
}

function broadcastCandle(instrument, candle) {
  const msg = { instrument, candle };
  subscribers.forEach((cb) => cb(msg));
}

function updateCandle(instrument, price, time) {
  const now = new Date(time);
  const minute = now.getUTCMinutes();

  if (
    !currentCandle[instrument] ||
    currentCandle[instrument].minute !== minute
  ) {
    if (currentCandle[instrument]) {
      broadcastCandle(instrument, currentCandle[instrument]);
      if (!candles[instrument]) candles[instrument] = [];
      candles[instrument].push(currentCandle[instrument]);
    }

    currentCandle[instrument] = {
      open: price,
      high: price,
      low: price,
      close: price,
      startTime: now.toISOString(),
      minute,
    };
  } else {
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

function startStream() {
  if (global.oandaStreamStarted) return;
  global.oandaStreamStarted = true;

  const options = {
    hostname: "stream-fxpractice.oanda.com",
    path: `/v3/accounts/${OANDA_ACCOUNT_ID}/pricing/stream?instruments=${INSTRUMENTS.join(
      ","
    )}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${OANDA_API_KEY}`,
    },
  };

  const req = https.request(options, (res) => {
    res.setEncoding("utf8");
    let buffer = "";

    res.on("data", (chunk) => {
      buffer += chunk;
      const parts = buffer.split("\n");

      parts.forEach((line, idx) => {
        if (line.trim() === "") return;

        try {
          const msg = JSON.parse(line);
          if (msg.type === "PRICE") {
            const instrument = msg.instrument;
            const price = parseFloat(msg.bids[0].price);
            const time = msg.time;
            updateCandle(instrument, price, time);
          }
        } catch (err) {
          console.error("JSON parse error:", err);
        }
      });

      // Reset buffer only to last incomplete line (if any)
      buffer =
        parts[parts.length - 1].trim() === "" ? "" : parts[parts.length - 1];
    });
  });

  req.on("error", (err) => console.error("Stream error:", err.message));
  req.end();
}

export { startStream, subscribeClient };
