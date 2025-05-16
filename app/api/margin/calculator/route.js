import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
  try {
    const { exchange, symbol, quantity, price, productType, orderType } =
      await request.json();

    // Get the auth token from cookies
    const token = request.cookies.get("angel_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const config = {
      method: "post",
      url: "https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/getMargin",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": "CLIENT_LOCAL_IP",
        "X-ClientPublicIP": "CLIENT_PUBLIC_IP",
        "X-MACAddress": "MAC_ADDRESS",
        "X-PrivateKey": process.env.ANGEL_API_KEY,
      },
      data: {
        exchange,
        symbol,
        quantity: parseInt(quantity),
        price: parseFloat(price),
        productType,
        orderType,
        triggerPrice: 0,
        squareoff: 0,
        stoploss: 0,
        trailingStopLoss: 0
      },
    };

    const response = await axios(config);
    console.log(" response ----- ", response);
    if (!response.data.status) {
      return NextResponse.json(
        { error: response.data.message || "Failed to calculate margin" },
        { status: 400 }
      );
    }

    // Transform the response to match our UI needs
    const marginData = response.data.data;
    return NextResponse.json({
      totalMarginRequired: marginData.totalMarginRequired || 0,
      availableMargin: marginData.availableMargin || 0,
      orderValue: marginData.orderValue || 0,
      marginBlocked: marginData.marginBlocked || 0,
      additionalMargin: marginData.additionalMargin || 0,
      leverage: marginData.leverage || 0,
      marginUtilized: marginData.marginUtilized || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(
      "Margin calculation error:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      {
        error: error.response?.data?.message || "Failed to calculate margin",
        details: error.response?.data || error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}
