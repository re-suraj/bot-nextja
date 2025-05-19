import { NextResponse } from "next/server";
import { oandaGet } from "@/app/lib/oanda";

const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") || "OPEN";
    const count = searchParams.get("count") || "100";

    // Fetch trades from OANDA
    const response = await oandaGet(
      `/v3/accounts/${ACCOUNT_ID}/trades?state=${state}&count=${count}`
    );

    // if (!response.ok) {
    //   return NextResponse.json(
    //     { error: response.error || "Failed to fetch trades1" },
    //     { status: response.status || 500 }
    //   );
    // }

    // Transform the trades data
    const trades = response.trades.map((trade) => ({
      id: trade.id,
      instrument: trade.instrument,
      type: parseInt(trade.initialUnits) > 0 ? "BUY" : "SELL",
      units: Math.abs(parseInt(trade.initialUnits)),
      openPrice: parseFloat(trade.price),
      currentPrice:
        trade.state === "CLOSED"
          ? parseFloat(trade.averageClosePrice)
          : parseFloat(trade.price),
      pl: trade.state === "CLOSED" ? parseFloat(trade.realizedPL) : 0,
      state: trade.state,
      openTime: trade.openTime,
      closeTime: trade.closeTime,
      marginRequired: parseFloat(trade.initialMarginRequired),
      financing: parseFloat(trade.financing),
      dividendAdjustment: parseFloat(trade.dividendAdjustment),
    }));

    return NextResponse.json({
      trades,
      lastTransactionID: response.lastTransactionID,
    });
  } catch (error) {
    console.error("Error fetching trades:", error);
    return NextResponse.json(
      { error: "Failed to fetch trades2" },
      { status: 500 }
    );
  }
}
