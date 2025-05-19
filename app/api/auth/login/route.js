import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
  try {
    const { clientcode, password, totp, state } = await request.json();

    const data = JSON.stringify({
      clientcode,
      password,
      totp,
      state,
    });

    const config = {
      method: "post",
      url: "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": "CLIENT_LOCAL_IP",
        "X-ClientPublicIP": "CLIENT_PUBLIC_IP",
        "X-MACAddress": "MAC_ADDRESS",
        "X-PrivateKey": process.env.ANGEL_API_KEY,
      },
      data: data,
    };

    const response = await axios(config);
    // console.log(" -------- response ", response.data);

    // Check if the response indicates success
    if (!response.data.status) {
      return NextResponse.json(
        {
          error: response.data.message || "Login failed",
          errorCode: response.data.errorcode,
        },
        { status: 400 }
      );
    }

    // Store the auth token in a cookie
    const result = NextResponse.json({
      success: true,
      message: "Login successful",
      ...response.data,
    });

    // Store the auth token and other necessary data
    result.cookies.set("angel_token", response.data.data?.token || "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    // Store additional user data if needed
    if (response.data.data) {
      result.cookies.set("user_data", JSON.stringify(response.data.data), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 24 hours
      });
    }

    return result;
  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    return NextResponse.json(
      {
        error: error.response?.data?.message || "Login failed",
        errorCode: error.response?.data?.errorcode,
        details: error.response?.data || error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}

// var axios = require('axios');
// var data = JSON.stringify({
//     "clientcode":"CLIENT_ID",
//     "password":"CLIENT_PIN",
// 	"totp":"TOTP_CODE",
//   "state":"STATE_VARIABLE"
// });

// var config = {
//   method: 'post',
//   url: 'https://apiconnect.angelone.in/
//     /rest/auth/angelbroking/user/
//   v1/loginByPassword',

//   headers : {
//     'Content-Type': 'application/json',
//     'Accept': 'application/json',
//     'X-UserType': 'USER',
//     'X-SourceID': 'WEB',
//     'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
//     'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
//     'X-MACAddress': 'MAC_ADDRESS',
//     'X-PrivateKey': 'API_KEY'
//   }
//   data : data
// };

// axios(config)
// .then(function (response) {
//   console.log(JSON.stringify(response.data));
// })
// .catch(function (error) {
//   console.log(error);
// });
