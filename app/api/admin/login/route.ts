import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password === 'rikigantengZ55') {
      // Return success and a simple signed auth session token
      const sessionToken = Buffer.from(`admin_authenticated_${Date.now()}`).toString('base64');
      
      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        token: sessionToken,
      });

      response.cookies.set('admin_auth', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
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
      { success: false, error: 'Server error during login' },
      { status: 500 }
    );
  }
}
