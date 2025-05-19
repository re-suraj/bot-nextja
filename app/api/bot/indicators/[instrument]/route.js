// app/api/bot/indicators/[instrument]/route.js
// import { getCandles, calculateIndicators } from "../../../../../lib/helpers";

import { calculateIndicators, getCandles } from "@/app/lib/helpers";

export async function GET(request, { params }) {
  try {
    const { instrument } = params;
    const candles = await getCandles(instrument);
    const indicators = calculateIndicators(candles);
    const rsiValues = indicators.rsi.slice(-6); // Last 6 candles
    const labels = ["T-5", "T-4", "T-3", "T-2", "T-1", "Now"];
    return new Response(JSON.stringify({ labels, values: rsiValues }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
