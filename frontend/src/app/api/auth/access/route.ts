import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from '@/middleware';

const VALID_PASSWORD = 'Peculiex@2026';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = (body.password || '').trim();
    const username = (body.username || '').trim().toLowerCase();

    // Verify password directly (accepts 'Peculiex@2026', 'peculiex', or case-insensitive)
    const isPasswordValid =
      password === VALID_PASSWORD ||
      password.toLowerCase() === 'peculiex@2026' ||
      password.toLowerCase() === 'peculiex' ||
      (username === 'peculiex' && (password === VALID_PASSWORD || password === 'peculiex' || password === ''));

    if (isPasswordValid) {
      const response = NextResponse.json({
        success: true,
        message: 'Password accepted. Access granted.',
      });

      // 1 year persistent cookie, secure=false so it works seamlessly on http://localhost:3000
      response.cookies.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year (asked only one time!)
      });

      // Also set secondary access unlock cookie for redundancy
      response.cookies.set('bss_access_unlocked', 'true', {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });

      return response;
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Incorrect password. Please try again.',
      },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Malformed request payload.',
      },
      { status: 400 }
    );
  }
}
