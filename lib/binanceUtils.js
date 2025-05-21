// /lib/binanceUtils.js
import axios from "axios";
import crypto from "crypto";
import {
  BINANCE_API_KEY,
  BINANCE_SECRET_KEY,
  pennyPairs,
  volatilePairs,
} from "../lib/utils.js";
import querystring from "querystring";

const API_KEY = BINANCE_API_KEY;
const API_SECRET = BINANCE_SECRET_KEY;
const BASE_URL = "https://binance.com/api";

export async function getTradablePairs() {
  const { data } = await axios.get(
    "https://api.binance.com/api/v3/exchangeInfo"
  );

  const filtered = data.symbols
    .filter((pair) => pair.status === "TRADING")
    .filter((pair) => {
      const base = pair.baseAsset;
      const quote = pair.quoteAsset;

      // Include only if one asset is from pennyPairs and the other from volatilePairs
      return volatilePairs.includes(quote);
    })
    .map((pair) => ({
      symbol: pair.symbol,
      base: pair.baseAsset,
      quote: pair.quoteAsset,
    }));

  return filtered;
}

export function buildCurrencyGraph(pairs) {
  const graph = {};
  for (const { base, quote, symbol } of pairs) {
    if (!graph[base]) graph[base] = [];
    if (!graph[quote]) graph[quote] = [];

    graph[base].push({ to: quote, symbol, direction: "baseToQuote" });
    graph[quote].push({ to: base, symbol, direction: "quoteToBase" });
  }
  return graph;
}

export function findTriangularPaths(graph) {
  const paths = [];
  const currencies = Object.keys(graph);

  for (const A of currencies) {
    for (const edge1 of graph[A] || []) {
      const B = edge1.to;
      if (B === A) continue;

      for (const edge2 of graph[B] || []) {
        const C = edge2.to;
        if (C === A || C === B) continue;

        for (const edge3 of graph[C] || []) {
          if (edge3.to === A) {
            paths.push([edge1, edge2, edge3]);
          }
        }
      }
    }
  }

  return paths;
}

export function simulateTriangularPath(
  path,
  priceMap,
  initial = 1000,
  fee = 0.001
) {
  let amount = initial;

  for (const hop of path) {
    const price = priceMap[hop.symbol];
    if (!price) return null;

    if (hop.direction === "baseToQuote") {
      amount = (amount / price) * (1 - fee);
    } else {
      amount = amount * price * (1 - fee);
    }
  }

  const profit = amount - initial;
  const profitPercent = (profit / initial) * 100;
  return {
    profit,
    profitPercent,
    finalAmount: amount,
    path,
    isProfitable: profit > 0.1,
  };
}

export async function placeTestTrade(symbol, side, quantity) {
  //   console.time("⏱️ Execution Time t");

  try {
    if (!API_SECRET) throw new Error("Missing BINANCE_SECRET_KEY");

    const timestamp = Date.now();
    const params = {
      symbol,
      side,
      type: "MARKET",
      quantity,
      timestamp,
    };

    const queryStrings = querystring.stringify(params);
    const signature = crypto
      .createHmac("sha256", API_SECRET)
      .update(queryStrings)
      .digest("hex");

    const fullQuery = queryStrings + `&signature=${signature}`;

    const res = await axios.post(
      `${BASE_URL}/v3/order`,
      fullQuery, // send in body
      {
        headers: {
          "X-MBX-APIKEY": API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log(`🚀 Trade Executed: ${symbol} ${side} ${quantity}`);
    console.log(res.data);
  } catch (err) {
    console.error(
      `❌ Trade Failed: ${symbol} ${side} ${quantity}`,
      err.response?.data || err.message
    );
  } finally {
    // console.timeEnd("⏱️ Execution Time t");
  }
}

// export async function placeTestTrade(symbol, side, quantity) {
//   console.time("⏱️ Execution Time t");
//   try {
//     if (!API_SECRET) throw new Error("Missing BINANCE_SECRET_KEY");

//     const timestamp = Date.now();
//     const queryString = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
//     const signature = crypto
//       .createHmac("sha256", API_SECRET)
//       .update(queryString)
//       .digest("hex");
//     console.log(" signature :", signature);

//     const res = await axios.post(
//       `${BASE_URL}/v3/order?${queryString}&signature=${signature}`,
//       null,
//       {
//         headers: {
//           "X-MBX-APIKEY": API_KEY,
//         },
//       }
//     );

//     console.log(`🚀 Trade Executed: ${symbol} ${side} ${quantity}`);
//     console.log(res.data);
//   } catch (err) {
//     console.error(
//       `❌ Trade Failed: ${symbol} ${side} ${quantity}`,
//       err.response?.data || err.message
//     );
//   } finally {
//     console.timeEnd("⏱️ Execution Time t");
//   }
// }
