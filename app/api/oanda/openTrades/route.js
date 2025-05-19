// pages/api/openTrades.js
import { oandaGet, ACCOUNT_ID } from "../../../lib/oanda";

export default async function handler(req, res) {
  try {
    const state = req.query.state || "all"; // 'open', 'closed', or 'all'
    const count = req.query.count || 50;

    const trades = await oandaGet(
      `/v3/accounts/${ACCOUNT_ID}/trades?state=${state}&count=${count}`
    );
    res.status(200).json(trades);
  } catch (error) {
    console.error("Trade list fetch error:", error);
    res.status(500).json({ error: "Failed to fetch trade list." });
  }
}
