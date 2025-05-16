import { NextResponse } from "next/server";
import { serverBot } from "../../../lib/serverBot";

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "manage":
        await serverBot.manageProfits();
        return NextResponse.json({
          status: "success",
          message: "Profit management executed",
          stats: serverBot.getTradeStats()
        });

      case "stats":
        return NextResponse.json({
          status: "success",
          stats: serverBot.getTradeStats()
        });

      case "reset":
        serverBot.resetStats();
        return NextResponse.json({
          status: "success",
          message: "Trade statistics reset",
          stats: serverBot.getTradeStats()
        });

      default:
        return NextResponse.json({
          status: "error",
          message: "Invalid action specified"
        }, { status: 400 });
    }
  } catch (error) {
    console.error("Profit management error:", error);
    return NextResponse.json({
      status: "error",
      message: error.message
    }, { status: 500 });
  }
} 