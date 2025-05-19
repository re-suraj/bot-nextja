export default function handler(req, res) {
  console.log(" ------ data ", process.env.UPSTOX_API_KEY);
  const url = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${process.env.UPSTOX_API_KEY}&redirect_uri=${process.env.REDIRECT_URI}`;
  res.redirect(url);
}
// import { NextRequest, NextResponse } from "next/server";

// // next.js api routes
// export async function GET(request) {
//   return NextResponse.json({ msg: "Hello from NextJS API!" });
// }
