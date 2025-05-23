// /lib/workerPool.js
import { Worker } from "worker_threads";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = new URL(
  "../background/pathSimulatorWorker.js",
  import.meta.url
);

export class WorkerPool {
  constructor(poolSize = 4) {
    this.poolSize = poolSize;
    this.workers = [];
    this.idleWorkers = [];
    this.taskQueue = [];

    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerPath);
      worker.on("message", (result) => this._handleResult(worker, result));
      worker.on("error", (err) => this._handleError(worker, err));
      this.workers.push(worker);
      this.idleWorkers.push(worker);
    }
  }

  _handleResult(worker, result) {
    const { resolve } = worker.currentTask;
    worker.currentTask = null;
    this.idleWorkers.push(worker);
    resolve(result);
    this._processQueue();
  }

  _handleError(worker, error) {
    const { reject } = worker.currentTask || {};
    worker.currentTask = null;
    this.idleWorkers.push(worker);
    if (reject) reject(error);
    this._processQueue();
  }

  _processQueue() {
    if (this.taskQueue.length === 0 || this.idleWorkers.length === 0) return;
    const { data, resolve, reject } = this.taskQueue.shift();
    const worker = this.idleWorkers.shift();
    worker.currentTask = { resolve, reject };
    worker.postMessage(data);
  }

  run(data) {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ data, resolve, reject });
      this._processQueue();
    });
  }

  async destroy() {
    await Promise.all(this.workers.map((worker) => worker.terminate()));
  }
}
