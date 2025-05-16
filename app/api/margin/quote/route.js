import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
  try {
    const {
      exchangeTokens = { NSE: ["3045"] },
      // exchangeTokens = { CDS: ["26009"] },
      // token, // Authorization token (Bearer)
      clientIP = "127.0.0.1",
      macAddress = "00:11:22:33:44:55",
    } = await request.json();
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const data = JSON.stringify({
      mode: "FULL",
      exchangeTokens,
    });

    const config = {
      method: "post",
      url: "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/",
      headers: {
        "X-PrivateKey": process.env.ANGEL_API_KEY,
        Accept: "application/json",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": clientIP,
        "X-ClientPublicIP": clientIP,
        "X-MACAddress": macAddress,
        "X-UserType": "USER",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data,
    };

    const response = await axios(config);
    console.log(" ------ response ", response);
    return NextResponse.json(response.data);
  } catch (error) {
    console.error(
      "Error fetching quote:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      {
        error: error.response?.data?.message || "Failed to fetch quote",
        details: error.response?.data || error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}
