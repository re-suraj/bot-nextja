// // app/api/history-all/route.js

// import crypto from "crypto";
// import querystring from "querystring";
// import axios from "axios";

// const API_KEY = process.env.BINANCE_API_KEY;
// const API_SECRET = process.env.BINANCE_SECRET_KEY;
// const BASE_URL = "https://testnet.binance.vision/api";

// async function signParams(params) {
//   const queryString = querystring.stringify(params);
//   const signature = crypto
//     .createHmac("sha256", API_SECRET)
//     .update(queryString)
//     .digest("hex");
//   return `${queryString}&signature=${signature}`;
// }

// export async function GET() {
//   try {
//     const timestamp = Date.now();
//     const query = { timestamp };

//     // Step 1: Get balances to infer traded symbols
//     const accountSignature = await signParams(query);
//     const accountRes = await axios.get(
//       `${BASE_URL}/v3/account?${accountSignature}`,
//       {
//         headers: { "X-MBX-APIKEY": API_KEY },
//       }
//     );

//     // Step 2: Filter non-zero balances (you’ve likely traded these)
//     const symbols = accountRes.data.balances
//       .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
//       .map((b) => b.asset)
//       .map((asset) => asset + "USDT"); // Approximation for common quote

//     const uniqueSymbols = [...new Set(symbols)];

//     // Step 3: For each symbol, get orders and trades
//     // const headers = { "X-MBX-APIKEY": API_KEY };
//     const allResults = [];
//     // for (const symbol of uniqueSymbols) {
//     // let symbol = "BNBETH";
//     // let symbol = "EOSETH";
//     let symbol = "ETHBTC";
//     try {
//       const timestamp1 = Date.now();
//       const queryString1 = querystring.stringify({
//         symbol,
//         timestamp: timestamp1,
//       });
//       const signature1 = crypto
//         .createHmac("sha256", API_SECRET)
//         .update(queryString1)
//         .digest("hex");

//       const orderRes = await axios.get(
//         `${BASE_URL}/v3/allOrders?${queryString1}&signature=${signature1}`,
//         { headers: { "X-MBX-APIKEY": API_KEY } }
//       );

//       // 🔄 Delay just a bit to ensure different timestamp
//       await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay

//       const timestamp2 = Date.now();
//       const queryString2 = querystring.stringify({
//         symbol,
//         timestamp: timestamp2,
//       });
//       const signature2 = crypto
//         .createHmac("sha256", API_SECRET)
//         .update(queryString2)
//         .digest("hex");

//       const tradeRes = await axios.get(
//         `${BASE_URL}/v3/myTrades?${queryString2}&signature=${signature2}`,
//         { headers: { "X-MBX-APIKEY": API_KEY } }
//       );

//       allResults.push({
//         symbol,
//         orders: orderRes.data,
//         trades: tradeRes.data,
//       });
//     } catch (err) {
//       console.warn(
//         `⚠️ Skipped ${symbol}:`,
//         err.response?.data?.msg || err.message
//       );
//     }
//     // }

//     return new Response(JSON.stringify(allResults), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (err) {
//     console.error(
//       "❌ Failed to fetch all history:",
//       err.response?.data || err.message
//     );
//     return new Response(JSON.stringify({ error: "Internal Server Error" }), {
//       status: 500,
//     });
//   }
// }

// // app/api/balance/route.js

import crypto from "crypto";
import querystring from "querystring";
import axios from "axios";

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_SECRET_KEY;
const BASE_URL = "https://testnet.binance.vision/api";

export async function GET() {
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto
      .createHmac("sha256", API_SECRET)
      .update(queryString)
      .digest("hex");

    const url = `${BASE_URL}/v3/account?${queryString}&signature=${signature}`;

    const response = await axios.get(url, {
      headers: {
        "X-MBX-APIKEY": API_KEY,
      },
    });

    // Filter only assets with non-zero balance
    const balances = response.data.balances.filter(
      (b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
    );

    return new Response(JSON.stringify(balances), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("❌ Balance fetch error:", err.response?.data || err.message);
    return new Response(JSON.stringify({ error: "Unable to fetch balance" }), {
      status: 500,
    });
  }
}
