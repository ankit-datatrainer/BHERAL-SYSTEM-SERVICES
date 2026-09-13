import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const AUTH_COOKIE_NAME = 'bss_site_access';
export const AUTH_COOKIE_VALUE = 'auth_peculiex_granted_2026';

// Required credentials
const VALID_USERNAME = 'peculiex';
const VALID_PASSWORD = 'Peculiex@2026';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Always allow Next.js internal files, build assets, and public static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/logout' ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf|eot)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Check for the authentication cookie
  const authCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isCookieValid = authCookie === AUTH_COOKIE_VALUE;

  // 3. Optional: check for HTTP Basic Auth header
  const authHeader = req.headers.get('authorization');
  let isBasicAuthValid = false;
  if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      const b64 = authHeader.substring(6);
      const decoded = atob(b64);
      const [user, pass] = decoded.split(':');
      if (user?.trim().toLowerCase() === VALID_USERNAME && pass === VALID_PASSWORD) {
        isBasicAuthValid = true;
      }
    } catch {
      // ignore decoding error
    }
  }

  const isAuthenticated = isCookieValid || isBasicAuthValid;

  // 4. If visiting /login:
  if (pathname === '/login') {
    if (isAuthenticated) {
      // If already logged in, redirect away from login page to home or returnUrl
      const returnUrl = req.nextUrl.searchParams.get('returnUrl') || '/';
      return NextResponse.redirect(new URL(returnUrl, req.url));
    }
    return NextResponse.next();
  }

  // 5. If not authenticated:
  if (!isAuthenticated) {
    // For API calls, return 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized. Site credentials required.' },
        { status: 401 }
      );
    }

    // For web pages, redirect to /login with returnUrl
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('returnUrl', pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
