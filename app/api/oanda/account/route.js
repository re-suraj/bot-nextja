// pages/api/account.js
import { NextResponse } from "next/server";
import { oandaGet } from "@/app/lib/oanda";

const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    // Fetch account details from OANDA
    const response = await oandaGet(`/v3/accounts/${ACCOUNT_ID}`);

    // Transform the account data and convert numeric values
    const account = {
      id: response.account.id,
      alias: response.account.alias,
      currency: response.account.currency,
      createdByUserID: response.account.createdByUserID,
      createdTime: response.account.createdTime,
      guaranteedStopLossOrderMode: response.account.guaranteedStopLossOrderMode,
      marginRate: Number(response.account.marginRate) || 0,
      openTradeCount: Number(response.account.openTradeCount) || 0,
      openPositionCount: Number(response.account.openPositionCount) || 0,
      pendingOrderCount: Number(response.account.pendingOrderCount) || 0,
      hedgingEnabled: response.account.hedgingEnabled,
      unrealizedPL: Number(response.account.unrealizedPL) || 0,
      NAV: Number(response.account.NAV) || 0,
      marginUsed: Number(response.account.marginUsed) || 0,
      marginAvailable: Number(response.account.marginAvailable) || 0,
      positionValue: Number(response.account.positionValue) || 0,
      marginCloseoutUnrealizedPL: Number(response.account.marginCloseoutUnrealizedPL) || 0,
      marginCloseoutNAV: Number(response.account.marginCloseoutNAV) || 0,
      marginCloseoutMarginUsed: Number(response.account.marginCloseoutMarginUsed) || 0,
      marginCloseoutPercent: Number(response.account.marginCloseoutPercent) || 0,
      marginCloseoutPositionValue: Number(response.account.marginCloseoutPositionValue) || 0,
      withdrawalLimit: Number(response.account.withdrawalLimit) || 0,
      marginCallMarginUsed: Number(response.account.marginCallMarginUsed) || 0,
      marginCallPercent: Number(response.account.marginCallPercent) || 0,
      balance: Number(response.account.balance) || 0,
      pl: Number(response.account.pl) || 0,
      resettablePL: Number(response.account.resettablePL) || 0,
      financing: Number(response.account.financing) || 0,
      commission: Number(response.account.commission) || 0,
      dividendAdjustment: Number(response.account.dividendAdjustment) || 0,
      guaranteedExecutionFees: Number(response.account.guaranteedExecutionFees) || 0,
      marginCallEnterTime: response.account.marginCallEnterTime,
      marginCallExtensionCount: Number(response.account.marginCallExtensionCount) || 0,
      lastMarginCallExtensionTime: response.account.lastMarginCallExtensionTime,
      lastTransactionID: response.account.lastTransactionID,
    };

    return NextResponse.json(account);
  } catch (error) {
    console.error("Error fetching account details:", error);
    return NextResponse.json(
      { error: "Failed to fetch account details" },
      { status: 500 }
    );
  }
}
