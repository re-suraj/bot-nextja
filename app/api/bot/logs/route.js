import { NextResponse } from "next/server";
import { subscribeToLogs } from "@/app/lib/serverBot";

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeToLogs((log) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(log)}\n\n`));
      });

      // Clean up subscription when the connection is closed
      return () => {
        unsubscribe();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
} 