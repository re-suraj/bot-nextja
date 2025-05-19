import { NextResponse } from 'next/server';

export async function middleware(request) {
  const angelToken = request.cookies.get('angel_token')?.value;

  // Check if the request is for the login page
  if (request.nextUrl.pathname === '/login') {
    if (angelToken) {
      // If token exists, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // For protected routes
  if (!angelToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}; 