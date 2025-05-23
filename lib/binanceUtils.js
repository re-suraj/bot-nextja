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
const BASE_URL = "https://testnet.binance.vision/api";

export async function getTradablePairs() {
  const { data } = await axios.get(`${BASE_URL}/v3/exchangeInfo`);
  const tradingPairs = data.symbols.filter((pair) => pair.status === "TRADING");

  const filtered = tradingPairs
    .filter(
      (pair) =>
        volatilePairs.includes(pair.baseAsset) &&
        volatilePairs.includes(pair.quoteAsset)
    )
    .map((pair) => ({
      symbol: pair.symbol,
      base: pair.baseAsset,
      quote: pair.quoteAsset,
    }));

  console.log(`✅ Total tradable pairs: ${tradingPairs.length}`);
  console.log(
    `✅ Filtered to ${filtered.length} pairs with base and quote in volatilePairs`
  );
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
// old one
// export function findTriangularPaths(graph) {
//   const paths = [];
//   const currencies = Object.keys(graph);

//   for (const A of currencies) {
//     for (const edge1 of graph[A] || []) {
//       const B = edge1.to;
//       if (B === A) continue;

//       for (const edge2 of graph[B] || []) {
//         const C = edge2.to;
//         if (C === A || C === B) continue;

//         for (const edge3 of graph[C] || []) {
//           if (edge3.to === A) {
//             paths.push([edge1, edge2, edge3]);
//           }
//         }
//       }
//     }
//   }

//   return paths;
// }

// previous
// export function findTriangularPaths(graph) {
//   const paths = [];
//   const currencies = Object.keys(graph);
//   for (const A of currencies) {
//     for (const edge1 of graph[A] || []) {
//       const B = edge1.to;
//       if (B === A) continue;
//       for (const edge2 of graph[B] || []) {
//         const C = edge2.to;
//         if (C === A || C === B) continue;
//         for (const edge3 of graph[C] || []) {
//           if (edge3.to === A) {
//             paths.push([edge1, edge2, edge3]);
//           }
//         }
//       }
//     }
//   }
//   return paths;
// }

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
            const path = [edge1, edge2, edge3].map((edge) => {
              const direction = edge.direction;
              const symbol = edge.symbol;
              const type = direction === "baseToQuote" ? "BUY" : "SELL";
              const requiredAsset =
                direction === "baseToQuote"
                  ? symbol.replace(edge.to, "") // base asset
                  : symbol.replace(edge.from, ""); // quote asset

              return {
                from: edge.from,
                to: edge.to,
                symbol,
                direction,
                type,
                requiredAsset,
              };
            });

            paths.push(path);
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

export async function placeTestTrade(symbol, side, quantity, buyPrice = null) {
  console.time("⏱️ Execution Time t");
  try {
    if (!API_SECRET) throw new Error("Missing BINANCE_SECRET_KEY");
    const timestamp = Date.now();
    const params = { symbol, side, type: "MARKET", quantity, timestamp };
    const queryStrings = querystring.stringify(params);
    // console.log(" ✅✅✅✅✅✅ --------------- queryString", queryStrings);
    const signature = crypto
      .createHmac("sha256", API_SECRET)
      .update(queryStrings)
      .digest("hex");
    const fullQuery = queryStrings + `&signature=${signature}`;

    const res = await axios.post(`${BASE_URL}/v3/order`, fullQuery, {
      headers: {
        "X-MBX-APIKEY": API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = res.data;
    console.log(`🚀 Trade Executed: ${symbol} ${side} ${quantity}`);
    console.log(data);

    if (side === "SELL" && buyPrice) {
      const revenue = parseFloat(data.cummulativeQuoteQty);
      const cost = parseFloat(buyPrice) * parseFloat(data.executedQty);
      const profit = revenue - cost;
      const profitPercent = (profit / cost) * 100;
      console.log(`💰 Revenue: ${revenue}`);
      console.log(`💸 Cost: ${cost}`);
      console.log(
        `📈 Profit: ${profit.toFixed(8)} (${profitPercent.toFixed(2)}%)`
      );
    }
    return data;
  } catch (err) {
    const code = err.response?.data?.code;
    if (code === -1021) {
      console.warn("Retrying due to time sync error...");
      return await placeTestTrade(symbol, side, quantity, buyPrice);
    }
    console.error(
      `❌ Trade Failed: ${symbol} ${side} ${quantity}`,
      err.response?.data || err.message
    );
  } finally {
    console.timeEnd("⏱️ Execution Time t");
  }
}

export async function getAccountBalances1() {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(queryString)
    .digest("hex");
  const url = `${BASE_URL}/v3/account?${queryString}&signature=${signature}`;
  const res = await axios.get(url, { headers: { "X-MBX-APIKEY": API_KEY } });
  console.log(" -------------res.data.balances ", res.data.balances);
  return res.data.balances;
}
export async function getAccountBalances() {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(queryString)
    .digest("hex");
  const url = `${BASE_URL}/v3/account?${queryString}&signature=${signature}`;

  const res = await axios.get(url, { headers: { "X-MBX-APIKEY": API_KEY } });
  const balances = res.data.balances.filter((b) => parseFloat(b.free) > 0);

  const { data: prices } = await axios.get(`${BASE_URL}/v3/ticker/price`);

  const updatedBalances = balances.map((bal) => {
    const asset = bal.asset;
    const amount = parseFloat(bal.free);
    let usdtValue = null;

    if (asset === "USDT") {
      usdtValue = amount;
    } else {
      const direct = `${asset}USDT`;
      const inverse = `USDT${asset}`;
      let priceObj = prices.find((p) => p.symbol === direct);
      if (priceObj) {
        usdtValue = amount * parseFloat(priceObj.price);
      } else {
        priceObj = prices.find((p) => p.symbol === inverse);
        if (priceObj) {
          usdtValue = amount / parseFloat(priceObj.price);
        }
      }
    }

    return {
      ...bal,
      balanceInUSDT:
        usdtValue !== null ? parseFloat(usdtValue.toFixed(6)) : null,
    };
  });

  return updatedBalances;
}

export async function getSymbolFilters(symbol) {
  const { data } = await axios.get(
    `${BASE_URL}/v3/exchangeInfo?symbol=${symbol}`
  );
  return data.symbols[0].filters;
}
