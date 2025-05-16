// pages/api/candles.js
import { oandaGet } from "../../../lib/oanda";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const instrument = searchParams.get("instrument") || "EUR_USD";
  const granularity = searchParams.get("granularity") || "M5";
  const count = searchParams.get("count") || "100";

  try {
    // Validate input parameters
    if (!instrument || !granularity || !count) {
      return NextResponse.json({ 
        error: "Missing required parameters",
        details: "instrument, granularity, and count are required"
      }, { status: 400 });
    }

    // Fetch candles using the utility function
    const data = await oandaGet(
      `/v3/instruments/${instrument}/candles?granularity=${granularity}&count=${count}`
    );

    // Transform the response to include only necessary data
    const transformedData = {
      instrument: data.instrument,
      granularity: data.granularity,
      candles: data.candles.map(candle => ({
        time: candle.time,
        open: parseFloat(candle.mid.o),
        high: parseFloat(candle.mid.h),
        low: parseFloat(candle.mid.l),
        close: parseFloat(candle.mid.c),
        volume: candle.volume,
        complete: candle.complete
      }))
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Candles fetch error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch candle data",
      details: error.message
    }, { status: 500 });
  }
}
