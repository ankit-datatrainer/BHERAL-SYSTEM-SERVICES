import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from '@/middleware';

const VALID_USERNAME = 'peculiex';
const VALID_PASSWORD = 'Peculiex@2026';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = (body.username || '').trim().toLowerCase();
    const password = body.password || '';

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      const response = NextResponse.json({
        success: true,
        message: 'Authentication successful. Access granted.',
      });

      response.cookies.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid User ID or Password. Please check and try again.',
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
