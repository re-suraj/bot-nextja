export async function GET() {
  return Response.json({
    message:
      "Arbitrage bot is running in the background. See terminal for logs.",
  });
}
