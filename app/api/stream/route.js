import { startStream, subscribeClient } from "@/app/lib/oandaStream";
import { NextResponse } from "next/server";
// import { startStream, subscribeClient } from "@/lib/oandaStream";

export async function GET(req) {
  startStream();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeClient((msg) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
      });

      req.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
