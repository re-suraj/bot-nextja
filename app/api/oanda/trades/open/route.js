import { NextResponse } from "next/server";
import { oandaGet } from "@/app/lib/oanda";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const response = await oandaGet(`/v3/accounts/${process.env.OANDA_ACCOUNT_ID}/openTrades`);
    
    // Transform the trades data
    const trades = response.trades.map(trade => ({
      id: trade.id,
      instrument: trade.instrument,
      price: trade.price,
      currentUnits: trade.currentUnits,
      initialUnits: trade.initialUnits,
      state: trade.state,
      openTime: trade.openTime,
      unrealizedPL: trade.unrealizedPL,
      pl: trade.pl,
      long: trade.long,
      short: trade.short,
      marginUsed: trade.marginUsed
    }));

    return NextResponse.json({ trades });
  } catch (error) {
    console.error("Error fetching open trades:", error);
    return NextResponse.json(
      { error: "Failed to fetch open trades" },
      { status: 500 }
    );
  }
} 