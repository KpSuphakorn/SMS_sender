import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // If not logged in, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based access control
  const { role } = token as { role?: string };

  // If user is not admin and tries to access anything except /all-data or /mainmenu, redirect to /all-data
  if (
    role !== 'admin' &&
    !request.nextUrl.pathname.startsWith('/all-data') &&
    !request.nextUrl.pathname.startsWith('/mainmenu')
  ) {
    return NextResponse.redirect(new URL('/all-data', request.url));
  }

  // If admin, allow access to all pages
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/mainmenu/:path*',
    '/history',
    '/all-data/:path*',
    '/support-letter/:path*',
    '/dashboard/:path*',
    // Add more protected routes here if needed
  ],
};