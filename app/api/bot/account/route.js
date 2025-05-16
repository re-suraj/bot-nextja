import { getAccountSummary } from "@/app/lib/serverBot";

export async function GET() {
  try {
    const accountSummary = await getAccountSummary();
    return Response.json(accountSummary);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 