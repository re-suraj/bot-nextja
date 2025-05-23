// lib/getValidQuantityForPath.js

import { getSymbolFilters } from "./binanceUtils.js";

/**
 * Local symbol filter cache
 */
const symbolFiltersCache = {};

/**
 * Rounds quantity to comply with step size
 */
function roundToStepSize(qty, stepSize) {
  const precision = Math.ceil(Math.abs(Math.log10(stepSize)));
  return parseFloat((Math.floor(qty / stepSize) * stepSize).toFixed(precision));
}

/**
 * Cached version of getSymbolFilters with rate limit protection
 */
async function getCachedSymbolFilters(symbol, countWeight) {
  if (symbolFiltersCache[symbol]) return symbolFiltersCache[symbol];
  if (!countWeight(10)) return null;

  try {
    const filters = await getSymbolFilters(symbol);
    symbolFiltersCache[symbol] = filters;
    return filters;
  } catch (err) {
    console.warn(`❌ Failed to fetch filters for ${symbol}:`, err.message);
    return null;
  }
}

/**
 * Simulates the full path using a starting USDT amount and checks:
 * - If each hop produces a valid quantity
 * - If final result is profitable
 */
export async function getValidQuantityForPath(
  path,
  priceMap,
  initialUSDT = 50,
  fee = 0.001,
  countWeight = () => true
) {
  let currentAmount = initialUSDT;

  for (let i = 0; i < path.length; i++) {
    const hop = path[i];
    const { symbol, direction } = hop;
    const price = priceMap[symbol];

    if (!price) {
      return { valid: false, reason: `Missing price for ${symbol}` };
    }

    const filters = await getCachedSymbolFilters(symbol, countWeight);
    if (!filters) {
      return { valid: false, reason: `Missing filters for ${symbol}` };
    }

    const lotSize = filters.find((f) => f.filterType === "LOT_SIZE");
    const stepSize = parseFloat(lotSize.stepSize);
    const minQty = parseFloat(lotSize.minQty);
    const maxQty = parseFloat(lotSize.maxQty);

    let qty;
    if (direction === "baseToQuote") {
      qty = roundToStepSize(currentAmount / price, stepSize);
    } else {
      qty = roundToStepSize(currentAmount, stepSize);
    }

    if (qty < minQty || qty > maxQty || qty <= 0) {
      return {
        valid: false,
        reason: `Quantity ${qty} out of bounds for ${symbol}`,
        symbol,
        qty,
        minQty,
        maxQty,
      };
    }

    // Update amount for next hop
    if (direction === "baseToQuote") {
      currentAmount = qty * price * (1 - fee);
    } else {
      currentAmount = (qty / price) * (1 - fee);
    }
  }

  const profit = currentAmount - initialUSDT;
  const profitPercent = (profit / initialUSDT) * 100;

  return {
    valid: true,
    finalAmount: currentAmount,
    initialAmount: initialUSDT,
    profit,
    profitPercent,
  };
}
