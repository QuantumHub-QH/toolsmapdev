import { NextRequest, NextResponse } from 'next/server';
import {
  createDiscordSessionToken,
  DISCORD_OAUTH_STATE_COOKIE,
  DISCORD_SESSION_COOKIE,
} from '@/lib/discord-session';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
  const state = searchParams.get('state');
  const savedState = request.cookies.get(DISCORD_OAUTH_STATE_COOKIE)?.value;

  if (error || !code || !state || !savedState || state !== savedState) {
    const response = NextResponse.redirect(`${baseUrl}/?discord_error=denied`);
    response.cookies.delete(DISCORD_OAUTH_STATE_COOKIE);
    return response;
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(`${baseUrl}/?discord_error=config`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${baseUrl}/?discord_error=token`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user info from Discord API
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error('User fetch failed:', await userRes.text());
      return NextResponse.redirect(`${baseUrl}/?discord_error=user`);
    }

    const discordUser = await userRes.json();

    // 3. Build user object
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0') % 5}.png`;

    const sessionToken = createDiscordSessionToken({
      id: discordUser.id,
      username: discordUser.username,
      avatarUrl,
    });

    const response = NextResponse.redirect(baseUrl);
    response.cookies.set(DISCORD_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    response.cookies.delete(DISCORD_OAUTH_STATE_COOKIE);
    return response;

  } catch (err) {
    console.error('Discord OAuth error:', err);
    return NextResponse.redirect(`${baseUrl}/?discord_error=server`);
  }
}
