import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'rikigantengZ55';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password === ADMIN_PASSWORD) {
      const sessionToken = Buffer.from(`admin_auth_${Date.now()}`).toString('base64');
      const response = NextResponse.json({
        success: true,
        message: 'Login berhasil!',
        token: sessionToken,
      });

      response.cookies.set('admin_panel_auth', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Password salah! Silakan coba lagi.' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error saat login' },
      { status: 500 }
    );
  }
}
