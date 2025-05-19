import { NextResponse } from "next/server";
import { oandaGet, oandaPost } from "@/app/lib/oanda";
import {
  getBotState,
  startBot,
  stopBot,
  updateBotState,
  updatePerformance,
  getStrategy,
  getAllStrategies,
  enableStrategy,
  disableStrategy,
  updateStrategyParameters,
  executeTrade,
  closePosition,
  monitorPositions,
  analyzeMarket
} from "@/app/lib/botState";

const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Map display names to strategy keys
function getStrategyKey(displayName) {
  const strategyMap = {
    "Moving Average Crossover": "movingAverageCrossover",
    "RSI Strategy": "rsiStrategy",
    "Bollinger Bands": "bollingerBands",
    "MACD Strategy": "macdStrategy"
  };
  return strategyMap[displayName] || displayName;
}

// Get bot status and configuration
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    console.log("Bot GET request:", { action });

    switch (action) {
      case "status":
        // Get current bot status
        const state = getBotState();
        console.log("Current bot state:", state);
        return NextResponse.json(state);

      case "config":
        // Get bot configuration
        const strategies = getAllStrategies();
        console.log("Bot configuration:", { strategies });
        return NextResponse.json({
          strategies,
          riskManagement: {
            maxOpenTrades: 3,
            maxRiskPerTrade: 0.02, // 2% of account
            stopLoss: 50, // pips
            takeProfit: 100, // pips
          },
        });

      case "positions":
        // Get current open positions
        const positions = getBotState().openPositions;
        return NextResponse.json({ positions });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in bot route:", error);
    return NextResponse.json(
      { error: "Failed to process bot request" },
      { status: 500 }
    );
  }
}

// Update bot configuration or execute actions
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    console.log("Bot POST request:", { action, data });

    switch (action) {
      case "start":
        // Start the trading bot
        const startedState = startBot();
        console.log("Bot started:", startedState);
        return NextResponse.json({
          status: "started",
          message: "Trading bot started successfully",
          state: startedState,
          timestamp: new Date().toISOString(),
        });

      case "stop":
        // Stop the trading bot
        const stoppedState = stopBot();
        console.log("Bot stopped:", stoppedState);
        return NextResponse.json({
          status: "stopped",
          message: "Trading bot stopped successfully",
          state: stoppedState,
          timestamp: new Date().toISOString(),
        });

      case "updateConfig":
        // Update bot configuration
        const { strategyName, updates } = data;
        const strategyKey = getStrategyKey(strategyName);
        console.log("Updating strategy config:", { strategyName, strategyKey, updates });

        let updatedState = null;

        if (updates.enabled !== undefined) {
          if (updates.enabled) {
            updatedState = enableStrategy(strategyKey);
            console.log("Strategy enabled:", strategyKey);
          } else {
            updatedState = disableStrategy(strategyKey);
            console.log("Strategy disabled:", strategyKey);
          }
        }

        if (updates.parameters) {
          updatedState = updateStrategyParameters(strategyKey, updates.parameters);
          console.log("Strategy parameters updated:", strategyKey);
        }

        if (!updatedState) {
          console.error("Failed to update strategy:", strategyKey);
          return NextResponse.json(
            { error: "Failed to update strategy configuration" },
            { status: 400 }
          );
        }

        console.log("Updated bot state:", updatedState);
        return NextResponse.json({
          status: "updated",
          message: "Configuration updated successfully",
          state: updatedState,
          timestamp: new Date().toISOString(),
        });

      case "executeStrategy":
        // Execute a specific trading strategy
        const { strategy, instrument, direction, units } = data;
        console.log("Executing strategy:", {
          strategy,
          instrument,
          direction,
          units,
        });

        // Create the order
        const order = {
          order: {
            units: direction === "BUY" ? units : -units,
            instrument: instrument,
            timeInForce: "FOK",
            type: "MARKET",
            positionFill: "DEFAULT",
          },
        };

        const response = await oandaPost(
          `/v3/accounts/${ACCOUNT_ID}/orders`,
          order
        );

        // Execute trade in bot state
        const position = await executeTrade(direction, instrument, units);
        console.log("Trade executed:", position);

        // Update performance metrics
        const trade = {
          profit: response.pl || 0,
          instrument: instrument,
          direction: direction,
          units: units,
        };
        const updatedPerformance = updatePerformance(trade);

        return NextResponse.json({
          status: "executed",
          message: "Strategy executed successfully",
          order: response,
          position,
          performance: updatedPerformance.performance,
          timestamp: new Date().toISOString(),
        });

      case "closePosition":
        // Close a specific position
        const { positionId } = data;
        const closedPosition = await closePosition(positionId);
        
        if (!closedPosition) {
          return NextResponse.json(
            { error: "Position not found" },
            { status: 404 }
          );
        }

        // Create the close order
        const closeOrder = {
          order: {
            units: -closedPosition.units,
            instrument: closedPosition.instrument,
            timeInForce: "FOK",
            type: "MARKET",
            positionFill: "DEFAULT",
          },
        };

        const closeResponse = await oandaPost(
          `/v3/accounts/${ACCOUNT_ID}/orders`,
          closeOrder
        );

        return NextResponse.json({
          status: "closed",
          message: "Position closed successfully",
          position: closedPosition,
          order: closeResponse,
          timestamp: new Date().toISOString(),
        });

      case "monitor":
        // Monitor open positions
        const { currentPrices } = data;
        const monitoredState = await monitorPositions(currentPrices);
        
        return NextResponse.json({
          status: "monitored",
          message: "Positions monitored successfully",
          state: monitoredState,
          timestamp: new Date().toISOString(),
        });

      case "analyze":
        // Analyze market conditions
        const { candles, instrument: analyzeInstrument } = data;
        const signals = await analyzeMarket(candles, analyzeInstrument);
        
        return NextResponse.json({
          status: "analyzed",
          message: "Market analyzed successfully",
          signals,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in bot route:", error);
    return NextResponse.json(
      { error: "Failed to process bot request" },
      { status: 500 }
    );
  }
}

// Helper function to get default parameters for each strategy
function getDefaultParameters(strategyName) {
  switch (strategyName) {
    case "Moving Average Crossover":
      return {
        fastPeriod: 10,
        slowPeriod: 20,
        timeframe: "M15",
      };
    case "RSI Strategy":
      return {
        period: 14,
        overbought: 70,
        oversold: 30,
        timeframe: "M15",
      };
    case "Bollinger Bands":
      return {
        period: 20,
        stdDev: 2,
        timeframe: "M15",
      };
    case "MACD Strategy":
      return {
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        timeframe: "M15",
      };
    default:
      return {};
  }
}
