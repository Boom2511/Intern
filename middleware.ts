import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Allow public routes
  const publicRoutes = [
    '/login',
    '/api/auth/login',
    '/api/auth/logout',
    '/liff',  // LIFF routes (LINE Front-end Framework) - authenticated by LINE
    '/api/liff',  // LIFF API routes
    '/api/webhook',  // LINE webhook endpoints
    '/api/line/webhook',  // Alternative LINE webhook endpoint
  ];

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Debug logging for LIFF routes
  if (pathname.startsWith('/liff')) {
    console.log('[Middleware] LIFF route detected:', pathname, 'isPublic:', isPublicRoute);
  }

  if (isPublicRoute) {
    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
  }

  // Handle LIFF redirect at root path - redirect to liff.state immediately
  // This prevents client-side redirect loops
  // Safety: Check for redirect header to prevent infinite loops
  if (
    pathname === '/' &&
    searchParams.has('liff.state') &&
    !request.headers.get('x-liff-redirected')
  ) {
    const liffState = searchParams.get('liff.state');
    console.log('[Middleware] Root path with liff.state detected:', liffState);
    console.log('[Middleware] Redirecting to liff.state immediately (server-side)');

    // Redirect to liff.state path (preserving full URL including query params)
    const redirectUrl = new URL(liffState!, request.url);
    const response = NextResponse.redirect(redirectUrl);
    // Set header to prevent redirect loops
    response.headers.set('x-liff-redirected', 'true');
    return response;
  }

  // Allow public access to client mode tickets (both page and API)
  if (searchParams.get('mode') === 'client') {
    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
  }

  // Allow public access to ticket detail API (used by client mode pages)
  // Pattern: /api/tickets/[id] (but not /api/tickets without ID)
  if (pathname.match(/^\/api\/tickets\/[^\/]+$/)) {
    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
  }

  // Check if user is authenticated
  const sessionToken = request.cookies.get('session_token')?.value;

  if (!sessionToken) {
    // Redirect to login if not authenticated
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify session token
  try {
    const payload = JSON.parse(Buffer.from(sessionToken, 'base64').toString());

    if (payload.exp < Date.now()) {
      // Session expired - redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session_token');
      return response;
    }

    // Token is valid - let the request through
    // Permission checks will be handled by the UI and API routes
    // Add pathname to headers for server components
    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // Invalid token - redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('session_token');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
