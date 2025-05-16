import { NextResponse } from "next/server";
import { oandaGet } from "@/app/lib/oanda";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    // Fetch all accounts from OANDA
    const response = await oandaGet("/v3/accounts");

    // Transform the accounts data
    const accounts = response.accounts.map(account => ({
      id: account.id,
      tags: account.tags,
      currency: account.currency,
      createdByUserID: account.createdByUserID,
      createdTime: account.createdTime,
      marginRate: Number(account.marginRate) || 0,
      openTradeCount: Number(account.openTradeCount) || 0,
      openPositionCount: Number(account.openPositionCount) || 0,
      pendingOrderCount: Number(account.pendingOrderCount) || 0,
      hedgingEnabled: account.hedgingEnabled,
      unrealizedPL: Number(account.unrealizedPL) || 0,
      NAV: Number(account.NAV) || 0,
      marginUsed: Number(account.marginUsed) || 0,
      marginAvailable: Number(account.marginAvailable) || 0,
      positionValue: Number(account.positionValue) || 0,
      withdrawalLimit: Number(account.withdrawalLimit) || 0,
      marginCallMarginUsed: Number(account.marginCallMarginUsed) || 0,
      marginCallPercent: Number(account.marginCallPercent) || 0,
      balance: Number(account.balance) || 0,
      pl: Number(account.pl) || 0,
      resettablePL: Number(account.resettablePL) || 0,
      financing: Number(account.financing) || 0,
      commission: Number(account.commission) || 0,
      dividendAdjustment: Number(account.dividendAdjustment) || 0,
      guaranteedExecutionFees: Number(account.guaranteedExecutionFees) || 0,
      lastTransactionID: account.lastTransactionID
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
} 