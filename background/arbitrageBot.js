import WebSocket from "ws";
import fs from "fs";
import path from "path";
import {
  getTradablePairs,
  buildCurrencyGraph,
  findTriangularPaths,
  placeTestTrade,
  getAccountBalances,
  getSymbolFilters,
} from "../lib/binanceUtils.js";
import { getValidQuantityForPath } from "../lib/getValidQuantityForPath.js";

const priceMap = {};
let paths = [];
const TRADE_COOLDOWN_MS = 30000;
const recentlyTradedSymbols = new Set();
const symbolFiltersCache = {};
let cachedBalances = {};
let lastBalanceFetch = 0;
let requestWeight = 0;
const MAX_WEIGHT_PER_MIN = 5900;
const MAX_PRICE_DEVIATION = 0.5;
const MAX_SIMULATED_PROFIT_PERCENT = 50;
const executedPathCache = new Set();

function decayRequestWeight() {
  requestWeight = Math.max(0, requestWeight - 1000);
  setTimeout(decayRequestWeight, 15000);
}
decayRequestWeight();

function countWeight(w) {
  requestWeight += w;
  if (requestWeight >= MAX_WEIGHT_PER_MIN) {
    console.warn("⛔ Rate limit near exceeded. Skipping execution this cycle.");
    return false;
  }
  return true;
}

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function parseSymbol(symbol) {
  const knownQuotes = ["USDT", "BTC", "ETH", "BNB", "BUSD", "TUSD", "USDC"];
  for (const quote of knownQuotes) {
    if (symbol.endsWith(quote)) {
      return {
        baseAsset: symbol.slice(0, symbol.length - quote.length),
        quoteAsset: quote,
      };
    }
  }
  return {
    baseAsset: symbol.slice(0, -3),
    quoteAsset: symbol.slice(-3),
  };
}

function hasSufficientBalance(symbol, side, qty, price, balances) {
  const { baseAsset, quoteAsset } = parseSymbol(symbol);
  const required = side === "BUY" ? qty * price : qty;
  const asset = side === "BUY" ? quoteAsset : baseAsset;
  const available = balances[asset] || 0;

  if (parseFloat(required.toFixed(8)) > available) {
    return {
      ok: false,
      reason: `Not enough balance for ${symbol}`,
      required,
      available,
      asset,
    };
  }

  return { ok: true };
}

function markSymbolTraded(symbol) {
  recentlyTradedSymbols.add(symbol);
  setTimeout(() => recentlyTradedSymbols.delete(symbol), TRADE_COOLDOWN_MS);
}

function isPathRecentlyTraded(path) {
  return path.some((hop) => recentlyTradedSymbols.has(hop.symbol));
}

function isPathAlreadyExecuted(path) {
  const key = path.map((hop) => hop.symbol + hop.direction).join("->");
  return executedPathCache.has(key);
}

function markPathExecuted(path) {
  const key = path.map((hop) => hop.symbol + hop.direction).join("->");
  executedPathCache.add(key);
  setTimeout(() => executedPathCache.delete(key), 5 * 60 * 1000); // Clear after 5 minutes
}

async function getCachedBalances() {
  const now = Date.now();
  if (now - lastBalanceFetch > 10000) {
    if (!countWeight(10)) return cachedBalances;
    const fresh = await getAccountBalances();
    cachedBalances = Object.fromEntries(
      fresh
        .filter((b) => parseFloat(b.free) > 0)
        .map((b) => [b.asset, parseFloat(b.free)])
    );
    lastBalanceFetch = now;
  }
  return cachedBalances;
}

