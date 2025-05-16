import { NextResponse } from "next/server";
import { oandaPut } from "@/app/lib/oanda";

const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;

export async function DELETE(request, { params }) {
  const { tradeId } = params;

  try {
    // Close the trade using OANDA's API
    const response = await oandaPut(
      `/v3/accounts/${ACCOUNT_ID}/trades/${tradeId}/close`,
      {
        units: "ALL"
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || "Failed to close trade" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error closing trade:", error);
    return NextResponse.json(
      { error: "Failed to close trade" },
      { status: 500 }
    );
  }
} 