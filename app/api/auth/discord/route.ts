import { NextResponse } from 'next/server';

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
  });

  const discordAuthUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;

  return NextResponse.redirect(discordAuthUrl);
}