function logOrderSummary(trade) {
  const qty = parseFloat(trade.executedQty);
  const received = parseFloat(trade.cummulativeQuoteQty);
  const avgPrice = received / qty;
  console.log(`\n✅ Order Summary: ${trade.side} ${qty} ${trade.symbol}`);
  console.log(`💸 Received: ${received.toFixed(6)} USDT`);
  console.log(`💱 Avg Execution Price: ${avgPrice.toFixed(6)} USDT`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const filtersPath = path.resolve("./data/symbolFilters.json");
if (fs.existsSync(filtersPath)) {
  const filtersJson = JSON.parse(fs.readFileSync(filtersPath, "utf-8"));
  Object.entries(filtersJson).forEach(([symbol, filters]) => {
    symbolFiltersCache[symbol] = filters;
  });
  console.log(
    `✅ Preloaded ${
      Object.keys(symbolFiltersCache).length
    } symbol filters from JSON.`
  );
} else {
  console.warn("⚠️ No symbolFilters.json found. Trade filtering may fail.");
}

(async function startBot() {
  console.log("🚀 Starting arbitrage bot...");

  if (!countWeight(10)) return;

  const pairs = await getTradablePairs();
  const graph = buildCurrencyGraph(pairs);
  // console.log(" ---------- graph ", graph);
  paths = findTriangularPaths(graph);

  // console.log(paths);
  // return;
  if (paths.length === 0) return;

  const allSymbols = [...new Set(paths.flat().map((p) => p.symbol))];
  let preloadCount = 0;

  for (const symbol of allSymbols) {
    if (!symbolFiltersCache[symbol]) {
      if (!countWeight(10)) {
        console.warn("⚠️ Rate limit hit while preloading symbol filters.");
        break;
      }
      try {
        const filters = await getSymbolFilters(symbol);
        symbolFiltersCache[symbol] = filters;
        preloadCount++;
      } catch (err) {
        console.warn(
          `❌ Failed to preload filters for ${symbol}: ${err.message}`
        );
      }
      await sleep(150);
    }
  }

  console.log(`✅ Preloaded ${preloadCount} new symbol filters.`);
  fs.writeFileSync(filtersPath, JSON.stringify(symbolFiltersCache, null, 2));

  const uniqueSymbols = [
    ...new Set(paths.flat().map((p) => p.symbol.toLowerCase())),
  ];
  const symbolChunks = chunkArray(uniqueSymbols, 30);

  symbolChunks.forEach((chunk) => {
    const streamStr = chunk.map((s) => `${s}@ticker`).join("/");
    const ws = new WebSocket(
      `wss://stream.testnet.binance.vision:9443/stream?streams=${streamStr}`
    );

    ws.on("message", (data) => {
      const msg = JSON.parse(data);
      const symbol = msg?.data?.s;
      const price = parseFloat(msg?.data?.c);
      if (symbol && price && priceMap[symbol] !== price) {
        priceMap[symbol] = price;
      }
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err.message);
    });
  });

  setInterval(async () => {
    if (requestWeight >= MAX_WEIGHT_PER_MIN) return;

    const readyPaths = paths.filter((path) =>
      path.every((hop) => priceMap[hop.symbol])
    );

    // const seen = new Set();

    // const readyPaths = paths
    //   .filter((path) => path.every((hop) => priceMap[hop.symbol]))
    //   .filter((path) => {
    //     const key = path.map((hop) => hop.symbol).join("->");
    //     if (seen.has(key)) return false;
    //     seen.add(key);
    //     return true;
    //   });
    for (const path of readyPaths) {
      if (isPathRecentlyTraded(path)) continue;
      if (isPathAlreadyExecuted(path)) continue;

      const simulation = await getValidQuantityForPath(
        path,
        priceMap,
        50,
        0.001,
        countWeight
      );
      if (
        !simulation.valid ||
        simulation.profit < 0.1 ||
        simulation.profitPercent > MAX_SIMULATED_PROFIT_PERCENT
      )
        continue;

      // (existing execution logic continues)
      // console.log(`✅ Profitable path found!`);
      // console.log(`Profit: ${simulation.profit.toFixed(4)} USDT`);
      // console.log(`Profit %: ${simulation.profitPercent.toFixed(2)}%`);

      console.table(path);
      // console.log(readyPaths);

      let currentAmount = simulation.initialAmount;
      const balances = await getCachedBalances();
      let pathFailed = false;

      for (let i = 0; i < path.length; i++) {
        const hop = path[i];

        const symbol = hop.symbol;
        const direction = hop.direction;
        const side = direction === "baseToQuote" ? "BUY" : "SELL";

        const livePrice = priceMap[symbol];
        const expectedPrice = hop.price || livePrice;
        const deviation =
          (Math.abs(livePrice - expectedPrice) / expectedPrice) * 100;

        // console.log(i, priceMap[symbol], " somple price ⚠️⚠️ hop ⚠️⚠️ ", hop);

        if (deviation > MAX_PRICE_DEVIATION) {
          console.log(
            `⚠️ Skipped: ${symbol} price deviation too high (${deviation.toFixed(
              2
            )}%)`
          );
          pathFailed = true;
          break;
        }

        const filters = symbolFiltersCache[symbol];
        if (!filters) {
          console.warn(`⚠️ No filters for ${symbol}. Skipping.`);
          pathFailed = true;
          break;
        }

        const lotSize = filters.find((f) => f.filterType === "LOT_SIZE");
        const stepSize = parseFloat(lotSize.stepSize);
        const minQty = parseFloat(lotSize.minQty);
        const maxQty = parseFloat(lotSize.maxQty);
        const qty1 =
          side === "BUY"
            ? Math.floor(currentAmount / livePrice / stepSize) * stepSize
            : Math.floor(currentAmount / stepSize) * stepSize;
        const qty = Number(parseFloat(qty1).toFixed(8));
        if (isNaN(qty) || qty < minQty || qty > maxQty) {
          console.log(
            `⚠️ Skipped: Invalid qty ${qty} for ${symbol}. Limits: ${minQty}-${maxQty}`
          );
          pathFailed = true;
          break;
        }

        const balanceCheck = hasSufficientBalance(
          symbol,
          side,
          qty,
          livePrice,
          balances
        );
        if (!balanceCheck.ok) {
          console.log(
            `⚠️ Skipped: ${
              balanceCheck.reason
            }. Required: ${balanceCheck.required.toFixed(
              6
            )}, Available: ${balanceCheck.available.toFixed(6)}, Asset: ${
              balanceCheck.asset
            }, Quantity: ${qty}`
          );
          pathFailed = true;

          console.log("❌ Trade failed successfully.");
          process.exit(0); // Clean exit with status code 0 (success)
          break;
        }

        if (!countWeight(1)) {
          console.log("⏸️ Rate limit protection: Skipping trade this cycle.");
          pathFailed = true;
          break;
        }
        // console.log(
        //   " ------ symbol, direction, qty ,symbol : ",
        //   symbol,
        //   ", direction : ",
        //   side,
        //   ", qty : ",
        //   qty
        // );

        return;
        const tradeResponse = await placeTestTrade(symbol, side, qty);
        console.log(
          tradeResponse.status !== "FILLED",
          " ------  tradeResponse.status ",
          tradeResponse.status
        );
        if (!tradeResponse || tradeResponse.status !== "FILLED") {
          console.log(`❌ Failed at hop ${i + 1}`);
          pathFailed = true;
          break;
        }

        logOrderSummary(tradeResponse);
        markSymbolTraded(symbol);

        currentAmount =
          side === "BUY"
            ? parseFloat(tradeResponse.cummulativeQuoteQty)
            : parseFloat(tradeResponse.executedQty);

        currentAmount *= 0.98;
      }

      if (pathFailed) continue;
      console.log(
        pathFailed,
        `✅ Arbitrage path completed successfully. Final amount: ${currentAmount.toFixed(
          6
        )} USDT`
      );
      // break;
      console.log("✅ Trade completed successfully.");
      process.exit(0); // Clean exit with status code 0 (success)
    }
  }, 1500);
})();
