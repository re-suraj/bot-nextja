import { OANDA_API_KEY, OANDA_ACCOUNT_ID, OANDA_API_URL } from "@/app/config/env";

export async function DELETE(request, { params }) {
  try {
    const { tradeId } = params;
    
    const response = await fetch(
      `${OANDA_API_URL}/v3/accounts/${OANDA_ACCOUNT_ID}/trades/${tradeId}/close`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${OANDA_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json(
        { error: errorData.errorMessage || "Failed to close trade" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("Error closing trade:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 