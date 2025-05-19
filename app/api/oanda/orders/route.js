import { NextResponse } from "next/server";
import { oandaGet, oandaPost } from "@/app/lib/oanda";

const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") || "PENDING";
    const count = searchParams.get("count") || "10";
    const beforeID = searchParams.get("beforeID") || "";

    // Build the URL with pagination parameters
    let url = `/v3/accounts/${ACCOUNT_ID}/orders?state=${state}&count=${count}`;
    if (beforeID) {
      url += `&beforeID=${beforeID}`;
    }

    // Fetch orders from OANDA
    const response = await oandaGet(url);

    // Transform the orders data
    const orders = response.orders.map(order => ({
      id: order.id,
      type: order.type,
      instrument: order.instrument,
      units: order.units,
      price: order.price,
      state: order.state,
      timeInForce: order.timeInForce,
      positionFill: order.positionFill,
      triggerCondition: order.triggerCondition,
      createTime: order.createTime,
      filledTime: order.filledTime,
      cancelledTime: order.cancelledTime,
      // Additional fields for specific order types
      ...(order.type === "MARKET" && {
        priceBound: order.priceBound,
      }),
      ...(order.type === "LIMIT" && {
        gtdTime: order.gtdTime,
      }),
      ...(order.type === "STOP" && {
        priceBound: order.priceBound,
        gtdTime: order.gtdTime,
      }),
      ...(order.type === "MARKET_IF_TOUCHED" && {
        priceBound: order.priceBound,
        gtdTime: order.gtdTime,
        initialMarketPrice: order.initialMarketPrice,
      }),
      ...(order.type === "TAKE_PROFIT" && {
        tradeID: order.tradeID,
        gtdTime: order.gtdTime,
      }),
      ...(order.type === "STOP_LOSS" && {
        tradeID: order.tradeID,
        distance: order.distance,
        gtdTime: order.gtdTime,
      }),
      ...(order.type === "GUARANTEED_STOP_LOSS" && {
        tradeID: order.tradeID,
        distance: order.distance,
        guaranteedExecutionPremium: order.guaranteedExecutionPremium,
        gtdTime: order.gtdTime,
      }),
      ...(order.type === "TRAILING_STOP_LOSS" && {
        tradeID: order.tradeID,
        distance: order.distance,
        trailingStopValue: order.trailingStopValue,
        gtdTime: order.gtdTime,
      }),
    }));

    return NextResponse.json({
      orders,
      lastTransactionID: response.lastTransactionID,
      hasMore: orders.length === parseInt(count),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      type = "MARKET",
      instrument,
      units,
      price,
      timeInForce = "GTC",
      positionFill = "DEFAULT",
      triggerCondition = "DEFAULT",
      priceBound,
      gtdTime,
      tradeID,
      distance,
      takeProfitOnFill,
      stopLossOnFill,
      guaranteedStopLossOnFill,
      trailingStopLossOnFill,
    } = body;

    // Validate required fields based on order type
    if (!instrument || !units) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          details: "instrument and units are required",
        },
        { status: 400 }
      );
    }

    // Prepare order request
    const orderRequest = {
      order: {
        type,
        instrument,
        units: units.toString(),
        timeInForce,
        positionFill,
        triggerCondition,
      },
    };

    // Add type-specific fields
    switch (type) {
      case "MARKET":
        if (priceBound) orderRequest.order.priceBound = priceBound;
        break;
      case "LIMIT":
        if (!price) {
          return NextResponse.json(
            { error: "Price is required for Limit orders" },
            { status: 400 }
          );
        }
        orderRequest.order.price = price;
        if (gtdTime) orderRequest.order.gtdTime = gtdTime;
        break;
      case "STOP":
        if (!price) {
          return NextResponse.json(
            { error: "Price is required for Stop orders" },
            { status: 400 }
          );
        }
        orderRequest.order.price = price;
        if (priceBound) orderRequest.order.priceBound = priceBound;
        if (gtdTime) orderRequest.order.gtdTime = gtdTime;
        break;
      case "MARKET_IF_TOUCHED":
        if (!price) {
          return NextResponse.json(
            { error: "Price is required for Market If Touched orders" },
            { status: 400 }
          );
        }
        orderRequest.order.price = price;
        if (priceBound) orderRequest.order.priceBound = priceBound;
        if (gtdTime) orderRequest.order.gtdTime = gtdTime;
        break;
      case "TAKE_PROFIT":
        if (!tradeID || !price) {
          return NextResponse.json(
            { error: "TradeID and price are required for Take Profit orders" },
            { status: 400 }
          );
        }
        orderRequest.order.tradeID = tradeID;
        orderRequest.order.price = price;
        if (gtdTime) orderRequest.order.gtdTime = gtdTime;
        break;
      case "STOP_LOSS":
        if (!tradeID || (!price && !distance)) {
          return NextResponse.json(
            { error: "TradeID and either price or distance are required for Stop Loss orders" },
            { status: 400 }
          );
        }
        orderRequest.order.tradeID = tradeID;
        if (price) orderRequest.order.price = price;
        if (distance) orderRequest.order.distance = distance;
        if (gtdTime) orderRequest.order.gtdTime = gtdTime;
        break;
      case "GUARANTEED_STOP_LOSS":
        if (!tradeID || (!price && !distance)) {
          return NextResponse.json(
            { error: "TradeID and either price or distance are required for Guaranteed Stop Loss orders" },
            { status: 400 }
          );
        }
        orderRequest.order.tradeID = tradeID;
        if (price) orderRequest.order.price = price;
        if (distance) orderRequest.order.distance = distance;
        if (gtdTime) orderRequest.order.gtdTime = gtdTime;
        break;
      case "TRAILING_STOP_LOSS":
        if (!tradeID || !distance) {
          return NextResponse.json(
            { error: "TradeID and distance are required for Trailing Stop Loss orders" },
            { status: 400 }
          );
        }
        orderRequest.order.tradeID = tradeID;
        orderRequest.order.distance = distance;
        if (gtdTime) orderRequest.order.gtdTime = gtdTime;
        break;
    }

    // Add optional fields if provided
    if (takeProfitOnFill) orderRequest.order.takeProfitOnFill = takeProfitOnFill;
    if (stopLossOnFill) orderRequest.order.stopLossOnFill = stopLossOnFill;
    if (guaranteedStopLossOnFill) orderRequest.order.guaranteedStopLossOnFill = guaranteedStopLossOnFill;
    if (trailingStopLossOnFill) orderRequest.order.trailingStopLossOnFill = trailingStopLossOnFill;

    // Create order
    const response = await oandaPost(
      `/v3/accounts/${ACCOUNT_ID}/orders`,
      orderRequest
    );

    return NextResponse.json({
      status: "success",
      order: response.orderCreateTransaction,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      {
        error: "Failed to create order",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
