import { NextResponse } from "next/server";
import { oandaGet } from "@/app/lib/oanda";

const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const instruments = searchParams.get("instruments");

    let url = `/v3/accounts/${ACCOUNT_ID}/instruments`;
    if (instruments) {
      url += `?instruments=${instruments}`;
    }

    const response = await oandaGet(url);

    // Transform the instruments data
    const transformedInstruments = response.instruments.map(instrument => ({
      name: instrument.name,
      type: instrument.type,
      displayName: instrument.displayName,
      pipLocation: instrument.pipLocation,
      displayPrecision: instrument.displayPrecision,
      tradeUnitsPrecision: instrument.tradeUnitsPrecision,
      minimumTradeSize: Number(instrument.minimumTradeSize) || 0,
      maximumTrailingStopDistance: Number(instrument.maximumTrailingStopDistance) || 0,
      minimumTrailingStopDistance: Number(instrument.minimumTrailingStopDistance) || 0,
      maximumPositionSize: Number(instrument.maximumPositionSize) || 0,
      maximumOrderUnits: Number(instrument.maximumOrderUnits) || 0,
      marginRate: Number(instrument.marginRate) || 0,
    }));

    return NextResponse.json({ instruments: transformedInstruments });
  } catch (error) {
    console.error("Error fetching account instruments:", error);
    return NextResponse.json(
      { error: "Failed to fetch account instruments" },
      { status: 500 }
    );
  }
} 