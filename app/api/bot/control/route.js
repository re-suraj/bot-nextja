import { NextResponse } from "next/server";
import { startBot, stopBot, getBotState } from "@/app/lib/serverBot";

export async function POST(request) {
  try {
    const { action } = await request.json();
    
    if (action === "start") {
      const result = startBot();
      return NextResponse.json(result);
    } else if (action === "stop") {
      const result = stopBot();
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Bot control error:", error);
    return NextResponse.json(
      { error: "Failed to control bot" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const state = getBotState();
    return NextResponse.json(state);
  } catch (error) {
    console.error("Error getting bot state:", error);
    return NextResponse.json(
      { error: "Failed to get bot state" },
      { status: 500 }
    );
  }
} 