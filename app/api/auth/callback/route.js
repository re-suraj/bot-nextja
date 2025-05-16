import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { code } = await request.json();

    // Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://api.upstox.com/v2/login/authorization/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.UPSTOX_API_KEY,
        client_secret: process.env.UPSTOX_API_SECRET,
        redirect_uri: process.env.REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token');
    }

    const tokenData = await tokenResponse.json();

    // Store the access token in an HTTP-only cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('upstox_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in,
    });

    return response;
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.json(
      { message: 'Authentication failed' },
      { status: 401 }
    );
  }
} 