import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { DISCORD_OAUTH_STATE_COOKIE } from '@/lib/discord-session';

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Discord OAuth2 belum dikonfigurasi. Set DISCORD_CLIENT_ID dan DISCORD_REDIRECT_URI di environment variables Vercel.' },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify',
    state: randomBytes(32).toString('hex'),
  });

  const discordAuthUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;

  const response = NextResponse.redirect(discordAuthUrl);
  response.cookies.set(DISCORD_OAUTH_STATE_COOKIE, params.get('state')!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60,
    path: '/',
  });
  return response;
}
