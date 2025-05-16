// pages/api/trade.js
import { oandaGet, oandaPost, ACCOUNT_ID } from "../../../lib/oanda";
import { NextResponse } from "next/server";

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

    // 1. Fetch historical candles for analysis
    const candlesRes = await oandaGet(
      `/v3/instruments/${instrument}/candles?count=40&granularity=M1`
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

    // 2. Compute moving averages
    const sma = (data, period) => {
      const slice = data.slice(-period);
      return slice.reduce((sum, val) => sum + val, 0) / period;
    };

    const maShort = sma(prices, 10);
    const maLong = sma(prices, 30);

    // 3. Determine trade direction
    let units = 0;
    let tradeType = "NONE";

    if (maShort > maLong) {
      units = unitsSize;
      tradeType = "BUY";
    } else if (maShort < maLong) {
      units = -unitsSize;
      tradeType = "SELL";
    }

    // 4. Execute trade if there's a signal
    if (units !== 0) {
      const order = {
        order: {
          units: units.toString(),
          instrument: instrument,
          timeInForce: "FOK",
          type: "MARKET",
          positionFill: "DEFAULT",
        },
      };

      const tradeResponse = await oandaPost(
        `/v3/accounts/${ACCOUNT_ID}/orders`,
        order
      );

      return NextResponse.json({
        status: "success",
        tradeType,
        order: tradeResponse.orderCreateTransaction,
        analysis: {
          shortMA: maShort,
          longMA: maLong,
          lastPrice: prices[prices.length - 1],
        },
      });
    }

    // No trade signal
    return NextResponse.json({
      status: "no_signal",
      analysis: {
        shortMA: maShort,
        longMA: maLong,
        lastPrice: prices[prices.length - 1],
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
