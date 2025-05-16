import { NextResponse } from "next/server";
import { oandaGet, oandaPatch } from "@/app/lib/oanda";

const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const response = await oandaGet(`/v3/accounts/${ACCOUNT_ID}/configuration`);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching account configuration:", error);
    return NextResponse.json(
      { error: "Failed to fetch account configuration" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const response = await oandaPatch(
      `/v3/accounts/${ACCOUNT_ID}/configuration`,
      body
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating account configuration:", error);
    return NextResponse.json(
      { error: "Failed to update account configuration" },
      { status: 500 }
    );
  }
} 