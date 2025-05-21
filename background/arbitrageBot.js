// /background/arbitrageBot.js
import WebSocket from "ws";
import { Worker } from "worker_threads";
import {
  getTradablePairs,
  buildCurrencyGraph,
  findTriangularPaths,
  placeTestTrade,
} from "../lib/binanceUtils.js";

const priceMap = {};
let paths = [];
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

(async function startBot() {
  const pairs = await getTradablePairs();
  const graph = buildCurrencyGraph(pairs);
  paths = findTriangularPaths(graph);
  console.table(pairs.length);
  const uniqueSymbols = [
    ...new Set(paths.flat().map((p) => p.symbol.toLowerCase())),
  ];

  const symbolChunks = chunkArray(uniqueSymbols, 30); // 🔁 limit to ~30 per connection

  symbolChunks.forEach((chunk) => {
    const streamStr = chunk.map((s) => `${s}@ticker`).join("/");
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/stream?streams=${streamStr}`
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

  setInterval(() => {
    console.time("⏱️ Execution Time");
    const readyPaths = paths.filter((path) =>
      path.every((hop) => priceMap[hop.symbol])
    );
    // console.log(typeof priceMap);
    console.log(Object.keys(priceMap).length);
    const worker = new Worker(
      new URL("./pathSimulatorWorker.js", import.meta.url),
      {
        workerData: {
          priceMap: Object.fromEntries(Object.entries(priceMap)),
          paths: readyPaths,
        },
      }
    );

    worker.on("message", async (profitablePaths) => {
      for (const result of profitablePaths.slice(0, 3)) {
        console.log("\n🚀 Arbitrage Opportunity:");
        console.log("Profit:", result.profit.toFixed(4), "USDT");
        console.log("Profit %:", result.profitPercent.toFixed(4));
        console.log(
          result.profitPercent.toFixed(4) > 0.5
            ? "❌ ❌ ❌ ❌ ❌ ❌ Profit %:"
            : "",
          result.profitPercent.toFixed(4) > 0.5
            ? result.profitPercent.toFixed(4)
            : ""
        );
        console.log("Final Amount:", result.finalAmount.toFixed(4), "USDT");
        console.table(result.path);
        result.path.forEach((hop, idx) => {
          console.log(
            `  ${idx + 1}. ${
              hop.direction === "baseToQuote"
                ? hop.symbol
                : hop.symbol + " (inverse)"
            }`
          );
        });

        const firstHop = result.path[0];
        const side = firstHop.direction === "baseToQuote" ? "BUY" : "SELL";
        const tradeAmount = 10; // Adjust this as needed

        await placeTestTrade(firstHop.symbol, side, tradeAmount);
      }
    });

    worker.on("error", (err) => console.error("Worker error:", err));
    console.timeEnd("⏱️ Execution Time");
  }, 1000);
})();
