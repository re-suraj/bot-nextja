import axios from "axios";

export default async function handler(req, res) {
  const { code } = req.query;
  const data = {
    code,
    client_id: process.env.UPSTOX_API_KEY,
    client_secret: process.env.UPSTOX_API_SECRET,
    grant_type: "authorization_code",
    redirect_uri: process.env.REDIRECT_URI,
  };
  console.log(" ------ data ", data);
  try {
    const response = await axios.post(
      `https://api.upstox.com/v2/login/authorization/token`,
      data
    );
    const token = response.data.access_token;

    // You can store this token in a secure cookie/session/db
    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ error: "Token exchange failed" });
  }
}
