import { NextResponse } from 'next/server';
import { DISCORD_SESSION_COOKIE } from '@/lib/discord-session';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(DISCORD_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
