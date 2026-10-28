export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import {
  generateAdminSession,
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginAttempts,
} from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json(
        { success: false, error: 'ADMIN_PASSWORD belum dikonfigurasi di environment server.' },
        { status: 503 }
      );
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown-ip';

    // 1. Check Anti-Bruteforce Lockout
    const rateCheck = checkLoginRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `⚠️ Akses terkunci karena terlalu banyak percobaan salah! Tunggu ${rateCheck.remainingLockSeconds} detik.`,
          isLocked: true,
          lockSeconds: rateCheck.remainingLockSeconds,
        },
        { status: 429 }
      );
    }

    const { password } = await request.json();

    // 2. Validate Password
    if (password === adminPassword) {
      resetLoginAttempts(ip);
      const sessionToken = generateAdminSession();

      const response = NextResponse.json({
        success: true,
        message: 'Login berhasil!',
      });

      // Secure HTTP-Only Cookie
      response.cookies.set('admin_panel_auth', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;
    }

    // 3. Record Failed Attempt
    const failRecord = recordFailedLogin(ip);
    if (failRecord.locked) {
      return NextResponse.json(
        {
          success: false,
          error: '⚠️ Password salah 5 kali! Akses terkunci selama 15 menit.',
          isLocked: true,
          lockSeconds: 900,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: `Password salah! (${failRecord.attempts}/5 percobaan)`,
      },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error saat login' },
      { status: 500 }
    );
  }
}
