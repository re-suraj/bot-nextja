import { subscribeToLogs } from "@/app/lib/serverBot";

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      console.log("Starting log subscription...");
      const unsubscribe = subscribeToLogs((log) => {
        console.log("Received log:", log);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(log)}\n\n`));
      });
      return () => {
        console.log("Unsubscribing from logs...");
        unsubscribe();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
