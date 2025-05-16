// pages/api/trade.js
import { oandaGet, oandaPost, ACCOUNT_ID } from "../../../lib/oanda";
import { NextResponse } from "next/server";
import { NYSessionStrategy } from "../../../lib/strategies/nySessionStrategy";
import { TRADING_PARAMS } from "../../../config/instruments";

export async function POST(request) {
  try {
    const body = await request.json();
    const { instrument = "EUR_USD", unitsSize = 100 } = body;

    // Validate input
    if (!instrument || !unitsSize) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          details: "instrument and unitsSize are required",
        },
        { status: 400 }
      );
    }

    // Initialize NY Session Strategy
    const nyStrategy = new NYSessionStrategy();

    // Check if we're in NY session
    if (!nyStrategy.isNYSession()) {
      return NextResponse.json({
        status: "no_session",
        message: "Outside of New York trading session hours",
      });
    }

    // 1. Fetch historical candles for analysis
    const candlesRes = await oandaGet(
      `/v3/instruments/${instrument}/candles?count=400&granularity=M1`
    );

    // Filter and process candle data
    const prices = candlesRes.candles
      .filter((c) => c.complete)
      .map((c) => parseFloat(c.mid.c));

    if (prices.length < 30) {
      return NextResponse.json(
        {
          error: "Insufficient data",
          details: "Not enough candle data for analysis",
        },
        { status: 400 }
      );
    }

    // Calculate indicators using NY Session Strategy
    const indicators = nyStrategy.calculateIndicators(prices);
    const curr = prices.length - 1;

    // Check for trade signals
    let tradeDirection = null;
    let tradeParams = null;

    if (nyStrategy.shouldEnterLong(indicators, curr)) {
      tradeDirection = "BUY";
      tradeParams = nyStrategy.getTradeParameters(prices[curr], "long", indicators.atr);
    } else if (nyStrategy.shouldEnterShort(indicators, curr)) {
      tradeDirection = "SELL";
      tradeParams = nyStrategy.getTradeParameters(prices[curr], "short", indicators.atr);
    }

    // Execute trade if there's a signal
    if (tradeDirection) {
      const order = {
        order: {
          units: tradeDirection === "BUY" ? unitsSize.toString() : (-unitsSize).toString(),
          instrument: instrument,
          timeInForce: "FOK",
          type: "MARKET",
          positionFill: "DEFAULT",
          stopLossOnFill: {
            price: tradeParams.stopLoss.toFixed(5),
            timeInForce: "GTC",
          },
          takeProfitOnFill: {
            price: tradeParams.takeProfit.toFixed(5),
            timeInForce: "GTC",
          },
        },
      };

      const tradeResponse = await oandaPost(
        `/v3/accounts/${ACCOUNT_ID}/orders`,
        order
      );

      return NextResponse.json({
        status: "success",
        tradeType: tradeDirection,
        order: tradeResponse.orderCreateTransaction,
        analysis: {
          entryPrice: prices[curr],
          stopLoss: tradeParams.stopLoss,
          takeProfit: tradeParams.takeProfit,
          rsi: indicators.rsi[curr],
          adx: indicators.adx[curr],
        },
      });
    }

    // No trade signal
    return NextResponse.json({
      status: "no_signal",
      analysis: {
        lastPrice: prices[curr],
        rsi: indicators.rsi[curr],
        adx: indicators.adx[curr],
      },
    });
  } catch (error) {
    console.error("Trade execution error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute trade",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
