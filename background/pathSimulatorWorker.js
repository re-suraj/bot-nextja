// - background/pathSimulatorWorker.js

import { parentPort, workerData } from "worker_threads";
import { simulateTriangularPath } from "../lib/binanceUtils.js";

const { priceMap, paths } = workerData;

const profitable = [];

for (const path of paths) {
  if (path.every((hop) => priceMap[hop.symbol])) {
    const result = simulateTriangularPath(path, priceMap);
    if (result?.isProfitable) profitable.push(result);
  }
}

parentPort.postMessage(profitable);
