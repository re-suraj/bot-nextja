import { getLatestPrices } from '../../../scripts/price-stream';

export async function GET() {
  const prices = getLatestPrices();
  return Response.json(prices);
} 