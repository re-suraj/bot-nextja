import { NextResponse } from "next/server";
import { oandaGet, oandaPut, oandaDelete } from "@/app/lib/oanda";

const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;

export async function GET(request, { params }) {
  const { orderId } = params;

  try {
    const response = await oandaGet(
      `/v3/accounts/${ACCOUNT_ID}/orders/${orderId}`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const { orderId } = params;

  try {
    const body = await request.json();
    const response = await oandaPut(
      `/v3/accounts/${ACCOUNT_ID}/orders/${orderId}`,
      body
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { orderId } = params;

  try {
    const response = await oandaDelete(
      `/v3/accounts/${ACCOUNT_ID}/orders/${orderId}`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error cancelling order:", error);
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import { oandaGet, oandaPut } from "@/app/lib/oanda";

// const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;

export async function PATCH(request, { params }) {
  const { orderSpecifier } = params;

  try {
    // Close the trade using OANDA's API
    const response = await oandaGet(
      `/v3/accounts/${ACCOUNT_ID}/orders/${orderSpecifier}`
    );
    console.log(" -------- response ", orderSpecifier, response);
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || "Failed to close trade" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error closing trade:", error);
    return NextResponse.json(
      { error: "Failed to close trade" },
      { status: 500 }
    );
  }
}
