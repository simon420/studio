// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';
import type { SessionPayload } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_VERY_SECRET_KEY';
const COOKIE_NAME = 'auth_token';

const publicPaths = ['/login', '/register']; // Paths accessible without login
const adminOnlyPaths = ['/admin']; // Example paths restricted to admins

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to public paths and API auth routes
  if (publicPaths.includes(pathname) || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    console.log('Middleware: No token found, redirecting to login.');
    // Redirect to login page if no token and accessing protected route
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname); // Pass redirect info
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify the token
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify<SessionPayload>(token, secret);

    // Token is valid, attach user info to the request headers (optional, useful for API routes)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);
    requestHeaders.set('x-user-username', payload.username);

    // Role-based access control
    if (adminOnlyPaths.some(p => pathname.startsWith(p)) && payload.role !== 'admin') {
        console.log(`Middleware: Unauthorized access attempt to ${pathname} by user ${payload.username} (role: ${payload.role}).`);
        // Redirect non-admins trying to access admin paths
        // You could redirect to a specific 'unauthorized' page or back to home
        const homeUrl = new URL('/', request.url);
        return NextResponse.redirect(homeUrl); // Redirect to home for simplicity
    }


    // Allow the request to proceed with added headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Middleware: Token verification failed:', error);
    // Invalid token, redirect to login and clear the invalid cookie
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' }); // Clear cookie
    return response;
  }
}

// Specify which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api routes that are NOT auth routes (allow direct API access if needed, adjust as necessary)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/|api/auth/|_next/static|_next/image|favicon.ico).*)',
    // Apply to specific API routes if needed, e.g., '/api/products/:path*'
  ],
};
