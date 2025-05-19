import axios from "axios";

export async function POST(req, res) {
  // export default async function POST(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed" });
  }

  const { positions, token, clientIP, macAddress, apiKey } = req.body;

  if (!positions || !Array.isArray(positions)) {
    return res.status(400).json({ error: "Invalid positions array" });
  }
  console.log(token, " ---- token ");
  const data = JSON.stringify({ positions });

  const config = {
    method: "post",
    url: "https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/placeOrder",
    headers: {
      "X-PrivateKey": apiKey,
      Accept: "application/json",
      "X-SourceID": "WEB",
      "X-ClientLocalIP": clientIP || "127.0.0.1",
      "X-ClientPublicIP": clientIP || "127.0.0.1",
      "X-MACAddress": macAddress || "00:00:00:00:00:00",
      "X-UserType": "USER",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: data,
  };

  try {
    const response = await axios(config);
    res.status(200).json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: "Margin batch request failed",
      details: error.response?.data || error.message,
    });
  }
}
