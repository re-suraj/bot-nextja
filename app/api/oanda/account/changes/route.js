import { NextResponse } from "next/server";
import { oandaGet } from "@/app/lib/oanda";

const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sinceTransactionID = searchParams.get("sinceTransactionID");

    if (!sinceTransactionID) {
      return NextResponse.json(
        { error: "sinceTransactionID is required" },
        { status: 400 }
      );
    }

    const response = await oandaGet(
      `/v3/accounts/${ACCOUNT_ID}/changes?sinceTransactionID=${sinceTransactionID}`
    );

    // Transform the changes data
    const changes = {
      state: {
        unrealizedPL: Number(response.state.unrealizedPL) || 0,
        NAV: Number(response.state.NAV) || 0,
        marginUsed: Number(response.state.marginUsed) || 0,
        marginAvailable: Number(response.state.marginAvailable) || 0,
        positionValue: Number(response.state.positionValue) || 0,
        marginCloseoutUnrealizedPL: Number(response.state.marginCloseoutUnrealizedPL) || 0,
        marginCloseoutNAV: Number(response.state.marginCloseoutNAV) || 0,
        marginCloseoutMarginUsed: Number(response.state.marginCloseoutMarginUsed) || 0,
        marginCloseoutPercent: Number(response.state.marginCloseoutPercent) || 0,
        marginCloseoutPositionValue: Number(response.state.marginCloseoutPositionValue) || 0,
        withdrawalLimit: Number(response.state.withdrawalLimit) || 0,
        marginCallMarginUsed: Number(response.state.marginCallMarginUsed) || 0,
        marginCallPercent: Number(response.state.marginCallPercent) || 0,
        balance: Number(response.state.balance) || 0,
        pl: Number(response.state.pl) || 0,
        resettablePL: Number(response.state.resettablePL) || 0,
        financing: Number(response.state.financing) || 0,
        commission: Number(response.state.commission) || 0,
        dividendAdjustment: Number(response.state.dividendAdjustment) || 0,
        guaranteedExecutionFees: Number(response.state.guaranteedExecutionFees) || 0,
        marginCallEnterTime: response.state.marginCallEnterTime,
        marginCallExtensionCount: Number(response.state.marginCallExtensionCount) || 0,
        lastMarginCallExtensionTime: response.state.lastMarginCallExtensionTime,
      },
      orders: response.orders || [],
      trades: response.trades || [],
      positions: response.positions || [],
    };

    return NextResponse.json(changes);
  } catch (error) {
    console.error("Error fetching account changes:", error);
    return NextResponse.json(
      { error: "Failed to fetch account changes" },
      { status: 500 }
    );
  }
} 